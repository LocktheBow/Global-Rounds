#!/bin/bash
set -euo pipefail

pip install -r automation_prototype/backend/requirements.txt

if command -v corepack >/dev/null 2>&1; then
  corepack enable
  corepack prepare pnpm@latest --activate
else
  npm install -g pnpm
fi

pnpm install --frozen-lockfile
pnpm --filter backend build
pnpm --dir frontend build
pnpm --dir frontend build:embed

mkdir -p automation_prototype/dashboard/assets
cp frontend/dist-command/command-insights-embed.js automation_prototype/dashboard/assets/command-insights-embed.js
