import time
import httpx
from typing import List, Dict, Any, Optional, Union
from backend.app.models.shipment import Shipment
from backend.app.repository.shipment_repository import shipment_repository
from backend.app.engine.ingestion import ingest_shipment
from backend.app.engine.classification import classify_and_enrich_shipment
from backend.app.engine.road_route import compute_road_leg
from backend.app.engine.rail_route import compute_rail_leg
from backend.app.engine.risk import calculate_risk
from backend.app.engine.optimization_engine import solve_multimodal_plans
from backend.app.config import transport_config
from backend.app.core.exceptions import (
    ShipmentNotFoundError,
    InvalidShipmentPayloadError,
    RoutingProviderUnavailableError,
    FreightAppException
)

def run_consolidation_pipeline(
    shipment_ids: Optional[List[str]] = None,
    custom_shipments: Optional[List[Union[Shipment, Dict[str, Any]]]] = None,
    custom_checkpoints: Optional[Dict[str, Any]] = None,
    custom_scenarios: Optional[List[Any]] = None,
    simulated_temp_c: Optional[float] = None
) -> Dict[str, Any]:
    """
    Orchestrates ingestion, classification, multimodal route generation,
    risk evaluation, and OR-Tools optimization with support for dynamic consignments,
    dynamic network checkpoints, and custom Pareto scenarios.
    """
    t_start = time.perf_counter()
    shipments_to_process: List[Shipment] = []
    max_batch = transport_config.limits.max_shipments_per_batch

    # 1. Collect repository shipments if shipment_ids requested
    if shipment_ids is not None:
        if len(shipment_ids) == 0 and not custom_shipments:
            raise InvalidShipmentPayloadError("shipment_ids list cannot be empty when no custom shipments are provided.")
        for sid in shipment_ids:
            shipment = shipment_repository.get_shipment(sid)
            if shipment is None:
                raise ShipmentNotFoundError(f"Shipment ID '{sid}' was not found in the repository.")
            shipments_to_process.append(shipment)

    # 2. Collect ad-hoc custom shipments if provided
    if custom_shipments:
        for raw in custom_shipments:
            if isinstance(raw, Shipment):
                shipments_to_process.append(raw)
            else:
                try:
                    shipment = ingest_shipment(raw)
                    shipments_to_process.append(shipment)
                except Exception as e:
                    if isinstance(e, FreightAppException):
                        raise
                    raise InvalidShipmentPayloadError(f"Failed to parse custom shipment: {str(e)}") from e

    # 3. Default fallback: if neither shipment_ids nor custom_shipments given, load all seed shipments
    if shipment_ids is None and not custom_shipments:
        shipments_to_process = shipment_repository.list_shipments()

    # Enforce batch size limits from centralized config
    if len(shipments_to_process) > max_batch:
        raise InvalidShipmentPayloadError(f"Batch exceeds maximum allowable limit of {max_batch} shipments per request.")

    if not shipments_to_process:
        raise InvalidShipmentPayloadError("No valid shipments found to process.")

    candidates = []
    for s in shipments_to_process:
        try:
            s_enriched = classify_and_enrich_shipment(s)
            road_leg = compute_road_leg(s_enriched, extra_checkpoints=custom_checkpoints)
            road_risk = calculate_risk(s_enriched, road_leg, simulated_temp_c)
            rail_leg = compute_rail_leg(s_enriched, extra_checkpoints=custom_checkpoints)
            rail_risk = calculate_risk(s_enriched, rail_leg, simulated_temp_c) if rail_leg is not None else None
            candidates.append({
                "shipment": s_enriched,
                "road_leg": road_leg,
                "road_risk": road_risk,
                "rail_leg": rail_leg,
                "rail_risk": rail_risk
            })
        except httpx.TimeoutException as e:
            raise RoutingProviderUnavailableError(f"Upstream road routing provider timed out: {str(e)}") from e
        except Exception as e:
            if isinstance(e, FreightAppException):
                raise
            raise

    # Solve Pareto candidate plans
    plans = solve_multimodal_plans(
        candidates,
        simulated_temp_c=simulated_temp_c,
        custom_scenarios=custom_scenarios
    )
    
    total_duration_ms = round((time.perf_counter() - t_start) * 1000.0, 2)

    return {
        "success": True,
        "total_shipments_processed": len(shipments_to_process),
        "plans": plans,
        "execution_time_ms": total_duration_ms
    }
