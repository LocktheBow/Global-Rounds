from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from automation.predictive_inventory import DEFAULT_LEAD_TIME_DAYS, run_inventory_scenario


def _write_csv(path: Path, rows: str) -> None:
    path.write_text(rows.strip() + "\n", encoding="utf-8")


def test_inventory_scenario_adjusts_forecast(tmp_path):
    data_dir = tmp_path
    _write_csv(
        data_dir / "patient_usage.csv",
        """
        patient_id,supply_sku,avg_daily_use,days_supply_remaining,last_fulfillment_date
        P1,SKU-1,2.0,5,2024-08-01
        P2,SKU-2,1.0,10,2024-08-05
        """,
    )
    _write_csv(
        data_dir / "inventory_levels.csv",
        """
        supply_sku,on_hand_units,reorder_point_units,lead_time_days,vendor
        SKU-1,50,40,10,VendorX
        SKU-2,20,30,12,VendorY
        """,
    )

    scenario = run_inventory_scenario(
        data_dir,
        datetime(2024, 9, 1, tzinfo=timezone.utc),
        growth_percent=25.0,
        lead_time_delta=5,
        skus=["SKU-1"],
    )

    assert scenario["lead_time_applied"] == DEFAULT_LEAD_TIME_DAYS + 5
    assert scenario["skus"] == ["SKU-1"]
    baseline_units = scenario["baseline"]["SKU-1"]["forecast_units"]
    scenario_units = scenario["scenario"]["SKU-1"]["forecast_units"]
    assert scenario_units > baseline_units
    delta = scenario["deltas"]["SKU-1"]["forecast_units"]
    assert round(delta, 2) == round(scenario_units - baseline_units, 2)
