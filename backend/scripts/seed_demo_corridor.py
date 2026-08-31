import sys
import json
from pathlib import Path

# Ensure UTF-8 output on Windows terminals
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

BASE_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(BASE_DIR))

from backend.app.repository.shipment_repository import shipment_repository
from backend.app.engine.orchestrator import run_consolidation_pipeline

def seed_and_verify_demo():
    print("=== Multimodal Consolidation Engine Demo Setup ===")
    shipments = shipment_repository.list_shipments()
    print(f"Loaded {len(shipments)} seed shipments:")
    for s in shipments:
        print(f"  - [{s.shipment_id}] {s.product_category} (Class {s.shipment_class}) | {s.origin} -> {s.destination} | Value: INR {s.cargo_value:,.2f}")
    
    print("\nRunning test plan generation across 5-hub network...")
    result = run_consolidation_pipeline()
    print(f"Successfully generated {len(result['plans'])} candidate plans in {result['execution_time_ms']} ms:")
    for p in result["plans"]:
        print(f"\n[{p.label.upper()}] (Alpha: {p.alpha}, Beta: {p.beta})")
        print(f"  Freight Cost  : INR {p.freight_cost:,.2f}")
        print(f"  Expected Loss : INR {p.expected_loss:,.2f}")
        print(f"  Total Cost    : INR {p.total_cost:,.2f}")
        print(f"  Max ETA       : {p.eta_hr:.1f} hrs")
        print(f"  Groupings     : {', '.join(p.groupings)}")
        print(f"  Mode Split    : {p.mode_assignments}")
    
    print("\nDemo corridor setup verified successfully!")

if __name__ == "__main__":
    seed_and_verify_demo()
