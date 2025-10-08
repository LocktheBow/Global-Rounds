# Global Rounds Rail Architecture

"Not-Two" means every stakeholder touches the same flow: one event ledger, one task queue, one SLA engine. This document explains how the prototype stitches providers, patients, payers, and DME partners together while we operate on synthetic data.

## High-Level Topology
```
        +----------------+        +----------------------+        +-------------------+
        | Synthetic Data |        | Automation Agents    |        | Event Ledger      |
        | (data/*.csv)   | -----> | (automation/*)       | -----> | backend/events.py |
        +----------------+        +----------------------+        +-------------------+
                  |                           |                           |
                  |                           v                           v
                  |                +---------------------+       +--------------------+
                  |                | Unified Task Queue  | <---> | SLA Engine         |
                  |                | backend/tasks.py    |       | backend/sla.py     |
                  |                +---------------------+       +--------------------+
                  |                           |                           |
                  v                           v                           v
        +-----------------+      +----------------------+       +----------------------+
        | Provider Portal |      | Patient Microsite    |       | External APIs        |
        | portal/*        |      | portal/patient/*     |       | (payers, DMEs, KPI)  |
        +-----------------+      +----------------------+       +----------------------+
```

Everything publishes to the ledger (`data/events.jsonl`). Webhooks, SSE streams, dashboards, and partner APIs subscribe to the same source of truth.

## Core Services
| Area | Module | Responsibilities |
| ---- | ------ | ---------------- |
| SLA Enforcement | `backend/sla.py`, `cli.py sla-evaluate` | Declarative specs, policy loader, breach detection, credit memos, `sla.updated` emission, task synchronization |
| Task Orchestration | `backend/tasks.py`, `backend/app.py` | Persisted queue with SLA references, breach reasons, cycle times, first-pass flags, and acknowledgement APIs |
| Event Ledger & Delivery | `backend/events.py`, `backend/webhooks.py` | Append-only log, replay/filters, SSE feed, webhook registry/outbox worker |
| Ordering & Inventory | `automation/ordering.py`, `automation/predictive_inventory.py` | Forecast demand, vendor reorders, scenario API consumed by ordering agent and dashboard |
| Compliance Radar | `backend/compliance.py`, `cli.py compliance-scan` | Scan 719A/F2F/prior-auth expirations, open tasks, emit radar telemetry |
| Provider Co-Pilot | `portal/`, `backend/provider.py`, `backend/app.py` | Role-based task inbox, WOPD/F2F templates, e-sign stubs, hold-clearance actions |
| Patient Deep-Link | `backend/patient_links.py`, `portal/patient/` | Expiring tokens, confirm/reschedule/help flows that post events and tasks |
| Payer Connectors | `backend/payers.py` | Eligibility/auth/remit adapters, `payer.updated` events, closes reconciliation tasks |
| Finance & Revenue | `automation/finance.py`, `backend/revenue_model.py` | ROI metrics, revenue model CLI, dashboard finance cards |
| Audit Vault | `backend/audit.py` | Immutable timeline + attachment hashing, export bundles for ACHC/JCAHO/payer audits |
| LLM Guardrails | `backend/llm.py` | Schema-validated narratives (appeals, status summaries) with deterministic fallbacks |

## Event Flow
1. **Agents run** (`cli.py run-all` or orchestrator) and push structured results (orders, tasks, KPIs).
2. **EventDispatcher** persists every change in `events.jsonl` and notifies subscribers.
3. **SLA Service** listens to order topics, re-evaluates the policy, publishes `sla.updated`, and syncs breach tasks.
4. **Unified Task Queue** persists new tasks or auto-closes them when resolutions post back.
5. **Provider Co-Pilot** and **Patient Microsite** actions write right back to orders/tasks → immediate ledger updates → downstream agents rerun.
6. **Webhooks/SSE** replay or stream to external systems (Brightree bridge, analytics dashboards, partner DMEs).
7. **Audit Vault** appends every event + attachment reference for compliance exports.

The result is a closed loop where humans and automations operate on one shared timeline.

## Data Contracts
- `data/portal_orders.json`, `data/tasks.json`, `data/events.jsonl` simulate production stores.
- CSV fixtures (`patient_usage.csv`, `inventory_levels.csv`, `payer_status.csv`, etc.) mirror Brightree/Kyron exports and can be swapped without code changes.
- Ledger events follow the `{topic, payload, timestamp}` shape so replay is deterministic.
- Audit vault entries store `{order_id, topic, attachments[], checksum}` to guarantee integrity.

## CLI & API Interop
- CLI commands (`run-all`, `compliance-scan`, `sla-evaluate`, `events-replay`, `revenue-model`) are wrappers around the same services exposed via FastAPI endpoints.
- FastAPI app (`backend/app.py`) composes agents, task store, SLA service, ledger, webhooks, provider/patient flows, predictive inventory, finance snapshot, payer connectors, and partner APIs.
- SSE (`/api/events/stream`) + webhooks keep dashboards and partners current without polling database tables.

## Extensibility Checklist
1. Swap synthetic data for production connectors (Brightree REST, Kyron SFTP, payer EDI).
2. Back `tasks.json` and `events.jsonl` with Postgres/Dynamo + Redis Streams for horizontal scale.
3. Promote predictive models (Prophet/LightGBM) and finance assumptions with real telemetry.
4. Connect provider/patient experiences to AuthN, messaging, and e-sign providers under HIPAA.
5. Harden webhooks with retries, signing secrets, and dead-letter queues.

This prototype already exercises the full flow—connecting a provider clearance or patient reschedule to SLA recalculation, compliance tasks, finance metrics, and partner notifications—all without leaving the single rail.
