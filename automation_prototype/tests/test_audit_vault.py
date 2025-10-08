from __future__ import annotations

import base64
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.audit import AuditVault


def test_audit_vault_records_attachment(tmp_path):
    vault = AuditVault(tmp_path)
    payload = b"Sample attachment body"
    record = vault.add_attachment(
        "ORD-ABC",
        name="wopd.pdf",
        content=payload,
        content_type="application/pdf",
        metadata={"description": "Signed WOPD"},
    )

    assert record["checksum"]
    assert record["size_bytes"] == len(payload)

    timeline = vault.timeline("ORD-ABC")
    assert timeline.attachments
    stored = timeline.attachments[0]
    assert stored["name"] == "wopd.pdf"
    assert base64.b64decode(stored["content_b64"]) == payload
