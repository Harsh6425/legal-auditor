import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import client, { testConnection } from './config/elasticsearch.js';
import { detectPII } from './utils/pii-detector.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
// ... (rest of imports/middleware)

// ... (previous routes)

// Analyze a new document
app.post('/api/analyze', async (req, res) => {
  try {
    const { content, source = 'manual', author = 'user' } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    // Detect PII in application layer
    const analysisResult = detectPII(content);

    // Index the document with pre-calculated PII data
    const indexResponse = await client.index({
      index: 'monitored-documents',
      pipeline: 'pii-detection-pipeline', // Only sets timestamp etc.
      document: {
        content,
        source,
        author,
        channel: 'manual-upload',
        author_email: `${author}@manual.input`,
        timestamp: new Date().toISOString(),
        ...analysisResult // Spread PII detection results
      },
      refresh: true
    });

    // Fetch the analyzed document to assume persistence
    const analyzed = await client.get({
      index: 'monitored-documents',
      id: indexResponse._id
    });

    const doc = analyzed._source;
    
    // Matched policies logic (same as before)
    let matchedPolicies = [];
    if (doc.pii_count > 0) {
      const policySearch = await client.search({
        index: 'compliance-policies',
        body: {
          query: {
            bool: {
              should: [
                { match: { content: 'personal data disclosure' } },
                { match: { content: 'pii protection' } },
                { terms: { category: ['DATA_PROTECTION', 'PHI_DISCLOSURE', 'DATA_SECURITY'] } }
              ]
            }
          },
          size: 5
        }
      });

      matchedPolicies = policySearch.hits.hits.map(hit => ({
        id: hit._id,
        title: hit._source.title,
        framework: hit._source.framework,
        article: hit._source.article,
        score: hit._score
      }));
    }

    // Generate response using pre-calculated data
    const analysis = {
      documentId: indexResponse._id,
      content: doc.content,
      piiDetected: doc.pii_detected,
      piiCount: doc.pii_count,
      piiTypes: doc.pii_types,
      riskScore: doc.risk_score,
      riskLevel: doc.risk_score >= 0.7 ? 'HIGH' : doc.risk_score >= 0.3 ? 'MEDIUM' : 'LOW',
      flagged: doc.flagged,
      matchedPolicies,
      recommendations: generateRecommendations(doc)
    };

    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a violation record
app.post('/api/violations', async (req, res) => {
  try {
    const violation = {
      ...req.body,
      status: 'PENDING',
      flagged_at: new Date().toISOString(),
      flagged_by: 'agent'
    };

    const response = await client.index({
      index: 'flagged-violations',
      document: violation,
      refresh: true
    });

    res.json({ id: response._id, ...violation });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update violation status
app.patch('/api/violations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (updates.status === 'REVIEWED' || updates.status === 'REMEDIATED') {
      updates.reviewed_at = new Date().toISOString();
    }

    await client.update({
      index: 'flagged-violations',
      id,
      body: { doc: updates },
      refresh: true
    });

    const updated = await client.get({
      index: 'flagged-violations',
      id
    });

    res.json({ id, ...updated._source });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate remediation recommendations
function generateRecommendations(doc) {
  const recommendations = [];
  
  if (!doc.pii_types || doc.pii_types.length === 0) {
    return ['No PII detected. Document appears safe.'];
  }

  if (doc.pii_types.includes('SSN')) {
    recommendations.push('🔴 CRITICAL: Social Security Number detected. Immediately delete this content and notify the Data Protection Officer.');
    recommendations.push('Reference: GDPR Article 9 (Special Categories), HIPAA PHI Guidelines');
  }

  if (doc.pii_types.includes('CREDIT_CARD')) {
    recommendations.push('🔴 CRITICAL: Credit card information detected. This violates PCI-DSS standards. Remove immediately.');
    recommendations.push('Action: Redact card number, notify payment security team.');
  }

  if (doc.pii_types.includes('EMAIL')) {
    recommendations.push('🟡 Email addresses detected. Verify if disclosure is authorized.');
    recommendations.push('Reference: Internal Policy COM-002 (Communication Channel Rules)');
  }

  if (doc.pii_types.includes('PHONE')) {
    recommendations.push('🟡 Phone numbers detected. Confirm necessity and authorization for sharing.');
  }

  if (doc.pii_types.includes('DATE_OF_BIRTH')) {
    recommendations.push('🟡 Date of birth detected. Combined with other PII, this increases identity theft risk.');
  }

  if (doc.risk_score >= 0.7) {
    recommendations.push('⚠️ HIGH RISK: Document should be escalated to compliance team within 24 hours.');
  }

  return recommendations;
}

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Start server
app.listen(PORT, async () => {
  console.log(`\n🚀 Legal Auditor Server running on http://localhost:${PORT}\n`);
  
  // Test ES connection on startup
  const connected = await testConnection();
  if (!connected) {
    console.log('⚠️  Warning: Elasticsearch connection failed. Some features may not work.\n');
  }
  
  console.log('📊 Dashboard: http://localhost:' + PORT);
  console.log('📚 API Docs:');
  console.log('   GET  /api/health         - Health check');
  console.log('   GET  /api/stats          - Dashboard statistics');
  console.log('   GET  /api/documents      - List all documents');
  console.log('   GET  /api/documents/flagged - Flagged documents');
  console.log('   GET  /api/policies       - List policies');
  console.log('   POST /api/policies/search - Search policies');
  console.log('   POST /api/analyze        - Analyze new document');
  console.log('   GET  /api/violations     - List violations');
  console.log('   POST /api/violations     - Create violation');
  console.log('');
});
