import json
from pathlib import Path
import pytest
from backend.app.engine.ingestion import ingest_shipment, ingest_shipments, IngestionError
from backend.app.models.shipment import Shipment

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

def test_ingest_single_seed_shipment():
    with open(DATA_DIR / "seed_shipments.json", "r", encoding="utf-8") as f:
        data = json.load(f)
    s1 = ingest_shipment(data[0])
    assert isinstance(s1, Shipment)
    assert s1.shipment_id == "SHP-001"
    assert s1.shipment_class == "A"
    assert s1.class_a.product_subtype == "organic"

def test_ingest_all_seed_shipments():
    with open(DATA_DIR / "seed_shipments.json", "r", encoding="utf-8") as f:
        data = json.load(f)
    shipments = ingest_shipments(data)
    assert len(shipments) == 6
    assert all(isinstance(s, Shipment) for s in shipments)

def test_ingest_empty_batch_raises():
    with pytest.raises(IngestionError):
        ingest_shipments([])

def test_ingest_invalid_record_raises():
    with pytest.raises(IngestionError):
        ingest_shipment({"shipment_id": "INVALID"})
