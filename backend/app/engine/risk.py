from typing import Union, Optional
from backend.app.models.shipment import Shipment
from backend.app.models.legs import RoadLeg, RailLeg
from backend.app.models.risk_models import RiskScore

def calculate_risk(
    shipment: Shipment,
    leg: Union[RoadLeg, RailLeg],
    simulated_temp_c: Optional[float] = None
) -> RiskScore:
    """
    Evaluates mode-specific risk and expected loss using deterministic physics formulas.
    Guarantees that risk_score, expected_loss, and breakdown string are produced from
    the exact same execution context (Single Source of Truth Rule).
    """
    total_time_hr = leg.transit_time_hr + getattr(leg, "dwell_time_hr", 0.0)

    if shipment.shipment_class == "A":
        attr = shipment.class_a
        t_min = attr.temperature_min
        t_max = attr.temperature_max
        t_optimal = (t_min + t_max) / 2.0
        
        # Determine actual temperature (normal midpoint or simulated excursion)
        t_actual = simulated_temp_c if simulated_temp_c is not None else t_optimal
        breached = not (t_min <= t_actual <= t_max)

        if attr.product_subtype == "medical" and breached and attr.hard_breach_override:
            risk_score = 1.0
            expected_loss = round(float(shipment.cargo_value), 2)
            breakdown = (
                f"Medical Hard Breach Override: Temperature excursion ({t_actual:.1f}°C outside [{t_min:.1f}, {t_max:.1f}]°C). "
                f"Risk = 1.00 (100% loss). Expected Loss = ₹{expected_loss:,.2f}"
            )
            return RiskScore(
                risk_score=risk_score,
                expected_loss=expected_loss,
                breakdown=breakdown,
                breached=True,
                simulated_temp_c=t_actual,
                formula_components={
                    "type": "medical_hard_breach",
                    "t_actual": t_actual,
                    "t_band": [t_min, t_max],
                    "cargo_value": shipment.cargo_value
                }
            )
        else:
            temp_delta = (t_actual - t_optimal) / 10.0
            q10_factor = attr.q10 ** temp_delta
            fraction_consumed = (total_time_hr / attr.base_shelf_life_hr) * q10_factor
            risk_score = round(min(1.0, max(0.0, fraction_consumed)), 4)
            expected_loss = round(risk_score * shipment.cargo_value, 2)
            breakdown = (
                f"Organic/Medical Q10 Spoilage: ({total_time_hr:.1f}h / {attr.base_shelf_life_hr:.1f}h) * "
                f"({attr.q10}^{temp_delta:.2f}) = {risk_score:.4f} ({risk_score * 100:.1f}% spoilage). "
                f"Expected Loss: ₹{expected_loss:,.2f}"
            )
            return RiskScore(
                risk_score=risk_score,
                expected_loss=expected_loss,
                breakdown=breakdown,
                breached=breached,
                simulated_temp_c=t_actual,
                formula_components={
                    "type": "q10_decay",
                    "total_time_hr": total_time_hr,
                    "base_shelf_life_hr": attr.base_shelf_life_hr,
                    "q10": attr.q10,
                    "temp_delta": temp_delta,
                    "cargo_value": shipment.cargo_value
                }
            )

    else:
        # Class B: Dimensionless Economic Delay Penalty Model
        attr_b = shipment.class_b
        risk_score = round(float(leg.delay_probability), 4)
        penalty_rate = float(attr_b.delay_penalty_rate)
        
        # Expected loss = risk_score * cargo_value * delay_penalty_rate
        expected_loss = round(risk_score * shipment.cargo_value * penalty_rate, 2)
        breakdown = (
            f"Class B Economic Loss: Delay Probability ({risk_score:.2f}) * "
            f"Cargo Value (₹{shipment.cargo_value:,.2f}) * Penalty Rate ({penalty_rate:.2f}) = "
            f"₹{expected_loss:,.2f}"
        )
        return RiskScore(
            risk_score=risk_score,
            expected_loss=expected_loss,
            breakdown=breakdown,
            breached=False,
            formula_components={
                "type": "class_b_delay_loss",
                "delay_prob": risk_score,
                "cargo_value": shipment.cargo_value,
                "delay_penalty_rate": penalty_rate
            }
        )
