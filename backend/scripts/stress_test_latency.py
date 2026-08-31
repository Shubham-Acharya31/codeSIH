import sys
import time
import json
from pathlib import Path
import statistics

# Ensure backend root is on sys.path
BASE_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(BASE_DIR))

from backend.app.engine.input_entry import prepare_batch_candidates
from backend.app.engine.optimization_engine import solve_multimodal_plans

def run_stress_test(iterations: int = 20):
    data_file = BASE_DIR / "backend" / "data" / "seed_shipments.json"
    with open(data_file, "r", encoding="utf-8") as f:
        shipment_data = json.load(f)
        
    print(f"=== Running CP-SAT Optimization Stress Benchmark ({iterations} solves) ===")
    print("Preparing modal candidates for 6 seed shipments...")
    candidates = prepare_batch_candidates(shipment_data)
    
    latencies_ms = []
    
    for i in range(iterations):
        t0 = time.perf_counter()
        plans = solve_multimodal_plans(candidates)
        t_elapsed = (time.perf_counter() - t0) * 1000.0
        latencies_ms.append(t_elapsed)
        print(f"Iteration {i+1:02d}/{iterations}: {t_elapsed:.2f} ms (Plans generated: {len(plans)})")
        
    latencies_ms.sort()
    p50 = statistics.median(latencies_ms)
    p95 = latencies_ms[int(len(latencies_ms) * 0.95)]
    p99 = latencies_ms[int(len(latencies_ms) * 0.99)] if len(latencies_ms) >= 100 else latencies_ms[-1]
    avg = statistics.mean(latencies_ms)
    
    print("\n--- Latency Benchmark Summary ---")
    print(f"Iterations: {iterations}")
    print(f"Mean Latency: {avg:.2f} ms")
    print(f"p50 Latency : {p50:.2f} ms")
    print(f"p95 Latency : {p95:.2f} ms")
    print(f"p99 Latency : {p99:.2f} ms")
    print(f"Min Latency : {latencies_ms[0]:.2f} ms")
    print(f"Max Latency : {latencies_ms[-1]:.2f} ms")
    
    assert p95 < 2000.0, f"p95 latency ({p95:.2f} ms) exceeds 2000 ms budget!"
    print("\n>>> SUCCESS: All solve iterations comfortably beat the sub-2-second target limit! <<<\n")

if __name__ == "__main__":
    run_stress_test(20)
