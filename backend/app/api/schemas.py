from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, Literal
from backend.app.models.plan_models import CandidatePlan
from backend.app.models.shipment import Shipment

class CheckpointInput(BaseModel):
    """Dynamic location geocoded input."""
    lat: float = Field(..., ge=-90.0, le=90.0, description="Latitude coordinate")
    lon: float = Field(..., ge=-180.0, le=180.0, description="Longitude coordinate")
    type: Literal["hub", "satellite"] = Field(default="satellite", description="Location type")
    nearest_hub: Optional[str] = Field(default=None, description="Nearest trunk rail hub for intermodal routing")
    region: Optional[str] = Field(default=None, description="Geographic region")

class OptimizationScenarioInput(BaseModel):
    """Dynamic optimization Pareto scenario weight configuration."""
    label: str = Field(..., min_length=1, description="Scenario name or label")
    alpha: float = Field(..., ge=0.0, le=1.0, description="Freight cost weight")
    beta: float = Field(..., ge=0.0, le=1.0, description="Cold-chain/delay risk weight")

class PlanRequest(BaseModel):
    shipment_ids: Optional[List[str]] = Field(
        default=None,
        description="List of shipment IDs to consolidate and plan from repository."
    )
    custom_shipments: Optional[List[Shipment]] = Field(
        default=None,
        description="Optional ad-hoc validated shipment objects to plan directly."
    )
    custom_checkpoints: Optional[Dict[str, CheckpointInput]] = Field(
        default=None,
        description="Optional dynamic custom locations/cities with geocoded coordinates."
    )
    custom_scenarios: Optional[List[OptimizationScenarioInput]] = Field(
        default=None,
        description="Optional dynamic Pareto optimization scenario weights override."
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

class ConfigResponse(BaseModel):
    app_version: str
    app_env: str
    transport_config: Dict[str, Any]
    supported_classes: List[str]
    supported_subtypes: List[str]
    default_scenarios: List[Dict[str, Any]]

class HealthResponse(BaseModel):
    status: str = "ok"
    version: str = "2.0.0"
    app_env: str = "development"
