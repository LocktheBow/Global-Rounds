import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { SeedData } from './types';
import { generateSeedData } from './generate';

let cache: SeedData | null = null;

const SEED_LOCATIONS = [
  join(__dirname, 'seed.json'),
  join(process.cwd(), 'backend', 'src', 'db', 'seed.json'),
  join(process.cwd(), 'backend', 'dist', 'db', 'seed.json'),
];

export const getSeedData = (): SeedData => {
  if (cache) return cache;
  if (process.env.NODE_ENV === 'test') {
    // Generate lightweight fixtures in-memory for fast test runs.
    cache = generateSeedData();
    return cache;
  }
  for (const path of SEED_LOCATIONS) {
    if (!existsSync(path)) continue;
    const raw = readFileSync(path, 'utf-8');
    cache = JSON.parse(raw) as SeedData;
    return cache;
  }
  cache = generateSeedData();
  return cache;
};

export const refreshSeedData = () => {
  cache = generateSeedData();
  return cache;
};
