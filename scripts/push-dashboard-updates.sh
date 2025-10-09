#!/bin/bash
set -euo pipefail

pnpm --dir frontend build:embed

git add automation_prototype/dashboard/index.html \
        automation_prototype/dashboard/styles.css \
        automation_prototype/dashboard/app.js \
        automation_prototype/dashboard/assets/command-insights-embed.js \
        frontend/src/command-embed.tsx \
        frontend/src/command-embed.css \
        frontend/vite.command.config.ts \
        frontend/package.json \
        package.json \
        scripts/push-dashboard-updates.sh

git commit -m "Embed React command insight cards into automation dashboard"

git push origin main
