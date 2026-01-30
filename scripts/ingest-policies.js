import client, { testConnection } from '../config/elasticsearch.js';

// Sample compliance policies based on GDPR and HIPAA
const policies = [
  // GDPR Policies
  {
    title: 'GDPR Article 5 - Principles of Processing',
    content: `Personal data shall be processed lawfully, fairly and in a transparent manner in relation to the data subject. Personal data shall be collected for specified, explicit and legitimate purposes and not further processed in a manner that is incompatible with those purposes. Personal data shall be adequate, relevant and limited to what is necessary in relation to the purposes for which they are processed (data minimisation). Personal data shall be accurate and, where necessary, kept up to date. Personal data shall be kept in a form which permits identification of data subjects for no longer than is necessary. Personal data shall be processed in a manner that ensures appropriate security of the personal data, including protection against unauthorised or unlawful processing.`,
    framework: 'GDPR',
    section: 'Chapter II',
    article: 'Article 5',
    category: 'DATA_PROCESSING_PRINCIPLES',
    effective_date: '2018-05-25',
    version: '1.0'
  },
  {
    title: 'GDPR Article 17 - Right to Erasure',
    content: `The data subject shall have the right to obtain from the controller the erasure of personal data concerning him or her without undue delay and the controller shall have the obligation to erase personal data without undue delay where: the personal data are no longer necessary in relation to the purposes for which they were collected; the data subject withdraws consent; the data subject objects to the processing; the personal data have been unlawfully processed; the personal data have to be erased for compliance with a legal obligation. This right does not apply where processing is necessary for exercising the right of freedom of expression, for compliance with a legal obligation, for reasons of public interest in the area of public health, or for archiving purposes.`,
    framework: 'GDPR',
    section: 'Chapter III',
    article: 'Article 17',
    category: 'DATA_SUBJECT_RIGHTS',
    effective_date: '2018-05-25',
    version: '1.0'
  },
  {
    title: 'GDPR Article 32 - Security of Processing',
    content: `Taking into account the state of the art, the costs of implementation and the nature, scope, context and purposes of processing as well as the risk of varying likelihood and severity for the rights and freedoms of natural persons, the controller and the processor shall implement appropriate technical and organisational measures to ensure a level of security appropriate to the risk, including: the pseudonymisation and encryption of personal data; the ability to ensure the ongoing confidentiality, integrity, availability and resilience of processing systems; the ability to restore the availability and access to personal data in a timely manner in the event of a physical or technical incident; a process for regularly testing, assessing and evaluating the effectiveness of technical and organisational measures.`,
    framework: 'GDPR',
    section: 'Chapter IV',
    article: 'Article 32',
    category: 'DATA_SECURITY',
    effective_date: '2018-05-25',
    version: '1.0'
  },
  {
    title: 'GDPR Article 33 - Notification of Personal Data Breach',
    content: `In the case of a personal data breach, the controller shall without undue delay and, where feasible, not later than 72 hours after having become aware of it, notify the personal data breach to the supervisory authority, unless the personal data breach is unlikely to result in a risk to the rights and freedoms of natural persons. The notification shall describe the nature of the personal data breach including the categories and approximate number of data subjects concerned, the name and contact details of the data protection officer, describe the likely consequences of the personal data breach, and describe the measures taken or proposed to be taken by the controller to address the personal data breach.`,
    framework: 'GDPR',
    section: 'Chapter IV',
    article: 'Article 33',
    category: 'BREACH_NOTIFICATION',
    effective_date: '2018-05-25',
    version: '1.0'
  },
  {
    title: 'GDPR Article 6 - Lawfulness of Processing',
    content: `Processing shall be lawful only if and to the extent that at least one of the following applies: the data subject has given consent to the processing of his or her personal data for one or more specific purposes; processing is necessary for the performance of a contract to which the data subject is party; processing is necessary for compliance with a legal obligation to which the controller is subject; processing is necessary in order to protect the vital interests of the data subject or of another natural person; processing is necessary for the performance of a task carried out in the public interest; processing is necessary for the purposes of the legitimate interests pursued by the controller or by a third party.`,
    framework: 'GDPR',
    section: 'Chapter II',
    article: 'Article 6',
    category: 'LAWFUL_PROCESSING',
    effective_date: '2018-05-25',
    version: '1.0'
  },

  // HIPAA Policies
  {
    title: 'HIPAA Privacy Rule - PHI Disclosure',
    content: `A covered entity may not use or disclose protected health information (PHI), except either as the Privacy Rule permits or requires or as the individual who is the subject of the information authorizes in writing. Required disclosures include: to individuals when they request access to their PHI, and to HHS when undertaking a compliance investigation or enforcement action. PHI includes demographic information, medical history, test and laboratory results, mental health conditions, insurance information, and other data that a healthcare professional collects to identify an individual and determine appropriate care.`,
    framework: 'HIPAA',
    section: 'Privacy Rule',
    article: '164.502',
    category: 'PHI_DISCLOSURE',
    effective_date: '2003-04-14',
    version: '1.0'
  },
  {
    title: 'HIPAA Security Rule - Administrative Safeguards',
    content: `Covered entities must implement administrative safeguards to protect electronic PHI. This includes: security management process to prevent, detect, contain, and correct security violations; assigned security responsibility with a designated security official; workforce security to ensure appropriate access to ePHI; information access management to authorize access to ePHI; security awareness and training for workforce members; security incident procedures; contingency plan for emergencies; and regular evaluations of security policies. Risk analysis and risk management are required components.`,
    framework: 'HIPAA',
    section: 'Security Rule',
    article: '164.308',
    category: 'ADMINISTRATIVE_SAFEGUARDS',
    effective_date: '2005-04-20',
    version: '1.0'
  },
  {
    title: 'HIPAA Minimum Necessary Standard',
    content: `When using or disclosing protected health information or when requesting protected health information from another covered entity, a covered entity must make reasonable efforts to limit protected health information to the minimum necessary to accomplish the intended purpose of the use, disclosure, or request. This standard does not apply to disclosures to or requests by a health care provider for treatment; uses or disclosures made to the individual; uses or disclosures made pursuant to an authorization; disclosures made to the Secretary of HHS; or uses or disclosures that are required by law.`,
    framework: 'HIPAA',
    section: 'Privacy Rule',
    article: '164.502(b)',
    category: 'MINIMUM_NECESSARY',
    effective_date: '2003-04-14',
    version: '1.0'
  },
  {
    title: 'HIPAA Breach Notification Rule',
    content: `Covered entities and business associates must provide notification following a breach of unsecured protected health information. A breach is defined as the acquisition, access, use, or disclosure of PHI in a manner not permitted which compromises the security or privacy of the PHI. Notification must be made without unreasonable delay and in no case later than 60 calendar days after discovery of a breach. If a breach affects 500 or more individuals, covered entities must also notify HHS and prominent media outlets. Breaches affecting fewer than 500 individuals must be reported to HHS annually.`,
    framework: 'HIPAA',
    section: 'Breach Notification Rule',
    article: '164.400-414',
    category: 'BREACH_NOTIFICATION',
    effective_date: '2009-09-23',
    version: '1.0'
  },

  // Internal Company Policies
  {
    title: 'Internal Policy - PII Classification Guidelines',
    content: `All employees must classify and handle personally identifiable information (PII) according to the following tiers: Tier 1 (Highly Sensitive) includes Social Security numbers, financial account numbers, health records, and biometric data - must be encrypted at rest and in transit, access logged, and never shared via unencrypted channels. Tier 2 (Sensitive) includes names combined with date of birth, addresses, or phone numbers - must be access-controlled and not shared externally without authorization. Tier 3 (Internal) includes business contact information - standard handling applies. Any accidental exposure of Tier 1 or Tier 2 PII must be reported to the compliance team within 24 hours.`,
    framework: 'INTERNAL',
    section: 'Data Handling',
    article: 'DH-001',
    category: 'DATA_CLASSIFICATION',
    effective_date: '2024-01-01',
    version: '2.0'
  },
  {
    title: 'Internal Policy - Communication Channel Rules',
    content: `Employees must not transmit sensitive PII through unapproved communication channels. Approved channels for PII transmission include: encrypted email systems with recipient verification, secure file transfer systems, and approved collaboration tools with end-to-end encryption. Prohibited channels for PII include: public Slack channels, unencrypted email, SMS/text messages, social media platforms, and personal messaging apps. Pull requests, code comments, and documentation must never contain real customer data - use synthetic or anonymized data only. Violations will result in mandatory security training and potential disciplinary action.`,
    framework: 'INTERNAL',
    section: 'Communications',
    article: 'COM-002',
    category: 'COMMUNICATION_SECURITY',
    effective_date: '2024-01-01',
    version: '1.5'
  },
  {
    title: 'Internal Policy - Data Retention and Deletion',
    content: `Personal data must be retained only for as long as necessary to fulfill the purpose for which it was collected. Customer PII must be deleted or anonymized within 90 days of account closure unless required by law. Employee data must be retained for 7 years after termination for legal compliance. Marketing consent records must be kept for 3 years after last interaction. Upon receiving a deletion request, the data protection team has 30 days to complete erasure across all systems. Backup retention must not exceed 90 days. Annual audits will verify compliance with retention schedules.`,
    framework: 'INTERNAL',
    section: 'Data Lifecycle',
    article: 'DL-003',
    category: 'DATA_RETENTION',
    effective_date: '2024-01-01',
    version: '1.0'
  }
];

async function ingestPolicies() {
  console.log('📚 Ingesting compliance policies...\n');

  // Test connection first
  const connected = await testConnection();
  if (!connected) {
    console.error('Cannot proceed without Elasticsearch connection');
    process.exit(1);
  }

  console.log('\n');

  const indexName = 'compliance-policies';

  // Check if index exists
  const exists = await client.indices.exists({ index: indexName });
  if (!exists) {
    console.error(`❌ Index "${indexName}" does not exist. Run setup-indices.js first.`);
    process.exit(1);
  }

  let successCount = 0;
  let errorCount = 0;

  for (const policy of policies) {
    try {
      await client.index({
        index: indexName,
        pipeline: 'policy-processing-pipeline',
        document: policy,
        refresh: true
      });
      
      console.log(`✅ Ingested: ${policy.title}`);
      console.log(`   Framework: ${policy.framework} | Article: ${policy.article}\n`);
      successCount++;
      
    } catch (error) {
      console.error(`❌ Failed to ingest "${policy.title}":`, error.message);
      errorCount++;
    }
  }

  console.log('\n📊 Ingestion Summary:');
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${errorCount}`);
  console.log(`   📄 Total: ${policies.length}`);

  // Verify count
  try {
    const count = await client.count({ index: indexName });
    console.log(`\n   Documents in index: ${count.count}`);
  } catch (error) {
    console.log('   Could not verify count:', error.message);
  }
}

ingestPolicies().catch(console.error);
