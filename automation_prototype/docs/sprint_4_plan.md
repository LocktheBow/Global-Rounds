# Sprint 4 Plan – Predictive & Financial Intelligence

## Goals
1. Predictive inventory engine with scenario API feeding ordering recommendations.
2. Financial Pulse agent exposing ROI metrics (labor saved, claim recovery, DSO impact) and dashboard card.
3. Persistent event pipeline hooks so forecasts and finance metrics surface in tasks/analytics.

## Deliverables
- **Predictive Inventory**
  - Module `automation/predictive_inventory.py` performing exponential smoothing on historical usage + portal orders.
  - API endpoint `/api/inventory/forecast` returning baseline + scenario adjustments.
  - Ordering agent consumes forecast to improve vendor recommendations.
- **Financial Pulse Agent**
  - New automation agent `automation/finance.py` and orchestrator support.
  - KPIs: labor_minutes_saved (from tasks + agent outputs), projected cash recovered, DSO delta.
  - Dashboard cards rendering new metrics + trend summaries.
- **Event & Task Hooks**
  - Events published on forecast generation (`inventory.forecast`), finance snapshot (`finance.snapshot`).
  - Task queue helper to create `finance_review` tasks when KPIs breach thresholds.
- **Frontend**
  - Dashboard additions: finance KPI cards + trend list, scenario slider for inventory forecast.
  - Portal clinician drawer button to request finance review task.

## Timeline
- Days 1-3: predictive inventory module + endpoint + ordering integration.
- Days 4-6: finance agent + orchestrator wiring + dashboard render.
- Days 7-8: frontend scenario controls + finance panel.
- Days 9-10: polish, docs, tests.

