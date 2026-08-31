from typing import List, Dict, Any, Union, Optional
from backend.app.models.shipment import Shipment
from backend.app.engine.ingestion import ingest_shipment
from backend.app.engine.classification import classify_and_enrich_shipment
from backend.app.engine.road_route import compute_road_leg
from backend.app.engine.rail_route import compute_rail_leg
from backend.app.engine.risk import calculate_risk

def prepare_shipment_candidates(
    shipment: Union[Shipment, Dict[str, Any]],
    simulated_temp_c: Optional[float] = None
) -> Dict[str, Any]:
    """
    Generates modal candidates (Road and optional Rail) and precalculates risk for a single shipment.
    """
    if isinstance(shipment, dict):
        shipment = ingest_shipment(shipment)
    
    shipment = classify_and_enrich_shipment(shipment)
    
    # 1. Compute Road candidate
    road_leg = compute_road_leg(shipment)
    road_risk = calculate_risk(shipment, road_leg, simulated_temp_c=simulated_temp_c)
    
    # 2. Compute Rail candidate (None if non-trunk or same region)
    rail_leg = compute_rail_leg(shipment)
    rail_risk = calculate_risk(shipment, rail_leg, simulated_temp_c=simulated_temp_c) if rail_leg is not None else None
    
    return {
        "shipment": shipment,
        "road_leg": road_leg,
        "road_risk": road_risk,
        "rail_leg": rail_leg,
        "rail_risk": rail_risk
    }

def prepare_batch_candidates(
    shipments_data: List[Union[Shipment, Dict[str, Any]]],
    simulated_temp_c: Optional[float] = None
) -> List[Dict[str, Any]]:
    """
    Generates candidate routes and risk evaluations for a batch of shipments.
    """
    candidates = []
    for item in shipments_data:
        candidates.append(prepare_shipment_candidates(item, simulated_temp_c=simulated_temp_c))
    return candidates
