import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["version"] == "2.0.0"

def test_checkpoints_endpoint():
    response = client.get("/api/v1/checkpoints")
    assert response.status_code == 200
    data = response.json()
    assert len(data["checkpoints"]) == 20
    assert len(data["hubs"]) == 5
    assert len(data["satellites"]) == 15

def test_seed_demo_endpoint():
    response = client.get("/api/v1/seed-demo")
    assert response.status_code == 200
    shipments = response.json()
    assert len(shipments) == 6
    ids = [s["shipment_id"] for s in shipments]
    assert "SHP-001" in ids
    assert "SHP-003" in ids

def test_post_plan_e2e():
    payload = {
        "shipment_ids": ["SHP-001", "SHP-002", "SHP-003", "SHP-004", "SHP-005", "SHP-006"]
    }
    response = client.post("/api/v1/plan", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["total_shipments_processed"] == 6
    assert len(data["plans"]) == 3
    
    plan_labels = [p["label"] for p in data["plans"]]
    assert "Cheapest" in plan_labels
    assert "Fastest / Lowest-Risk" in plan_labels
    assert "Balanced" in plan_labels
    
    # Assert correlation ID is returned in headers
    assert "x-correlation-id" in response.headers
