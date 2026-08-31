import json
from pathlib import Path
import pytest
from pydantic import ValidationError
from backend.app.models.shipment import Shipment, ShipmentBase, ClassAAttributes, ClassBAttributes
from backend.app.models.legs import RoadLeg, RailLeg
from backend.app.models.risk_models import RiskScore
from backend.app.models.plan_models import CandidatePlan

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

def test_checkpoints_geocoded():
    with open(DATA_DIR / "checkpoints_geocoded.json", "r", encoding="utf-8") as f:
        checkpoints = json.load(f)
    assert len(checkpoints) == 20
    hubs = [k for k, v in checkpoints.items() if v.get("type") == "hub"]
    satellites = [k for k, v in checkpoints.items() if v.get("type") == "satellite"]
    assert len(hubs) == 5
    assert len(satellites) == 15
    for city, data in checkpoints.items():
        assert "lat" in data and -90 <= data["lat"] <= 90
        assert "lon" in data and -180 <= data["lon"] <= 180
        assert "nearest_hub" in data
        assert data["nearest_hub"] in hubs

def test_decay_constants():
    with open(DATA_DIR / "decay_constants.json", "r", encoding="utf-8") as f:
        constants = json.load(f)
    assert "medical" in constants
    assert "organic" in constants
    assert constants["medical"]["q10"] == 2.5
    assert constants["organic"]["q10"] == 2.2
    assert constants["medical"]["hard_breach_override"] is True
    assert constants["organic"]["hard_breach_override"] is False

def test_rail_station_graph():
    with open(DATA_DIR / "rail_station_graph.json", "r", encoding="utf-8") as f:
        graph = json.load(f)
    assert len(graph["hubs"]) == 5
    assert len(graph["trunk_edges"]) == 5
    # Verify Himkot <-> Meghdoot is NOT a direct trunk edge
    trunk_pairs = set(tuple(sorted(edge)) for edge in graph["trunk_edges"])
    assert tuple(sorted(["Himkot", "Meghdoot"])) not in trunk_pairs
    assert tuple(sorted(["Indranagar Junction", "Himkot"])) in trunk_pairs
    assert tuple(sorted(["Suryapatan", "Chandanpalli"])) in trunk_pairs

def test_rail_schedules():
    with open(DATA_DIR / "rail_schedules.json", "r", encoding="utf-8") as f:
        schedules = json.load(f)
    assert "corridors" in schedules
    assert len(schedules["corridors"]) >= 10  # bidirectional for 5 trunk edges
    for corridor in schedules["corridors"]:
        assert corridor["distance_km"] > 0
        assert corridor["transit_time_hr"] > 0
        assert 0 <= corridor["delay_probability"] <= 1

def test_dwell_time_matrix():
    with open(DATA_DIR / "dwell_time_matrix.json", "r", encoding="utf-8") as f:
        dwell = json.load(f)
    assert dwell["transfer_buffers"]["generic_cargo_hr"] == 2.0
    assert dwell["transfer_buffers"]["cold_chain_cargo_hr"] == 3.0

def test_seed_shipments_validation():
    with open(DATA_DIR / "seed_shipments.json", "r", encoding="utf-8") as f:
        shipments_raw = json.load(f)
    assert len(shipments_raw) == 6
    for item in shipments_raw:
        shipment = Shipment(**item)
        assert shipment.shipment_id.startswith("SHP-")
        if shipment.shipment_class == "A":
            assert shipment.class_a is not None
            assert shipment.class_b is None
            assert shipment.class_a.q10 > 0
        else:
            assert shipment.class_b is not None
            assert shipment.class_a is None
            # Assert v2 dimensionless penalty rate
            assert 0.0 <= shipment.class_b.delay_penalty_rate <= 1.0

def test_shipment_class_exclusivity_rejection():
    # Class A with class_b defined should fail
    with pytest.raises(ValidationError):
        Shipment(
            shipment_id="ERR-1",
            origin="Amrai",
            destination="Suryapatan",
            weight_kg=100,
            volume_m3=1,
            deadline="2026-09-02T18:00:00Z",
            cargo_value=50000,
            product_category="Invalid",
            shipment_class="A",
            class_a=ClassAAttributes(
                product_subtype="organic",
                temperature_min=4,
                temperature_max=12,
                q10=2.2,
                base_shelf_life_hr=72,
                hard_breach_override=False
            ),
            class_b=ClassBAttributes(delay_penalty_rate=0.05, sla_strict=True)
        )

    # Class B with delay_penalty_rate > 1.0 (v1 bug) should fail
    with pytest.raises(ValidationError):
        ClassBAttributes(delay_penalty_rate=150.0, sla_strict=True)
