#!/usr/bin/env node
require('../test/register-ts');

const { mkdirSync, writeFileSync } = require('node:fs');
const { cpSync } = require('node:fs');
const { join } = require('node:path');
const { generateSeedData } = require('../backend/src/db/generate');

const OUTPUT_DIR = join(process.cwd(), 'backend', 'src', 'db');
const OUTPUT_FILE = join(OUTPUT_DIR, 'seed.json');
const DIST_DIR = join(process.cwd(), 'backend', 'dist', 'db');
const DIST_FILE = join(DIST_DIR, 'seed.json');

const main = () => {
  const data = generateSeedData();
  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2), 'utf8');
  if (process.env.COPY_TO_DIST !== 'false') {
    mkdirSync(DIST_DIR, { recursive: true });
    cpSync(OUTPUT_FILE, DIST_FILE);
  }
  console.log(`Seed data written to ${OUTPUT_FILE}`);
};

Promise.resolve()
  .then(main)
  .catch((error) => {
    console.error('Seed script failed', error);
    process.exitCode = 1;
  });
