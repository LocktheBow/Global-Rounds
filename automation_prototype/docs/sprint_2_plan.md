# Sprint 2 Plan – Workflow & Monitoring Enhancements

## Goals
1. Expose the unified task queue to operators and clinicians via dashboard/portal inbox views.
2. Launch a compliance radar skeleton that scans upcoming expirations and portal holds into tasks + alerts.
3. Enhance analytics by tagging tasks (open vs closed, SLA breach risk) and surfacing metrics in the performance agent payload.

## Deliverables
- **API/UI**
  - `GET /api/tasks` already available; extend dashboard + portal to render task inbox with filters and status updates.
  - Add `POST /api/tasks/{id}/status` interactions from the UI (claiming/closing tasks).
- **Compliance Radar service**
  - New module `backend/compliance.py` with `scan_compliance(data_dir, as_of)` returning impending expirations (e.g., F2F, WOPD, prior auth).
  - CLI/cron entry point `python cli.py compliance-scan` for manual runs; FastAPI endpoint `/api/compliance/scan` for on-demand tests.
  - Automatically create/update tasks via `TaskStore` and emit events (`compliance.alert`).
- **Performance analytics**
  - Extend `automation/performance.py` to include `open_tasks`, `sla_risk_tasks`, and `tasks_closed_today` counts.
  - Dashboard cards to show "Open Tasks" & "Tasks at Risk" using new payload fields.

## Implementation Notes
- Task inbox UI: reuse existing dashboard styling (cards/tables). Provide quick actions (Mark In Progress, Close, Reassign).
- Compliance radar v1 uses existing CSV fixtures (`compliance_status.csv`) to flag records whose `next_due_date <= as_of + 7 days` or missing statuses; map to tasks via `TaskStore.ensure_task_for_radars` helper.
- Use `EventDispatcher` to publish `compliance.alert` and `task.updated` events for inbox auto-refresh via existing polling.
- Tests: add lightweight smoke script similar to Sprint 1 verifying compliance scan produces tasks/events.

## Timeline
- Day 1-2: build compliance module + CLI, wire events/tasks.
- Day 3: update performance analytics & ensure JSON schema compatibility.
- Day 4-5: implement dashboard/portal inbox views with status actions, add polling for `/api/tasks`.

