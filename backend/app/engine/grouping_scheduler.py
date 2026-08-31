from typing import List, Dict, Any

def compute_consolidation_groupings(
    shipment_details: List[Dict[str, Any]],
    mode_assignments: Dict[str, str]
) -> List[str]:
    """
    Analyzes mode assignments and corridors to generate consolidation groupings.
    """
    rail_shipments = [sid for sid, m in mode_assignments.items() if m == "rail"]
    road_shipments = [sid for sid, m in mode_assignments.items() if m == "road"]
    
    groupings: List[str] = []
    
    if rail_shipments:
        groupings.append(f"Central Trunk Rail Freight Batch ({', '.join(rail_shipments)})")
    
    if road_shipments:
        if len(road_shipments) > 1:
            groupings.append(f"Regional Road Direct Group ({', '.join(road_shipments)})")
        else:
            groupings.append(f"Dedicated Road Dispatch ({road_shipments[0]})")
            
    if not groupings:
        groupings.append("Single Consignment Direct Route")
        
    return groupings
