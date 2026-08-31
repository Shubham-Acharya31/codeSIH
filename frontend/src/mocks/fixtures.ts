import { Shipment, CandidatePlan, CheckpointsData } from '../types';

export const MOCK_CHECKPOINTS: CheckpointsData = {
  hubs: ["Indranagar Junction", "Himkot", "Suryapatan", "Chandanpalli", "Meghdoot"],
  satellites: [
    "Kanakpur", "Rudra Nagar", "Panchvati Khurd",
    "Amrai", "Bhairavgarh", "Nilgiri Basti", "Vasantnagar",
    "Devgiri", "Ratnapur", "Harishpur", "Ambapuri",
    "Shantivan", "Ganganpalli", "Kishangunj", "Sagarpettah"
  ],
  checkpoints: {
    "Indranagar Junction": { lat: 21.15, lon: 79.08, type: "hub", nearest_hub: "Indranagar Junction", region: "Central" },
    "Himkot": { lat: 29.40, lon: 76.60, type: "hub", nearest_hub: "Himkot", region: "North" },
    "Suryapatan": { lat: 22.30, lon: 71.20, type: "hub", nearest_hub: "Suryapatan", region: "West" },
    "Chandanpalli": { lat: 13.50, lon: 78.10, type: "hub", nearest_hub: "Chandanpalli", region: "South" },
    "Meghdoot": { lat: 23.60, lon: 87.40, type: "hub", nearest_hub: "Meghdoot", region: "East" },
    "Kanakpur": { lat: 29.05, lon: 75.90, type: "satellite", nearest_hub: "Himkot" },
    "Rudra Nagar": { lat: 30.10, lon: 77.25, type: "satellite", nearest_hub: "Himkot" },
    "Panchvati Khurd": { lat: 28.70, lon: 76.95, type: "satellite", nearest_hub: "Himkot" },
    "Amrai": { lat: 21.90, lon: 72.10, type: "satellite", nearest_hub: "Suryapatan" },
    "Bhairavgarh": { lat: 22.80, lon: 70.50, type: "satellite", nearest_hub: "Suryapatan" },
    "Nilgiri Basti": { lat: 21.40, lon: 73.00, type: "satellite", nearest_hub: "Suryapatan" },
    "Vasantnagar": { lat: 23.10, lon: 71.80, type: "satellite", nearest_hub: "Suryapatan" },
    "Devgiri": { lat: 12.90, lon: 77.50, type: "satellite", nearest_hub: "Chandanpalli" },
    "Ratnapur": { lat: 14.20, lon: 78.60, type: "satellite", nearest_hub: "Chandanpalli" },
    "Harishpur": { lat: 13.00, lon: 79.40, type: "satellite", nearest_hub: "Chandanpalli" },
    "Ambapuri": { lat: 12.50, lon: 77.90, type: "satellite", nearest_hub: "Chandanpalli" },
    "Shantivan": { lat: 24.10, lon: 88.20, type: "satellite", nearest_hub: "Meghdoot" },
    "Ganganpalli": { lat: 23.20, lon: 86.80, type: "satellite", nearest_hub: "Meghdoot" },
    "Kishangunj": { lat: 24.50, lon: 87.90, type: "satellite", nearest_hub: "Meghdoot" },
    "Sagarpettah": { lat: 22.90, lon: 88.10, type: "satellite", nearest_hub: "Meghdoot" }
  }
};

export const MOCK_SHIPMENTS: Shipment[] = [
  {
    shipment_id: "SHP-001",
    origin: "Amrai",
    destination: "Suryapatan",
    weight_kg: 4500.0,
    volume_m3: 14.0,
    deadline: "2026-09-02T18:00:00Z",
    cargo_value: 450000.0,
    product_category: "Fresh Agri - Grapes",
    shipment_class: "A",
    class_a: {
      product_subtype: "organic",
      temperature_min: 4.0,
      temperature_max: 12.0,
      q10: 2.2,
      base_shelf_life_hr: 72.0,
      hard_breach_override: false
    },
    class_b: null
  },
  {
    shipment_id: "SHP-002",
    origin: "Kanakpur",
    destination: "Ambapuri",
    weight_kg: 12000.0,
    volume_m3: 32.0,
    deadline: "2026-09-04T12:00:00Z",
    cargo_value: 600000.0,
    product_category: "Bulk Agri - Onions",
    shipment_class: "B",
    class_a: null,
    class_b: {
      delay_penalty_rate: 0.06,
      sla_strict: true
    }
  },
  {
    shipment_id: "SHP-003",
    origin: "Rudra Nagar",
    destination: "Meghdoot",
    weight_kg: 1800.0,
    volume_m3: 6.5,
    deadline: "2026-09-03T10:00:00Z",
    cargo_value: 2500000.0,
    product_category: "Pharmaceuticals - Vaccines",
    shipment_class: "A",
    class_a: {
      product_subtype: "medical",
      temperature_min: 2.0,
      temperature_max: 8.0,
      q10: 2.5,
      base_shelf_life_hr: 48.0,
      hard_breach_override: true
    },
    class_b: null
  },
  {
    shipment_id: "SHP-004",
    origin: "Bhairavgarh",
    destination: "Suryapatan",
    weight_kg: 6200.0,
    volume_m3: 18.0,
    deadline: "2026-09-02T20:00:00Z",
    cargo_value: 850000.0,
    product_category: "Automotive - Precision Auto Parts",
    shipment_class: "B",
    class_a: null,
    class_b: {
      delay_penalty_rate: 0.05,
      sla_strict: false
    }
  },
  {
    shipment_id: "SHP-005",
    origin: "Shantivan",
    destination: "Himkot",
    weight_kg: 9500.0,
    volume_m3: 28.0,
    deadline: "2026-09-04T16:00:00Z",
    cargo_value: 1100000.0,
    product_category: "Apparel - Industrial Textiles",
    shipment_class: "B",
    class_a: null,
    class_b: {
      delay_penalty_rate: 0.04,
      sla_strict: true
    }
  },
  {
    shipment_id: "SHP-006",
    origin: "Devgiri",
    destination: "Suryapatan",
    weight_kg: 2400.0,
    volume_m3: 8.0,
    deadline: "2026-09-03T14:00:00Z",
    cargo_value: 1800000.0,
    product_category: "Healthcare - Pharma Supplies",
    shipment_class: "A",
    class_a: {
      product_subtype: "medical",
      temperature_min: 2.0,
      temperature_max: 8.0,
      q10: 2.5,
      base_shelf_life_hr: 48.0,
      hard_breach_override: true
    },
    class_b: null
  }
];

export const MOCK_PLANS: CandidatePlan[] = [
  {
    label: "Cheapest",
    alpha: 0.90,
    beta: 0.10,
    freight_cost: 276685.56,
    expected_loss: 1917883.50,
    total_cost: 2194569.06,
    eta_hr: 27.8,
    groupings: [
      "Central Trunk Rail Freight Batch (SHP-006)",
      "Regional Road Direct Group (SHP-001, SHP-002, SHP-003, SHP-004, SHP-005)"
    ],
    mode_assignments: {
      "SHP-001": "road",
      "SHP-002": "road",
      "SHP-003": "road",
      "SHP-004": "road",
      "SHP-005": "road",
      "SHP-006": "rail"
    },
    shipment_details: [
      {
        shipment_id: "SHP-001",
        selected_mode: "road",
        transit_time_hr: 2.3,
        freight_cost: 4826.0,
        expected_loss: 14375.0,
        risk_score: 0.0319,
        breakdown: "Organic/Medical Q10 Spoilage: (2.3h / 72.0h) * (2.2^0.00) = 0.0319 (3.2% spoilage). Expected Loss: ₹14,375.00",
        route_description: "Direct Highway Road Transport (Amrai -> Suryapatan)",
        geometry: [[21.9, 72.1], [22.3, 71.2]],
        transfer_hubs: []
      },
      {
        shipment_id: "SHP-002",
        selected_mode: "road",
        transit_time_hr: 27.0,
        freight_cost: 68352.0,
        expected_loss: 6840.0,
        risk_score: 0.19,
        breakdown: "Class B Economic Loss: Delay Probability (0.19) * Cargo Value (₹600,000.00) * Penalty Rate (0.06) = ₹6,840.00",
        route_description: "Direct Highway Road Transport (Kanakpur -> Ambapuri)",
        geometry: [[29.05, 75.9], [12.5, 77.9]],
        transfer_hubs: []
      },
      {
        shipment_id: "SHP-003",
        selected_mode: "road",
        transit_time_hr: 23.5,
        freight_cost: 49818.0,
        expected_loss: 1223958.33,
        risk_score: 0.4896,
        breakdown: "Organic/Medical Q10 Spoilage: (23.5h / 48.0h) * (2.5^0.00) = 0.4896 (49.0% spoilage). Expected Loss: ₹1,223,958.33",
        route_description: "Direct Highway Road Transport (Rudra Nagar -> Meghdoot)",
        geometry: [[30.1, 77.25], [23.6, 87.4]],
        transfer_hubs: []
      },
      {
        shipment_id: "SHP-004",
        selected_mode: "road",
        transit_time_hr: 2.1,
        freight_cost: 3712.0,
        expected_loss: 2125.0,
        risk_score: 0.05,
        breakdown: "Class B Economic Loss: Delay Probability (0.05) * Cargo Value (₹850,000.00) * Penalty Rate (0.05) = ₹2,125.00",
        route_description: "Direct Highway Road Transport (Bhairavgarh -> Suryapatan)",
        geometry: [[22.8, 70.5], [22.3, 71.2]],
        transfer_hubs: []
      },
      {
        shipment_id: "SHP-005",
        selected_mode: "road",
        transit_time_hr: 24.8,
        freight_cost: 52824.0,
        expected_loss: 8360.0,
        risk_score: 0.19,
        breakdown: "Class B Economic Loss: Delay Probability (0.19) * Cargo Value (₹1,100,000.00) * Penalty Rate (0.04) = ₹8,360.00",
        route_description: "Direct Highway Road Transport (Shantivan -> Himkot)",
        geometry: [[24.1, 88.2], [29.4, 76.6]],
        transfer_hubs: []
      },
      {
        shipment_id: "SHP-006",
        selected_mode: "rail",
        transit_time_hr: 27.8,
        freight_cost: 24200.0,
        expected_loss: 662225.17,
        risk_score: 0.5792,
        breakdown: "Organic/Medical Q10 Spoilage: (27.8h / 48.0h) * (2.5^0.00) = 0.5792 (57.9% spoilage). Expected Loss: ₹662,225.17",
        route_description: "Multimodal Rail Transport via Chandanpalli (Devgiri -> Suryapatan)",
        geometry: [[12.9, 77.5], [13.5, 78.1], [22.3, 71.2]],
        transfer_hubs: ["Chandanpalli"]
      }
    ]
  },
  {
    label: "Fastest / Lowest-Risk",
    alpha: 0.20,
    beta: 0.80,
    freight_cost: 316258.86,
    expected_loss: 1605223.50,
    total_cost: 1921482.36,
    eta_hr: 27.0,
    groupings: [
      "Regional Road Direct Group (SHP-001, SHP-002, SHP-003, SHP-004, SHP-005, SHP-006)"
    ],
    mode_assignments: {
      "SHP-001": "road",
      "SHP-002": "road",
      "SHP-003": "road",
      "SHP-004": "road",
      "SHP-005": "road",
      "SHP-006": "road"
    },
    shipment_details: [
      {
        shipment_id: "SHP-001",
        selected_mode: "road",
        transit_time_hr: 2.3,
        freight_cost: 4826.0,
        expected_loss: 14375.0,
        risk_score: 0.0319,
        breakdown: "Organic/Medical Q10 Spoilage: (2.3h / 72.0h) * (2.2^0.00) = 0.0319 (3.2% spoilage). Expected Loss: ₹14,375.00",
        route_description: "Direct Highway Road Transport (Amrai -> Suryapatan)",
        geometry: [[21.9, 72.1], [22.3, 71.2]],
        transfer_hubs: []
      },
      {
        shipment_id: "SHP-002",
        selected_mode: "road",
        transit_time_hr: 27.0,
        freight_cost: 68352.0,
        expected_loss: 6840.0,
        risk_score: 0.19,
        breakdown: "Class B Economic Loss: Delay Probability (0.19) * Cargo Value (₹600,000.00) * Penalty Rate (0.06) = ₹6,840.00",
        route_description: "Direct Highway Road Transport (Kanakpur -> Ambapuri)",
        geometry: [[29.05, 75.9], [12.5, 77.9]],
        transfer_hubs: []
      },
      {
        shipment_id: "SHP-003",
        selected_mode: "road",
        transit_time_hr: 23.5,
        freight_cost: 49818.0,
        expected_loss: 1223958.33,
        risk_score: 0.4896,
        breakdown: "Organic/Medical Q10 Spoilage: (23.5h / 48.0h) * (2.5^0.00) = 0.4896 (49.0% spoilage). Expected Loss: ₹1,223,958.33",
        route_description: "Direct Highway Road Transport (Rudra Nagar -> Meghdoot)",
        geometry: [[30.1, 77.25], [23.6, 87.4]],
        transfer_hubs: []
      },
      {
        shipment_id: "SHP-004",
        selected_mode: "road",
        transit_time_hr: 2.1,
        freight_cost: 3712.0,
        expected_loss: 2125.0,
        risk_score: 0.05,
        breakdown: "Class B Economic Loss: Delay Probability (0.05) * Cargo Value (₹850,000.00) * Penalty Rate (0.05) = ₹2,125.00",
        route_description: "Direct Highway Road Transport (Bhairavgarh -> Suryapatan)",
        geometry: [[22.8, 70.5], [22.3, 71.2]],
        transfer_hubs: []
      },
      {
        shipment_id: "SHP-005",
        selected_mode: "road",
        transit_time_hr: 24.8,
        freight_cost: 52824.0,
        expected_loss: 8360.0,
        risk_score: 0.19,
        breakdown: "Class B Economic Loss: Delay Probability (0.19) * Cargo Value (₹1,100,000.00) * Penalty Rate (0.04) = ₹8,360.00",
        route_description: "Direct Highway Road Transport (Shantivan -> Himkot)",
        geometry: [[24.1, 88.2], [29.4, 76.6]],
        transfer_hubs: []
      },
      {
        shipment_id: "SHP-006",
        selected_mode: "road",
        transit_time_hr: 20.2,
        freight_cost: 42800.0,
        expected_loss: 757500.0,
        risk_score: 0.4208,
        breakdown: "Organic/Medical Q10 Spoilage: (20.2h / 48.0h) * (2.5^0.00) = 0.4208 (42.1% spoilage). Expected Loss: ₹757,500.00",
        route_description: "Direct Highway Road Transport (Devgiri -> Suryapatan)",
        geometry: [[12.9, 77.5], [22.3, 71.2]],
        transfer_hubs: []
      }
    ]
  },
  {
    label: "Balanced",
    alpha: 0.55,
    beta: 0.45,
    freight_cost: 295000.0,
    expected_loss: 1750000.0,
    total_cost: 2045000.0,
    eta_hr: 27.2,
    groupings: [
      "Central Trunk Rail Freight Batch (SHP-006)",
      "Regional Road Direct Group (SHP-001, SHP-002, SHP-003, SHP-004, SHP-005)"
    ],
    mode_assignments: {
      "SHP-001": "road",
      "SHP-002": "road",
      "SHP-003": "road",
      "SHP-004": "road",
      "SHP-005": "road",
      "SHP-006": "rail"
    },
    shipment_details: [
      {
        shipment_id: "SHP-001",
        selected_mode: "road",
        transit_time_hr: 2.3,
        freight_cost: 4826.0,
        expected_loss: 14375.0,
        risk_score: 0.0319,
        breakdown: "Organic/Medical Q10 Spoilage: (2.3h / 72.0h) * (2.2^0.00) = 0.0319 (3.2% spoilage). Expected Loss: ₹14,375.00",
        route_description: "Direct Highway Road Transport (Amrai -> Suryapatan)",
        geometry: [[21.9, 72.1], [22.3, 71.2]],
        transfer_hubs: []
      },
      {
        shipment_id: "SHP-002",
        selected_mode: "road",
        transit_time_hr: 27.0,
        freight_cost: 68352.0,
        expected_loss: 6840.0,
        risk_score: 0.19,
        breakdown: "Class B Economic Loss: Delay Probability (0.19) * Cargo Value (₹600,000.00) * Penalty Rate (0.06) = ₹6,840.00",
        route_description: "Direct Highway Road Transport (Kanakpur -> Ambapuri)",
        geometry: [[29.05, 75.9], [12.5, 77.9]],
        transfer_hubs: []
      },
      {
        shipment_id: "SHP-003",
        selected_mode: "road",
        transit_time_hr: 23.5,
        freight_cost: 49818.0,
        expected_loss: 1223958.33,
        risk_score: 0.4896,
        breakdown: "Organic/Medical Q10 Spoilage: (23.5h / 48.0h) * (2.5^0.00) = 0.4896 (49.0% spoilage). Expected Loss: ₹1,223,958.33",
        route_description: "Direct Highway Road Transport (Rudra Nagar -> Meghdoot)",
        geometry: [[30.1, 77.25], [23.6, 87.4]],
        transfer_hubs: []
      },
      {
        shipment_id: "SHP-004",
        selected_mode: "road",
        transit_time_hr: 2.1,
        freight_cost: 3712.0,
        expected_loss: 2125.0,
        risk_score: 0.05,
        breakdown: "Class B Economic Loss: Delay Probability (0.05) * Cargo Value (₹850,000.00) * Penalty Rate (0.05) = ₹2,125.00",
        route_description: "Direct Highway Road Transport (Bhairavgarh -> Suryapatan)",
        geometry: [[22.8, 70.5], [22.3, 71.2]],
        transfer_hubs: []
      },
      {
        shipment_id: "SHP-005",
        selected_mode: "road",
        transit_time_hr: 24.8,
        freight_cost: 52824.0,
        expected_loss: 8360.0,
        risk_score: 0.19,
        breakdown: "Class B Economic Loss: Delay Probability (0.19) * Cargo Value (₹1,100,000.00) * Penalty Rate (0.04) = ₹8,360.00",
        route_description: "Direct Highway Road Transport (Shantivan -> Himkot)",
        geometry: [[24.1, 88.2], [29.4, 76.6]],
        transfer_hubs: []
      },
      {
        shipment_id: "SHP-006",
        selected_mode: "rail",
        transit_time_hr: 27.8,
        freight_cost: 24200.0,
        expected_loss: 662225.17,
        risk_score: 0.5792,
        breakdown: "Organic/Medical Q10 Spoilage: (27.8h / 48.0h) * (2.5^0.00) = 0.5792 (57.9% spoilage). Expected Loss: ₹662,225.17",
        route_description: "Multimodal Rail Transport via Chandanpalli (Devgiri -> Suryapatan)",
        geometry: [[12.9, 77.5], [13.5, 78.1], [22.3, 71.2]],
        transfer_hubs: ["Chandanpalli"]
      }
    ]
  }
];
