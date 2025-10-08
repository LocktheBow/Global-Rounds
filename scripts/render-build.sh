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
pnpm --dir frontend build
