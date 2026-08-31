from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, Literal

class ShipmentPlanDetail(BaseModel):
    shipment_id: str
    selected_mode: Literal["road", "rail"]
    transit_time_hr: float
    freight_cost: float
    expected_loss: float
    risk_score: float
    breakdown: str
    route_description: str
    geometry: List[List[float]] = Field(default_factory=list)
    transfer_hubs: List[str] = Field(default_factory=list)

class CandidatePlan(BaseModel):
    label: Literal["Cheapest", "Fastest / Lowest-Risk", "Balanced"]
    alpha: float
    beta: float
    freight_cost: float
    expected_loss: float
    total_cost: float
    eta_hr: float
    groupings: List[str] = Field(default_factory=list)
    shipment_details: List[ShipmentPlanDetail] = Field(default_factory=list)
    solve_time_ms: Optional[float] = None
    mode_assignments: Dict[str, str] = Field(default_factory=dict)
