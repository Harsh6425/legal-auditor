/**
 * PII Detection Utility
 * Runs in Node.js to avoid Elasticsearch Serverless script limits
 */

export function detectPII(content) {
  const pii = [];
  const piiTypes = new Set();
  
  if (!content) return { pii_detected: [], pii_types: [], pii_count: 0, risk_score: 0.0 };

  // Email pattern
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  let match;
  while ((match = emailRegex.exec(content)) !== null) {
    const email = match[0];
    const redacted = email.replace(/(?<=.{2}).(?=.*@)/g, '*');
    
    pii.push({
      type: 'EMAIL',
      value: email,
      redacted: redacted,
      start_pos: match.index,
      end_pos: match.index + email.length,
      confidence: 0.95
    });
    piiTypes.add('EMAIL');
  }

  // SSN pattern (matches XXX-XX-XXXX)
  const ssnRegex = /\b\d{3}-\d{2}-\d{4}\b/g;
  while ((match = ssnRegex.exec(content)) !== null) {
    pii.push({
      type: 'SSN',
      value: '[REDACTED]',
      redacted: 'XXX-XX-' + match[0].substring(7),
      start_pos: match.index,
      end_pos: match.index + match[0].length,
      confidence: 0.99
    });
    piiTypes.add('SSN');
  }

  // Phone pattern (matches various formats)
  const phoneRegex = /\b(?:\+1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
  while ((match = phoneRegex.exec(content)) !== null) {
    // Avoid matching SSNs as phones
    if (match[0].match(/^\d{3}-\d{2}-\d{4}$/)) continue;
    
    pii.push({
      type: 'PHONE',
      value: match[0],
      redacted: match[0].replace(/\d(?=\d{4})/g, '*'),
      start_pos: match.index,
      end_pos: match.index + match[0].length,
      confidence: 0.85
    });
    piiTypes.add('PHONE');
  }

  // Credit Card (matches 16 digits with separators)
  const ccRegex = /\b(?:\d{4}[- ]?){3}\d{4}\b/g;
  while ((match = ccRegex.exec(content)) !== null) {
    const clean = match[0].replace(/[- ]/g, '');
    pii.push({
      type: 'CREDIT_CARD',
      value: '[REDACTED]',
      redacted: '**** **** **** ' + clean.substring(12),
      start_pos: match.index,
      end_pos: match.index + match[0].length,
      confidence: 0.90
    });
    piiTypes.add('CREDIT_CARD');
  }

  // Date of Birth (MM/DD/YYYY or MM-DD-YYYY)
  const dobRegex = /\b(?:0[1-9]|1[0-2])[\/\-](?:0[1-9]|[12]\d|3[01])[\/\-](?:19|20)\d{2}\b/g;
  while ((match = dobRegex.exec(content)) !== null) {
    pii.push({
      type: 'DATE_OF_BIRTH',
      value: match[0],
      redacted: '**/**/****',
      start_pos: match.index,
      end_pos: match.index + match[0].length,
      confidence: 0.75
    });
    piiTypes.add('DATE_OF_BIRTH');
  }

  // IPv4 Address
  const ipRegex = /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g;
  while ((match = ipRegex.exec(content)) !== null) {
    // Basic filter to avoid version numbers (e.g. 1.2.3.4) looking like IPs unless in context
    pii.push({
      type: 'IP_ADDRESS',
      value: match[0],
      redacted: '***.***.***.***',
      start_pos: match.index,
      end_pos: match.index + match[0].length,
      confidence: 0.80
    });
    piiTypes.add('IP_ADDRESS');
  }

  // Calculate Risk Score
  const riskWeights = {
    'SSN': 1.0,
    'CREDIT_CARD': 0.9,
    'DATE_OF_BIRTH': 0.6,
    'PHONE': 0.4,
    'EMAIL': 0.3,
    'IP_ADDRESS': 0.2
  };
  
  let totalRisk = 0.0;
  for (const type of piiTypes) {
    totalRisk += (riskWeights[type] || 0.2);
  }
  
  const riskScore = Math.min(totalRisk / 2.0, 1.0);
  const flagged = riskScore >= 0.7;

  return {
    pii_detected: pii,
    pii_types: Array.from(piiTypes),
    pii_count: pii.length,
    risk_score: riskScore,
    flagged: flagged
  };
}
