import json
import sqlite3
from pathlib import Path
from typing import List, Optional, Dict, Any, Union
from datetime import datetime, timezone, timedelta
from backend.app.models.shipment import Shipment

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"

class ShipmentRepository:
    """
    Data-access layer providing persistent SQLite storage for consignments
    and live tracking timeline events, with automatic fallback/seeding from seed_shipments.json.
    """
    def __init__(self, data_dir: Optional[Path] = None, db_filename: str = "freight.db"):
        self.data_dir = data_dir or DATA_DIR
        self.db_path = self.data_dir / db_filename
        self._seed_file = self.data_dir / "seed_shipments.json"
        self._checkpoints_file = self.data_dir / "checkpoints_geocoded.json"
        self._decay_file = self.data_dir / "decay_constants.json"
        self._dwell_file = self.data_dir / "dwell_time_matrix.json"
        self._graph_file = self.data_dir / "rail_station_graph.json"
        self._schedules_file = self.data_dir / "rail_schedules.json"
        
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        """Initializes tables and seeds initial data if database is empty."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS consignments (
                    shipment_id TEXT PRIMARY KEY,
                    origin TEXT NOT NULL,
                    destination TEXT NOT NULL,
                    weight_kg REAL NOT NULL,
                    volume_m3 REAL NOT NULL,
                    deadline TEXT NOT NULL,
                    cargo_value REAL NOT NULL,
                    product_category TEXT NOT NULL,
                    shipment_class TEXT NOT NULL,
                    class_a_json TEXT,
                    class_b_json TEXT,
                    status TEXT NOT NULL DEFAULT 'PENDING',
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    dispatched_at TEXT,
                    assigned_plan_scenario TEXT,
                    assigned_plan_id TEXT,
                    route_summary TEXT
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS consignment_timeline_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    shipment_id TEXT NOT NULL,
                    event_seq INTEGER NOT NULL,
                    event_type TEXT NOT NULL,
                    title TEXT NOT NULL,
                    description TEXT NOT NULL,
                    location TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    status TEXT NOT NULL,
                    temperature_c REAL,
                    dwell_time_hr REAL,
                    carrier_details TEXT,
                    eta TEXT,
                    FOREIGN KEY(shipment_id) REFERENCES consignments(shipment_id) ON DELETE CASCADE
                )
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_timeline_shipment ON consignment_timeline_events(shipment_id, event_seq)")
            conn.commit()

            # Check if consignments table is empty; if so, auto-seed from seed_shipments.json
            cursor.execute("SELECT COUNT(*) as cnt FROM consignments")
            row = cursor.fetchone()
            if row and row["cnt"] == 0:
                self._seed_initial_data(conn)

    def _seed_initial_data(self, conn: sqlite3.Connection) -> None:
        """Seeds initial consignments from seed_shipments.json."""
        if not self._seed_file.exists():
            return
        with open(self._seed_file, "r", encoding="utf-8") as f:
            raw_data = json.load(f)

        now_iso = datetime.now(timezone.utc).isoformat()
        cursor = conn.cursor()
        for item in raw_data:
            s = Shipment(**item)
            class_a_str = json.dumps(s.class_a.model_dump(mode="json")) if s.class_a else None
            class_b_str = json.dumps(s.class_b.model_dump(mode="json")) if s.class_b else None
            
            cursor.execute("""
                INSERT OR REPLACE INTO consignments (
                    shipment_id, origin, destination, weight_kg, volume_m3, deadline,
                    cargo_value, product_category, shipment_class, class_a_json, class_b_json,
                    status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                s.shipment_id, s.origin, s.destination, s.weight_kg, s.volume_m3,
                s.deadline.isoformat(), s.cargo_value, s.product_category, s.shipment_class,
                class_a_str, class_b_str, "PENDING", now_iso, now_iso
            ))

            # Add initial intake event
            cursor.execute("""
                INSERT INTO consignment_timeline_events (
                    shipment_id, event_seq, event_type, title, description,
                    location, timestamp, status, temperature_c, carrier_details
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                s.shipment_id, 0, "BOOKED", "Consignment Booked & Intake Verified",
                f"Cargo verified at origin facility. Weight: {s.weight_kg:,.0f} kg, Volume: {s.volume_m3} m³. Class {s.shipment_class} specifications locked.",
                s.origin, now_iso, "COMPLETED",
                s.class_a.temperature_min if s.class_a else None,
                "Station Intake Terminal"
            ))
        conn.commit()

    def _row_to_shipment(self, row: sqlite3.Row) -> Shipment:
        class_a_dict = json.loads(row["class_a_json"]) if row["class_a_json"] else None
        class_b_dict = json.loads(row["class_b_json"]) if row["class_b_json"] else None
        return Shipment(
            shipment_id=row["shipment_id"],
            origin=row["origin"],
            destination=row["destination"],
            weight_kg=row["weight_kg"],
            volume_m3=row["volume_m3"],
            deadline=row["deadline"],
            cargo_value=row["cargo_value"],
            product_category=row["product_category"],
            shipment_class=row["shipment_class"],
            class_a=class_a_dict,
            class_b=class_b_dict
        )

    def _row_to_record(self, row: sqlite3.Row) -> Dict[str, Any]:
        s = self._row_to_shipment(row)
        d = s.model_dump(mode="json")
        d.update({
            "status": row["status"],
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
            "dispatched_at": row["dispatched_at"],
            "assigned_plan_scenario": row["assigned_plan_scenario"],
            "assigned_plan_id": row["assigned_plan_id"],
            "route_summary": row["route_summary"]
        })
        return d

    def list_shipments(self, status_filter: Optional[str] = None) -> List[Shipment]:
        """Returns standard Shipment instances (compatible with OR-Tools engine & legacy callers)."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            if status_filter:
                cursor.execute("SELECT * FROM consignments WHERE status = ? ORDER BY created_at ASC", (status_filter,))
            else:
                cursor.execute("SELECT * FROM consignments ORDER BY created_at ASC")
            rows = cursor.fetchall()
            return [self._row_to_shipment(r) for r in rows]

    def list_shipment_records(self, status_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        """Returns rich consignment records with live status, timestamps, and route metadata."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            if status_filter:
                cursor.execute("SELECT * FROM consignments WHERE status = ? ORDER BY created_at ASC", (status_filter,))
            else:
                cursor.execute("SELECT * FROM consignments ORDER BY created_at ASC")
            rows = cursor.fetchall()
            return [self._row_to_record(r) for r in rows]

    def get_shipment(self, shipment_id: str) -> Optional[Shipment]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM consignments WHERE shipment_id = ?", (shipment_id,))
            row = cursor.fetchone()
            return self._row_to_shipment(row) if row else None

    def get_shipment_record(self, shipment_id: str) -> Optional[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM consignments WHERE shipment_id = ?", (shipment_id,))
            row = cursor.fetchone()
            return self._row_to_record(row) if row else None

    def create_shipment(self, shipment: Shipment) -> Shipment:
        now_iso = datetime.now(timezone.utc).isoformat()
        class_a_str = json.dumps(shipment.class_a.model_dump(mode="json")) if shipment.class_a else None
        class_b_str = json.dumps(shipment.class_b.model_dump(mode="json")) if shipment.class_b else None

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO consignments (
                    shipment_id, origin, destination, weight_kg, volume_m3, deadline,
                    cargo_value, product_category, shipment_class, class_a_json, class_b_json,
                    status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                shipment.shipment_id, shipment.origin, shipment.destination,
                shipment.weight_kg, shipment.volume_m3, shipment.deadline.isoformat(),
                shipment.cargo_value, shipment.product_category, shipment.shipment_class,
                class_a_str, class_b_str, "PENDING", now_iso, now_iso
            ))

            # Initial timeline milestone
            cursor.execute("""
                INSERT INTO consignment_timeline_events (
                    shipment_id, event_seq, event_type, title, description,
                    location, timestamp, status, temperature_c, carrier_details
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                shipment.shipment_id, 0, "BOOKED", "Consignment Booked & Intake Verified",
                f"Intake registered at {shipment.origin}. Cargo: {shipment.product_category}, {shipment.weight_kg:,.0f} kg.",
                shipment.origin, now_iso, "COMPLETED",
                shipment.class_a.temperature_min if shipment.class_a else None,
                "Intake Weighbridge Terminal"
            ))
            conn.commit()

        return shipment

    def update_shipment(self, shipment_id: str, shipment: Shipment) -> Optional[Shipment]:
        now_iso = datetime.now(timezone.utc).isoformat()
        class_a_str = json.dumps(shipment.class_a.model_dump(mode="json")) if shipment.class_a else None
        class_b_str = json.dumps(shipment.class_b.model_dump(mode="json")) if shipment.class_b else None

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT shipment_id FROM consignments WHERE shipment_id = ?", (shipment_id,))
            if not cursor.fetchone():
                return None

            cursor.execute("""
                UPDATE consignments SET
                    origin = ?, destination = ?, weight_kg = ?, volume_m3 = ?,
                    deadline = ?, cargo_value = ?, product_category = ?,
                    shipment_class = ?, class_a_json = ?, class_b_json = ?,
                    updated_at = ?
                WHERE shipment_id = ?
            """, (
                shipment.origin, shipment.destination, shipment.weight_kg,
                shipment.volume_m3, shipment.deadline.isoformat(), shipment.cargo_value,
                shipment.product_category, shipment.shipment_class,
                class_a_str, class_b_str, now_iso, shipment_id
            ))

            # Add an update log into timeline
            cursor.execute("SELECT COALESCE(MAX(event_seq), 0) + 1 as next_seq FROM consignment_timeline_events WHERE shipment_id = ?", (shipment_id,))
            next_seq = cursor.fetchone()["next_seq"]
            cursor.execute("""
                INSERT INTO consignment_timeline_events (
                    shipment_id, event_seq, event_type, title, description,
                    location, timestamp, status, carrier_details
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                shipment_id, next_seq, "UPDATED", "Specifications Modified",
                f"Consignment parameters updated. Weight: {shipment.weight_kg:,.0f} kg, Value: ₹{shipment.cargo_value:,.0f}.",
                shipment.origin, now_iso, "COMPLETED", "Terminal Operations Log"
            ))
            conn.commit()

        return shipment

    def delete_shipment(self, shipment_id: str) -> bool:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT shipment_id FROM consignments WHERE shipment_id = ?", (shipment_id,))
            if not cursor.fetchone():
                return False

            cursor.execute("DELETE FROM consignment_timeline_events WHERE shipment_id = ?", (shipment_id,))
            cursor.execute("DELETE FROM consignments WHERE shipment_id = ?", (shipment_id,))
            conn.commit()
            return True

    def reset_to_seed(self) -> List[Shipment]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM consignment_timeline_events")
            cursor.execute("DELETE FROM consignments")
            conn.commit()
            self._seed_initial_data(conn)
        return self.list_shipments()

    # -------------------------------------------------------------
    # Timeline & Dispatch Management
    # -------------------------------------------------------------

    def get_timeline(self, shipment_id: str) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM consignment_timeline_events
                WHERE shipment_id = ?
                ORDER BY event_seq ASC, id ASC
            """, (shipment_id,))
            rows = cursor.fetchall()
            return [dict(r) for r in rows]

    def dispatch_shipment(
        self,
        shipment_id: str,
        scenario_label: str = "Direct Dispatch",
        plan_data: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """Dispatches an individual consignment and generates its route timeline."""
        shipment = self.get_shipment(shipment_id)
        if not shipment:
            return []

        now = datetime.now(timezone.utc)
        now_iso = now.isoformat()
        is_class_a = shipment.shipment_class == "A"
        nominal_temp = (
            (shipment.class_a.temperature_min + shipment.class_a.temperature_max) / 2.0
            if is_class_a and shipment.class_a
            else None
        )

        mode = plan_data.get("selected_mode", "rail") if plan_data else "rail"
        hubs = plan_data.get("transfer_hubs", []) if plan_data else []

        with self._get_connection() as conn:
            cursor = conn.cursor()
            # Clear any future/scheduled events after event 0
            cursor.execute("DELETE FROM consignment_timeline_events WHERE shipment_id = ? AND event_seq > 0", (shipment_id,))

            milestones = []
            if mode == "rail" and hubs and len(hubs) >= 1:
                origin_hub = hubs[0]
                dest_hub = hubs[-1]
                
                # 1. Feeder road dispatch
                t1 = now
                milestones.append((
                    1, "FIRST_MILE_ROAD", "First-Mile Road Feeder Dispatched",
                    f"Refrigerated Feeder truck departed {shipment.origin} towards {origin_hub} Rail Terminal.",
                    shipment.origin, t1.isoformat(), "COMPLETED", nominal_temp, 0.0,
                    "Tata Prima 4028 Reefer Feeder (Truck #GJ-03-TR-9102)", (t1 + timedelta(hours=3)).isoformat()
                ))

                # 2. Hub Cross-dock & Consolidation
                t2 = t1 + timedelta(hours=3)
                milestones.append((
                    2, "HUB_CROSSDOCK", f"Intermodal Consolidation at {origin_hub}",
                    f"Arrived at {origin_hub} Freight Yard. Palletized and coupled into Indian Railways BTPN/Container Rake.",
                    origin_hub, t2.isoformat(), "ACTIVE", nominal_temp, 1.5,
                    "Indian Railways Yard Cross-Dock Terminal", (t2 + timedelta(hours=6)).isoformat()
                ))

                # 3. Multimodal Rail Line-Haul
                t3 = t2 + timedelta(hours=4)
                milestones.append((
                    3, "RAIL_TRANSIT", f"Electric Rail Trunk Line-Haul ({origin_hub} → {dest_hub})",
                    f"Departed on Dedicated Rail Freight Corridor via Electric WAG-9 Locomotive #IR-4091. Continuous IoT telematics active.",
                    f"En route to {dest_hub}", t3.isoformat(), "SCHEDULED", nominal_temp, 0.0,
                    "Indian Railways Freight Service Rake #IR-4091", (t3 + timedelta(hours=14)).isoformat()
                ))

                # 4. Destination Hub Arrival
                t4 = t3 + timedelta(hours=14)
                milestones.append((
                    4, "DESTINATION_HUB", f"Arrival & De-coupling at {dest_hub}",
                    f"Arrived at {dest_hub} Logistics Terminal. Unloaded from rake to destination sorting bay.",
                    dest_hub, t4.isoformat(), "SCHEDULED", nominal_temp, 1.0,
                    f"{dest_hub} Intermodal Transshipment Terminal", (t4 + timedelta(hours=4)).isoformat()
                ))

                # 5. Last-Mile Delivery
                t5 = t4 + timedelta(hours=3)
                milestones.append((
                    5, "LAST_MILE_DELIVERY", f"Last-Mile Feeder to {shipment.destination}",
                    f"Loaded onto local refrigerated van for final delivery to consignee gate in {shipment.destination}.",
                    shipment.destination, t5.isoformat(), "SCHEDULED", nominal_temp, 0.0,
                    "Local Express Distribution Logistics", (t5 + timedelta(hours=3)).isoformat()
                ))

                # 6. Delivered
                t6 = t5 + timedelta(hours=3)
                milestones.append((
                    6, "DELIVERED", "Consignee Handover & Compliance Signed",
                    f"Successfully delivered to recipient at {shipment.destination}. Cold-chain & SLA compliance verified.",
                    shipment.destination, t6.isoformat(), "SCHEDULED", nominal_temp, 0.0,
                    "Consignee Receiving Bay", t6.isoformat()
                ))
            else:
                # Direct Road Route
                t1 = now
                milestones.append((
                    1, "DISPATCHED", "Direct Express Highway Feeder Dispatched",
                    f"High-speed highway transit vehicle departed {shipment.origin} toward {shipment.destination}.",
                    shipment.origin, t1.isoformat(), "COMPLETED", nominal_temp, 0.0,
                    "Interstate Logistics Carrier (Vehicle #DL-01-AB-4412)", (t1 + timedelta(hours=6)).isoformat()
                ))

                t2 = t1 + timedelta(hours=5)
                milestones.append((
                    2, "HIGHWAY_TRANSIT", "Corridor Highway Transit Checkpoint",
                    f"Vehicle passing interstate highway tollway checkpoint. IoT telemetry confirmed normal.",
                    f"Interstate Highway Corridor ({shipment.origin} - {shipment.destination})",
                    t2.isoformat(), "ACTIVE", nominal_temp, 0.5,
                    "Interstate Logistics Carrier", (t2 + timedelta(hours=8)).isoformat()
                ))

                t3 = t2 + timedelta(hours=7)
                milestones.append((
                    3, "DELIVERED", "Final Consignee Delivery Handover",
                    f"Consignment received and signed at {shipment.destination} destination warehouse.",
                    shipment.destination, t3.isoformat(), "SCHEDULED", nominal_temp, 0.0,
                    "Consignee Receiving Bay", t3.isoformat()
                ))

            for m in milestones:
                cursor.execute("""
                    INSERT INTO consignment_timeline_events (
                        shipment_id, event_seq, event_type, title, description,
                        location, timestamp, status, temperature_c, dwell_time_hr,
                        carrier_details, eta
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (shipment_id, *m))

            # Update consignment status
            effective_mode = "rail" if (mode == "rail" and hubs and len(hubs) >= 1) else "road"
            route_desc = f"RAIL via {', '.join(hubs)}" if (effective_mode == "rail" and hubs) else "DIRECT ROAD"
            cursor.execute("""
                UPDATE consignments SET
                    status = 'IN_TRANSIT',
                    dispatched_at = ?,
                    assigned_plan_scenario = ?,
                    route_summary = ?,
                    updated_at = ?
                WHERE shipment_id = ?
            """, (now_iso, scenario_label, route_desc, now_iso, shipment_id))
            conn.commit()

        return self.get_timeline(shipment_id)

    def dispatch_plan(
        self,
        scenario_label: str,
        shipment_ids: List[str],
        plan_details: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """Dispatches an entire consolidation plan, updating all participating shipments."""
        details_by_id = {}
        if plan_details:
            for d in plan_details:
                sid = d.get("shipment_id")
                if sid:
                    details_by_id[sid] = d

        dispatched_count = 0
        for sid in shipment_ids:
            p_data = details_by_id.get(sid)
            self.dispatch_shipment(sid, scenario_label=scenario_label, plan_data=p_data)
            dispatched_count += 1

        return {
            "success": True,
            "scenario_label": scenario_label,
            "dispatched_count": dispatched_count,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

    def advance_timeline_step(self, shipment_id: str) -> Dict[str, Any]:
        """Advances tracking to the next checkpoint along the corridor."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM consignment_timeline_events
                WHERE shipment_id = ?
                ORDER BY event_seq ASC
            """, (shipment_id,))
            events = cursor.fetchall()
            if not events:
                return {"success": False, "message": "No timeline events found"}

            # Filter to progressive corridor milestones (excluding incident alerts & audit updates)
            milestone_events = [e for e in events if e["event_type"] not in ("EXCURSION_ALERT", "UPDATED")]
            if not milestone_events:
                return {"success": False, "message": "No corridor milestones found to advance"}

            # Find active milestone event
            active_idx = -1
            for idx, e in enumerate(milestone_events):
                if e["status"] == "ACTIVE":
                    active_idx = idx
                    break

            now_iso = datetime.now(timezone.utc).isoformat()

            # Check if consignment has an active EXCURSION alert status
            cursor.execute("SELECT status FROM consignments WHERE shipment_id = ?", (shipment_id,))
            row = cursor.fetchone()
            curr_shipment_status = row["status"] if row else "IN_TRANSIT"
            next_in_transit_status = "EXCURSION" if curr_shipment_status == "EXCURSION" else "IN_TRANSIT"

            if active_idx != -1:
                # Mark current active as COMPLETED
                curr_event_id = milestone_events[active_idx]["id"]
                cursor.execute("UPDATE consignment_timeline_events SET status = 'COMPLETED', timestamp = ? WHERE id = ?", (now_iso, curr_event_id))

                # Check if there is a next milestone event
                if active_idx + 1 < len(milestone_events):
                    next_event_id = milestone_events[active_idx + 1]["id"]
                    cursor.execute("UPDATE consignment_timeline_events SET status = 'ACTIVE', timestamp = ? WHERE id = ?", (now_iso, next_event_id))
                    cursor.execute("UPDATE consignments SET status = ?, updated_at = ? WHERE shipment_id = ?", (next_in_transit_status, now_iso, shipment_id))
                else:
                    # Final delivery milestone completed
                    cursor.execute("UPDATE consignments SET status = 'DELIVERED', updated_at = ? WHERE shipment_id = ?", (now_iso, shipment_id))
            else:
                # If no active milestone event, look for the first SCHEDULED milestone event
                for e in milestone_events:
                    if e["status"] == "SCHEDULED":
                        cursor.execute("UPDATE consignment_timeline_events SET status = 'ACTIVE', timestamp = ? WHERE id = ?", (now_iso, e["id"]))
                        cursor.execute("UPDATE consignments SET status = ?, updated_at = ? WHERE shipment_id = ?", (next_in_transit_status, now_iso, shipment_id))
                        break

            conn.commit()

        updated_timeline = self.get_timeline(shipment_id)
        record = self.get_shipment_record(shipment_id)
        return {
            "success": True,
            "shipment_id": shipment_id,
            "status": record.get("status") if record else "IN_TRANSIT",
            "timeline": updated_timeline
        }

    def simulate_temp_spike(self, shipment_id: str, spike_temp_c: float) -> Dict[str, Any]:
        """Simulates a live IoT temperature excursion spike in transit."""
        now_iso = datetime.now(timezone.utc).isoformat()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COALESCE(MAX(event_seq), 0) + 1 as next_seq FROM consignment_timeline_events WHERE shipment_id = ?", (shipment_id,))
            next_seq = cursor.fetchone()["next_seq"]

            cursor.execute("""
                INSERT INTO consignment_timeline_events (
                    shipment_id, event_seq, event_type, title, description,
                    location, timestamp, status, temperature_c, carrier_details
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                shipment_id, next_seq, "EXCURSION_ALERT", "Cold-Chain Thermal Excursion Alert",
                f"CRITICAL: IoT Sensor reported {spike_temp_c:.1f}°C temperature spike exceeding safe refrigerated threshold! Automatic incident ticket created.",
                "In-Transit Corridor Sensor #SN-8942", now_iso, "ALERT", spike_temp_c,
                "Automated Cold-Chain Telemetry System"
            ))

            cursor.execute("""
                UPDATE consignments SET status = 'EXCURSION', updated_at = ? WHERE shipment_id = ?
            """, (now_iso, shipment_id))
            conn.commit()

        return {
            "success": True,
            "shipment_id": shipment_id,
            "spike_temp_c": spike_temp_c,
            "status": "EXCURSION",
            "timeline": self.get_timeline(shipment_id)
        }

    # -------------------------------------------------------------
    # Static Network Data (Read-Only)
    # -------------------------------------------------------------

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

