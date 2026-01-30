import client, { testConnection } from '../config/elasticsearch.js';
import { detectPII } from '../utils/pii-detector.js';

// Sample documents simulating real-world compliance violations
const documents = [
  // ... (keep existing documents array as is)
  // HIGH RISK - SSN exposure in Slack
  {
    content: `Hey team, I need to verify this customer's identity for the refund request. Their SSN is 123-45-6789 and they're asking for the full amount back. Can someone from finance approve this? The customer email is john.doe@example.com and phone is 555-123-4567.`,
    source: 'slack',
    channel: '#customer-support',
    author: 'sarah.jones',
    author_email: 'sarah.jones@company.com',
    timestamp: new Date().toISOString()
  },
  
  // HIGH RISK - Credit card in email
  {
    content: `Subject: Payment Issue - Customer #45821
    
Hi Support Team,

Customer called about a failed transaction. Here are their payment details for manual processing:

Card Number: 4532-1234-5678-9012
Expiry: 12/26
CVV: 321

Please process the refund of $149.99 to this card. Customer name is Michael Smith, DOB 03/15/1985.

Thanks,
Payment Processing Team`,
    source: 'email',
    channel: 'support@company.com',
    author: 'payments.team',
    author_email: 'payments@company.com',
    timestamp: new Date().toISOString()
  },

  // MEDIUM RISK - PII in GitHub PR
  {
    content: `## PR Description
Fixed the user authentication bug.

## Test Data Used
Tested with user: Jane Wilson
Email: jane.wilson@testmail.com  
Phone: (555) 987-6543
Address: 123 Main Street, Anytown, CA 90210

All tests passing now. Ready for review.`,
    source: 'github',
    channel: 'pr-authentication-fix',
    author: 'dev.alex',
    author_email: 'alex@company.com',
    timestamp: new Date().toISOString()
  },

  // HIGH RISK - Health information (HIPAA)
  {
    content: `Team update: Patient Robert Johnson (DOB: 07/22/1978, SSN: 987-65-4321) called about his prescription. He's on Metformin 500mg for Type 2 Diabetes and needs a refill. His phone is 555-456-7890 and email robert.j@email.com. Insurance ID: BCBS-445566778. Please update his file.`,
    source: 'slack',
    channel: '#medical-support',
    author: 'nurse.maria',
    author_email: 'maria@healthclinic.com',
    timestamp: new Date().toISOString()
  },

  // MEDIUM RISK - Multiple emails exposed
  {
    content: `Here's the list of attendees for tomorrow's meeting:
- john.smith@company.com
- sarah.connor@company.com  
- mike.wilson@partner.com
- external.client@gmail.com
- vip.customer@fortune500.com

Please make sure everyone has the conference link. IP for the meeting server is 192.168.1.100.`,
    source: 'email',
    channel: 'team@company.com',
    author: 'admin.assistant',
    author_email: 'admin@company.com',
    timestamp: new Date().toISOString()
  },

  // LOW RISK - Single email mention
  {
    content: `Quick question - can you forward the design specs to design.team@company.com? We need them for the Friday review. Thanks!`,
    source: 'slack',
    channel: '#general',
    author: 'tom.developer',
    author_email: 'tom@company.com',
    timestamp: new Date().toISOString()
  },

  // HIGH RISK - Customer database dump discussion
  {
    content: `I exported the customer list for the marketing campaign. File includes: full names, emails, phone numbers, and purchase history. Sample row: 
Name: Emily Davis
Email: emily.d@customer.com
Phone: 555-321-9876
Last Purchase: $2,340.00
Credit Card Last 4: 4532

The full export is 50,000 records. Where should I upload it?`,
    source: 'slack',
    channel: '#marketing',
    author: 'data.analyst',
    author_email: 'analyst@company.com',
    timestamp: new Date().toISOString()
  },

  // NO RISK - Clean message
  {
    content: `Reminder: Team standup is at 10 AM tomorrow. Please update your Jira tickets before the meeting. We'll be discussing the Q2 roadmap and sprint planning.`,
    source: 'slack',
    channel: '#engineering',
    author: 'tech.lead',
    author_email: 'lead@company.com',
    timestamp: new Date().toISOString()
  },

  // MEDIUM RISK - Birth date exposure
  {
    content: `Happy Birthday celebration for team members this month:
- Alice (DOB: 01/15/1990)
- Bob (DOB: 01/22/1988)  
- Charlie (DOB: 01/28/1995)

Cake will be in the break room at 3 PM on Friday. Contact hr@company.com if you want to contribute.`,
    source: 'email',
    channel: 'all-staff@company.com',
    author: 'hr.coordinator',
    author_email: 'hr@company.com',
    timestamp: new Date().toISOString()
  },

  // HIGH RISK - Credentials in code review
  {
    content: `Code review feedback:

Line 45: Remove the hardcoded API key before merging
Line 89: The database connection string has the password visible: postgres://admin:SuperSecret123@db.internal.com:5432/production

Also found a test file with customer SSN: 456-78-9012 - PLEASE REMOVE THIS.

IP whitelist includes: 10.0.0.1, 172.16.0.50, 192.168.100.1`,
    source: 'github',
    channel: 'pr-database-refactor',
    author: 'senior.dev',
    author_email: 'senior@company.com',
    timestamp: new Date().toISOString()
  },

  // MEDIUM RISK - Personal info in support ticket
  {
    content: `Ticket #78234 - Password Reset Request

Customer: Margaret Thompson
Email: m.thompson@email.com
Phone: 555-246-8135
Account ID: ACC-998877

Customer called unable to access account. Verified identity using last 4 of phone and email. Reset link sent. Follow up in 24 hours if issue persists.`,
    source: 'email',
    channel: 'support-tickets@company.com',
    author: 'support.agent',
    author_email: 'support1@company.com',
    timestamp: new Date().toISOString()
  },

  // NO RISK - Project discussion
  {
    content: `The new feature deployment is scheduled for next Tuesday at 2 AM UTC. Downtime expected: 30 minutes. All teams should review the rollback procedure in Confluence. Questions? Reach out in #deployment-support.`,
    source: 'slack',
    channel: '#announcements',
    author: 'devops.lead',
    author_email: 'devops@company.com',
    timestamp: new Date().toISOString()
  }
];

async function ingestDocuments() {
  console.log('📄 Ingesting sample documents for analysis...\n');

  // Test connection first
  const connected = await testConnection();
  if (!connected) {
    console.error('Cannot proceed without Elasticsearch connection');
    process.exit(1);
  }

  console.log('\n');

  const indexName = 'monitored-documents';

  // Check if index exists
  const exists = await client.indices.exists({ index: indexName });
  if (!exists) {
    console.error(`❌ Index "${indexName}" does not exist. Run setup-indices.js first.`);
    process.exit(1);
  }

  let successCount = 0;
  let errorCount = 0;
  let highRiskCount = 0;

  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i];
    
    // Detect PII in application layer before ingestion
    const analysis = detectPII(doc.content);
    
    // Enrich document with PII metadata
    const enrichedDoc = {
      ...doc,
      ...analysis
    };
    
    try {
      const response = await client.index({
        index: indexName,
        pipeline: 'pii-detection-pipeline', // Only sets timestamps now
        document: enrichedDoc,
        refresh: true
      });

      const piiCount = analysis.pii_count || 0;
      const riskScore = analysis.risk_score || 0;
      const flagged = analysis.flagged || false;

      if (riskScore >= 0.7) highRiskCount++;

      const riskLevel = riskScore >= 0.7 ? '🔴 HIGH' : riskScore >= 0.3 ? '🟡 MEDIUM' : '🟢 LOW';
      
      console.log(`✅ Doc ${i + 1}: ${doc.source}/${doc.channel}`);
      console.log(`   PII Found: ${piiCount} | Risk: ${(riskScore * 100).toFixed(0)}% ${riskLevel}`);
      if (flagged) console.log(`   ⚠️  AUTO-FLAGGED for review`);
      console.log('');
      
      successCount++;
      
    } catch (error) {
      console.error(`❌ Failed to ingest document ${i + 1}:`, error.message);
      errorCount++;
    }
  }

  console.log('\n📊 Ingestion Summary:');
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${errorCount}`);
  console.log(`   🔴 High Risk: ${highRiskCount}`);
  console.log(`   📄 Total: ${documents.length}`);

  // Show flagged documents
  try {
    const flagged = await client.search({
      index: indexName,
      body: {
        query: { term: { flagged: true } },
        size: 100
      }
    });
    
    console.log(`\n⚠️  Documents flagged for review: ${flagged.hits.total.value}`);
    
  } catch (error) {
    console.log('   Could not query flagged documents:', error.message);
  }
}

ingestDocuments().catch(console.error);
