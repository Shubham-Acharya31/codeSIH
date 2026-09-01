from fastapi import APIRouter, status
from typing import List
from backend.app.api.schemas import (
    PlanRequest,
    PlanResponse,
    CheckpointsResponse,
    HealthResponse,
    ConfigResponse
)
from backend.app.repository.shipment_repository import shipment_repository
from backend.app.engine.orchestrator import run_consolidation_pipeline
from backend.app.models.shipment import Shipment
from backend.app.config import settings, transport_config

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
