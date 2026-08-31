from pydantic import BaseModel, Field
from typing import List, Optional, Literal, Dict, Any

class RouteSegment(BaseModel):
    mode: Literal["road", "rail"]
    origin: str
    destination: str
    distance_km: float
    transit_time_hr: float
    dwell_time_hr: float = 0.0
    geometry: List[List[float]] = Field(default_factory=list) # [[lat, lon], ...]

class RoadLeg(BaseModel):
    mode: Literal["road"] = "road"
    origin: str
    destination: str
    distance_km: float
    transit_time_hr: float
    delay_probability: float = Field(..., ge=0, le=1)
    num_trucks: int = 1
    cost_per_truck: float = 0.0
    total_cost: float = 0.0
    geometry: List[List[float]] = Field(default_factory=list)

class RailLeg(BaseModel):
    mode: Literal["rail"] = "rail"
    origin: str
    destination: str
    distance_km: float
    transit_time_hr: float
    dwell_time_hr: float = 0.0
    delay_probability: float = Field(..., ge=0, le=1)
    num_bogeys: int = 1
    cost_per_bogey: float = 0.0
    total_cost: float = 0.0
    segments: List[Dict[str, Any]] = Field(default_factory=list)
    transfer_hubs: List[str] = Field(default_factory=list)
    geometry: List[List[float]] = Field(default_factory=list)
