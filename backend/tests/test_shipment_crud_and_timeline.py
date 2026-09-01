import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.repository.shipment_repository import shipment_repository

client = TestClient(app)

@pytest.fixture(autouse=True)
def reset_db():
    """Ensure clean state before each test."""
    shipment_repository.reset_to_seed()
    yield
    shipment_repository.reset_to_seed()

def test_list_consignments():
    response = client.get("/api/v1/shipments")
    assert response.status_code == 200
    shipments = response.json()
    assert len(shipments) >= 6
    ids = [s["shipment_id"] for s in shipments]
    assert "SHP-001" in ids
    assert "status" in shipments[0]

def test_create_consignment_class_a():
    payload = {
        "shipment_id": "TEST-A-01",
        "origin": "Amrai",
        "destination": "Suryapatan",
        "weight_kg": 3500.0,
        "volume_m3": 12.0,
        "deadline": "2026-09-10T15:00:00Z",
        "cargo_value": 750000.0,
        "product_category": "Fresh Organic Apples",
        "shipment_class": "A",
        "class_a": {
            "product_subtype": "organic",
            "temperature_min": 3.0,
            "temperature_max": 9.0,
            "q10": 2.2,
            "base_shelf_life_hr": 80.0,
            "hard_breach_override": False
        },
        "class_b": None
    }
    response = client.post("/api/v1/shipments", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["shipment_id"] == "TEST-A-01"
    assert data["status"] == "PENDING"

    # Verify persistence: get it back
    get_res = client.get("/api/v1/shipments/TEST-A-01")
    assert get_res.status_code == 200
    assert get_res.json()["cargo_value"] == 750000.0

def test_update_consignment():
    # Update SHP-001
    payload = {
        "shipment_id": "SHP-001",
        "origin": "Amrai",
        "destination": "Suryapatan",
        "weight_kg": 5000.0,
        "volume_m3": 15.0,
        "deadline": "2026-09-02T18:00:00Z",
        "cargo_value": 520000.0,
        "product_category": "Fresh Agri - Premium Grapes",
        "shipment_class": "A",
        "class_a": {
            "product_subtype": "organic",
            "temperature_min": 4.0,
            "temperature_max": 12.0,
            "q10": 2.2,
            "base_shelf_life_hr": 72.0,
            "hard_breach_override": False
        },
        "class_b": None
    }
    response = client.put("/api/v1/shipments/SHP-001", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["weight_kg"] == 5000.0
    assert data["product_category"] == "Fresh Agri - Premium Grapes"

def test_delete_consignment():
    response = client.delete("/api/v1/shipments/SHP-002")
    assert response.status_code == 200
    assert response.json()["success"] is True

    # Verify 404 on subsequent get
    get_res = client.get("/api/v1/shipments/SHP-002")
    assert get_res.status_code == 404

def test_tracking_timeline_and_dispatch():
    # 1. Fetch initial timeline for SHP-001
    res = client.get("/api/v1/shipments/SHP-001/timeline")
    assert res.status_code == 200
    timeline = res.json()
    assert len(timeline) >= 1
    assert timeline[0]["event_type"] == "BOOKED"

    # 2. Dispatch SHP-001
    dispatch_res = client.post("/api/v1/shipments/SHP-001/dispatch")
    assert dispatch_res.status_code == 200
    new_timeline = dispatch_res.json()
    assert len(new_timeline) > 1

    # Verify status is now IN_TRANSIT
    shipment_res = client.get("/api/v1/shipments/SHP-001")
    assert shipment_res.json()["status"] == "IN_TRANSIT"

    # 3. Advance timeline
    advance_res = client.post("/api/v1/shipments/SHP-001/timeline/advance")
    assert advance_res.status_code == 200
    assert advance_res.json()["success"] is True

    # 4. Simulate temperature spike
    spike_res = client.post("/api/v1/shipments/SHP-001/timeline/simulate-spike", json={"temp_c": 16.5})
    assert spike_res.status_code == 200
    assert spike_res.json()["status"] == "EXCURSION"
    
    # Verify shipment is marked EXCURSION
    chk_res = client.get("/api/v1/shipments/SHP-001")
    assert chk_res.json()["status"] == "EXCURSION"

def test_dispatch_plan_endpoint():
    payload = {
        "scenario_label": "Balanced",
        "shipment_ids": ["SHP-003", "SHP-004"],
        "plan_details": [
            {
                "shipment_id": "SHP-003",
                "selected_mode": "rail",
                "transfer_hubs": ["Himkot", "Meghdoot"]
            },
            {
                "shipment_id": "SHP-004",
                "selected_mode": "road",
                "transfer_hubs": []
            }
        ]
    }
    response = client.post("/api/v1/shipments/dispatch-plan", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["dispatched_count"] == 2

    # Check both shipments are IN_TRANSIT
    s3 = client.get("/api/v1/shipments/SHP-003").json()
    s4 = client.get("/api/v1/shipments/SHP-004").json()
    assert s3["status"] == "IN_TRANSIT"
    assert s4["status"] == "IN_TRANSIT"
    assert s3["assigned_plan_scenario"] == "Balanced"


def test_create_consignment_class_b():
    payload = {
        "shipment_id": "TEST-B-01",
        "origin": "Kanakpur",
        "destination": "Ambapuri",
        "weight_kg": 4200.0,
        "volume_m3": 14.0,
        "deadline": "2026-09-12T12:00:00Z",
        "cargo_value": 900000.0,
        "product_category": "Industrial Machine Spares",
        "shipment_class": "B",
        "class_a": None,
        "class_b": {
            "delay_penalty_rate": 0.08,
            "sla_strict": True
        }
    }
    response = client.post("/api/v1/shipments", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["shipment_id"] == "TEST-B-01"
    assert data["shipment_class"] == "B"
    assert data["class_b"]["delay_penalty_rate"] == 0.08
    assert data["class_b"]["sla_strict"] is True

    # Check retrieval
    get_res = client.get("/api/v1/shipments/TEST-B-01")
    assert get_res.status_code == 200
    rec = get_res.json()
    assert rec["product_category"] == "Industrial Machine Spares"
    assert rec["class_b"]["sla_strict"] is True


def test_duplicate_consignment_rejected():
    payload = {
        "shipment_id": "SHP-001",
        "origin": "Amrai",
        "destination": "Suryapatan",
        "weight_kg": 1000.0,
        "volume_m3": 5.0,
        "deadline": "2026-09-10T12:00:00Z",
        "cargo_value": 100000.0,
        "product_category": "Duplicate Cargo",
        "shipment_class": "A",
        "class_a": {
            "product_subtype": "organic",
            "temperature_min": 4.0,
            "temperature_max": 12.0,
            "q10": 2.2,
            "base_shelf_life_hr": 72.0,
            "hard_breach_override": False
        },
        "class_b": None
    }
    response = client.post("/api/v1/shipments", json=payload)
    assert response.status_code == 400
    assert "already exists" in response.json()["detail"]


def test_crud_and_timeline_error_responses():
    # 404 for non-existent shipment GET
    assert client.get("/api/v1/shipments/NON-EXISTENT").status_code == 404
    # 404 for non-existent shipment timeline GET
    assert client.get("/api/v1/shipments/NON-EXISTENT/timeline").status_code == 404
    # 404 for non-existent shipment DELETE
    assert client.delete("/api/v1/shipments/NON-EXISTENT").status_code == 404
    # 404 for non-existent shipment dispatch
    assert client.post("/api/v1/shipments/NON-EXISTENT/dispatch").status_code == 404
    # 404 for non-existent shipment advance
    assert client.post("/api/v1/shipments/NON-EXISTENT/timeline/advance").status_code == 404
    # 404 for non-existent shipment simulate-spike
    assert client.post("/api/v1/shipments/NON-EXISTENT/timeline/simulate-spike", json={"temp_c": 20.0}).status_code == 404


def test_full_journey_to_delivered_and_excursion_preservation():
    # Dispatch SHP-001 (Road route: Dispatched -> Highway Transit -> Delivered)
    res = client.post("/api/v1/shipments/SHP-001/dispatch")
    assert res.status_code == 200

    # Simulate spike -> status becomes EXCURSION
    spike_res = client.post("/api/v1/shipments/SHP-001/timeline/simulate-spike", json={"temp_c": 18.0})
    assert spike_res.status_code == 200
    assert spike_res.json()["status"] == "EXCURSION"

    # Advance checkpoint -> EXCURSION status must be preserved, not overwritten to IN_TRANSIT
    adv1 = client.post("/api/v1/shipments/SHP-001/timeline/advance")
    assert adv1.status_code == 200
    assert adv1.json()["status"] == "EXCURSION"

    # Advance final step to delivery -> status becomes DELIVERED
    adv2 = client.post("/api/v1/shipments/SHP-001/timeline/advance")
    assert adv2.status_code == 200
    assert adv2.json()["status"] == "DELIVERED"

    final_shp = client.get("/api/v1/shipments/SHP-001").json()
    assert final_shp["status"] == "DELIVERED"

