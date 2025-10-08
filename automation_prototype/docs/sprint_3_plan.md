# Sprint 3 Plan – Provider & Patient Experiences

## Objectives
1. **Provider Co-Pilot MVP** – enable clinicians to resolve compliance gaps quickly via a task-driven workspace.
2. **Patient Deep-Link Microsite** – allow patients to confirm deliveries, reschedule, or request help tied directly to task queue/workforce.
3. **Action Prioritization Cues** – highlight newly created or high-severity tasks immediately after agent runs.

## Scope Overview
- **Provider Co-Pilot**
  - Role-based portal view (clinician mode toggle or /clinician route).
  - Task inbox filtered to compliance-related work with quick actions (request docs, mark resolved).
  - Detail drawer per task showing compliance metadata, auto-filled WOPD/F2F templates (downloadable PDF/HTML stub).
  - Track clinician actions via task events (e.g., `task.comment`, `task.escalated`).
- **Patient Deep Link**
  - Tokenized link generator API `POST /api/patient_links` returning expiring URL (stored in data/tokens.json for now).
  - Lightweight static page under `/portal/patient/index.html` showing order timeline, confirm/reschedule controls, and “Need help” button.
  - Each action posts back to `/api/patient_actions` -> creates/updates tasks + publishes events.
- **Visual Prioritization Cue**
  - Dashboard: toast summary + badge counts for newly created tasks, highlight rows briefly (CSS animation) when refreshTasks pulls new IDs.
  - Portal (clinician mode): same cue plus quick filters (“New”, “High priority”).

## Deliverables & Milestones
1. **Backend Enhancements**
   - Extend `TaskStore` with `events` list and helper to mark `new_since` per client poll.
   - New endpoints: `/api/tasks/acknowledge` or query param to fetch task diff; `/api/patient_links`, `/api/patient_actions`.
   - Provider template generator stub in `backend/provider.py` (returns HTML/PDF string for WOPD/F2F).
2. **Frontend**
   - Dashboard `renderTasks` -> detect new tasks (comparing previous set) -> flash row + show toast “3 new high-priority tasks”.
   - Portal clinician view – new route or toggle, same task diff handling + detail drawer UI.
   - Patient microsite (mobile-first).
3. **Data/Config**
   - `data/patient_links.json` for demo tokens.
   - Update sample data for compliance tasks to illustrate workflows.

## Timeline (assuming 2-week sprint)
- Days 1-2: backend task diff + events, patient link endpoints.
- Days 3-4: dashboard visual cues + clinician-task enhancements.
- Days 5-7: provider co-pilot detail drawer + template stubs.
- Days 8-9: patient microsite + API wiring.
- Days 10-11: testing, documentation, polish.

