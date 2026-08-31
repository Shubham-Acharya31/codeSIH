import json
from pathlib import Path
import pytest
from backend.app.engine.input_entry import prepare_batch_candidates
from backend.app.engine.optimization_engine import solve_multimodal_plans

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

@pytest.fixture
def seed_candidates():
    with open(DATA_DIR / "seed_shipments.json", "r", encoding="utf-8") as f:
        data = json.load(f)
    return prepare_batch_candidates(data)

def test_optimization_all_six_seed_shipments(seed_candidates):
    plans = solve_multimodal_plans(seed_candidates)
    
    assert len(plans) == 3
    labels = [p.label for p in plans]
    assert labels == ["Cheapest", "Fastest / Lowest-Risk", "Balanced"]
    
    cheapest = plans[0]
    fastest = plans[1]
    balanced = plans[2]
    
    # Assert alpha / beta constants
    assert cheapest.alpha == 0.90 and cheapest.beta == 0.10
    assert fastest.alpha == 0.20 and fastest.beta == 0.80
    assert balanced.alpha == 0.55 and balanced.beta == 0.45
    
    # Assert plan properties
    for plan in plans:
        assert plan.freight_cost > 0
        assert plan.expected_loss >= 0
        assert plan.total_cost == round(plan.freight_cost + plan.expected_loss, 2)
        assert plan.eta_hr > 0
        assert len(plan.groupings) > 0
        assert len(plan.shipment_details) == 6
        assert plan.solve_time_ms is not None
        assert plan.solve_time_ms < 2000.0  # Sub-2-second constraint

def test_optimization_with_temperature_excursion(seed_candidates):
    # Under 20°C excursion, medical vaccines breach hard -> expected_loss will jump
    plans_normal = solve_multimodal_plans(seed_candidates, simulated_temp_c=5.0)
    plans_excursion = solve_multimodal_plans(seed_candidates, simulated_temp_c=20.0)
    
    # Total expected loss under excursion should be significantly higher due to hard breach
    assert plans_excursion[0].expected_loss > plans_normal[0].expected_loss
