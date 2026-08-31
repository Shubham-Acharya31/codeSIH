import json
from pathlib import Path
import pytest
from backend.app.engine.ingestion import ingest_shipment
from backend.app.engine.classification import classify_and_enrich_shipment

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

def test_classify_medical_class_a():
    with open(DATA_DIR / "seed_shipments.json", "r", encoding="utf-8") as f:
        data = json.load(f)
    # SHP-003 is Vaccines (medical)
    vaccine_raw = next(s for s in data if s["shipment_id"] == "SHP-003")
    shipment = ingest_shipment(vaccine_raw)
    enriched = classify_and_enrich_shipment(shipment)
    
    assert enriched.class_a.q10 == 2.5
    assert enriched.class_a.temperature_min == 2.0
    assert enriched.class_a.temperature_max == 8.0
    assert enriched.class_a.hard_breach_override is True

def test_classify_organic_class_a():
    with open(DATA_DIR / "seed_shipments.json", "r", encoding="utf-8") as f:
        data = json.load(f)
    # SHP-001 is Grapes (organic)
    grapes_raw = next(s for s in data if s["shipment_id"] == "SHP-001")
    shipment = ingest_shipment(grapes_raw)
    enriched = classify_and_enrich_shipment(shipment)
    
    assert enriched.class_a.q10 == 2.2
    assert enriched.class_a.temperature_min == 4.0
    assert enriched.class_a.temperature_max == 12.0
    assert enriched.class_a.hard_breach_override is False

def test_classify_class_b_dimensionless():
    with open(DATA_DIR / "seed_shipments.json", "r", encoding="utf-8") as f:
        data = json.load(f)
    # SHP-002 is Onions (Class B)
    onions_raw = next(s for s in data if s["shipment_id"] == "SHP-002")
    shipment = ingest_shipment(onions_raw)
    enriched = classify_and_enrich_shipment(shipment)
    
    assert enriched.class_b.delay_penalty_rate == 0.06
    assert 0.0 <= enriched.class_b.delay_penalty_rate <= 1.0
