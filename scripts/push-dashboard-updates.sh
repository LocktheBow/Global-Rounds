#!/bin/bash
set -euo pipefail

git add automation_prototype/dashboard/index.html \
        automation_prototype/dashboard/styles.css \
        automation_prototype/dashboard/app.js \
        backend/src/app.ts \
        backend/src/routes/automation.ts \
        backend/src/services/automation.ts \
        backend/test/run-tests.js \
        scripts/push-dashboard-updates.sh

git commit -m "Add automation API shim and embed command insights"

git push origin main
