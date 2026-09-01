import json
import math
import time
from pathlib import Path
from typing import Tuple, List, Dict, Any, Optional
import httpx

from backend.app.models.shipment import Shipment
from backend.app.models.legs import RoadLeg
from backend.app.core.exceptions import RoutingProviderUnavailableError, InvalidShipmentPayloadError
from backend.app.config import settings, transport_config

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"

def load_checkpoints(extra_checkpoints: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Load base network checkpoints combined with optional dynamic checkpoints."""
    with open(DATA_DIR / "checkpoints_geocoded.json", "r", encoding="utf-8") as f:
        checkpoints = json.load(f)
    if extra_checkpoints:
        for k, v in extra_checkpoints.items():
            if isinstance(v, dict):
                checkpoints[k] = v
            elif hasattr(v, "model_dump"):
                checkpoints[k] = v.model_dump()
    return checkpoints

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great-circle distance between two points in km."""
    R = 6371.0  # Earth radius in kilometers
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
        curvature = 0.15 * math.sin(frac * math.pi) * (0.5 if (lat1 + lon1) % 2 == 0 else -0.5)
        curv_lat = lat1 + (lat2 - lat1) * frac + curvature
        curv_lon = lon1 + (lon2 - lon1) * frac + curvature * 0.5
        geom.append([round(curv_lat, 4), round(curv_lon, 4)])
    return geom

def fetch_osrm_road_route(
    origin_city: str,
    destination_city: str,
    max_retries: Optional[int] = None,
    allow_fallback: bool = True,
    extra_checkpoints: Optional[Dict[str, Any]] = None
) -> Tuple[float, float, List[List[float]]]:
    """
    Fetch road route distance (km), transit time (hr), and geometry from OSRM.
    Falls back to deterministic highway synthesis on network failure if allow_fallback=True.
    """
    retries = max_retries if max_retries is not None else settings.osrm_max_retries
    checkpoints = load_checkpoints(extra_checkpoints)
    if origin_city not in checkpoints:
        raise InvalidShipmentPayloadError(f"Origin city '{origin_city}' not found in checkpoints network.")
    if destination_city not in checkpoints:
        raise InvalidShipmentPayloadError(f"Destination city '{destination_city}' not found in checkpoints network.")

    orig = checkpoints[origin_city]
    dest = checkpoints[destination_city]
    
    # Coordinates in OSRM are lon,lat
    lon1, lat1 = orig["lon"], orig["lat"]
    lon2, lat2 = dest["lon"], dest["lat"]

    url = f"{settings.osrm_base_url}/route/v1/driving/{lon1},{lat1};{lon2},{lat2}?overview=simplified&geometries=geojson"
    
    for attempt in range(retries + 1):
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
                        geometry = [[round(pt[1], 4), round(pt[0], 4)] for pt in coords]
                        return distance_km, duration_hr, geometry
        except Exception:
            if attempt < retries:
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
    
    # Centralized deterministic Fallback: Haversine distance with configurable detour factor & speed
    direct_km = haversine_distance(lat1, lon1, lat2, lon2)
    road_km = round(max(direct_km * transport_config.road.detour_factor, transport_config.road.min_distance_km), 2)
    avg_speed = transport_config.road.avg_speed_kmh
    transit_hr = round(road_km / avg_speed, 2)
    geometry = generate_interpolated_geometry(lat1, lon1, lat2, lon2)
    
    return road_km, transit_hr, geometry

def compute_road_leg(
    shipment: Shipment,
    extra_checkpoints: Optional[Dict[str, Any]] = None
) -> RoadLeg:
    """
    Computes road routing metrics, vehicle requirement, cost, and delay probability
    using centralized transport configuration.
    """
    distance_km, transit_time_hr, geometry = fetch_osrm_road_route(
        shipment.origin, shipment.destination, allow_fallback=True, extra_checkpoints=extra_checkpoints
    )
    
    road_cfg = transport_config.road
    
    # Truck calculation: Standard capacity from centralized config
    trucks_by_weight = math.ceil(shipment.weight_kg / road_cfg.truck_capacity_kg)
    trucks_by_vol = math.ceil(shipment.volume_m3 / road_cfg.truck_capacity_m3)
    num_trucks = max(trucks_by_weight, trucks_by_vol, 1)
    
    # Road cost: rate based on cold chain refrigeration requirement
    base_rate = road_cfg.base_rate_per_km_class_a if shipment.shipment_class == "A" else road_cfg.base_rate_per_km_class_b
    cost_per_truck = round(distance_km * base_rate, 2)
    total_cost = round(cost_per_truck * num_trucks, 2)
    
    # Delay probability: Configurable bounded linear scale with distance
    raw_delay = road_cfg.delay_prob_base + (distance_km / road_cfg.delay_prob_scale_km)
    delay_prob = round(min(road_cfg.delay_prob_max, max(road_cfg.delay_prob_min, raw_delay)), 3)
    
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
