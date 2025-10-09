#!/usr/bin/env node
require('../../test/register-ts');

const assert = require('node:assert/strict');
const { getAnalyticsSummary, parseAnalyticsFilters } = require('../src/services/analytics');
const {
  getAgentStatuses,
  runAllAgents,
  runInventoryScenario,
} = require('../src/services/automation');

const results = [];

const run = (name, fn) => {
  try {
    fn();
    results.push({ name, status: 'passed' });
    // eslint-disable-next-line no-console
    console.log(`✓ ${name}`);
  } catch (error) {
    results.push({ name, status: 'failed', error });
    // eslint-disable-next-line no-console
    console.error(`✗ ${name}`);
    // eslint-disable-next-line no-console
    console.error(error);
  }
};

run('returns revenue and supplier metrics', () => {
  const summary = getAnalyticsSummary({});
  assert.ok(summary.revenueByCategory.length > 0, 'revenueByCategory should have data');
  assert.ok(summary.supplierReliability.length > 0, 'supplierReliability should have data');
});

run('applies supplier filters', () => {
  const summary = getAnalyticsSummary({ supplierId: 'SUP-001' });
  const supplierIds = new Set(summary.supplierReliability.map((row) => row.supplierId));
  assert.strictEqual(supplierIds.size, 1);
  assert.ok(supplierIds.has('SUP-001'));
});

run('parses filters from query params', () => {
  const filters = parseAnalyticsFilters({ from: '2024-01-01', riskLevel: 'high' });
  assert.strictEqual(filters.from, '2024-01-01');
  assert.strictEqual(filters.riskLevel, 'high');
});

run('returns automation agent statuses', () => {
  const statuses = getAgentStatuses();
  assert.ok(Array.isArray(statuses));
  assert.strictEqual(statuses.length, 5);
  statuses.forEach((status) => {
    assert.ok(status.agent);
    assert.ok(Object.prototype.hasOwnProperty.call(status, 'records'));
  });
});

run('simulates inventory scenario', () => {
  const result = runInventoryScenario({ growth_percent: 5, lead_time_delta: 2, skus: ['INC-XL-24'] });
  assert.ok(result);
  assert.ok(result.scenario['INC-XL-24']);
  assert.strictEqual(result.skus.length, 1);
});

run('runs all automation agents', () => {
  const response = runAllAgents();
  assert.ok(response.run_at);
  assert.ok(response.payload.module_last_run);
  assert.ok(Array.isArray(response.payload.tasks));
});

const failed = results.filter((item) => item.status === 'failed');
if (failed.length > 0) {
  process.exit(1);
}

process.exit(0);
