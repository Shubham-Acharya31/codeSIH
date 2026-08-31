import json
import math
from pathlib import Path
from typing import Optional, Dict, Any, List

from backend.app.models.shipment import Shipment
from backend.app.models.legs import RailLeg, RouteSegment
from backend.app.engine.road_route import fetch_osrm_road_route, load_checkpoints

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"

def load_rail_graph() -> Dict[str, Any]:
    with open(DATA_DIR / "rail_station_graph.json", "r", encoding="utf-8") as f:
        return json.load(f)

def load_rail_schedules() -> Dict[str, Any]:
    with open(DATA_DIR / "rail_schedules.json", "r", encoding="utf-8") as f:
        return json.load(f)

def load_dwell_matrix() -> Dict[str, Any]:
    with open(DATA_DIR / "dwell_time_matrix.json", "r", encoding="utf-8") as f:
        return json.load(f)

def find_trunk_schedule(origin_hub: str, dest_hub: str) -> Optional[Dict[str, Any]]:
    schedules = load_rail_schedules()
    for corridor in schedules.get("corridors", []):
        if corridor["origin_hub"] == origin_hub and corridor["destination_hub"] == dest_hub:
            return corridor
    return None

def compute_rail_leg(shipment: Shipment) -> Optional[RailLeg]:
    """
    Constructs a single aggregated multimodal RailLeg candidate across the 20-city network.
    Returns None if:
      - Origin and destination share the same nearest hub (no rail advantage).
      - No direct trunk rail edge connects the origin hub and destination hub.
    """
    checkpoints = load_checkpoints()
    if shipment.origin not in checkpoints or shipment.destination not in checkpoints:
        return None

    orig_info = checkpoints[shipment.origin]
    dest_info = checkpoints[shipment.destination]
    
    orig_hub = orig_info["nearest_hub"] if orig_info["type"] == "satellite" else shipment.origin
    dest_hub = dest_info["nearest_hub"] if dest_info["type"] == "satellite" else shipment.destination

    # 1. If same hub region, return None (road-only)
    if orig_hub == dest_hub:
        return None

    # 2. Check trunk edge connectivity
    trunk = find_trunk_schedule(orig_hub, dest_hub)
    if trunk is None:
        return None

    dwell_matrix = load_dwell_matrix()
    transfer_buffer_hr = (
        dwell_matrix["transfer_buffers"]["cold_chain_cargo_hr"]
        if shipment.shipment_class == "A"
        else dwell_matrix["transfer_buffers"]["generic_cargo_hr"]
    )

    segments: List[Dict[str, Any]] = []
    transfer_hubs: List[str] = []
    combined_geometry: List[List[float]] = []
    
    total_distance_km = 0.0
    total_transit_hr = 0.0
    total_dwell_hr = 0.0
    total_feeder_cost = 0.0

    # Feeder Leg 1: Origin -> Origin Hub (if origin is satellite)
    if shipment.origin != orig_hub:
        dist1, time1, geom1 = fetch_osrm_road_route(shipment.origin, orig_hub, allow_fallback=True)
        total_distance_km += dist1
        total_transit_hr += time1
        total_dwell_hr += transfer_buffer_hr
        transfer_hubs.append(orig_hub)
        combined_geometry.extend(geom1)
        feeder_rate = 22.0 if shipment.shipment_class == "A" else 18.0
        total_feeder_cost += dist1 * feeder_rate
        segments.append({
            "mode": "road",
            "from": shipment.origin,
            "to": orig_hub,
            "distance_km": dist1,
            "transit_time_hr": time1,
            "type": "feeder_inbound"
        })

    # Trunk Rail Leg: Origin Hub -> Destination Hub
    rail_dist = trunk["distance_km"]
    rail_time = trunk["transit_time_hr"]
    rail_dwell = trunk.get("scheduled_dwell_hr", 1.0)
    total_distance_km += rail_dist
    total_transit_hr += rail_time
    total_dwell_hr += rail_dwell
    
    # Get rail geometry from hubs
    hub_orig_lat, hub_orig_lon = checkpoints[orig_hub]["lat"], checkpoints[orig_hub]["lon"]
    hub_dest_lat, hub_dest_lon = checkpoints[dest_hub]["lat"], checkpoints[dest_hub]["lon"]
    
    rail_geom = [
        [hub_orig_lat, hub_orig_lon],
        [round((hub_orig_lat + hub_dest_lat) / 2 + 0.1, 4), round((hub_orig_lon + hub_dest_lon) / 2, 4)],
        [hub_dest_lat, hub_dest_lon]
    ]
    if combined_geometry and combined_geometry[-1] == rail_geom[0]:
        combined_geometry.extend(rail_geom[1:])
    else:
        combined_geometry.extend(rail_geom)
        
    segments.append({
        "mode": "rail",
        "from": orig_hub,
        "to": dest_hub,
        "distance_km": rail_dist,
        "transit_time_hr": rail_time,
        "type": "trunk_rail"
    })

    # Feeder Leg 2: Destination Hub -> Destination (if destination is satellite)
    if shipment.destination != dest_hub:
        dist2, time2, geom2 = fetch_osrm_road_route(dest_hub, shipment.destination, allow_fallback=True)
        total_distance_km += dist2
        total_transit_hr += time2
        total_dwell_hr += transfer_buffer_hr
        transfer_hubs.append(dest_hub)
        if combined_geometry and combined_geometry[-1] == geom2[0]:
            combined_geometry.extend(geom2[1:])
        else:
            combined_geometry.extend(geom2)
        feeder_rate = 22.0 if shipment.shipment_class == "A" else 18.0
        total_feeder_cost += dist2 * feeder_rate
        segments.append({
            "mode": "road",
            "from": dest_hub,
            "to": shipment.destination,
            "distance_km": dist2,
            "transit_time_hr": time2,
            "type": "feeder_outbound"
        })

    # Bogey Calculation: Standard railway freight bogey (25,000 kg, 70 m3)
    bogeys_by_weight = math.ceil(shipment.weight_kg / 25000.0)
    bogeys_by_vol = math.ceil(shipment.volume_m3 / 70.0)
    num_bogeys = max(bogeys_by_weight, bogeys_by_vol, 1)

    # Rail trunk cost: ₹12 - ₹15 / km per bogey for high-efficiency rail bulk
    base_rail_rate = 15.0 if shipment.shipment_class == "A" else 11.0
    cost_per_bogey = round(rail_dist * base_rail_rate, 2)
    total_rail_cost = round((cost_per_bogey * num_bogeys) + total_feeder_cost, 2)

    # Delay probability on rail: schedule delay probability
    delay_prob = round(min(0.20, trunk.get("delay_probability", 0.08)), 3)

    return RailLeg(
        mode="rail",
        origin=shipment.origin,
        destination=shipment.destination,
        distance_km=round(total_distance_km, 2),
        transit_time_hr=round(total_transit_hr, 2),
        dwell_time_hr=round(total_dwell_hr, 2),
        delay_probability=delay_prob,
        num_bogeys=num_bogeys,
        cost_per_bogey=cost_per_bogey,
        total_cost=total_rail_cost,
        segments=segments,
        transfer_hubs=transfer_hubs,
        geometry=combined_geometry
    )
