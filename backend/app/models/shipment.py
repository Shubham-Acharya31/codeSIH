from pydantic import BaseModel, Field, model_validator
from typing import Optional, Literal
from datetime import datetime

class ShipmentBase(BaseModel):
    shipment_id: str
    origin: str
    destination: str
    weight_kg: float = Field(..., gt=0)
    volume_m3: float = Field(..., gt=0)
    deadline: datetime
    cargo_value: float = Field(..., gt=0)   # INR
    product_category: str
    shipment_class: Literal["A", "B"]

class ClassAAttributes(BaseModel):
    product_subtype: Literal["medical", "organic"]
    temperature_min: float
    temperature_max: float
    q10: float = Field(..., gt=0)
    base_shelf_life_hr: float = Field(..., gt=0)
    hard_breach_override: bool = True   # Medical only — excursion causes instant 1.0 risk

class ClassBAttributes(BaseModel):
    # v2 CORRECTED UNITS:
    # delay_penalty_rate is a DIMENSIONLESS FRACTION (0.0-1.0), representing the
    # fraction of cargo_value contractually at risk if the shipment is late — NOT
    # an absolute INR/hour rate. Typical realistic range: 0.01-0.15.
    delay_penalty_rate: float = Field(..., ge=0, le=1)
    sla_strict: bool = False

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
