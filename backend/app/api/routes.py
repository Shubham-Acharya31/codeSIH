from fastapi import APIRouter, status
from typing import List, Optional, Dict, Any
from backend.app.api.schemas import (
    PlanRequest,
    PlanResponse,
    CheckpointsResponse,
    HealthResponse,
    ConfigResponse,
    ShipmentRecord,
    TimelineEvent,
    DispatchPlanRequest,
    DispatchPlanResponse,
    TimelineAdvanceResponse,
    SimulateSpikeRequest,
    SimulateSpikeResponse
)
from backend.app.repository.shipment_repository import shipment_repository
from backend.app.engine.orchestrator import run_consolidation_pipeline
from backend.app.models.shipment import Shipment
from backend.app.config import settings, transport_config
from backend.app.core.exceptions import ShipmentNotFoundError, InvalidShipmentPayloadError

router = APIRouter()

@router.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """Health check endpoint confirming API status and version."""
    return HealthResponse(app_env=settings.app_env)

@router.get("/api/v1/config", response_model=ConfigResponse, tags=["Configuration"])
@router.get("/config", response_model=ConfigResponse, include_in_schema=False)
async def get_system_config():
    """Returns dynamic system configuration parameters, transport rates, capacities, and Pareto scenarios."""
    return ConfigResponse(
        app_version="2.0.0",
        app_env=settings.app_env,
        transport_config=transport_config.model_dump(),
        supported_classes=["A", "B"],
        supported_subtypes=["organic", "medical"],
        default_scenarios=[s.model_dump() for s in transport_config.optimization.default_scenarios]
    )

@router.get("/api/v1/checkpoints", response_model=CheckpointsResponse, tags=["Network"])
@router.get("/checkpoints", response_model=CheckpointsResponse, include_in_schema=False)
async def get_checkpoints():
    """Returns the geocoded network checkpoints (hubs + satellite towns)."""
    checkpoints = shipment_repository.get_checkpoints()
    hubs = [k for k, v in checkpoints.items() if v.get("type") == "hub"]
    satellites = [k for k, v in checkpoints.items() if v.get("type") == "satellite"]
    return CheckpointsResponse(
        checkpoints=checkpoints,
        hubs=hubs,
        satellites=satellites
    )

@router.get("/api/v1/seed-demo", response_model=List[Shipment], tags=["Shipments"])
@router.get("/seed-demo", response_model=List[Shipment], include_in_schema=False)
async def get_seed_demo_shipments():
    """Returns the curated seed shipments covering Class A/B, road-only and multimodal routes."""
    return shipment_repository.list_shipments()

# -------------------------------------------------------------
# Consignment CRUD & Persistent Storage Endpoints
# -------------------------------------------------------------

@router.get("/api/v1/shipments", response_model=List[ShipmentRecord], tags=["Consignments"])
async def list_consignments(status: Optional[str] = None):
    """Returns all stored consignments from SQLite with live status, timestamps, and route metadata."""
    return shipment_repository.list_shipment_records(status_filter=status)

@router.post("/api/v1/shipments", response_model=ShipmentRecord, status_code=status.HTTP_201_CREATED, tags=["Consignments"])
async def create_consignment(payload: Shipment):
    """Creates and persists a new consignment in SQLite database."""
    if shipment_repository.get_shipment(payload.shipment_id):
        raise InvalidShipmentPayloadError(f"Consignment with ID '{payload.shipment_id}' already exists.")
    shipment_repository.create_shipment(payload)
    record = shipment_repository.get_shipment_record(payload.shipment_id)
    return record

@router.get("/api/v1/shipments/{shipment_id}", response_model=ShipmentRecord, tags=["Consignments"])
async def get_consignment(shipment_id: str):
    """Retrieves a single consignment by ID."""
    record = shipment_repository.get_shipment_record(shipment_id)
    if not record:
        raise ShipmentNotFoundError(f"Consignment '{shipment_id}' was not found.")
    return record

@router.put("/api/v1/shipments/{shipment_id}", response_model=ShipmentRecord, tags=["Consignments"])
async def update_consignment(shipment_id: str, payload: Shipment):
    """Updates an existing consignment in SQLite database."""
    updated = shipment_repository.update_shipment(shipment_id, payload)
    if not updated:
        raise ShipmentNotFoundError(f"Consignment '{shipment_id}' was not found to update.")
    record = shipment_repository.get_shipment_record(shipment_id)
    return record

@router.delete("/api/v1/shipments/{shipment_id}", tags=["Consignments"])
async def delete_consignment(shipment_id: str):
    """Deletes a consignment and its timeline history."""
    deleted = shipment_repository.delete_shipment(shipment_id)
    if not deleted:
        raise ShipmentNotFoundError(f"Consignment '{shipment_id}' was not found to delete.")
    return {"success": True, "shipment_id": shipment_id, "message": "Consignment deleted successfully"}

@router.post("/api/v1/shipments/reset", response_model=List[ShipmentRecord], tags=["Consignments"])
async def reset_seed_consignments():
    """Resets database back to clean curated seed demo state."""
    shipment_repository.reset_to_seed()
    return shipment_repository.list_shipment_records()

# -------------------------------------------------------------
# Tracking Timeline & Live Dispatched Movement
# -------------------------------------------------------------

@router.get("/api/v1/shipments/{shipment_id}/timeline", response_model=List[TimelineEvent], tags=["Tracking Timeline"])
async def get_consignment_timeline(shipment_id: str):
    """Returns the chronological tracking timeline for a consignment."""
    record = shipment_repository.get_shipment_record(shipment_id)
    if not record:
        raise ShipmentNotFoundError(f"Consignment '{shipment_id}' was not found.")
    return shipment_repository.get_timeline(shipment_id)

@router.post("/api/v1/shipments/{shipment_id}/dispatch", response_model=List[TimelineEvent], tags=["Tracking Timeline"])
async def dispatch_single_consignment(shipment_id: str):
    """Dispatches an individual consignment, generating route milestones and live status."""
    record = shipment_repository.get_shipment_record(shipment_id)
    if not record:
        raise ShipmentNotFoundError(f"Consignment '{shipment_id}' was not found to dispatch.")
    timeline = shipment_repository.dispatch_shipment(shipment_id, scenario_label="Direct Dispatch")
    return timeline

@router.post("/api/v1/shipments/dispatch-plan", response_model=DispatchPlanResponse, tags=["Tracking Timeline"])
async def dispatch_consolidation_plan(payload: DispatchPlanRequest):
    """Dispatches an entire consolidation plan, updating all participating shipments to in-transit."""
    res = shipment_repository.dispatch_plan(
        scenario_label=payload.scenario_label,
        shipment_ids=payload.shipment_ids,
        plan_details=payload.plan_details
    )
    return DispatchPlanResponse(**res)

@router.post("/api/v1/shipments/{shipment_id}/timeline/advance", response_model=TimelineAdvanceResponse, tags=["Tracking Timeline"])
async def advance_timeline_step(shipment_id: str):
    """Advances consignment tracking to the next checkpoint milestone."""
    record = shipment_repository.get_shipment_record(shipment_id)
    if not record:
        raise ShipmentNotFoundError(f"Consignment '{shipment_id}' was not found.")
    res = shipment_repository.advance_timeline_step(shipment_id)
    return TimelineAdvanceResponse(**res)

@router.post("/api/v1/shipments/{shipment_id}/timeline/simulate-spike", response_model=SimulateSpikeResponse, tags=["Tracking Timeline"])
async def simulate_sensor_spike(shipment_id: str, payload: SimulateSpikeRequest):
    """Simulates an in-transit IoT temperature sensor excursion spike."""
    record = shipment_repository.get_shipment_record(shipment_id)
    if not record:
        raise ShipmentNotFoundError(f"Consignment '{shipment_id}' was not found.")
    res = shipment_repository.simulate_temp_spike(shipment_id, spike_temp_c=payload.temp_c)
    return SimulateSpikeResponse(**res)

# -------------------------------------------------------------
# Optimization Planning
# -------------------------------------------------------------

@router.post("/api/v1/plan", response_model=PlanResponse, status_code=status.HTTP_200_OK, tags=["Optimization"])
@router.post("/plan", response_model=PlanResponse, include_in_schema=False)
async def generate_consolidation_plans(payload: PlanRequest):
    """
    Generates Pareto-optimal multimodal freight consolidation & risk prediction plans.
    Supports repository shipments, dynamic ad-hoc shipments, custom checkpoints, and custom scenarios.
    """
    result = run_consolidation_pipeline(
        shipment_ids=payload.shipment_ids,
        custom_shipments=payload.custom_shipments,
        custom_checkpoints=payload.custom_checkpoints,
        custom_scenarios=payload.custom_scenarios,
        simulated_temp_c=payload.simulated_temp_c
    )
    return PlanResponse(**result)

