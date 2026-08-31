import json
from pathlib import Path
import pytest
from unittest.mock import patch
import httpx
from backend.app.models.shipment import Shipment
from backend.app.engine.road_route import compute_road_leg, fetch_osrm_road_route
from backend.app.engine.rail_route import compute_rail_leg
from backend.app.engine.input_entry import prepare_shipment_candidates
from backend.app.core.exceptions import RoutingProviderUnavailableError

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

@pytest.fixture
def seed_shipments():
    with open(DATA_DIR / "seed_shipments.json", "r", encoding="utf-8") as f:
        return json.load(f)

def test_road_routing_seed_shipment(seed_shipments):
    # SHP-001: Amrai -> Suryapatan (Road only)
    s1_data = seed_shipments[0]
    shipment = Shipment(**s1_data)
    road_leg = compute_road_leg(shipment)
    
    assert road_leg.mode == "road"
    assert road_leg.origin == "Amrai"
    assert road_leg.destination == "Suryapatan"
    assert road_leg.distance_km > 0
    assert road_leg.transit_time_hr > 0
    assert road_leg.total_cost > 0
    assert 0 <= road_leg.delay_probability <= 1

def test_rail_routing_same_hub_returns_none(seed_shipments):
    # SHP-001: Amrai -> Suryapatan (both in Suryapatan region -> None)
    s1_data = seed_shipments[0]
    shipment = Shipment(**s1_data)
    rail_leg = compute_rail_leg(shipment)
    assert rail_leg is None

def test_rail_routing_non_trunk_pair_returns_none():
    # Himkot region (Kanakpur) to Meghdoot region (Shantivan) has NO direct trunk edge
    # (Himkot <-> Meghdoot is not in trunk_edges)
    dummy_shipment = Shipment(
        shipment_id="SHP-TEST-NOTRUNK",
        origin="Kanakpur",        # Nearest: Himkot
        destination="Shantivan",   # Nearest: Meghdoot
        weight_kg=5000,
        volume_m3=15,
        deadline="2026-09-04T12:00:00Z",
        cargo_value=500000,
        product_category="Test",
        shipment_class="B",
        class_b={"delay_penalty_rate": 0.05, "sla_strict": False}
    )
    rail_leg = compute_rail_leg(dummy_shipment)
    assert rail_leg is None

def test_rail_routing_multimodal_aggregation_corridor(seed_shipments):
    # SHP-002: Kanakpur -> Ambapuri
    # Kanakpur (Himkot) -> Ambapuri (Chandanpalli).
    # Wait, Himkot <-> Indranagar Junction trunk edge exists.
    # What about Himkot <-> Chandanpalli?
    # Let's check: SHP-006: Devgiri (Chandanpalli) -> Suryapatan (Suryapatan).
    # Suryapatan <-> Chandanpalli is a direct trunk line!
    s6_data = seed_shipments[5]
    shipment = Shipment(**s6_data)
    rail_leg = compute_rail_leg(shipment)
    
    assert rail_leg is not None
    assert rail_leg.mode == "rail"
    assert rail_leg.origin == "Devgiri"
    assert rail_leg.destination == "Suryapatan"
    assert len(rail_leg.segments) >= 2  # Feeder road (Devgiri -> Chandanpalli) + Rail (Chandanpalli -> Suryapatan)
    assert "Chandanpalli" in rail_leg.transfer_hubs
    assert rail_leg.dwell_time_hr >= 3.0  # Cold chain transfer buffer

def test_osrm_network_timeout_fallback_and_error():
    # Test that fallback generates realistic geometry when OSRM times out
    with patch("httpx.Client.get", side_effect=httpx.TimeoutException("Timeout")):
        dist, time_hr, geom = fetch_osrm_road_route("Amrai", "Suryapatan", allow_fallback=True)
        assert dist > 0
        assert time_hr > 0
        assert len(geom) >= 2

    # Test that error is raised when fallback is disabled
    with patch("httpx.Client.get", side_effect=httpx.TimeoutException("Timeout")):
        with pytest.raises(RoutingProviderUnavailableError):
            fetch_osrm_road_route("Amrai", "Suryapatan", max_retries=0, allow_fallback=False)
