const savedApiBase = (() => {
  try {
    return window.localStorage.getItem('gr-api-base') || '';
  } catch (error) {
    console.warn('Unable to access localStorage for API base persistence.', error);
    return '';
  }
})();

const defaultApiBase =
  document.body.dataset.apiBase?.trim() || savedApiBase || 'http://localhost:8001';

const state = {
  data: null,
  complianceFilter: 'all',
  varianceMin: 0,
  shiftHours: 6.5,
  showPatient: true,
  showCaseManager: true,
  engagementSearch: '',
  selectedMetric: 'denial_rate',
  apiBase: defaultApiBase,
  apiOnline: false,
  statusTimer: null,
};

const elements = {
  status: document.getElementById('data-status'),
  apiStatus: document.getElementById('api-status'),
  runAllButton: document.getElementById('run-agents-api'),
  reloadSample: document.getElementById('reload-sample'),
  dataFile: document.getElementById('data-file'),
  agentButtons: Array.from(document.querySelectorAll('[data-agent]')),
  complianceFilter: document.getElementById('compliance-filter'),
  workOrdersBody: document.querySelector('#work-orders tbody'),
  vendorOrdersBody: document.querySelector('#vendor-orders tbody'),
  complianceAlerts: document.getElementById('compliance-alerts'),
  varianceSlider: document.getElementById('variance-slider'),
  varianceValue: document.getElementById('variance-value'),
  underpaymentsBody: document.querySelector('#underpayments tbody'),
  documentationBody: document.querySelector('#documentation tbody'),
  agingBody: document.querySelector('#aging tbody'),
  shiftHours: document.getElementById('shift-hours'),
  staffingBody: document.querySelector('#staffing-plan tbody'),
  surgeAlerts: document.getElementById('surge-alerts'),
  engagementBody: document.querySelector('#engagement-table tbody'),
  showPatient: document.getElementById('show-patient'),
  showCaseManager: document.getElementById('show-case-manager'),
  engagementSearch: document.getElementById('engagement-search'),
  metricSelect: document.getElementById('metric-select'),
  metricCards: document.getElementById('metric-cards'),
  trendList: document.getElementById('trend-list'),
  statusTableBody: document.getElementById('agent-status-body'),
  toastStack: document.getElementById('toast-stack'),
};

const STATUS_CLASSES = ['status-offline', 'status-online', 'status-busy', 'status-error'];
const API_STATUS_COPY = {
  offline: 'API Offline',
  online: 'API Online',
  busy: 'Running Agents…',
  error: 'API Error',
};

const usdFormatter = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const decimalFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

const AGENT_LABELS = {
  ordering: 'Ordering',
  payments: 'Payments',
  workforce: 'Workforce',
  engagement: 'Engagement',
  performance: 'Performance',
};

const AGENT_ORDER = Object.keys(AGENT_LABELS);

if (state.apiBase) {
  try {
    window.localStorage.setItem('gr-api-base', state.apiBase);
  } catch (error) {
    console.warn('Unable to persist API base URL.', error);
  }
}

function setDataStatus(message) {
  if (elements.status && typeof message === 'string') {
    elements.status.textContent = message;
  }
}

function setApiStatus(status, detail) {
  if (!elements.apiStatus) {
    return;
  }
  STATUS_CLASSES.forEach((cls) => elements.apiStatus.classList.remove(cls));
  elements.apiStatus.classList.add(`status-${status}`);
  elements.apiStatus.textContent = API_STATUS_COPY[status] || status;
  if (detail) {
    elements.apiStatus.title = detail;
  } else {
    elements.apiStatus.removeAttribute('title');
  }
}

function setButtonLoading(button, isLoading) {
  if (!button) {
    return;
  }
  button.disabled = isLoading;
  button.classList.toggle('is-loading', isLoading);
}

function isoToday() {
  return new Date().toISOString().split('T')[0];
}

function formatRunTimestamp(value) {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

function formatAgentName(agent) {
  return AGENT_LABELS[agent] || (agent ? agent.charAt(0).toUpperCase() + agent.slice(1) : 'Agent');
}

function escapeHtml(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatCurrency(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return escapeHtml(value ?? '');
  }
  return usdFormatter.format(numeric);
}

function formatHeadcount(hours, shiftHours) {
  const numericHours = Number(hours);
  const numericShift = Number(shiftHours);
  if (!Number.isFinite(numericHours) || !Number.isFinite(numericShift) || numericShift === 0) {
    return escapeHtml(hours ?? '');
  }
  return decimalFormatter.format(numericHours / numericShift);
}

function updateData(data, message, options = {}) {
  const { merge = false } = options;
  if (merge && state.data) {
    state.data = { ...state.data, ...data };
  } else if (merge) {
    state.data = { ...data };
  } else {
    state.data = data;
  }
  if (message) {
    setDataStatus(message);
  }
  renderAll();
}

function renderAll() {
  renderOrdering();
  renderPayments();
  renderWorkforce();
  renderEngagement();
  renderPerformance();
}

function renderOrdering() {
  const ordering = state.data?.ordering;
  if (!ordering) {
    if (elements.workOrdersBody) {
      elements.workOrdersBody.innerHTML = '<tr><td colspan="6">Run the ordering agent to populate this table.</td></tr>';
    }
    if (elements.vendorOrdersBody) {
      elements.vendorOrdersBody.innerHTML = '<tr><td colspan="3">Vendor suggestions will appear once the agent runs.</td></tr>';
    }
    if (elements.complianceAlerts) {
      elements.complianceAlerts.innerHTML = '';
    }
    return;
  }

  const workOrders = Array.isArray(ordering.patient_work_orders) ? ordering.patient_work_orders : [];
  const vendorOrders = Array.isArray(ordering.vendor_reorders) ? ordering.vendor_reorders : [];
  const alerts = Array.isArray(ordering.compliance_alerts) ? ordering.compliance_alerts : [];

  const filtered = workOrders.filter((row) => {
    if (state.complianceFilter === 'all') {
      return true;
    }
    return row.compliance_status === state.complianceFilter;
  });

  if (elements.workOrdersBody) {
    elements.workOrdersBody.innerHTML = filtered.length
      ? filtered
          .map(
            (row) => `
        <tr>
          <td>${escapeHtml(row.patient_id)}</td>
          <td>${escapeHtml(row.supply_sku)}</td>
          <td>${escapeHtml(row.required_date)}</td>
          <td>${escapeHtml(row.quantity)}</td>
          <td><span class="badge ${badgeClass(row.compliance_status)}">${escapeHtml(row.compliance_status)}</span></td>
          <td>${escapeHtml(row.notes || '')}</td>
        </tr>
      `,
          )
          .join('')
      : `<tr><td colspan="6">${workOrders.length ? 'No work orders match the selected filter.' : 'No work orders generated yet.'}</td></tr>`;
  }

  if (elements.vendorOrdersBody) {
    elements.vendorOrdersBody.innerHTML = vendorOrders.length
      ? vendorOrders
          .map(
            (row) => `
        <tr>
          <td>${escapeHtml(row.supply_sku)}</td>
          <td>${escapeHtml(row.suggested_order_qty)}</td>
          <td>${escapeHtml(row.rationale)}</td>
        </tr>
      `,
          )
          .join('')
      : '<tr><td colspan="3">No vendor recommendations at this time.</td></tr>';
  }

  if (elements.complianceAlerts) {
    elements.complianceAlerts.innerHTML = alerts.length
      ? alerts
          .map(
            (alert) => `
          <div class="alert-item">
            <strong>${escapeHtml(alert.severity || 'info').toUpperCase()}</strong> — ${escapeHtml(alert.message)}
            ${alert.metadata?.notes ? `<div>${escapeHtml(alert.metadata.notes)}</div>` : ''}
          </div>
        `,
          )
          .join('')
      : '<div class="alert-item neutral">No compliance alerts.</div>';
  }
}

function renderPayments() {
  const payments = state.data?.payments;
  if (!payments) {
    if (elements.varianceValue) {
      elements.varianceValue.textContent = formatCurrency(state.varianceMin);
    }
    if (elements.underpaymentsBody) {
      elements.underpaymentsBody.innerHTML = '<tr><td colspan="7">Run the payments agent to view reconciliation insights.</td></tr>';
    }
    if (elements.documentationBody) {
      elements.documentationBody.innerHTML = '';
    }
    if (elements.agingBody) {
      elements.agingBody.innerHTML = '';
    }
    return;
  }

  const underpayments = Array.isArray(payments.underpayments) ? payments.underpayments : [];
  const documentationQueue = Array.isArray(payments.documentation_queue) ? payments.documentation_queue : [];
  const outstanding = Array.isArray(payments.outstanding_summary) ? payments.outstanding_summary : [];

  const filteredUnderpayments = underpayments.filter((row) => {
    const variance = Number(row.variance);
    return !Number.isNaN(variance) && variance >= state.varianceMin;
  });

  if (elements.varianceValue) {
    elements.varianceValue.textContent = formatCurrency(state.varianceMin);
  }

  if (elements.underpaymentsBody) {
    elements.underpaymentsBody.innerHTML = filteredUnderpayments.length
      ? filteredUnderpayments
          .map(
            (row) => `
        <tr>
          <td>${escapeHtml(row.claim_id)}</td>
          <td>${escapeHtml(row.patient_id)}</td>
          <td>${escapeHtml(row.payer)}</td>
          <td>${formatCurrency(row.expected)}</td>
          <td>${formatCurrency(row.received)}</td>
          <td>${formatCurrency(row.variance)}</td>
          <td>${escapeHtml(row.status)}</td>
        </tr>
      `,
          )
          .join('')
      : '<tr><td colspan="7">No underpayments meet the current variance threshold.</td></tr>';
  }

  if (elements.documentationBody) {
    elements.documentationBody.innerHTML = documentationQueue.length
      ? documentationQueue
          .map(
            (row) => `
        <tr>
          <td>${escapeHtml(row.claim_id)}</td>
          <td>${escapeHtml(row.payer)}</td>
          <td>${escapeHtml(row.denial_code)}</td>
          <td>${escapeHtml(row.requested_docs)}</td>
          <td>${escapeHtml(row.status)}</td>
        </tr>
      `,
          )
          .join('')
      : '<tr><td colspan="5">No documentation requests pending.</td></tr>';
  }

  if (elements.agingBody) {
    elements.agingBody.innerHTML = outstanding.length
      ? outstanding
          .map(
            (row) => `
        <tr>
          <td>${escapeHtml(row.aging_bucket)}</td>
          <td>${formatCurrency(row.outstanding)}</td>
        </tr>
      `,
          )
          .join('')
      : '<tr><td colspan="2">All balances are clear.</td></tr>';
  }
}

function renderWorkforce() {
  const workforce = state.data?.workforce;
  if (!workforce) {
    if (elements.staffingBody) {
      elements.staffingBody.innerHTML = '<tr><td colspan="4">Run the workforce agent to forecast staffing needs.</td></tr>';
    }
    if (elements.surgeAlerts) {
      elements.surgeAlerts.innerHTML = '<li>No surge alerts generated.</li>';
    }
    if (elements.shiftHours) {
      elements.shiftHours.value = state.shiftHours;
    }
    return;
  }

  const staffingPlan = Array.isArray(workforce.staffing_plan) ? workforce.staffing_plan : [];
  const surgeAlerts = Array.isArray(workforce.surge_alerts) ? workforce.surge_alerts : [];

  if (elements.shiftHours) {
    elements.shiftHours.value = state.shiftHours;
  }

  if (elements.staffingBody) {
    elements.staffingBody.innerHTML = staffingPlan.length
      ? staffingPlan
          .map((row) => {
            const hours = Number(row.hours_needed);
            const hoursDisplay = Number.isFinite(hours) ? decimalFormatter.format(hours) : escapeHtml(row.hours_needed ?? '');
            const headcount = formatHeadcount(hours, state.shiftHours);
            return `
        <tr>
          <td>${escapeHtml(row.team)}</td>
          <td>${escapeHtml(row.week_start)}</td>
          <td>${hoursDisplay}</td>
          <td>${headcount}</td>
        </tr>
      `;
          })
          .join('')
      : '<tr><td colspan="4">No staffing needs identified.</td></tr>';
  }

  if (elements.surgeAlerts) {
    elements.surgeAlerts.innerHTML = surgeAlerts.length
      ? surgeAlerts
          .map(
            (alert) => `
        <li>
          <strong>${escapeHtml(alert.team)}</strong> — Week of ${escapeHtml(alert.week_start)}<br />
          ${escapeHtml(alert.message)} (Hours ${escapeHtml(alert.hours)}, baseline ${escapeHtml(alert.baseline_hours)})
        </li>
      `,
          )
          .join('')
      : '<li>No surges projected.</li>';
  }
}

function renderEngagement() {
  const engagement = state.data?.engagement;
  if (!engagement) {
    if (elements.engagementBody) {
      elements.engagementBody.innerHTML = '<tr><td colspan="6">Run the engagement agent to surface outreach messages.</td></tr>';
    }
    if (elements.showPatient) {
      elements.showPatient.checked = state.showPatient;
    }
    if (elements.showCaseManager) {
      elements.showCaseManager.checked = state.showCaseManager;
    }
    return;
  }

  const rows = [];
  if (state.showPatient && Array.isArray(engagement.patient_messages)) {
    engagement.patient_messages.forEach((row) => rows.push({ type: 'Patient', ...row }));
  }
  if (state.showCaseManager && Array.isArray(engagement.case_manager_messages)) {
    engagement.case_manager_messages.forEach((row) => rows.push({ type: 'Case Manager', ...row }));
  }

  if (elements.showPatient) {
    elements.showPatient.checked = state.showPatient;
  }
  if (elements.showCaseManager) {
    elements.showCaseManager.checked = state.showCaseManager;
  }

  const filtered = rows.filter((row) => {
    if (!state.engagementSearch) {
      return true;
    }
    const term = state.engagementSearch.toLowerCase();
    return (
      (row.patient_id && row.patient_id.toLowerCase().includes(term)) ||
      (row.message && row.message.toLowerCase().includes(term)) ||
      (row.order_id && row.order_id.toLowerCase().includes(term))
    );
  });

  if (elements.engagementBody) {
    elements.engagementBody.innerHTML = filtered.length
      ? filtered
          .map(
            (row) => `
        <tr>
          <td>${escapeHtml(row.type)}</td>
          <td>${escapeHtml(row.patient_id || '')}</td>
          <td>${escapeHtml(row.channel || '')}</td>
          <td>${escapeHtml(row.destination || '')}</td>
          <td>${escapeHtml(row.order_id || '')}</td>
          <td>${escapeHtml(row.message || '')}</td>
        </tr>
      `,
          )
          .join('')
      : '<tr><td colspan="6">No messages match your filters.</td></tr>';
  }
}

function renderPerformance() {
  const performance = state.data?.performance;
  if (!performance) {
    if (elements.metricCards) {
      elements.metricCards.innerHTML = '<div class="empty-state">Run the performance agent to populate KPI cards.</div>';
    }
    if (elements.trendList) {
      elements.trendList.innerHTML = '';
    }
    if (elements.metricSelect) {
      elements.metricSelect.value = state.selectedMetric;
    }
    return;
  }

  const snapshotArray = Array.isArray(performance.latest_snapshot)
    ? performance.latest_snapshot
    : performance.latest_snapshot
    ? [performance.latest_snapshot]
    : [];
  const snapshot = snapshotArray[0] || null;
  const trends = Array.isArray(performance.trend_summary) ? performance.trend_summary : [];

  if (elements.metricSelect) {
    elements.metricSelect.value = state.selectedMetric;
  }

  if (elements.metricCards) {
    if (!snapshot) {
      elements.metricCards.innerHTML = '<div class="empty-state">No KPI snapshot available.</div>';
    } else {
      elements.metricCards.innerHTML = Object.entries(snapshot)
        .filter(([key]) => key !== 'date')
        .map(([metric, value]) => {
          const trend = trends.find((entry) => entry.metric === metric);
          const delta = trend ? trend.change : '0';
          const positive = isPositiveMetric(metric, delta);
          return `
            <div class="card">
              <h4>${formatMetricName(metric)}</h4>
              <div class="value">${escapeHtml(value)}</div>
              <div class="delta">
                <span class="badge ${positive ? 'up' : 'down'}">${positive ? '▲' : '▼'} ${escapeHtml(delta)}</span>
              </div>
              <div class="meta">As of ${escapeHtml(snapshot.date || '')}</div>
            </div>
          `;
        })
        .join('');
    }
  }

  if (elements.trendList) {
    const selectedTrends = trends.filter((trend) => trend.metric === state.selectedMetric);
    elements.trendList.innerHTML = selectedTrends.length
      ? selectedTrends
          .map(
            (trend) => `
        <li>
          <h4>${formatMetricName(trend.metric)}</h4>
          <div>${escapeHtml(trend.period)}</div>
          <div class="delta">Change: ${escapeHtml(trend.change)}</div>
        </li>
      `,
          )
          .join('')
      : '<li class="empty-state">No trend data for the selected metric.</li>';
  }
}

function badgeClass(status) {
  if (status === 'clear') {
    return 'up';
  }
```
