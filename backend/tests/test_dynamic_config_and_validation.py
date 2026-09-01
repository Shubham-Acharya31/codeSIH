import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_get_system_config_endpoint():
    response = client.get("/api/v1/config")
    assert response.status_code == 200
    data = response.json()
    assert data["app_version"] == "2.0.0"
    assert "transport_config" in data
    assert "road" in data["transport_config"]
    assert "rail" in data["transport_config"]
    assert "optimization" in data["transport_config"]
    assert data["transport_config"]["road"]["truck_capacity_kg"] == 10000.0
    assert data["transport_config"]["rail"]["bogey_capacity_kg"] == 25000.0
    assert len(data["default_scenarios"]) == 3

def test_plan_with_combined_seed_and_custom_shipments():
    payload = {
        "shipment_ids": ["SHP-001"],
        "custom_shipments": [
            {
                "shipment_id": "SHP-DYN-01",
                "origin": "Amrai",
                "destination": "Suryapatan",
                "weight_kg": 4000.0,
                "volume_m3": 12.0,
                "deadline": "2026-09-03T12:00:00Z",
                "cargo_value": 350000.0,
                "product_category": "Apples",
                "shipment_class": "A",
                "class_a": {
                    "product_subtype": "organic",
                    "temperature_min": 4.0,
                    "temperature_max": 10.0,
                    "q10": 2.2,
                    "base_shelf_life_hr": 72.0,
                    "hard_breach_override": False
                }
            }
        ]
    }
    response = client.post("/api/v1/plan", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["total_shipments_processed"] == 2
    assert len(data["plans"]) == 3
    # Check that both shipment IDs appear in the generated plan details
    p = data["plans"][0]
    sids = [d["shipment_id"] for d in p["shipment_details"]]
    assert "SHP-001" in sids
    assert "SHP-DYN-01" in sids

def test_plan_with_dynamic_checkpoint():
    # Provide a new dynamic location not in base 20 cities
    payload = {
        "custom_checkpoints": {
            "Pune City": {
                "lat": 18.5204,
                "lon": 73.8567,
                "type": "satellite",
                "nearest_hub": "Indranagar Junction"
            }
        },
        "custom_shipments": [
            {
                "shipment_id": "SHP-DYN-PUNE",
                "origin": "Pune City",
                "destination": "Indranagar Junction",
                "weight_kg": 5000.0,
                "volume_m3": 15.0,
                "deadline": "2026-09-04T12:00:00Z",
                "cargo_value": 200000.0,
                "product_category": "Industrial Spares",
                "shipment_class": "B",
                "class_b": {
                    "delay_penalty_rate": 0.05,
                    "sla_strict": False
                }
            }
        ]
    }
    response = client.post("/api/v1/plan", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["total_shipments_processed"] == 1
    p = data["plans"][0]
    detail = p["shipment_details"][0]
    assert detail["shipment_id"] == "SHP-DYN-PUNE"
    assert detail["freight_cost"] > 0
    assert detail["transit_time_hr"] > 0

def test_plan_with_custom_scenarios():
    payload = {
        "shipment_ids": ["SHP-001"],
        "custom_scenarios": [
            {"label": "Extreme Safety", "alpha": 0.05, "beta": 0.95},
            {"label": "Direct Budget", "alpha": 0.95, "beta": 0.05}
        ]
    }
    response = client.post("/api/v1/plan", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert len(data["plans"]) == 2
    labels = [p["label"] for p in data["plans"]]
    assert "Extreme Safety" in labels
    assert "Direct Budget" in labels

def test_validation_rejects_inverted_temperature_band():
    # temperature_min (12.0) > temperature_max (4.0)
    payload = {
        "custom_shipments": [
            {
                "shipment_id": "BAD-TEMP",
                "origin": "Amrai",
                "destination": "Suryapatan",
                "weight_kg": 1000,
                "volume_m3": 5,
                "deadline": "2026-09-03T12:00:00Z",
                "cargo_value": 100000,
                "product_category": "Fruit",
                "shipment_class": "A",
                "class_a": {
                    "product_subtype": "organic",
                    "temperature_min": 12.0,
                    "temperature_max": 4.0,  # Inverted!
                    "q10": 2.2,
                    "base_shelf_life_hr": 72.0
                }
            }
        ]
    }
    response = client.post("/api/v1/plan", json=payload)
    assert response.status_code == 400
    data = response.json()
    assert "temperature_min" in data["detail"] or "temperature_max" in data["detail"]
    assert "validation_errors" in data

def test_validation_rejects_identical_origin_and_destination():
    payload = {
        "custom_shipments": [
            {
                "shipment_id": "BAD-ROUTE",
                "origin": "Himkot",
                "destination": "Himkot",  # Same city!
                "weight_kg": 1000,
                "volume_m3": 5,
                "deadline": "2026-09-03T12:00:00Z",
                "cargo_value": 100000,
                "product_category": "Cargo",
                "shipment_class": "B",
                "class_b": {
                    "delay_penalty_rate": 0.05,
                    "sla_strict": False
                }
            }
        ]
    }
    response = client.post("/api/v1/plan", json=payload)
    assert response.status_code == 400
    data = response.json()
    assert "cannot be identical" in data["detail"]
    assert "validation_errors" in data

def test_validation_rejects_negative_weight_and_volume():
    payload = {
        "custom_shipments": [
            {
                "shipment_id": "BAD-WEIGHT",
                "origin": "Amrai",
                "destination": "Suryapatan",
                "weight_kg": -500,  # Negative!
                "volume_m3": -10,  # Negative!
                "deadline": "2026-09-03T12:00:00Z",
                "cargo_value": 100000,
                "product_category": "Cargo",
                "shipment_class": "B",
                "class_b": {
                    "delay_penalty_rate": 0.05,
                    "sla_strict": False
                }
            }
        ]
    }
    response = client.post("/api/v1/plan", json=payload)
    assert response.status_code == 400
    data = response.json()
    assert "validation_errors" in data
