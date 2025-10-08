from __future__ import annotations

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.partners import DEFAULT_ORDER_FEE, PartnerOrderStore


def test_partner_order_flow_generates_usage(tmp_path):
    store = PartnerOrderStore(tmp_path)
    order = store.create_order(
        partner_id="PARTNER-A",
        patient_id="PAT-100",
        supply_sku="SKU-10",
        quantity=2,
        metadata={"notes": "First order"},
    )

    assert order["status"] == "received"
    updated = store.update_order(
        order["order_id"],
        status="paid",
        compliance_passed=True,
        amount_paid=95.0,
    )
    assert updated["is_paid"] is True
    assert updated["compliance_passed"] is True

    month = updated["created_at"][:7]
    usage = store.usage_summary(partner_id="PARTNER-A", month=month)
    assert usage["compliant_paid_orders"] == 1
    assert usage["total_charges"] == DEFAULT_ORDER_FEE
    assert usage["orders"][0]["order_id"] == order["order_id"]
