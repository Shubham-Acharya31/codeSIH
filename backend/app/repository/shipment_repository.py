import json
from pathlib import Path
from typing import List, Optional, Dict, Any
from backend.app.models.shipment import Shipment

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"

class ShipmentRepository:
    """
    Data-access layer abstracting seed JSON data stores.
    Enables zero-friction replacement with relational SQL / document DB later.
    """
    def __init__(self, data_dir: Optional[Path] = None):
        self.data_dir = data_dir or DATA_DIR
        self._seed_file = self.data_dir / "seed_shipments.json"
        self._checkpoints_file = self.data_dir / "checkpoints_geocoded.json"
        self._decay_file = self.data_dir / "decay_constants.json"
        self._dwell_file = self.data_dir / "dwell_time_matrix.json"
        self._graph_file = self.data_dir / "rail_station_graph.json"
        self._schedules_file = self.data_dir / "rail_schedules.json"

    def list_shipments(self) -> List[Shipment]:
        if not self._seed_file.exists():
            return []
        with open(self._seed_file, "r", encoding="utf-8") as f:
            raw_data = json.load(f)
        return [Shipment(**item) for item in raw_data]

    def get_shipment(self, shipment_id: str) -> Optional[Shipment]:
        shipments = self.list_shipments()
        for s in shipments:
            if s.shipment_id == shipment_id:
                return s
        return None

    def get_checkpoints(self) -> Dict[str, Any]:
        with open(self._checkpoints_file, "r", encoding="utf-8") as f:
            return json.load(f)

    def get_decay_constants(self) -> Dict[str, Any]:
        with open(self._decay_file, "r", encoding="utf-8") as f:
            return json.load(f)

    def get_dwell_matrix(self) -> Dict[str, Any]:
        with open(self._dwell_file, "r", encoding="utf-8") as f:
            return json.load(f)

    def get_rail_graph(self) -> Dict[str, Any]:
        with open(self._graph_file, "r", encoding="utf-8") as f:
            return json.load(f)

    def get_rail_schedules(self) -> Dict[str, Any]:
        with open(self._schedules_file, "r", encoding="utf-8") as f:
            return json.load(f)

shipment_repository = ShipmentRepository()
