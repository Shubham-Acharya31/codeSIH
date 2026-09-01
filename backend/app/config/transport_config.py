from pydantic import BaseModel, Field
from typing import List

class RoadTransportConfig(BaseModel):
    """Configuration for highway road transport parameters."""
    truck_capacity_kg: float = Field(default=10000.0, gt=0, description="Truck payload capacity in kg (10-ton)")
    truck_capacity_m3: float = Field(default=30.0, gt=0, description="Truck volumetric capacity in m³")
    base_rate_per_km_class_a: float = Field(default=38.0, gt=0, description="Class A refrigerated road freight rate (₹/km)")
    base_rate_per_km_class_b: float = Field(default=32.0, gt=0, description="Class B standard road freight rate (₹/km)")
    avg_speed_kmh: float = Field(default=55.0, gt=0, description="Average road transit speed (km/h)")
    detour_factor: float = Field(default=1.25, ge=1.0, description="Road detour factor applied to Haversine distance")
    min_distance_km: float = Field(default=15.0, gt=0, description="Minimum billable road distance (km)")
    delay_prob_base: float = Field(default=0.04, ge=0.0, le=1.0, description="Base road delay probability")
    delay_prob_scale_km: float = Field(default=10000.0, gt=0, description="Distance scale factor for delay probability")
    delay_prob_min: float = Field(default=0.04, ge=0.0, le=1.0, description="Minimum road delay probability")
    delay_prob_max: float = Field(default=0.25, ge=0.0, le=1.0, description="Maximum road delay probability")

class RailTransportConfig(BaseModel):
    """Configuration for trunk rail transport and intermodal feeder parameters."""
    bogey_capacity_kg: float = Field(default=25000.0, gt=0, description="Rail bogey capacity in kg (25-ton)")
    bogey_capacity_m3: float = Field(default=70.0, gt=0, description="Rail bogey volumetric capacity in m³")
    base_rate_per_km_class_a: float = Field(default=15.0, gt=0, description="Class A rail trunk rate per bogey (₹/km)")
    base_rate_per_km_class_b: float = Field(default=11.0, gt=0, description="Class B rail trunk rate per bogey (₹/km)")
    feeder_rate_per_km_class_a: float = Field(default=22.0, gt=0, description="Class A road feeder transfer rate (₹/km)")
    feeder_rate_per_km_class_b: float = Field(default=18.0, gt=0, description="Class B road feeder transfer rate (₹/km)")
    default_scheduled_dwell_hr: float = Field(default=1.0, ge=0, description="Default scheduled dwell at rail hubs (hr)")
    max_delay_probability: float = Field(default=0.20, ge=0.0, le=1.0, description="Upper bound for rail schedule delay probability")
    default_delay_probability: float = Field(default=0.08, ge=0.0, le=1.0, description="Default rail delay probability fallback")

class OptimizationScenarioConfig(BaseModel):
    """Weighted Pareto objective configuration."""
    label: str
    alpha: float = Field(..., ge=0.0, le=1.0, description="Cost weight factor")
    beta: float = Field(..., ge=0.0, le=1.0, description="Risk weight factor")

class OptimizationConfig(BaseModel):
    """Solver settings and default Pareto candidate definitions."""
    default_scenarios: List[OptimizationScenarioConfig] = Field(
        default_factory=lambda: [
            OptimizationScenarioConfig(label="Cheapest", alpha=0.90, beta=0.10),
            OptimizationScenarioConfig(label="Fastest / Lowest-Risk", alpha=0.20, beta=0.80),
            OptimizationScenarioConfig(label="Balanced", alpha=0.55, beta=0.45),
        ]
    )
    solver_time_limit_seconds: float = Field(default=2.0, gt=0)
    solver_workers: int = Field(default=4, ge=1)

class SystemLimitsConfig(BaseModel):
    """Safety boundaries and batch limits."""
    max_shipments_per_batch: int = Field(default=50, gt=0)
    max_cargo_value_inr: float = Field(default=100_000_000.0, gt=0)
    max_weight_kg: float = Field(default=500_000.0, gt=0)

class TransportConfig(BaseModel):
    """Unified centralized transport and system configuration."""
    road: RoadTransportConfig = Field(default_factory=RoadTransportConfig)
    rail: RailTransportConfig = Field(default_factory=RailTransportConfig)
    optimization: OptimizationConfig = Field(default_factory=OptimizationConfig)
    limits: SystemLimitsConfig = Field(default_factory=SystemLimitsConfig)

transport_config = TransportConfig()
