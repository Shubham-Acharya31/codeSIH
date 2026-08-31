import pytest
from unittest.mock import patch
import httpx
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_missing_shipment_id_returns_404():
    response = client.post("/api/v1/plan", json={"shipment_ids": ["SHP-NONEXISTENT-999"]})
    assert response.status_code == 404
    data = response.json()
    assert data["error"] == "ShipmentNotFoundError"
    assert "SHP-NONEXISTENT-999" in data["detail"]
    assert "correlation_id" in data

def test_invalid_payload_returns_400():
    # Invalid delay_penalty_rate > 1.0 (v1 bug condition)
    bad_payload = {
        "custom_shipments": [
            {
                "shipment_id": "BAD-1",
                "origin": "Amrai",
                "destination": "Suryapatan",
                "weight_kg": 500,
                "volume_m3": 2,
                "deadline": "2026-09-02T18:00:00Z",
                "cargo_value": 100000,
                "product_category": "General",
                "shipment_class": "B",
                "class_b": {
                    "delay_penalty_rate": 2.5,  # Invalid: must be <= 1.0
                    "sla_strict": True
                }
            }
        ]
    }
    response = client.post("/api/v1/plan", json=bad_payload)
    assert response.status_code == 400
    data = response.json()
    assert "detail" in data
    assert "correlation_id" in data

def test_routing_provider_failure_returns_502():
    # Simulate unrecoverable upstream timeout without fallback
    with patch("backend.app.engine.orchestrator.compute_road_leg", side_effect=httpx.TimeoutException("OSRM timeout")):
        with patch("backend.app.engine.road_route.fetch_osrm_road_route", side_effect=httpx.TimeoutException("OSRM timeout")):
            response = client.post("/api/v1/plan", json={"shipment_ids": ["SHP-001"]})
            # Should gracefully handle error and return structured error response
            assert response.status_code in (500, 502)
            data = response.json()
            assert "error" in data
            assert "correlation_id" in data
