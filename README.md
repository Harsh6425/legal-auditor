# Context-Aware Legal Auditor

> 🏆 **Elasticsearch Agent Builder Hackathon Entry**

An AI-powered compliance monitoring agent that detects PII (Personally Identifiable Information) exposure and regulatory violations in real-time using Elasticsearch Agent Builder.

![Legal Auditor Dashboard](./docs/dashboard-preview.png)

## 🎯 The Problem

Compliance teams face an impossible task: manually reviewing every Slack message, email, and pull request to check for PII leaks or regulatory violations (GDPR, HIPAA, etc.). This leads to:

- **Missed violations** resulting in regulatory fines
- **Delayed response** to compliance incidents
- **Burnout** of compliance officers from manual review
- **Inconsistent enforcement** across communication channels

## 💡 The Solution

A multi-step AI agent that:

1. **Ingests** internal policies and compliance frameworks as context
2. **Monitors** incoming documents using NER-based PII detection
3. **Matches** content against policy clauses using **Hybrid Search** (BM25 + Vector)
4. **Flags** violations with specific policy citations
5. **Drafts** remediation advice for compliance officers

## ✨ Features

- **🔍 Real-time PII Detection** - Automatically identifies SSNs, credit cards, emails, phone numbers, and more
- **📊 Hybrid Search** - Combines keyword (BM25) and vector search for accurate policy matching
- **⚠️ Risk Scoring** - Intelligent risk assessment with automatic flagging of high-risk documents
- **📋 Policy Browser** - Search and browse GDPR, HIPAA, and internal compliance policies
- **🎯 Remediation Advice** - AI-generated recommendations for addressing violations
- **📈 Compliance Dashboard** - Beautiful real-time monitoring interface

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Legal Auditor Agent                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Ingest     │  │   Hybrid     │  │    Flag      │      │
│  │   Pipeline   │──│   Search     │──│   Workflow   │      │
│  │   (NER/PII)  │  │   (BM25+Vec) │  │   (Action)   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                │                   │              │
│         ▼                ▼                   ▼              │
│  ┌─────────────────────────────────────────────────┐       │
│  │              Elasticsearch Serverless            │       │
│  ├─────────────┬─────────────────┬─────────────────┤       │
│  │ compliance- │   monitored-    │    flagged-     │       │
│  │  policies   │   documents     │   violations    │       │
│  └─────────────┴─────────────────┴─────────────────┘       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Elasticsearch Serverless account ([Sign up free](https://cloud.elastic.co/registration))

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/legal-auditor.git
cd legal-auditor

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your Elasticsearch credentials
```

### Configuration

Create a `.env` file with your Elasticsearch credentials:

```env
ELASTICSEARCH_URL=https://your-project.es.us-central1.gcp.elastic.cloud:443
ELASTICSEARCH_API_KEY=your-api-key-here
PORT=3000
```

### Setup Elasticsearch

```bash
# 1. Test connection
npm run test

# 2. Create indices
node scripts/setup-indices.js

# 3. Create ingest pipelines
node scripts/setup-pipelines.js

# 4. Ingest sample policies
node scripts/ingest-policies.js

# 5. Ingest sample documents
node scripts/ingest-documents.js
```

### Run the Application

```bash
npm start
```

Visit `http://localhost:3000` to access the dashboard.

## 📁 Project Structure

```
legal-auditor/
├── config/
│   └── elasticsearch.js      # ES client configuration
├── scripts/
│   ├── setup-indices.js      # Create ES indices
│   ├── setup-pipelines.js    # Create ingest pipelines
│   ├── ingest-policies.js    # Ingest compliance policies
│   ├── ingest-documents.js   # Ingest sample documents
│   └── test-connection.js    # Test ES connection
├── frontend/
│   ├── index.html            # Dashboard HTML
│   ├── styles.css            # Premium styling
│   └── app.js                # Frontend logic
├── server.js                 # Express API server
├── package.json
├── LICENSE                   # MIT License
└── README.md
```

## 🔧 Technologies Used

- **Elasticsearch Serverless** - Data storage and search
- **Elasticsearch Agent Builder** - AI agent framework
- **Ingest Pipelines** - PII detection during ingestion
- **Hybrid Search** - BM25 + Vector search for policy matching
- **Node.js + Express** - API server
- **Vanilla JS** - Frontend (no framework dependencies)

## 📊 Judging Criteria Alignment

| Criteria                      | Implementation                                                                           |
| ----------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| **Technical Execution (30%)** | Uses Elasticsearch Agent Builder with custom tools, ES                                   | QL queries, and Elastic Workflows. Ingest pipelines for NER/PII detection. |
| **Impact & Wow Factor (30%)** | Solves real compliance pain point. Automated PII detection saves hours of manual review. |
| **Demo Quality (30%)**        | Premium dashboard UI, real-time scanning, clear violation display with policy citations. |
| **Social (10%)**              | [Link to social post]                                                                    |

## 🎬 Demo Video

[Link to 3-minute demo video]

## 📝 Hackathon Submission

This project was built for the **Elasticsearch Agent Builder Hackathon** (January 22 - February 27, 2026).

### What I Built

A compliance monitoring agent that watches for PII exposure and regulatory violations using Elasticsearch's Agent Builder, Hybrid Search, and Ingest Pipelines.

### Features Used

- **Agent Builder** - Custom agent with compliance auditor persona
- **Hybrid Search** - BM25 + Vector for policy matching
- **Ingest Pipelines** - NER/PII detection during document ingestion
- **ES|QL** - Custom query tools for the agent

### Challenges

1. Balancing pattern-based PII detection with performance
2. Designing effective hybrid search queries for policy matching
3. Creating a risk scoring algorithm that accurately prioritizes violations

### What I Liked

1. The seamless integration of Agent Builder with Elasticsearch data
2. How ingest pipelines enable real-time PII detection at scale
3. The flexibility of ES|QL for creating custom agent tools

## 📄 License

MIT License - See [LICENSE](./LICENSE) for details.

## 🙏 Acknowledgments

- Elastic team for Agent Builder and the hackathon
- GDPR and HIPAA documentation for compliance policy content
