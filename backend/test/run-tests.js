#!/usr/bin/env node
require('../../test/register-ts');

const assert = require('node:assert/strict');
const { getAnalyticsSummary, parseAnalyticsFilters } = require('../src/services/analytics');

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

const failed = results.filter((item) => item.status === 'failed');
if (failed.length > 0) {
  process.exit(1);
}

process.exit(0);
