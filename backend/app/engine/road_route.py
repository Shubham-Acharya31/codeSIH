import json
import math
import time
from pathlib import Path
from typing import Tuple, List, Dict, Any, Optional
import httpx

from backend.app.models.shipment import Shipment
from backend.app.models.legs import RoadLeg
from backend.app.core.exceptions import RoutingProviderUnavailableError
from backend.app.config import settings

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"

def load_checkpoints() -> Dict[str, Any]:
    with open(DATA_DIR / "checkpoints_geocoded.json", "r", encoding="utf-8") as f:
        return json.load(f)

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great-circle distance between two points in km."""
    R = 6371.0 # Earth radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def generate_interpolated_geometry(lat1: float, lon1: float, lat2: float, lon2: float, steps: int = 8) -> List[List[float]]:
    """Generate intermediate coordinates for map rendering."""
    geom = []
    for i in range(steps + 1):
        frac = i / steps
        # Add slight realistic curvature
        curvature = 0.15 * math.sin(frac * math.pi) * (0.5 if (lat1 + lon1) % 2 == 0 else -0.5)
        curv_lat = lat1 + (lat2 - lat1) * frac + curvature
        curv_lon = lon1 + (lon2 - lon1) * frac + curvature * 0.5
        geom.append([round(curv_lat, 4), round(curv_lon, 4)])
    return geom

def fetch_osrm_road_route(
    origin_city: str,
    destination_city: str,
    max_retries: int = 1,
    allow_fallback: bool = True
) -> Tuple[float, float, List[List[float]]]:
    """
    Fetch road route distance (km), transit time (hr), and geometry from OSRM.
    Falls back to deterministic highway synthesis on network failure if allow_fallback=True.
    """
    checkpoints = load_checkpoints()
    if origin_city not in checkpoints:
        raise ValueError(f"Origin city '{origin_city}' not found in checkpoints.")
    if destination_city not in checkpoints:
        raise ValueError(f"Destination city '{destination_city}' not found in checkpoints.")

    orig = checkpoints[origin_city]
    dest = checkpoints[destination_city]
    
    # Coordinates in OSRM are lon,lat
    lon1, lat1 = orig["lon"], orig["lat"]
    lon2, lat2 = dest["lon"], dest["lat"]

    url = f"{settings.osrm_base_url}/route/v1/driving/{lon1},{lat1};{lon2},{lat2}?overview=simplified&geometries=geojson"
    
    for attempt in range(max_retries + 1):
        try:
            with httpx.Client(timeout=settings.osrm_timeout_seconds) as client:
                response = client.get(url)
                if response.status_code == 200:
                    data = response.json()
                    routes = data.get("routes", [])
                    if routes:
                        route = routes[0]
                        distance_km = round(route.get("distance", 0.0) / 1000.0, 2)
                        duration_hr = round(route.get("duration", 0.0) / 3600.0, 2)
                        coords = route.get("geometry", {}).get("coordinates", [])
                        # GeoJSON coordinates are [lon, lat] -> convert to [lat, lon] for Leaflet
                        geometry = [[round(pt[1], 4), round(pt[0], 4)] for pt in coords]
                        return distance_km, duration_hr, geometry
        except Exception:
            if attempt < max_retries:
                time.sleep(0.3 * (attempt + 1))
                continue
            elif not allow_fallback:
                raise RoutingProviderUnavailableError(
                    f"OSRM routing failed for corridor {origin_city} -> {destination_city}"
                )
    
    if not allow_fallback:
        raise RoutingProviderUnavailableError(
            f"OSRM routing returned invalid response for {origin_city} -> {destination_city}"
        )
    
    # Deterministic Fallback: Haversine distance with 1.25 road detour factor & 55 km/h avg speed
    direct_km = haversine_distance(lat1, lon1, lat2, lon2)
    road_km = round(max(direct_km * 1.25, 15.0), 2)
    avg_speed_kmh = 55.0
    transit_hr = round(road_km / avg_speed_kmh, 2)
    geometry = generate_interpolated_geometry(lat1, lon1, lat2, lon2)
    
    return road_km, transit_hr, geometry

def compute_road_leg(shipment: Shipment) -> RoadLeg:
    """
    Computes road routing metrics, vehicle requirement, cost, and delay probability.
    """
    distance_km, transit_time_hr, geometry = fetch_osrm_road_route(
        shipment.origin, shipment.destination, allow_fallback=True
    )
    
    # Truck calculation: Standard 10-ton (10,000 kg), 30 m3 capacity
    trucks_by_weight = math.ceil(shipment.weight_kg / 10000.0)
    trucks_by_vol = math.ceil(shipment.volume_m3 / 30.0)
    num_trucks = max(trucks_by_weight, trucks_by_vol, 1)
    
    # Road cost: ₹32 - ₹38 / km per truck based on cold chain refrigeration requirement
    base_rate_per_km = 38.0 if shipment.shipment_class == "A" else 32.0
    cost_per_truck = round(distance_km * base_rate_per_km, 2)
    total_cost = round(cost_per_truck * num_trucks, 2)
    
    # Delay probability: Bounded linear scale with distance (0.05 to 0.20)
    delay_prob = round(min(0.25, max(0.04, 0.04 + (distance_km / 10000.0))), 3)
    
    return RoadLeg(
        mode="road",
        origin=shipment.origin,
        destination=shipment.destination,
        distance_km=distance_km,
        transit_time_hr=transit_time_hr,
        delay_probability=delay_prob,
        num_trucks=num_trucks,
        cost_per_truck=cost_per_truck,
        total_cost=total_cost,
        geometry=geometry
    )
