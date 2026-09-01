import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.repository.shipment_repository import shipment_repository

client = TestClient(app)

@pytest.fixture(autouse=True)
def reset_db():
    """Reset repository before and after each test for pristine isolation."""
    shipment_repository.reset_to_seed()
    yield
    shipment_repository.reset_to_seed()


# ============================================================================
# 1. Health, System Configuration & Network Infrastructure
# ============================================================================

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["version"] == "2.0.0"
    assert "app_env" in data


def test_system_config():
    response = client.get("/api/v1/config")
    assert response.status_code == 200
    data = response.json()
    assert data["app_version"] == "2.0.0"
    assert "transport_config" in data
    assert "road" in data["transport_config"]
    assert "rail" in data["transport_config"]
    assert "optimization" in data["transport_config"]
    assert data["supported_classes"] == ["A", "B"]
    assert "medical" in data["supported_subtypes"]
    assert "organic" in data["supported_subtypes"]
    assert len(data["default_scenarios"]) == 3


def test_network_checkpoints():
    response = client.get("/api/v1/checkpoints")
    assert response.status_code == 200
    data = response.json()
    assert len(data["hubs"]) == 5
    assert len(data["satellites"]) == 15
    assert len(data["checkpoints"]) == 20
    # Verify core hub coordinates
    indranagar = data["checkpoints"]["Indranagar Junction"]
    assert indranagar["type"] == "hub"
    assert indranagar["lat"] == 21.15
    assert indranagar["lon"] == 79.08


def test_seed_demo_shipments():
    response = client.get("/api/v1/seed-demo")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 6
    ids = [s["shipment_id"] for s in data]
    assert ids == ["SHP-001", "SHP-002", "SHP-003", "SHP-004", "SHP-005", "SHP-006"]


# ============================================================================
# 2. Consignment CRUD & Persistent SQLite Operations
# ============================================================================

def test_list_shipments_with_and_without_filters():
    # Unfiltered
    res_all = client.get("/api/v1/shipments")
    assert res_all.status_code == 200
    all_shipments = res_all.json()
    assert len(all_shipments) == 6

    # Filter by PENDING status
    res_pending = client.get("/api/v1/shipments?status=PENDING")
    assert res_pending.status_code == 200
    assert len(res_pending.json()) == 6

    # Filter by non-matching status
    res_empty = client.get("/api/v1/shipments?status=DELIVERED")
    assert res_empty.status_code == 200
    assert len(res_empty.json()) == 0


def test_create_and_retrieve_custom_class_a():
    payload = {
        "shipment_id": "CUST-A-01",
        "origin": "Amrai",
        "destination": "Chandanpalli",
        "weight_kg": 3200.0,
        "volume_m3": 11.5,
        "deadline": "2026-09-08T18:00:00Z",
        "cargo_value": 850000.0,
        "product_category": "Fresh Strawberries",
        "shipment_class": "A",
        "class_a": {
            "product_subtype": "organic",
            "temperature_min": 1.0,
            "temperature_max": 4.0,
            "q10": 2.3,
            "base_shelf_life_hr": 60.0,
            "hard_breach_override": False
        },
        "class_b": None
    }
    create_res = client.post("/api/v1/shipments", json=payload)
    assert create_res.status_code == 201
    created = create_res.json()
    assert created["shipment_id"] == "CUST-A-01"
    assert created["status"] == "PENDING"
    assert created["class_a"]["temperature_min"] == 1.0

    # Retrieve by ID
    get_res = client.get("/api/v1/shipments/CUST-A-01")
    assert get_res.status_code == 200
    assert get_res.json()["cargo_value"] == 850000.0


def test_create_and_retrieve_custom_class_b():
    payload = {
        "shipment_id": "CUST-B-01",
        "origin": "Kanakpur",
        "destination": "Meghdoot",
        "weight_kg": 6000.0,
        "volume_m3": 20.0,
        "deadline": "2026-09-07T12:00:00Z",
        "cargo_value": 1500000.0,
        "product_category": "Precision CNC Tooling",
        "shipment_class": "B",
        "class_a": None,
        "class_b": {
            "delay_penalty_rate": 0.06,
            "sla_strict": True
        }
    }
    create_res = client.post("/api/v1/shipments", json=payload)
    assert create_res.status_code == 201
    created = create_res.json()
    assert created["shipment_id"] == "CUST-B-01"
    assert created["class_b"]["delay_penalty_rate"] == 0.06
    assert created["class_b"]["sla_strict"] is True


def test_update_consignment_parameters():
    update_payload = {
        "shipment_id": "SHP-001",
        "origin": "Amrai",
        "destination": "Suryapatan",
        "weight_kg": 4800.0,
        "volume_m3": 14.0,
        "deadline": "2026-09-05T12:00:00Z",
        "cargo_value": 550000.0,
        "product_category": "Fresh Agri - Export Quality Grapes",
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
    put_res = client.put("/api/v1/shipments/SHP-001", json=update_payload)
    assert put_res.status_code == 200
    updated = put_res.json()
    assert updated["weight_kg"] == 4800.0
    assert updated["cargo_value"] == 550000.0
    assert updated["product_category"] == "Fresh Agri - Export Quality Grapes"


def test_delete_consignment_lifecycle():
    del_res = client.delete("/api/v1/shipments/SHP-005")
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True

    # Verify not found afterwards
    get_res = client.get("/api/v1/shipments/SHP-005")
    assert get_res.status_code == 404

    # Verify count decremented
    list_res = client.get("/api/v1/shipments")
    assert len(list_res.json()) == 5


def test_reset_consignments_to_seed():
    # Delete a shipment
    client.delete("/api/v1/shipments/SHP-001")
    assert len(client.get("/api/v1/shipments").json()) == 5

    # Reset
    reset_res = client.post("/api/v1/shipments/reset")
    assert reset_res.status_code == 200
    shipments = reset_res.json()
    assert len(shipments) == 6
    assert any(s["shipment_id"] == "SHP-001" for s in shipments)


# ============================================================================
# 3. Validation & Structured Error Responses
# ============================================================================

def test_validation_rejects_inverted_temp_band():
    payload = {
        "shipment_id": "BAD-TEMP",
        "origin": "Amrai",
        "destination": "Suryapatan",
        "weight_kg": 1000.0,
        "volume_m3": 5.0,
        "deadline": "2026-09-10T12:00:00Z",
        "cargo_value": 100000.0,
        "product_category": "Faulty Cold Chain",
        "shipment_class": "A",
        "class_a": {
            "product_subtype": "organic",
            "temperature_min": 15.0,  # min > max
            "temperature_max": 5.0,
            "q10": 2.0,
            "base_shelf_life_hr": 48.0,
            "hard_breach_override": False
        },
        "class_b": None
    }
    res = client.post("/api/v1/shipments", json=payload)
    assert res.status_code == 400
    assert "temperature_min" in res.json()["detail"]


def test_validation_rejects_identical_origin_dest():
    payload = {
        "shipment_id": "SAME-CITY",
        "origin": "Himkot",
        "destination": "Himkot",
        "weight_kg": 1000.0,
        "volume_m3": 5.0,
        "deadline": "2026-09-10T12:00:00Z",
        "cargo_value": 100000.0,
        "product_category": "Local Move",
        "shipment_class": "B",
        "class_a": None,
        "class_b": {
            "delay_penalty_rate": 0.05,
            "sla_strict": False
        }
    }
    res = client.post("/api/v1/shipments", json=payload)
    assert res.status_code == 400
    assert "identical" in res.json()["detail"].lower()


def test_validation_rejects_delay_penalty_rate_greater_than_one():
    payload = {
        "shipment_id": "BAD-PENALTY",
        "origin": "Amrai",
        "destination": "Suryapatan",
        "weight_kg": 1000.0,
        "volume_m3": 5.0,
        "deadline": "2026-09-10T12:00:00Z",
        "cargo_value": 100000.0,
        "product_category": "General",
        "shipment_class": "B",
        "class_a": None,
        "class_b": {
            "delay_penalty_rate": 1.5,  # must be <= 1.0
            "sla_strict": False
        }
    }
    res = client.post("/api/v1/shipments", json=payload)
    assert res.status_code == 400


def test_error_404_on_nonexistent_resources():
    fake_id = "SHP-NON-EXISTENT-XYZ"
    assert client.get(f"/api/v1/shipments/{fake_id}").status_code == 404
    assert client.get(f"/api/v1/shipments/{fake_id}/timeline").status_code == 404
    assert client.delete(f"/api/v1/shipments/{fake_id}").status_code == 404
    assert client.post(f"/api/v1/shipments/{fake_id}/dispatch").status_code == 404
    assert client.post(f"/api/v1/shipments/{fake_id}/timeline/advance").status_code == 404
    assert client.post(f"/api/v1/shipments/{fake_id}/timeline/simulate-spike", json={"temp_c": 15.0}).status_code == 404


# ============================================================================
# 4. Optimization Engine & Pareto Scenarios
# ============================================================================

def test_optimization_plan_generation_with_all_seed():
    payload = {
        "shipment_ids": ["SHP-001", "SHP-002", "SHP-003", "SHP-004", "SHP-005", "SHP-006"]
    }
    res = client.post("/api/v1/plan", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["total_shipments_processed"] == 6
    assert len(data["plans"]) == 3

    labels = [p["label"] for p in data["plans"]]
    assert "Cheapest" in labels
    assert "Fastest / Lowest-Risk" in labels
    assert "Balanced" in labels

    for p in data["plans"]:
        # Verify alpha + beta == 1.0
        assert round(p["alpha"] + p["beta"], 2) == 1.0
        # Verify Total Cost = Freight Cost + Expected Loss
        assert round(p["total_cost"], 2) == round(p["freight_cost"] + p["expected_loss"], 2)
        assert len(p["shipment_details"]) == 6
        assert p["eta_hr"] > 0
        assert len(p["groupings"]) > 0


def test_optimization_plan_temperature_excursion():
    # Simulate high ambient temperature: 14.0°C
    payload = {
        "shipment_ids": ["SHP-001", "SHP-003"],  # Organic grapes & Medical vaccines
        "simulated_temp_c": 14.0
    }
    res = client.post("/api/v1/plan", json=payload)
    assert res.status_code == 200
    data = res.json()

    for p in data["plans"]:
        # Find SHP-003 (Vaccines, safe band 2-8°C, hard breach override)
        vax_detail = next(d for d in p["shipment_details"] if d["shipment_id"] == "SHP-003")
        assert vax_detail["risk_score"] == 1.0
        assert vax_detail["expected_loss"] == 2500000.0
        assert "Hard Breach Override" in vax_detail["breakdown"]


def test_optimization_plan_with_dynamic_custom_checkpoints():
    payload = {
        "custom_shipments": [
            {
                "shipment_id": "CUSTOM-PUNE-01",
                "origin": "Pune Terminal",
                "destination": "Indranagar Junction",
                "weight_kg": 3000.0,
                "volume_m3": 10.0,
                "deadline": "2026-09-08T18:00:00Z",
                "cargo_value": 700000.0,
                "product_category": "Agri Produce",
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
        ],
        "custom_checkpoints": {
            "Pune Terminal": {
                "lat": 18.5204,
                "lon": 73.8567,
                "type": "satellite",
                "nearest_hub": "Indranagar Junction",
                "region": "West"
            }
        }
    }
    res = client.post("/api/v1/plan", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert len(data["plans"]) == 3


def test_optimization_plan_with_custom_scenarios():
    payload = {
        "shipment_ids": ["SHP-001"],
        "custom_scenarios": [
            {"label": "Extreme Cost Priority", "alpha": 0.98, "beta": 0.02},
            {"label": "Pure Risk Minimization", "alpha": 0.05, "beta": 0.95}
        ]
    }
    res = client.post("/api/v1/plan", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert len(data["plans"]) == 2
    assert data["plans"][0]["label"] == "Extreme Cost Priority"
    assert data["plans"][1]["label"] == "Pure Risk Minimization"


# ============================================================================
# 5. Timeline Tracking, Dispatch, Checkpoint Advance & Sensor Spikes
# ============================================================================

def test_full_timeline_lifecycle_road_shipment():
    # 1. Initial timeline before dispatch
    t_init = client.get("/api/v1/shipments/SHP-001/timeline").json()
    assert len(t_init) == 1
    assert t_init[0]["event_type"] == "BOOKED"
    assert t_init[0]["status"] == "COMPLETED"

    # 2. Dispatch
    d_res = client.post("/api/v1/shipments/SHP-001/dispatch")
    assert d_res.status_code == 200
    timeline = d_res.json()
    assert len(timeline) >= 3
    assert client.get("/api/v1/shipments/SHP-001").json()["status"] == "IN_TRANSIT"

    # 3. Advance to Highway Transit Checkpoint
    adv1 = client.post("/api/v1/shipments/SHP-001/timeline/advance")
    assert adv1.status_code == 200
    assert adv1.json()["status"] == "IN_TRANSIT"

    # 4. Simulate Sensor Excursion Spike
    spike_res = client.post("/api/v1/shipments/SHP-001/timeline/simulate-spike", json={"temp_c": 17.5})
    assert spike_res.status_code == 200
    assert spike_res.json()["status"] == "EXCURSION"
    assert client.get("/api/v1/shipments/SHP-001").json()["status"] == "EXCURSION"

    # 5. Advance to final delivery handover
    adv2 = client.post("/api/v1/shipments/SHP-001/timeline/advance")
    assert adv2.status_code == 200
    assert adv2.json()["status"] == "DELIVERED"
    assert client.get("/api/v1/shipments/SHP-001").json()["status"] == "DELIVERED"


def test_multimodal_rail_dispatch_and_plan_dispatch():
    # Dispatch plan with rail and road shipments
    plan_payload = {
        "scenario_label": "Cheapest",
        "shipment_ids": ["SHP-006", "SHP-002"],
        "plan_details": [
            {
                "shipment_id": "SHP-006",
                "selected_mode": "rail",
                "transfer_hubs": ["Indranagar Junction", "Suryapatan"]
            },
            {
                "shipment_id": "SHP-002",
                "selected_mode": "road",
                "transfer_hubs": []
            }
        ]
    }
    res = client.post("/api/v1/shipments/dispatch-plan", json=plan_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["dispatched_count"] == 2

    # Verify SHP-006 has rail milestones
    t6 = client.get("/api/v1/shipments/SHP-006/timeline").json()
    event_types = [e["event_type"] for e in t6]
    assert "FIRST_MILE_ROAD" in event_types
    assert "HUB_CROSSDOCK" in event_types
    assert "RAIL_TRANSIT" in event_types
    assert "DESTINATION_HUB" in event_types
    assert "LAST_MILE_DELIVERY" in event_types
    assert "DELIVERED" in event_types

    rec6 = client.get("/api/v1/shipments/SHP-006").json()
    assert rec6["status"] == "IN_TRANSIT"
    assert "RAIL via Indranagar Junction, Suryapatan" in rec6["route_summary"]
    assert rec6["assigned_plan_scenario"] == "Cheapest"
