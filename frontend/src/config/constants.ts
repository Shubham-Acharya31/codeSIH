export interface ProductSubtypeConfig {
  label: string;
  q10: number;
  tempMin: number;
  tempMax: number;
  baseShelfLifeHr: number;
  hardBreachOverride: boolean;
}

export interface SystemConfig {
  appVersion: string;
  apiEndpoints: {
    health: string;
    config: string;
    checkpoints: string;
    seedDemo: string;
    shipments: string;
    plan: string;
  };
  cargoClasses: Array<{
    id: "A" | "B";
    label: string;
    description: string;
  }>;
  productSubtypes: Record<"medical" | "organic", ProductSubtypeConfig>;
  classBDefaults: {
    defaultPenaltyRate: number;
    minPenaltyRate: number;
    maxPenaltyRate: number;
    defaultSlaStrict: boolean;
  };
  scenarios: Array<{
    label: string;
    alpha: number;
    beta: number;
    description: string;
  }>;
  validationLimits: {
    minWeightKg: number;
    maxWeightKg: number;
    minVolumeM3: number;
    maxVolumeM3: number;
    minCargoValueInr: number;
    maxCargoValueInr: number;
    maxShipmentsBatch: number;
  };
  networkDefaults: {
    defaultOrigin: string;
    defaultDestination: string;
    defaultExcursionTempC: number;
    defaultNormalTempC: number;
  };
}

export const SYSTEM_CONFIG: SystemConfig = {
  appVersion: "2.0.0",
  apiEndpoints: {
    health: "/health",
    config: "/api/v1/config",
    checkpoints: "/api/v1/checkpoints",
    seedDemo: "/api/v1/seed-demo",
    shipments: "/api/v1/shipments",
    plan: "/api/v1/plan",
  },
  cargoClasses: [
    {
      id: "A",
      label: "Class A (Perishable)",
      description: "Q10 physics decay & temperature envelope control",
    },
    {
      id: "B",
      label: "Class B (Non-Perishable)",
      description: "Delay probability & contractual penalty rate model",
    },
  ],
  productSubtypes: {
    organic: {
      label: "Organic Produce (Q10 = 2.2)",
      q10: 2.2,
      tempMin: 4.0,
      tempMax: 12.0,
      baseShelfLifeHr: 72.0,
      hardBreachOverride: false,
    },
    medical: {
      label: "Medical / Vaccines (Q10 = 2.5, Hard Breach)",
      q10: 2.5,
      tempMin: 2.0,
      tempMax: 8.0,
      baseShelfLifeHr: 48.0,
      hardBreachOverride: true,
    },
  },
  classBDefaults: {
    defaultPenaltyRate: 0.05,
    minPenaltyRate: 0.0,
    maxPenaltyRate: 1.0,
    defaultSlaStrict: true,
  },
  scenarios: [
    { label: "Cheapest", alpha: 0.90, beta: 0.10, description: "Maximizes rail consolidation; lowest freight expenditure" },
    { label: "Fastest / Lowest-Risk", alpha: 0.20, beta: 0.80, description: "Prioritizes direct highway road; minimal transit dwell" },
    { label: "Balanced", alpha: 0.55, beta: 0.45, description: "Optimal Pareto compromise between freight cost and cold-chain risk" },
  ],
  validationLimits: {
    minWeightKg: 10,
    maxWeightKg: 100000,
    minVolumeM3: 0.5,
    maxVolumeM3: 500,
    minCargoValueInr: 1000,
    maxCargoValueInr: 100000000,
    maxShipmentsBatch: 50,
  },
  networkDefaults: {
    defaultOrigin: "Indranagar Junction",
    defaultDestination: "Himkot",
    defaultExcursionTempC: 14.0,
    defaultNormalTempC: 5.0,
  },
};
