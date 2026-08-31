from pydantic import BaseModel, Field
from typing import Optional, Dict, Any

class RiskScore(BaseModel):
    risk_score: float = Field(..., ge=0, le=1)
    expected_loss: float          # INR
    breakdown: str                 # Literal formula string with substituted numbers
    breached: bool = False
    simulated_temp_c: Optional[float] = None
    formula_components: Optional[Dict[str, Any]] = None
