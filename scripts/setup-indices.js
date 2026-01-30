import client, { testConnection } from '../config/elasticsearch.js';

// Index definitions for Elasticsearch Serverless
// Note: Serverless doesn't support custom shard/replica settings
const indices = {
  // Compliance policies index with semantic embeddings
  'compliance-policies': {
    mappings: {
      properties: {
        title: { type: 'text', analyzer: 'standard' },
        content: { 
          type: 'text',
          analyzer: 'standard',
          fields: {
            keyword: { type: 'keyword', ignore_above: 256 }
          }
        },
        content_embedding: { 
          type: 'dense_vector', 
          dims: 384,
          index: true,
          similarity: 'cosine'
        },
        framework: { type: 'keyword' },  // GDPR, HIPAA, SOX, INTERNAL
        section: { type: 'keyword' },
        article: { type: 'keyword' },
        keywords: { type: 'keyword' },
        category: { type: 'keyword' },  // DATA_PROTECTION, BREACH_NOTIFICATION, etc.
        effective_date: { type: 'date' },
        last_updated: { type: 'date' },
        version: { type: 'keyword' }
      }
    }
  },

  // Monitored documents index with NER/PII tags
  'monitored-documents': {
    mappings: {
      properties: {
        content: { 
          type: 'text',
          analyzer: 'standard'
        },
        content_embedding: { 
          type: 'dense_vector', 
          dims: 384,
          index: true,
          similarity: 'cosine'
        },
        source: { type: 'keyword' },      // slack, email, github, manual
        channel: { type: 'keyword' },     // channel name or email thread
        author: { type: 'keyword' },
        author_email: { type: 'keyword' },
        timestamp: { type: 'date' },
        ingested_at: { type: 'date' },
        pii_detected: {
          type: 'nested',
          properties: {
            type: { type: 'keyword' },    // PERSON, EMAIL, SSN, PHONE, CREDIT_CARD, etc.
            value: { type: 'keyword' },
            redacted: { type: 'keyword' },
            start_pos: { type: 'integer' },
            end_pos: { type: 'integer' },
            confidence: { type: 'float' }
          }
        },
        pii_types: { type: 'keyword' },   // Flattened list for easy filtering
        pii_count: { type: 'integer' },
        risk_score: { type: 'float' },    // 0.0 to 1.0
        flagged: { type: 'boolean' },
        reviewed: { type: 'boolean' },
        metadata: { type: 'object', enabled: false }
      }
    }
  },

  // Flagged violations index for tracking
  'flagged-violations': {
    mappings: {
      properties: {
        document_id: { type: 'keyword' },
        document_source: { type: 'keyword' },
        document_author: { type: 'keyword' },
        document_snippet: { type: 'text' },
        violation_type: { type: 'keyword' },  // PII_EXPOSURE, DATA_BREACH, UNAUTHORIZED_DISCLOSURE
        policy_framework: { type: 'keyword' },
        policy_reference: { type: 'keyword' }, // e.g., "GDPR Article 32"
        policy_citation: { type: 'text' },     // Exact policy text
        severity: { type: 'keyword' },         // HIGH, MEDIUM, LOW
        pii_involved: { type: 'keyword' },     // Types of PII found
        pii_count: { type: 'integer' },
        risk_explanation: { type: 'text' },
        remediation_advice: { type: 'text' },
        auto_remediation_available: { type: 'boolean' },
        status: { type: 'keyword' },           // PENDING, IN_REVIEW, REMEDIATED, DISMISSED
        flagged_at: { type: 'date' },
        flagged_by: { type: 'keyword' },       // agent or manual
        reviewed_by: { type: 'keyword' },
        reviewed_at: { type: 'date' },
        resolution_notes: { type: 'text' },
        resolved_at: { type: 'date' }
      }
    }
  }
};

async function createIndices() {
  console.log('🔧 Setting up Elasticsearch indices...\n');

  // Test connection first
  const connected = await testConnection();
  if (!connected) {
    console.error('Cannot proceed without Elasticsearch connection');
    process.exit(1);
  }

  console.log('\n');

  for (const [indexName, config] of Object.entries(indices)) {
    try {
      // Check if index exists
      const exists = await client.indices.exists({ index: indexName });
      
      if (exists) {
        console.log(`⚠️  Index "${indexName}" already exists. Deleting...`);
        await client.indices.delete({ index: indexName });
      }

      // Create index with mappings
      await client.indices.create({
        index: indexName,
        body: config
      });
      
      console.log(`✅ Created index: ${indexName}`);
      
      // Log mapping summary
      const fieldCount = Object.keys(config.mappings.properties).length;
      console.log(`   └─ ${fieldCount} fields defined\n`);
      
    } catch (error) {
      console.error(`❌ Failed to create index "${indexName}":`, error.message);
    }
  }

  console.log('📊 Index setup complete!\n');
  
  // Verify indices
  try {
    const catIndices = await client.cat.indices({ format: 'json' });
    console.log('Current indices:');
    catIndices.forEach(idx => {
      console.log(`   - ${idx.index} (${idx.health})`);
    });
  } catch (error) {
    console.log('Could not list indices:', error.message);
  }
}

createIndices().catch(console.error);
