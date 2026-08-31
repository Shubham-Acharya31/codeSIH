import time
import httpx
from typing import List, Dict, Any, Optional
from backend.app.models.shipment import Shipment
from backend.app.models.plan_models import CandidatePlan
from backend.app.repository.shipment_repository import shipment_repository
from backend.app.engine.ingestion import ingest_shipment
from backend.app.engine.classification import classify_and_enrich_shipment
from backend.app.engine.road_route import compute_road_leg
from backend.app.engine.rail_route import compute_rail_leg
from backend.app.engine.risk import calculate_risk
from backend.app.engine.optimization_engine import solve_multimodal_plans
from backend.app.core.exceptions import (
    ShipmentNotFoundError,
    InvalidShipmentPayloadError,
    RoutingProviderUnavailableError,
    FreightAppException
)

def run_consolidation_pipeline(
    shipment_ids: Optional[List[str]] = None,
    custom_shipments: Optional[List[Dict[str, Any]]] = None,
    simulated_temp_c: Optional[float] = None
) -> Dict[str, Any]:
    """
    Orchestrates ingestion, classification, multimodal route generation,
    risk evaluation, and OR-Tools optimization.
    """
    t_start = time.perf_counter()
    shipments_to_process: List[Shipment] = []

    # 1. Custom shipments provided directly in payload
    if custom_shipments:
        if len(custom_shipments) > 50:
            raise InvalidShipmentPayloadError("Batch exceeds maximum allowable limit of 50 shipments per request.")
        for raw in custom_shipments:
            try:
                shipment = ingest_shipment(raw)
                shipments_to_process.append(shipment)
            except Exception as e:
                raise InvalidShipmentPayloadError(f"Failed to parse custom shipment: {str(e)}")

    # 2. Shipment IDs provided for repository lookup
    elif shipment_ids is not None:
        if not shipment_ids:
            raise InvalidShipmentPayloadError("shipment_ids list cannot be empty.")
        if len(shipment_ids) > 50:
            raise InvalidShipmentPayloadError("Batch exceeds maximum allowable limit of 50 shipments per request.")
        for sid in shipment_ids:
            shipment = shipment_repository.get_shipment(sid)
            if shipment is None:
                raise ShipmentNotFoundError(f"Shipment ID '{sid}' was not found in the repository.")
            shipments_to_process.append(shipment)

    # 3. Default to all seed shipments in repository
    else:
        shipments_to_process = shipment_repository.list_shipments()

    if not shipments_to_process:
        raise InvalidShipmentPayloadError("No valid shipments found to process.")

    candidates = []
    for s in shipments_to_process:
        try:
            s_enriched = classify_and_enrich_shipment(s)
            road_leg = compute_road_leg(s_enriched)
            road_risk = calculate_risk(s_enriched, road_leg, simulated_temp_c)
            rail_leg = compute_rail_leg(s_enriched)
            rail_risk = calculate_risk(s_enriched, rail_leg, simulated_temp_c) if rail_leg is not None else None
            candidates.append({
                "shipment": s_enriched,
                "road_leg": road_leg,
                "road_risk": road_risk,
                "rail_leg": rail_leg,
                "rail_risk": rail_risk
            })
        except httpx.TimeoutException as e:
            raise RoutingProviderUnavailableError(f"Upstream road routing provider timed out: {str(e)}")
        except Exception as e:
            if isinstance(e, FreightAppException):
                raise
            raise

    # Solve 3 Pareto candidate plans
    plans = solve_multimodal_plans(candidates, simulated_temp_c=simulated_temp_c)
    
    total_duration_ms = round((time.perf_counter() - t_start) * 1000.0, 2)

    return {
        "success": True,
        "total_shipments_processed": len(shipments_to_process),
        "plans": plans,
        "execution_time_ms": total_duration_ms
    }
