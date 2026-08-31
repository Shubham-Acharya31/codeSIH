import json
from pathlib import Path
from typing import Dict, Any, Optional
from backend.app.models.shipment import Shipment, ClassAAttributes, ClassBAttributes

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"

def load_decay_constants() -> Dict[str, Any]:
    decay_file = DATA_DIR / "decay_constants.json"
    if not decay_file.exists():
        return {
            "medical": {
                "q10": 2.5,
                "optimal_temp_band": [2.0, 8.0],
                "base_shelf_life_hr": 48.0,
                "hard_breach_override": True
            },
            "organic": {
                "q10": 2.2,
                "optimal_temp_band": [4.0, 12.0],
                "base_shelf_life_hr": 72.0,
                "hard_breach_override": False
            }
        }
    with open(decay_file, "r", encoding="utf-8") as f:
        return json.load(f)

def classify_and_enrich_shipment(shipment: Shipment) -> Shipment:
    """
    Validates and enriches a shipment with decay constants and classification rules.
    """
    decay_constants = load_decay_constants()
    
    if shipment.shipment_class == "A":
        if shipment.class_a is None:
            raise ValueError(f"Shipment {shipment.shipment_id} marked as Class A but missing class_a attributes.")
        
        subtype = shipment.class_a.product_subtype
        constants = decay_constants.get(subtype, decay_constants["organic"])
        
        # Enrich if any field needs default alignment
        q10_val = shipment.class_a.q10 if shipment.class_a.q10 > 0 else constants.get("q10", 2.2)
        temp_min = shipment.class_a.temperature_min
        temp_max = shipment.class_a.temperature_max
        hard_breach = constants.get("hard_breach_override", (subtype == "medical"))
        
        shipment.class_a = ClassAAttributes(
            product_subtype=subtype,
            temperature_min=temp_min,
            temperature_max=temp_max,
            q10=q10_val,
            base_shelf_life_hr=shipment.class_a.base_shelf_life_hr,
            hard_breach_override=hard_breach
        )
    elif shipment.shipment_class == "B":
        if shipment.class_b is None:
            raise ValueError(f"Shipment {shipment.shipment_id} marked as Class B but missing class_b attributes.")
        
        rate = shipment.class_b.delay_penalty_rate
        if not (0.0 <= rate <= 1.0):
            raise ValueError(f"Shipment {shipment.shipment_id} has invalid delay_penalty_rate {rate}. Must be between 0.0 and 1.0.")
            
    return shipment
