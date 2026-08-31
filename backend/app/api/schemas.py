from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from backend.app.models.plan_models import CandidatePlan
from backend.app.models.shipment import Shipment

class PlanRequest(BaseModel):
    shipment_ids: Optional[List[str]] = Field(
        default=None,
        description="List of shipment IDs to consolidate and plan from repository."
    )
    custom_shipments: Optional[List[Dict[str, Any]]] = Field(
        default=None,
        description="Optional ad-hoc shipment dictionaries to plan directly."
    )
    simulated_temp_c: Optional[float] = Field(
        default=None,
        description="Optional simulation ambient temperature override in °C for cold-chain excursion testing."
    )

class PlanResponse(BaseModel):
    success: bool
    total_shipments_processed: int
    plans: List[CandidatePlan]
    execution_time_ms: float

class CheckpointsResponse(BaseModel):
    checkpoints: Dict[str, Any]
    hubs: List[str]
    satellites: List[str]

class HealthResponse(BaseModel):
    status: str = "ok"
    version: str = "2.0.0"
    app_env: str = "development"
