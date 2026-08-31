import time
from typing import List, Dict, Any, Optional
from ortools.sat.python import cp_model

from backend.app.models.plan_models import CandidatePlan, ShipmentPlanDetail
from backend.app.engine.risk import calculate_risk
from backend.app.engine.grouping_scheduler import compute_consolidation_groupings
from backend.app.core.exceptions import OptimizationInfeasibleError

SCENARIOS = [
    {"label": "Cheapest", "alpha": 0.90, "beta": 0.10},
    {"label": "Fastest / Lowest-Risk", "alpha": 0.20, "beta": 0.80},
    {"label": "Balanced", "alpha": 0.55, "beta": 0.45},
]

def solve_multimodal_plans(
    candidates: List[Dict[str, Any]],
    simulated_temp_c: Optional[float] = None
) -> List[CandidatePlan]:
    """
    Solves 3 Pareto-optimal candidate plans (Cheapest, Fastest/Lowest-Risk, Balanced)
    using OR-Tools CP-SAT with weighted objective minimization.
    """
    if not candidates:
        return []

    # Pre-evaluate candidates under given simulation temperature
    evaluated_candidates = []
    for item in candidates:
        shipment = item["shipment"]
        road_leg = item["road_leg"]
        rail_leg = item.get("rail_leg")

        road_risk = (
            calculate_risk(shipment, road_leg, simulated_temp_c)
            if simulated_temp_c is not None or "road_risk" not in item
            else item["road_risk"]
        )
        
        rail_risk = None
        if rail_leg is not None:
            rail_risk = (
                calculate_risk(shipment, rail_leg, simulated_temp_c)
                if simulated_temp_c is not None or "rail_risk" not in item
                else item["rail_risk"]
            )

        evaluated_candidates.append({
            "shipment": shipment,
            "road_leg": road_leg,
            "road_risk": road_risk,
            "rail_leg": rail_leg,
            "rail_risk": rail_risk
        })

    plans: List[CandidatePlan] = []

    for scenario in SCENARIOS:
        label = scenario["label"]
        alpha = scenario["alpha"]
        beta = scenario["beta"]

        model = cp_model.CpModel()
        x_road = {}
        x_rail = {}

        obj_terms = []

        for c in evaluated_candidates:
            sid = c["shipment"].shipment_id
            x_road[sid] = model.NewBoolVar(f"x_road_{sid}")
            x_rail[sid] = model.NewBoolVar(f"x_rail_{sid}")

            if c["rail_leg"] is None:
                model.Add(x_rail[sid] == 0)
                model.Add(x_road[sid] == 1)
            else:
                model.Add(x_road[sid] + x_rail[sid] == 1)

            # Road objective term
            road_cost = c["road_leg"].total_cost
            road_loss = c["road_risk"].expected_loss
            road_obj = int(round((alpha * road_cost + beta * road_loss) * 100))
            obj_terms.append(road_obj * x_road[sid])

            # Rail objective term
            if c["rail_leg"] is not None and c["rail_risk"] is not None:
                rail_cost = c["rail_leg"].total_cost
                rail_loss = c["rail_risk"].expected_loss
                rail_obj = int(round((alpha * rail_cost + beta * rail_loss) * 100))
                obj_terms.append(rail_obj * x_rail[sid])

        model.Minimize(sum(obj_terms))

        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = 2.0
        solver.parameters.num_workers = 4

        t_solve_start = time.perf_counter()
        status = solver.Solve(model)
        solve_duration_ms = round((time.perf_counter() - t_solve_start) * 1000.0, 2)

        if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            raise OptimizationInfeasibleError(f"Solver failed to find feasible solution for scenario {label}")

        mode_assignments = {}
        total_freight_cost = 0.0
        total_expected_loss = 0.0
        max_transit_time = 0.0
        shipment_details = []

        for c in evaluated_candidates:
            sid = c["shipment"].shipment_id
            is_road = bool(solver.Value(x_road[sid]))
            chosen_mode = "road" if is_road else "rail"
            mode_assignments[sid] = chosen_mode

            if is_road:
                leg = c["road_leg"]
                risk = c["road_risk"]
                desc = f"Direct Highway Road Transport ({c['shipment'].origin} -> {c['shipment'].destination})"
                geom = leg.geometry
                transfer_hubs = []
                time_hr = leg.transit_time_hr
            else:
                leg = c["rail_leg"]
                risk = c["rail_risk"]
                hubs_str = " -> ".join(leg.transfer_hubs) if leg.transfer_hubs else "Hub Network"
                desc = f"Multimodal Rail Transport via {hubs_str} ({c['shipment'].origin} -> {c['shipment'].destination})"
                geom = leg.geometry
                transfer_hubs = leg.transfer_hubs
                time_hr = leg.transit_time_hr + leg.dwell_time_hr

            total_freight_cost += leg.total_cost
            total_expected_loss += risk.expected_loss
            if time_hr > max_transit_time:
                max_transit_time = time_hr

            shipment_details.append(
                ShipmentPlanDetail(
                    shipment_id=sid,
                    selected_mode=chosen_mode,
                    transit_time_hr=round(time_hr, 2),
                    freight_cost=round(leg.total_cost, 2),
                    expected_loss=round(risk.expected_loss, 2),
                    risk_score=round(risk.risk_score, 4),
                    breakdown=risk.breakdown,
                    route_description=desc,
                    geometry=geom,
                    transfer_hubs=transfer_hubs
                )
            )

        total_freight_cost = round(total_freight_cost, 2)
        total_expected_loss = round(total_expected_loss, 2)
        total_cost = round(total_freight_cost + total_expected_loss, 2)

        groupings = compute_consolidation_groupings(shipment_details, mode_assignments)

        plan = CandidatePlan(
            label=label,
            alpha=alpha,
            beta=beta,
            freight_cost=total_freight_cost,
            expected_loss=total_expected_loss,
            total_cost=total_cost,
            eta_hr=round(max_transit_time, 2),
            groupings=groupings,
            shipment_details=shipment_details,
            solve_time_ms=solve_duration_ms,
            mode_assignments=mode_assignments
        )
        plans.append(plan)

    return plans
