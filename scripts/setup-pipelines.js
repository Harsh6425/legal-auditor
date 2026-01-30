import client, { testConnection } from '../config/elasticsearch.js';

// PII Detection Pipeline - Lightweight version (Logic moved to App layer)
const piiPipeline = {
  description: 'Pre-processing pipeline for monitored documents',
  processors: [
    // Set ingestion timestamp
    {
      set: {
        field: 'ingested_at',
        value: '{{_ingest.timestamp}}'
      }
    },
    // Initialize default fields if missing
    {
      set: {
        field: 'flagged',
        value: false,
        override: false
      }
    },
    {
      set: {
        field: 'reviewed',
        value: false,
        override: false
      }
    }
  ]
};

// Policy embedding pipeline - for semantic search on policies
const policyPipeline = {
  description: 'Process and prepare policy documents for semantic search',
  processors: [
    {
      set: {
        field: 'last_updated',
        value: '{{_ingest.timestamp}}'
      }
    },
    // Extract keywords from content
    {
      script: {
        description: 'Extract compliance keywords',
        lang: 'painless',
        source: `
          def content = ctx.content.toLowerCase();
          def keywords = [];
          
          def complianceTerms = [
            'personal data', 'pii', 'data subject', 'consent',
            'data breach', 'notification', 'encryption', 'access control',
            'retention', 'deletion', 'right to erasure', 'portability',
            'processing', 'controller', 'processor', 'transfer',
            'phi', 'hipaa', 'gdpr', 'ccpa', 'security', 'audit',
            'disclosure', 'authorization', 'minimum necessary'
          ];
          
          for (def term : complianceTerms) {
            if (content.contains(term)) {
              keywords.add(term.toUpperCase().replace(' ', '_'));
            }
          }
          
          ctx.keywords = keywords;
        `
      }
    }
  ]
};

async function setupPipelines() {
  console.log('🔧 Setting up ingest pipelines...\n');

  // Test connection first
  const connected = await testConnection();
  if (!connected) {
    console.error('Cannot proceed without Elasticsearch connection');
    process.exit(1);
  }

  console.log('\n');

  const pipelines = {
    'pii-detection-pipeline': piiPipeline,
    'policy-processing-pipeline': policyPipeline
  };

  for (const [pipelineName, pipelineConfig] of Object.entries(pipelines)) {
    try {
      await client.ingest.putPipeline({
        id: pipelineName,
        body: pipelineConfig
      });
      
      console.log(`✅ Created pipeline: ${pipelineName}`);
      console.log(`   └─ ${pipelineConfig.processors.length} processors\n`);
      
    } catch (error) {
      console.error(`❌ Failed to create pipeline "${pipelineName}":`, error.message);
      if (error.meta?.body?.error) {
        console.error('   Details:', JSON.stringify(error.meta.body.error, null, 2));
      }
    }
  }

  console.log('📊 Pipeline setup complete!\n');

  // List all pipelines
  try {
    const pipelines = await client.ingest.getPipeline();
    console.log('Active pipelines:');
    Object.keys(pipelines).forEach(name => {
      console.log(`   - ${name}`);
    });
  } catch (error) {
    console.log('Could not list pipelines:', error.message);
  }
}

setupPipelines().catch(console.error);
