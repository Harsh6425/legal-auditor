// ========================================
// Legal Auditor - Frontend Application
// ========================================

const API_BASE = '';

// State
let currentView = 'dashboard';
let documents = [];
let policies = [];
let violations = [];

// ========================================
// Initialization
// ========================================

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  checkHealth();
  loadDashboard();
});

function initNavigation() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const view = item.dataset.view;
      showView(view);
    });
  });
}

function showView(viewName) {
  // Update nav
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.view === viewName);
  });

  // Update views
  document.querySelectorAll('.view').forEach(view => {
    view.classList.remove('active');
  });
  document.getElementById(`${viewName}-view`).classList.add('active');

  currentView = viewName;

  // Load view data
  switch (viewName) {
    case 'dashboard':
      loadDashboard();
      break;
    case 'violations':
      loadViolations();
      break;
    case 'policies':
      loadPolicies();
      break;
  }
}

// ========================================
// API Calls
// ========================================

async function api(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    showToast(error.message, 'error');
    throw error;
  }
}

async function checkHealth() {
  try {
    const health = await api('/api/health');
    const statusEl = document.getElementById('connectionStatus');
    
    if (health.elasticsearch) {
      statusEl.className = 'connection-status connected';
      statusEl.querySelector('span').textContent = 'Connected';
    } else {
      statusEl.className = 'connection-status disconnected';
      statusEl.querySelector('span').textContent = 'Disconnected';
    }
  } catch (error) {
    const statusEl = document.getElementById('connectionStatus');
    statusEl.className = 'connection-status disconnected';
    statusEl.querySelector('span').textContent = 'Error';
  }
}

// ========================================
// Dashboard
// ========================================

async function loadDashboard() {
  await Promise.all([
    loadStats(),
    loadRecentFlagged()
  ]);
}

async function loadStats() {
  try {
    const stats = await api('/api/stats');
    
    animateValue('statDocuments', stats.totalDocuments);
    animateValue('statFlagged', stats.flaggedDocuments);
    animateValue('statHighRisk', stats.highRiskDocuments);
    animateValue('statPolicies', stats.totalPolicies);
    
    // Update violation badge
    document.getElementById('violationBadge').textContent = stats.flaggedDocuments;
  } catch (error) {
    console.error('Failed to load stats:', error);
  }
}

async function loadRecentFlagged() {
  const container = document.getElementById('recentFlagged');
  
  try {
    const data = await api('/api/documents/flagged');
    documents = data.documents;
    
    if (documents.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <h3>All Clear!</h3>
          <p>No flagged documents found. Your compliance is looking good.</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = documents.slice(0, 5).map(doc => renderDocumentCard(doc)).join('');
  } catch (error) {
    container.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <h3>Connection Error</h3>
        <p>Unable to load documents. Check your Elasticsearch connection.</p>
      </div>
    `;
  }
}

function refreshStats() {
  loadDashboard();
  showToast('Dashboard refreshed', 'success');
}

// ========================================
// Violations
// ========================================

async function loadViolations() {
  const container = document.getElementById('violationsList');
  
  try {
    const data = await api('/api/documents/flagged');
    documents = data.documents;
    
    if (documents.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="64" height="64">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <h3>No Violations Found</h3>
          <p>All documents are compliant. Great job!</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = documents.map(doc => renderDocumentCard(doc)).join('');
  } catch (error) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>Error Loading Violations</h3>
        <p>${error.message}</p>
      </div>
    `;
  }
}

async function filterDocuments() {
  const source = document.getElementById('sourceFilter').value;
  const minRisk = document.getElementById('riskFilter').value;
  
  const params = new URLSearchParams();
  if (source) params.append('source', source);
  if (minRisk) params.append('minRisk', minRisk);
  params.append('flaggedOnly', 'true');
  
  const container = document.getElementById('violationsList');
  container.innerHTML = '<div class="loading-state"><div class="spinner"></div><span>Filtering...</span></div>';
  
  try {
    const data = await api(`/api/documents?${params.toString()}`);
    documents = data.documents;
    
    if (documents.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <h3>No Results</h3>
          <p>No documents match your filters.</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = documents.map(doc => renderDocumentCard(doc)).join('');
  } catch (error) {
    container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${error.message}</p></div>`;
  }
}

// ========================================
// Policies
// ========================================

async function loadPolicies() {
  const container = document.getElementById('policiesList');
  const framework = document.getElementById('frameworkFilter')?.value || '';
  
  try {
    const params = framework ? `?framework=${framework}` : '';
    const data = await api(`/api/policies${params}`);
    policies = data.policies;
    
    if (policies.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <h3>No Policies Found</h3>
          <p>Run the ingest-policies script to load compliance policies.</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = policies.map(policy => renderPolicyCard(policy)).join('');
  } catch (error) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>Error Loading Policies</h3>
        <p>${error.message}</p>
      </div>
    `;
  }
}

async function searchPolicies(event) {
  if (event.key !== 'Enter') return;
  
  const query = document.getElementById('policySearch').value.trim();
  if (!query) {
    loadPolicies();
    return;
  }
  
  const container = document.getElementById('policiesList');
  container.innerHTML = '<div class="loading-state"><div class="spinner"></div><span>Searching...</span></div>';
  
  try {
    const framework = document.getElementById('frameworkFilter').value;
    const data = await api('/api/policies/search', {
      method: 'POST',
      body: JSON.stringify({ query, framework: framework || undefined })
    });
    
    policies = data.policies;
    
    if (policies.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <h3>No Results</h3>
          <p>No policies match your search query.</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = policies.map(policy => renderPolicyCard(policy, true)).join('');
  } catch (error) {
    container.innerHTML = `<div class="empty-state"><h3>Search Error</h3><p>${error.message}</p></div>`;
  }
}

// ========================================
// Document Scanner
// ========================================

async function analyzeDocument() {
  const content = document.getElementById('documentContent').value.trim();
  const source = document.getElementById('documentSource').value;
  const resultsContainer = document.getElementById('scannerResults');
  
  if (!content) {
    showToast('Please enter document content to analyze', 'warning');
    return;
  }
  
  resultsContainer.innerHTML = '<div class="loading-state"><div class="spinner"></div><span>Analyzing document...</span></div>';
  
  try {
    const analysis = await api('/api/analyze', {
      method: 'POST',
      body: JSON.stringify({ content, source })
    });
    
    resultsContainer.innerHTML = renderAnalysisResult(analysis);
    
    // Refresh stats
    loadStats();
    
  } catch (error) {
    resultsContainer.innerHTML = `
      <div class="empty-state">
        <h3>Analysis Failed</h3>
        <p>${error.message}</p>
      </div>
    `;
  }
}

function clearScanner() {
  document.getElementById('documentContent').value = '';
  document.getElementById('scannerResults').innerHTML = `
    <div class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="64" height="64">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <path d="M12 18v-6"/>
        <path d="M9 15h6"/>
      </svg>
      <h3>Ready to Scan</h3>
      <p>Paste a document and click "Analyze" to detect PII and compliance issues</p>
    </div>
  `;
}

// ========================================
// Rendering Functions
// ========================================

function renderDocumentCard(doc) {
  const riskLevel = doc.risk_score >= 0.7 ? 'high' : doc.risk_score >= 0.3 ? 'medium' : 'low';
  const riskPercent = Math.round(doc.risk_score * 100);
  const piiTypes = doc.pii_types || [];
  const truncatedContent = doc.content.length > 200 ? doc.content.substring(0, 200) + '...' : doc.content;
  const date = new Date(doc.timestamp).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  return `
    <div class="document-item" onclick="showDocumentDetail('${doc.id}')">
      <div class="document-header">
        <div class="document-source">
          <span class="source-badge ${doc.source}">${doc.source}</span>
          <span style="color: var(--text-muted); font-size: 0.8125rem;">${doc.channel || ''}</span>
        </div>
        <span class="risk-badge ${riskLevel}">${riskLevel} (${riskPercent}%)</span>
      </div>
      <div class="document-content">${escapeHtml(truncatedContent)}</div>
      <div class="document-meta">
        <span>By: ${doc.author || 'Unknown'}</span>
        <span>${date}</span>
        ${piiTypes.length > 0 ? `
          <div class="pii-tags">
            ${piiTypes.map(type => `<span class="pii-tag">${type}</span>`).join('')}
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

function renderPolicyCard(policy, showScore = false) {
  const frameworkClass = policy.framework.toLowerCase();
  const excerpt = policy.content.length > 200 ? policy.content.substring(0, 200) + '...' : policy.content;
  
  return `
    <div class="policy-card" onclick="showPolicyDetail('${policy.id}')">
      <div class="policy-header">
        <span class="policy-framework ${frameworkClass}">${policy.framework}</span>
        ${showScore ? `<span style="color: var(--text-muted); font-size: 0.75rem;">Score: ${policy.score?.toFixed(2) || 'N/A'}</span>` : ''}
      </div>
      <h3 class="policy-title">${escapeHtml(policy.title)}</h3>
      <p class="policy-excerpt">${escapeHtml(excerpt)}</p>
      <div class="policy-meta">
        <span>${policy.article || policy.section}</span>
        <span>${policy.category?.replace(/_/g, ' ') || ''}</span>
      </div>
    </div>
  `;
}

function renderAnalysisResult(analysis) {
  const riskLevel = analysis.riskLevel.toLowerCase();
  const riskIcon = riskLevel === 'high' ? 
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>' :
    riskLevel === 'medium' ?
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>' :
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';
  
  const piiHtml = analysis.piiDetected && analysis.piiDetected.length > 0 ? `
    <div class="result-section">
      <h4>PII Detected (${analysis.piiCount})</h4>
      <div class="pii-list">
        ${analysis.piiDetected.map(pii => `
          <div class="pii-item">
            <span class="pii-type">${pii.type}</span>
            <span class="pii-value">${escapeHtml(pii.redacted || pii.value)}</span>
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';
  
  const policiesHtml = analysis.matchedPolicies && analysis.matchedPolicies.length > 0 ? `
    <div class="result-section">
      <h4>Related Policies</h4>
      <div class="policy-matches">
        ${analysis.matchedPolicies.map(policy => `
          <div class="policy-match">
            <div class="policy-match-title">${escapeHtml(policy.title)}</div>
            <div class="policy-match-ref">${policy.framework} - ${policy.article}</div>
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';
  
  const recommendationsHtml = analysis.recommendations && analysis.recommendations.length > 0 ? `
    <div class="result-section">
      <h4>Recommendations</h4>
      <div class="recommendations-list">
        ${analysis.recommendations.map(rec => `
          <div class="recommendation-item">${escapeHtml(rec)}</div>
        `).join('')}
      </div>
    </div>
  ` : '';
  
  return `
    <div class="analysis-result">
      <div class="result-header">
        <div class="result-icon ${riskLevel}">
          ${riskIcon}
        </div>
        <div class="result-title">
          <h3>${analysis.riskLevel} Risk Document</h3>
          <p>Risk Score: ${Math.round(analysis.riskScore * 100)}% | ${analysis.piiCount} PII items detected</p>
        </div>
      </div>
      
      ${piiHtml}
      ${policiesHtml}
      ${recommendationsHtml}
      
      ${analysis.flagged ? `
        <div style="margin-top: 20px; padding: 12px 16px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px;">
          <strong style="color: var(--danger);">⚠️ Document Auto-Flagged</strong>
          <p style="color: var(--text-secondary); font-size: 0.875rem; margin-top: 4px;">
            This document has been flagged for compliance review due to high risk score.
          </p>
        </div>
      ` : ''}
    </div>
  `;
}

// ========================================
// Modal Functions
// ========================================

function showDocumentDetail(docId) {
  const doc = documents.find(d => d.id === docId);
  if (!doc) return;
  
  const riskLevel = doc.risk_score >= 0.7 ? 'HIGH' : doc.risk_score >= 0.3 ? 'MEDIUM' : 'LOW';
  
  document.getElementById('modalTitle').textContent = 'Document Details';
  document.getElementById('modalContent').innerHTML = `
    <div class="result-section">
      <h4>Source Information</h4>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div class="pii-item">
          <span class="pii-type">Source</span>
          <span>${doc.source}</span>
        </div>
        <div class="pii-item">
          <span class="pii-type">Channel</span>
          <span>${doc.channel || 'N/A'}</span>
        </div>
        <div class="pii-item">
          <span class="pii-type">Author</span>
          <span>${doc.author || 'Unknown'}</span>
        </div>
        <div class="pii-item">
          <span class="pii-type">Risk Level</span>
          <span class="risk-badge ${riskLevel.toLowerCase()}">${riskLevel}</span>
        </div>
      </div>
    </div>
    
    <div class="result-section">
      <h4>Content</h4>
      <div style="background: var(--bg-tertiary); padding: 16px; border-radius: 8px; font-family: monospace; font-size: 0.875rem; white-space: pre-wrap; max-height: 200px; overflow-y: auto;">
${escapeHtml(doc.content)}
      </div>
    </div>
    
    ${doc.pii_detected && doc.pii_detected.length > 0 ? `
      <div class="result-section">
        <h4>PII Detected (${doc.pii_count})</h4>
        <div class="pii-list">
          ${doc.pii_detected.map(pii => `
            <div class="pii-item">
              <span class="pii-type">${pii.type}</span>
              <span class="pii-value">${escapeHtml(pii.redacted || '[REDACTED]')}</span>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}
  `;
  
  document.getElementById('modalOverlay').classList.add('active');
}

function showPolicyDetail(policyId) {
  const policy = policies.find(p => p.id === policyId);
  if (!policy) return;
  
  document.getElementById('modalTitle').textContent = policy.title;
  document.getElementById('modalContent').innerHTML = `
    <div style="display: flex; gap: 12px; margin-bottom: 20px;">
      <span class="policy-framework ${policy.framework.toLowerCase()}">${policy.framework}</span>
      <span style="color: var(--text-muted);">${policy.article || policy.section}</span>
      <span style="color: var(--text-muted);">${policy.category?.replace(/_/g, ' ') || ''}</span>
    </div>
    
    <div class="result-section">
      <h4>Policy Content</h4>
      <div style="background: var(--bg-tertiary); padding: 20px; border-radius: 8px; line-height: 1.7; color: var(--text-secondary);">
        ${escapeHtml(policy.content)}
      </div>
    </div>
    
    ${policy.keywords && policy.keywords.length > 0 ? `
      <div class="result-section">
        <h4>Keywords</h4>
        <div class="pii-tags" style="gap: 8px;">
          ${policy.keywords.map(kw => `<span class="pii-tag" style="background: rgba(59, 130, 246, 0.15); color: var(--accent-primary);">${kw}</span>`).join('')}
        </div>
      </div>
    ` : ''}
  `;
  
  document.getElementById('modalOverlay').classList.add('active');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('active');
}

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

// ========================================
// Utility Functions
// ========================================

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function animateValue(elementId, endValue, duration = 500) {
  const element = document.getElementById(elementId);
  const startValue = parseInt(element.textContent) || 0;
  const startTime = performance.now();
  
  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Ease out cubic
    const easeOut = 1 - Math.pow(1 - progress, 3);
    const currentValue = Math.round(startValue + (endValue - startValue) * easeOut);
    
    element.textContent = currentValue;
    
    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }
  
  requestAnimationFrame(update);
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-message">${escapeHtml(message)}</span>`;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
