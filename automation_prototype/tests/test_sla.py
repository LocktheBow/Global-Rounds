from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.sla import evaluate, SlaSpec, CreditRule, determine_volume_tier, SlaBreach
from backend.tasks import TaskStore


def _event(order_id: str, topic: str, timestamp: datetime, **payload):
    body = {"order_id": order_id}
    body.update(payload)
    return {
        "topic": topic,
        "timestamp": timestamp.isoformat(),
        "payload": body,
    }


def test_evaluate_all_metrics_pass():
    base = datetime(2024, 9, 1, tzinfo=timezone.utc)
    events = [
        _event("ORD-1", "order.created", base),
        _event("ORD-1", "order.first_pass", base + timedelta(hours=1), success=True),
        _event("ORD-1", "order.approved", base + timedelta(hours=2)),
        _event("ORD-1", "shipment.delivered", base + timedelta(hours=60)),
        _event("ORD-1", "audit.ready", base + timedelta(hours=61)),
        _event("ORD-1", "claim.paid", base + timedelta(days=2, hours=12)),
        _event("ORD-1", "status.live", base + timedelta(hours=80)),
    ]

    score = evaluate(events, evaluated_at=base + timedelta(hours=81))

    assert score.order_id == "ORD-1"
    assert score.breaches == []
    assert score.total_credits == 0.0
    assert determine_volume_tier(len(score.metrics), len(score.metrics)) == score.volume_tier
    assert all(metric.passed for metric in score.metrics)


def test_evaluate_detects_delivery_and_dso_breach():
    base = datetime(2024, 9, 1, tzinfo=timezone.utc)
    events = [
        _event("ORD-2", "order.created", base),
        _event("ORD-2", "order.approved", base + timedelta(hours=4)),
        _event("ORD-2", "shipment.delivered", base + timedelta(hours=120)),
        _event("ORD-2", "claim.paid", base + timedelta(days=60)),
        _event("ORD-2", "status.live", base + timedelta(days=60, hours=1)),
    ]

    score = evaluate(events, evaluated_at=base + timedelta(days=60, hours=2))

    breach_metrics = {breach.metric for breach in score.breaches}
    assert "delivery_time_hours" in breach_metrics
    assert "dso_days" in breach_metrics
    assert score.total_credits >= 0
    assert any(metric.metric == "delivery_time_hours" and not metric.passed for metric in score.metrics)


def test_evaluate_handles_missing_events():
    base = datetime(2024, 9, 1, tzinfo=timezone.utc)
    events = [
        _event("ORD-3", "order.created", base),
    ]

    score = evaluate(events, evaluated_at=base + timedelta(hours=5))

    assert any(breach.metric == "delivery_time_hours" for breach in score.breaches)
    assert any(metric.metric == "status_latency_hours" and not metric.passed for metric in score.metrics)


def test_custom_policy_respected():
    base = datetime(2024, 9, 1, tzinfo=timezone.utc)
    policy = [
        SlaSpec(
            name="Fast Delivery",
            metric="delivery_time_hours",
            threshold=24,
            window="order.created -> shipment.delivered",
            credit_rule=CreditRule(per_breach=50.0),
        ),
    ]
    events = [
        _event("ORD-4", "order.created", base),
        _event("ORD-4", "shipment.delivered", base + timedelta(hours=30)),
    ]

    score = evaluate(events, policy=policy, policy_version="test")

    assert score.breaches and score.breaches[0].credits == 50.0
    assert score.policy_version == "test"


def test_sla_breach_task_contains_enriched_fields(tmp_path):
    store = TaskStore(tmp_path)
    breach = SlaBreach(
        spec_name="First-Pass Approvals",
        metric="first_pass_ratio",
        order_id="ORD-5",
        observed=0.0,
        threshold=0.98,
        occurred_at=datetime.now(timezone.utc),
        credits=75.0,
        details="Manual review required",
    )

    task = store.ensure_sla_task(breach)
    assert task is not None
    assert task.get("sla_ref")
    assert task.get("breach_reason") == "Manual review required"
    assert task.get("first_pass_flag") is False
    assert task.get("metadata", {}).get("sla_order_id") == "ORD-5"
