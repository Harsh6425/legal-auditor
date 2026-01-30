import client, { testConnection } from '../config/elasticsearch.js';

// Test the Elasticsearch connection
async function main() {
  console.log('🔍 Testing Elasticsearch connection...\n');
  
  const connected = await testConnection();
  
  if (connected) {
    console.log('\n📊 Checking cluster health...');
    try {
      const health = await client.cluster.health();
      console.log(`   Status: ${health.status}`);
      console.log(`   Nodes: ${health.number_of_nodes}`);
      console.log(`   Indices: ${health.active_primary_shards}`);
    } catch (error) {
      console.error('   Could not get cluster health:', error.message);
    }
  }
  
  process.exit(connected ? 0 : 1);
}

main();
