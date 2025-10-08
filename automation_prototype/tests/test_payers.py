from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.events import EventDispatcher
from backend.payers import PayerConnector
from backend.tasks import TaskStore


def test_payer_connector_eligibility_deterministic(tmp_path):
    dispatcher = EventDispatcher(tmp_path)
    store = TaskStore(tmp_path)
    connector = PayerConnector(tmp_path, dispatcher=dispatcher, task_store=store)

    result = connector.eligibility_check(
        patient_id="PAT-1",
        payer_id="PAY-ALPHA",
        policy_number="POL1234",
        date_of_service=datetime(2024, 9, 1, tzinfo=timezone.utc),
    )

    assert result.coverage_status in {"active", "inactive", "needs_review"}
    assert result.checked_at.tzinfo is timezone.utc
    assert result.effective_date <= datetime(2024, 9, 1, tzinfo=timezone.utc)


def test_payer_connector_remit_closes_finance_tasks(tmp_path):
    dispatcher = EventDispatcher(tmp_path)
    store = TaskStore(tmp_path)
    connector = PayerConnector(tmp_path, dispatcher=dispatcher, task_store=store)

    task = store.create_task(
        title="Reconcile claim",
        task_type="finance_review",
        metadata={"claim_id": "CLM-1001"},
    )
    assert task["status"] == "open"

    remit = connector.ingest_remit(
        remit_id="RMT-1",
        claim_id="CLM-1001",
        payer_id="PAY-ALPHA",
        amount_billed=125.0,
        amount_paid=125.0,
        order_id="ORD-200",
    )

    assert task["id"] in remit.tasks_closed
    closed = store.get_task(task["id"])
    assert closed["status"] == "closed"
    assert remit.status == "paid"
