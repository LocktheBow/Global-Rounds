#!/bin/bash
set -euo pipefail

git add automation_prototype/dashboard/index.html \
        automation_prototype/dashboard/styles.css \
        automation_prototype/dashboard/app.js \
        backend/src/app.ts

git commit -m "Serve automation dashboard with embedded command insights"

git push origin main
