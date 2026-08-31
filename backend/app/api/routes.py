from fastapi import APIRouter, status, Depends
from typing import List, Dict, Any
from backend.app.api.schemas import PlanRequest, PlanResponse, CheckpointsResponse, HealthResponse
from backend.app.repository.shipment_repository import shipment_repository
from backend.app.engine.orchestrator import run_consolidation_pipeline
from backend.app.models.shipment import Shipment

router = APIRouter()

@router.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """Health check endpoint confirming API status and version."""
    return HealthResponse()

@router.get("/api/v1/checkpoints", response_model=CheckpointsResponse, tags=["Network"])
@router.get("/checkpoints", response_model=CheckpointsResponse, include_in_schema=False)
async def get_checkpoints():
    """Returns the full 20-city geocoded network checkpoints (5 hubs + 15 satellite towns)."""
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
    """Returns the 6 curated seed shipments covering Class A/B, road-only and multimodal routes."""
    return shipment_repository.list_shipments()

@router.post("/api/v1/plan", response_model=PlanResponse, status_code=status.HTTP_200_OK, tags=["Optimization"])
@router.post("/plan", response_model=PlanResponse, include_in_schema=False)
async def generate_consolidation_plans(payload: PlanRequest):
    """
    Generates 3 Pareto-optimal multimodal freight consolidation & risk prediction plans:
    1. Cheapest (alpha=0.90, beta=0.10)
    2. Fastest / Lowest-Risk (alpha=0.20, beta=0.80)
    3. Balanced (alpha=0.55, beta=0.45)
    """
    result = run_consolidation_pipeline(
        shipment_ids=payload.shipment_ids,
        custom_shipments=payload.custom_shipments,
        simulated_temp_c=payload.simulated_temp_c
    )
    return PlanResponse(**result)
