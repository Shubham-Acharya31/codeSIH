export interface ClassAAttributes {
  product_subtype: "medical" | "organic";
  temperature_min: number;
  temperature_max: number;
  q10: number;
  base_shelf_life_hr: number;
  hard_breach_override: boolean;
}

export interface ClassBAttributes {
  delay_penalty_rate: number; // dimensionless fraction 0.0-1.0
  sla_strict: boolean;
}

export interface ShipmentBase {
  shipment_id: string;
  origin: string;
  destination: string;
  weight_kg: number;
  volume_m3: number;
  deadline: string; // ISO datetime
  cargo_value: number; // INR
  product_category: string;
  shipment_class: "A" | "B";
}

export interface Shipment extends ShipmentBase {
  class_a?: ClassAAttributes | null;
  class_b?: ClassBAttributes | null;
}

export interface RiskScore {
  risk_score: number; // 0.0-1.0
  expected_loss: number; // INR
  breakdown: string; // literal formula string with substituted numbers
  breached?: boolean;
  simulated_temp_c?: number;
  formula_components?: Record<string, any>;
}

export interface ShipmentPlanDetail {
  shipment_id: string;
  selected_mode: "road" | "rail";
  transit_time_hr: number;
  freight_cost: number;
  expected_loss: number;
  risk_score: number;
  breakdown: string;
  route_description: string;
  geometry: [number, number][];
  transfer_hubs: string[];
}

export interface CandidatePlan {
  label: string;
  alpha: number;
  beta: number;
  freight_cost: number;
  expected_loss: number;
  total_cost: number;
  eta_hr: number;
  groupings: string[];
  shipment_details: ShipmentPlanDetail[];
  solve_time_ms?: number;
  mode_assignments?: Record<string, "road" | "rail">;
}

export interface PlanResponse {
  success: boolean;
  total_shipments_processed: number;
  plans: CandidatePlan[];
  execution_time_ms: number;
}

export interface Checkpoint {
  lat: number;
  lon: number;
  type: "hub" | "satellite";
  nearest_hub: string;
  region?: string;
}

export interface CheckpointsData {
  checkpoints: Record<string, Checkpoint>;
  hubs: string[];
  satellites: string[];
}

export interface OptimizationScenarioInput {
  label: string;
  alpha: number;
  beta: number;
}

export interface CheckpointInput {
  lat: number;
  lon: number;
  type: "hub" | "satellite";
  nearest_hub?: string;
  region?: string;
}

export interface ConfigResponse {
  app_version: string;
  app_env: string;
  transport_config: Record<string, any>;
  supported_classes: string[];
  supported_subtypes: string[];
  default_scenarios: Array<{
    label: string;
    alpha: number;
    beta: number;
  }>;
}
