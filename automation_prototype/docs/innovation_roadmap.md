# Innovation Roadmap – Global Rounds Automation

This document outlines the architectural blueprint and phased delivery plan for the "Next Frontier" enhancements. Each capability builds on the deterministic automation spine already in place.

## 1. Unified Task Queue
- **Goal**: Single source of truth for operational work (holds, denials, surges, intake tasks).
- **Core components**:
  - Task domain model (`Task`, `TaskEvent`, `Assignment`, `SLA`).
  - FastAPI task service with REST + webhook interfaces.
  - Background worker to auto-create tasks from agent outputs (ordering holds, payment denials, workforce surges).
  - UI inbox surfaces (dashboard panel + portal tab).
- **Milestones**:
  1. Schema definition + persistence (SQLite/Postgres) with migrations.
  2. Agent integration emitting tasks (`ordering`, `payments`, `workforce`).
  3. Dashboard widget (filter, claim/hold resolution actions).
  4. Portal exposure for clinicians (resolve compliance holds).
  5. SLA analytics – overdue badges, cycle-time metrics feeding Performance agent.

## 2. Event Streaming Layer
- **Goal**: Real-time, replayable event pipeline for internal/external consumers.
- **Approach**:
  - Adopt lightweight broker (Redis Streams for local dev; abstract interface for Kafka-ready deployment).
  - Define canonical events (`order.created`, `task.created`, `agent.completed`, `shipment.delivered`).
  - Publish from FastAPI endpoints/agents via event dispatcher.
  - Build consumer adapters: dashboard SSE endpoint, webhook dispatcher, analytics loader.
- **Milestones**:
  1. Event schema + dispatcher module.
  2. Core publishing hooks (portal orders, agent completions).
  3. SSE/WS gateway for front-end live updates.
  4. Webhook subscription management.
  5. Replay/archival strategy (daily snapshots to object storage).

## 3. Provider Co-Pilot
- **Goal**: Clinician workspace to accelerate compliance paperwork.
- **Features**:
  - Referral intake with OCR/structured data capture (future ML/LLM plug-in).
  - Intelligent forms: pre-fill WOPD/F2F forms using patient data + heuristics.
  - Document checklist + status tracker (pending signatures, fax confirmations).
  - E-signature integration (API abstraction to future DocuSign/Hellosign connector).
  - Task queue integration for missing documents.
- **Milestones**:
  1. Clinician auth + portal controls (role-based view).
  2. Template engine for form generation (PDF/HTML exports).
  3. Compliance radar hooks (see section 8) to auto-populate tasks.
  4. Optional ML layer for scanned docs.

## 4. Predictive Inventory Engine
- **Goal**: Forward-looking supply/dropship planning with what-if analysis.
- **Components**:
  - Demand forecast module (initially statistical: exponential smoothing / moving averages).
  - Vendor model capturing lead times, price breaks, regional warehouses.
  - Scenario API accepting levers (demand growth %, vendor SLA, regional allocation).
  - Dashboard visualization (heatmaps, reorder simulations).
- **Milestones**:
  1. Data ingestion upgrades (historical usage + vendor master data).
  2. Baseline forecast service consumed by ordering agent for reorder suggestions.
  3. Scenario endpoint + UI what-if controls.
  4. Optimization heuristics (e.g., linear programming for allocation) – future phase.

## 5. Patient App Deep Link
- **Goal**: Extend mobile web experience for order confirmation, delivery rescheduling, support triage.
- **Scope**:
  - QR/SMS deep-link after portal order approval.
  - Patient microsite with status timeline, action buttons (“Confirm Delivery”, “Need Supplies”, “Request Support”).
  - Support actions push into task queue & workforce agent.
  - Integration with engagement agent messaging schedule.
- **Milestones**:
  1. Tokenized deep-link generator + API to fetch patient order snapshot.
  2. Responsive web module under `portal/patient/` (or separate app).
  3. Support request workflow hooking task queue + workforce.
  4. Optional push notification / PWA enablement.

## 6. Financial Pulse Dashboard
- **Goal**: Exec-ready ROI view combining saved labor, revenue protection, cash metrics.
- **Data sources**:
  - Time savings metrics (augmented performance agent).
  - Claim outcomes from payments agent (underpayments resolved, write-offs averted).
  - Order-to-cash cycle times from task queue + event logs.
  - Portal vs legacy channel volume split.
- **Deliverables**:
  - New `finance` agent computing weekly summaries.
  - Dashboard panel with KPIs, trends, downloadable report.
  - Optional auto-email digest (PDF/HTML) via background job.

## 7. LLM Guardrails Layer
- **Goal**: Introduce curated LLM assistance for narrative outputs while keeping deterministic decisions authoritative.
- **Design principles**:
  - Use schema-enforced prompts (Pydantic validation on responses).
  - Only consume sanitized, de-identified data.
  - Allow deterministic fallbacks if the LLM response fails validation.
- **Initial use cases**:
  - Denial appeal summaries (payments agent).
  - Patient-friendly status explanations (engagement agent).
  - Provider documentation request drafts (co-pilot).
- **Implementation**:
  - Abstract `llm_client` with pluggable backends (Ollama, OpenAI, Azure OpenAI).
  - Guardrail middleware performing retries, toxicity filters.
  - Feature flags per use case to enable incremental rollout.

## 8. Compliance Radar
- **Goal**: Always-on monitor for upcoming expirations and documentation gaps.
- **Functionality**:
  - Scheduled job scanning compliance data + portal orders.
  - Generates tasks + patient/provider notifications before expirations.
  - Feeds Provider Co-Pilot with prioritized renewal queue.
  - Visual dashboard timeline (calendar / heatmap).
- **Milestones**:
  1. Compliance monitor service with cron-like scheduler.
  2. Task queue + engagement agent hooks.
  3. Dashboard calendar + severity filters.
  4. Analytics roll-up into Performance/Financial agents.

---

## Implementation Phasing
1. **Foundation (Weeks 1-2)**
   - Stand up task queue DB + API (Section 1).
   - Introduce event dispatcher abstraction (Section 2).
   - Wire current agent events + portal submissions to both.

2. **Workflow & Monitoring (Weeks 3-5)**
   - Finish dashboard/portal inbox views.
   - Launch Compliance Radar service feeding tasks + notifications.
   - Extend performance agent with advanced analytics (time savings, SLA breach counts).

3. **Provider & Patient Experiences (Weeks 6-8)**
   - Provider Co-Pilot MVP with form templates + task integration.
   - Patient deep-link microsite and support triage.
   - Early LLM guardrail integration for provider messaging (optional, feature-gated).

4. **Predictive & Financial Intelligence (Weeks 9-11)**
   - Deploy predictive inventory service + scenario APIs.
   - Build Financial Pulse agent + dashboard module.
   - Hook inventory forecasts into event stream & task queue for proactive replenishment.

5. **Scaling & Automation (Weeks 12+)**
   - Harden event streaming for multi-tenant / cloud deployment.
   - Add webhook subscriptions, data lake exports.
   - Layer additional LLM-assisted workflows (denial appeals, patient messaging).

---

## Dependencies & Tooling
- Upgrade to relational DB (Postgres) for transactions, full-text search (task comments), timezone-safe timestamps.
- Adopt async task queue/worker (RQ, Celery, or Dramatiq) to process event-derived work.
- Choose event broker (Redis Streams for dev, Kafka for scale) with abstraction module.
- Implement role-based access control (RBAC) in FastAPI for clinician vs operator vs patient contexts.
- Logging/observability: structured logging, request tracing, event correlation IDs.

---

## Immediate Next Steps
1. **Finalize schema & infrastructure choices** (DB, broker, worker).
2. **Add foundational modules**: `backend/tasks.py`, `backend/events.py`, migrations folder.
3. **Prototype task ingestion** from ordering agent portal holds to validate queue flow.
4. **Schedule alignment**: confirm sprint capacity and parallel workstreams.

