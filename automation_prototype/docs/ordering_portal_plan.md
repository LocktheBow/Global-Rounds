# Ordering Portal Blueprint

## 1. Patient/Clinician UI
- **Authentication & context** – secure clinician login with patient search or referral deep links; display coverage snapshots, compliance warnings, and current supply status before creating a new order.
- **Guided order creation** – mobile-first wizard with steps for patient confirmation, prescription details, supply catalog (organized by therapy type and coverage tier), quantities, delivery preference, and supporting documents upload.
- **Inline AI assist** – deterministic checks surface compliance holds, inventory flags, and payer rules in real time; highlight actions (e.g., request WOPD) before submission.
- **Review & submission** – final summary screen capturing all inputs, AI disposition (“clear”, “hold”, “needs review”), expected fulfillment path (warehouse vs dropship), and signature capture if required.

## 2. Workflow Orchestration
- **Order intake service** – stores new orders, triggers compliance and inventory checks, and pushes structured events into the automation pipeline.
- **Agent coordination** – successful submissions enqueue the ordering agent to recalc work orders, notify the payments agent for upcoming claims, and ping workforce scheduling to account for new fulfillment effort.
- **Approval gating** – orders flagged “hold” remain pending until resolved; staff resolve holds via dashboard controls that re-run the ordering agent to confirm clearance.
- **Downstream hooks** – when an order clears, spawn vendor PO (dropship) or warehouse pick task, then update engagement agent so patient messaging reflects the new shipment.

## 3. Auditability & Alerts
- **Lifecycle timeline** – each order keeps a history: created, AI disposition, manual review, fulfillment start, shipment, delivery confirmation.
- **Exception feeds** – dashboard “Agent Status” highlights portal-derived holds; alerts include required artifacts (e.g., missing prior auth) and direct links back to the portal record.
- **Compliance ledger** – attachments and decisions stored with timestamps/user IDs to satisfy payer/ accreditation audits.
- **Operational notifications** – optional emails/SMS/Teams pings when high-risk orders stall, ensuring nothing ages out unnoticed.

## 4. Patient Handoff & Mobile Experience
- **Order confirmation** – patient receives app/SMS/email summary with delivery expectations and outstanding actions (sign forms, schedule training).
- **Self-service tracking** – mobile-native web view lets patients update address, choose delivery windows, and confirm receipt; feeds status back into the engagement agent.
- **Resupply automation** – portal surfaces reorder recommendations and lets patients trigger them; ordering agent validates and routes dropship vs warehouse.
- **Support escalation** – embed chat/callback requests that create workforce tasks and nudge the engagement agent for follow-up messaging.

## Integration Notes
- Deterministic AI heuristics remain the authoritative source for compliance and fulfillment instructions; LLMs can layer on for messaging/summarization but stay optional.
- Shared data layer ensures the dashboard, portal, and agents read/write consistent order objects so live updates appear instantly across experiences.
- Atomise events (`order.created`, `order.approved`, `order.fulfillment.started`) so existing agents can subscribe or be triggered deterministically without polling.

## Data Model & Integration
- **Core entities**
  - `Order`: `id`, `patient_id`, `sku`, `quantity`, `priority`, `delivery_mode`, `requested_date`, `status`, `ai_disposition`, `approver_id`, `notes`, timestamps, `source` (portal, intake, auto-reorder).
  - `OrderEvent`: immutable log of status transitions with `actor` (AI/staff/system) and payload (documents, comments).
  - `Attachment`: metadata for uploaded prescriptions/WOPD forms stored in secure object storage; referenced by `order_id`.
  - `ComplianceSnapshot`: cached compliance attributes at submission (F2F, WOPD, prior auth, coverage tier) to avoid drift.
  - `FulfillmentTask`: downstream tasks (pick/pack, dropship PO, patient training) linked back to the originating order.

- **APIs**
  - `POST /api/portal/orders` – create order, run compliance/inventory heuristics, return disposition and any holds.
  - `GET /api/portal/orders?status=pending` – list orders for review queue used by dashboard and approval workflows.
  - `POST /api/portal/orders/{id}/approve` – staff action that clears holds, triggers ordering agent refresh, and emits `order.approved`.
  - `GET /api/orders/{id}/timeline` – feed audit timeline to both portal and dashboard detail view.
  - `POST /api/orders/{id}/events` – append notes, upload docs, or log delivery changes.

- **Agent touchpoints**
  - Ordering agent ingests open orders (portal + forecasted) and updates `patient_work_orders` plus `vendor_reorders`.
  - Payments agent consumes `order.approved` to pre-stage claim reconciliation checkpoints.
  - Workforce agent recalculates staffing when `fulfillment_tasks` change.
  - Engagement agent listens for `order.approved`, `order.shipped`, `order.delivered` to schedule messaging.

- **Live update mechanics**
  - Shared in-memory cache (FastAPI global) mirrors persisted orders; dashboard endpoints read from the same cache for instant updates.
  - Web client polls lightweight `/api/agents/status` (existing) and new `/api/portal/orders?status=pending` every ~30s; optional SSE/websocket upgrade later.
  - Dashboard ordering table merges agent results with portal orders flagged via `source`, so operators see pending holds alongside forecasted work.
