from pydantic import BaseModel, Field, model_validator
from typing import Optional, Literal
from datetime import datetime

class ShipmentBase(BaseModel):
    shipment_id: str = Field(..., min_length=1, description="Unique shipment identifier")
    origin: str = Field(..., min_length=1, description="Origin city or location")
    destination: str = Field(..., min_length=1, description="Destination city or location")
    weight_kg: float = Field(..., gt=0, description="Gross cargo weight in kg")
    volume_m3: float = Field(..., gt=0, description="Gross cargo volume in m³")
    deadline: datetime = Field(..., description="Target delivery deadline (ISO format)")
    cargo_value: float = Field(..., gt=0, description="Cargo commercial value in INR")
    product_category: str = Field(..., min_length=1, description="Cargo description or classification category")
    shipment_class: Literal["A", "B"] = Field(..., description="'A' for Perishable, 'B' for Non-Perishable")

    @model_validator(mode="after")
    def validate_route_endpoints(self):
        if self.origin.strip().lower() == self.destination.strip().lower():
            raise ValueError(f"Origin and destination cannot be identical ('{self.origin}').")
        return self

class ClassAAttributes(BaseModel):
    product_subtype: Literal["medical", "organic"] = Field(..., description="Cold-chain subtype ('medical' or 'organic')")
    temperature_min: float = Field(..., description="Lower limit of safe temperature band in °C")
    temperature_max: float = Field(..., description="Upper limit of safe temperature band in °C")
    q10: float = Field(..., gt=0, description="Arrhenius/Q10 spoilage temperature sensitivity factor")
    base_shelf_life_hr: float = Field(..., gt=0, description="Base usable shelf life in hours")
    hard_breach_override: bool = Field(default=True, description="Instant 1.0 risk on temperature excursion (mandatory for medical)")

    @model_validator(mode="after")
    def validate_temperature_band(self):
        if self.temperature_min > self.temperature_max:
            raise ValueError(
                f"temperature_min ({self.temperature_min}°C) cannot exceed temperature_max ({self.temperature_max}°C)."
            )
        return self

class ClassBAttributes(BaseModel):
    # v2 CORRECTED UNITS:
    # delay_penalty_rate is a DIMENSIONLESS FRACTION (0.0-1.0), representing the
    # fraction of cargo_value contractually at risk if the shipment is late — NOT
    # an absolute INR/hour rate. Typical realistic range: 0.01-0.15.
    delay_penalty_rate: float = Field(..., ge=0.0, le=1.0, description="Dimensionless penalty fraction of cargo value")
    sla_strict: bool = Field(default=False, description="Strict contractual SLA penalty enforcement")

class Shipment(ShipmentBase):
    class_a: Optional[ClassAAttributes] = None
    class_b: Optional[ClassBAttributes] = None

    @model_validator(mode="after")
    def enforce_class_exclusivity(self):
        if self.shipment_class == "A":
            if self.class_a is None or self.class_b is not None:
                raise ValueError("Class A shipments must define class_a and have class_b as None.")
        elif self.shipment_class == "B":
            if self.class_b is None or self.class_a is not None:
                raise ValueError("Class B shipments must define class_b and have class_a as None.")
        else:
            raise ValueError(f"Invalid shipment class: {self.shipment_class}")
        return self
