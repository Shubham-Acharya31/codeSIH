import json
from pathlib import Path
import pytest
from backend.app.models.shipment import Shipment
from backend.app.engine.road_route import compute_road_leg
from backend.app.engine.risk import calculate_risk

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

@pytest.fixture
def seed_shipments():
    with open(DATA_DIR / "seed_shipments.json", "r", encoding="utf-8") as f:
        return json.load(f)

def test_medical_vaccines_normal_vs_hard_breach(seed_shipments):
    # SHP-003: Vaccines (Medical, 2-8°C, Q10=2.5, shelf_life=48h)
    s3_data = seed_shipments[2]
    shipment = Shipment(**s3_data)
    road_leg = compute_road_leg(shipment)
    
    # 1. Normal operating temp (5°C, inside [2, 8]°C)
    normal_risk = calculate_risk(shipment, road_leg, simulated_temp_c=5.0)
    assert 0.0 <= normal_risk.risk_score < 1.0
    assert normal_risk.breached is False
    assert normal_risk.expected_loss == round(normal_risk.risk_score * shipment.cargo_value, 2)
    assert f"{normal_risk.expected_loss:,.2f}" in normal_risk.breakdown

    # 2. Excursion breach (14°C, exceeds 8°C max) -> Hard breach triggers risk=1.00
    breach_risk = calculate_risk(shipment, road_leg, simulated_temp_c=14.0)
    assert breach_risk.risk_score == 1.0
    assert breach_risk.expected_loss == shipment.cargo_value
    assert breach_risk.breached is True
    assert "Hard Breach" in breach_risk.breakdown
    assert "1.00 (100% loss)" in breach_risk.breakdown

def test_organic_grapes_continuous_decay(seed_shipments):
    # SHP-001: Grapes (Organic, 4-12°C, Q10=2.2, shelf_life=72h)
    s1_data = seed_shipments[0]
    shipment = Shipment(**s1_data)
    road_leg = compute_road_leg(shipment)
    
    risk = calculate_risk(shipment, road_leg, simulated_temp_c=8.0)
    assert 0.0 <= risk.risk_score <= 1.0
    assert risk.expected_loss == round(risk.risk_score * shipment.cargo_value, 2)
    assert f"{risk.expected_loss:,.2f}" in risk.breakdown
    assert "Grapes" in risk.breakdown or "Organic" in risk.breakdown

def test_class_b_expected_loss_formula_v2(seed_shipments):
    # SHP-002: Onions (Class B, penalty_rate = 0.06, cargo_value = 600,000)
    s2_data = seed_shipments[1]
    shipment = Shipment(**s2_data)
    road_leg = compute_road_leg(shipment)
    
    risk = calculate_risk(shipment, road_leg)
    expected_numeric_loss = round(road_leg.delay_probability * shipment.cargo_value * shipment.class_b.delay_penalty_rate, 2)
    
    assert risk.risk_score == road_leg.delay_probability
    assert risk.expected_loss == expected_numeric_loss
    # Order of magnitude check: expected loss should be in thousands (e.g. ~3,000-10,000 INR), NOT tens of millions
    assert 1000.0 <= risk.expected_loss <= 50000.0
    assert f"{expected_numeric_loss:,.2f}" in risk.breakdown
