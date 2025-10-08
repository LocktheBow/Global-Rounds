#!/usr/bin/env node
require('../../test/register-ts');

const assert = require('node:assert/strict');
const { buildRevenueSeries, buildSupplierSeries } = require('../src/utils/calc');

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

run('builds revenue series with anomalies limited', () => {
  const rows = [
    { date: '2024-01-01', category: 'Respiratory', revenue: 1000, anomalyScore: 2.5 },
    { date: '2024-01-02', category: 'Respiratory', revenue: 1200 },
    { date: '2024-01-01', category: 'Mobility', revenue: 800 },
  ];

  const result = buildRevenueSeries(rows);
  assert.strictEqual(result.series.length, 2);
  assert.ok(result.anomalies.length <= 3);
});

run('prioritises focused supplier in series', () => {
  const rows = [
    {
      supplierId: 'SUP-001',
      supplierName: 'Alpha',
      onTimePct: 0.9,
      disputeRate: 0.02,
      defectRate: 0.01,
      region: 'Northeast',
      category: 'Respiratory',
    },
    {
      supplierId: 'SUP-002',
      supplierName: 'Beta',
      onTimePct: 0.95,
      disputeRate: 0.03,
      defectRate: 0.01,
      region: 'West',
      category: 'Mobility',
    },
  ];

  const result = buildSupplierSeries(rows, 'SUP-002');
  assert.strictEqual(result.suppliers[0].supplierId, 'SUP-002');
});

const failed = results.filter((item) => item.status === 'failed');
if (failed.length > 0) {
  process.exit(1);
}

process.exit(0);
