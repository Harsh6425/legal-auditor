import { Client } from "@elastic/elasticsearch";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Debug: Check env vars are loaded
const esUrl = process.env.ELASTICSEARCH_URL;
const esApiKey = process.env.ELASTICSEARCH_API_KEY;

if (!esUrl || !esApiKey) {
  console.error('❌ Missing environment variables:');
  console.error('   ELASTICSEARCH_URL:', esUrl ? '✓' : '✗ missing');
  console.error('   ELASTICSEARCH_API_KEY:', esApiKey ? '✓' : '✗ missing');
}

// Create Elasticsearch client
const client = new Client({
  node: esUrl,
  auth: {
    apiKey: esApiKey,
  },
  tls: {
    rejectUnauthorized: true,
  },
});

// Test connection
export async function testConnection() {
  try {
    const info = await client.info();
    console.log("✅ Connected to Elasticsearch");
    console.log(`   Cluster: ${info.cluster_name}`);
    console.log(`   Version: ${info.version.number}`);
    return true;
  } catch (error) {
    console.error("❌ Failed to connect to Elasticsearch:", error.message);
    if (error.meta?.body) {
      console.error("   Details:", JSON.stringify(error.meta.body, null, 2));
    }
    return false;
  }
}

export default client;
