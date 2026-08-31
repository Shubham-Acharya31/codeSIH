# Master Frontend Build Prompts — Lovable / Google AI Studio / v0 / bolt.new

**Purpose:** these are dense, one-shot-oriented prompts meant to get a browser-based AI app builder to a production-quality result with far fewer correction rounds than last time. Every field name, formula, and design rule from `PROJECT_CONTEXT.md` v2 is embedded directly — the goal is that this build never reproduces the bugs (unit mismatch, formula/score desync, wrong Q10, blank map, unstyled buttons) found in earlier rounds.

**How to use:** Prompt A is the full build — paste it as your first message in a new Lovable/AI Studio/v0/bolt project. Prompt B wires it to your real backend once that's running. Prompt C is a final polish/QA pass. Do all three in the same project thread so styling stays consistent.

---

## PROMPT A — Full Production-Quality Frontend Build

```
Build a production-quality web dashboard called "Multimodal Consignment Consolidation Engine" — a freight logistics planning tool for MSME and agri shippers. This is a demo-ready internal operations tool, not a consumer app.

## Tech requirements
- React + TypeScript, Vite
- Tailwind CSS for styling
- react-leaflet + OpenStreetMap tiles for maps (no API key required) — do NOT use Mapbox or Google Maps
- Recharts for charts
- All data types must be defined as TypeScript interfaces matching the schema below EXACTLY — field names, casing, and nesting must match, since this will later connect to a real backend that returns this exact shape. Do not rename or restructure any field.

## TypeScript interfaces (mirror these exactly, in a shared types.ts file)

interface ShipmentBase {
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

interface ClassAAttributes {
  product_subtype: "medical" | "organic";
  temperature_min: number;
  temperature_max: number;
  q10: number;
  base_shelf_life_hr: number;
  hard_breach_override: boolean;
}

interface ClassBAttributes {
  delay_penalty_rate: number; // dimensionless fraction 0.0-1.0, NOT an INR/hour rate
  sla_strict: boolean;
}

interface Shipment extends ShipmentBase {
  class_a?: ClassAAttributes;
  class_b?: ClassBAttributes;
}

interface RiskScore {
  risk_score: number; // 0.0-1.0
  expected_loss: number; // INR
  breakdown: string; // literal formula string
}

interface CandidatePlan {
  label: "Cheapest" | "Fastest / Lowest-Risk" | "Balanced";
  alpha: number;
  beta: number;
  freight_cost: number;
  expected_loss: number;
  total_cost: number;
  eta_hr: number;
  groupings: string[]; // shipment_ids
}

## Design system
- Clean, minimalist, professional B2B logistics dashboard. Neutral off-white/light-gray background, dark slate text.
- Exactly two functional accent colors, used consistently everywhere and NEVER swapped: calm blue (#2F6FED) = Class A / Perishable. Warm amber (#E28A2B) = Class B / Non-Perishable.
- Inter or similar geometric sans-serif font. Card-based layout, 8-12px rounded corners, soft shadows, generous whitespace.
- Flat line-style icons only, no illustrations, no gradients, no stock photography, no decorative hero imagery.
- Style every interactive element deliberately — no unstyled native <button> elements anywhere. Buttons need real hover/active/disabled states using the accent color system.
- Large monetary values (hundreds of thousands+ INR) must use compact formatting like "₹4.8L" or "₹43.6 Cr" (Indian lakh/crore convention), never raw numbers with multiple decimal places.

## App structure — 4 tabs, persistent header
Header (all tabs): app name/logo, "Class A (Perishable)" and "Class B (Non-Perishable)" legend badges in their accent colors, network label "5-Hub Multimodal Network" (not a single corridor name, since this is now a 20-city network, not one fixed route).

Tab bar below header: Home | Consignments | Plan Comparison | Risk & Route. Client-side tab state only (no routing library needed). Selection state and active-plan state MUST persist when switching tabs.

### Home tab
- Hero: app name + one-sentence tagline + "Start Planning" button jumping to Consignments tab
- A compact non-interactive overview map (same Leaflet component, zoomed/bounded to show the ENTIRE network: all 5 hubs and their rail trunk connections, plus at least the satellite towns used by the 6 seed shipments) — this is meant to show the network's scale, so don't crop it to one region
- Stat tiles built only from the mock data used elsewhere (6 active consignments, 2 cargo classes, 2 transport modes, 3 plan candidates, 5 multimodal hubs, 20 total network cities) — no invented numbers
- A compact "How it works" step row: Ingest -> Classify -> Route -> Risk Score -> Optimize -> 3 Plans (icons + short labels only)
- A Class A vs Class B explainer strip using the accent color system with one line each ("Spoilage risk via temperature x time physics" / "Delay-loss risk via cargo value x penalty rate")

### Network (use this instead of any smaller/different city set)

This demo uses a FICTIONAL 20-city network — none of these are real places, don't treat them as such. 5 "hub" cities have both road and rail service; 15 "satellite" towns have road only, each nearest to one hub. Only these 5 city PAIRS have direct rail: Indranagar Junction↔Himkot, Indranagar Junction↔Suryapatan, Indranagar Junction↔Chandanpalli, Indranagar Junction↔Meghdoot, and Suryapatan↔Chandanpalli directly. Any other origin/destination pair either has no rail benefit (same nearest hub) or no rail option at all (no trunk edge between their hubs) — in both cases treat it as road-only for this demo.

Hubs (lat, lon):
- Indranagar Junction (21.15, 79.08) — central
- Himkot (29.40, 76.60) — north
- Suryapatan (22.30, 71.20) — west
- Chandanpalli (13.50, 78.10) — south
- Meghdoot (23.60, 87.40) — east

Satellite towns (lat, lon, nearest hub) — only the ones used by the 6 seed shipments need to render on the map, but include all 15 in your checkpoint data for completeness:
- Kanakpur (29.05, 75.90, Himkot), Rudra Nagar (30.10, 77.25, Himkot), Panchvati Khurd (28.70, 76.95, Himkot)
- Amrai (21.90, 72.10, Suryapatan), Bhairavgarh (22.80, 70.50, Suryapatan), Nilgiri Basti (21.40, 73.00, Suryapatan), Vasantnagar (23.10, 71.80, Suryapatan)
- Devgiri (12.90, 77.50, Chandanpalli), Ratnapur (14.20, 78.60, Chandanpalli), Harishpur (13.00, 79.40, Chandanpalli), Ambapuri (12.50, 77.90, Chandanpalli)
- Shantivan (24.10, 88.20, Meghdoot), Ganganpalli (23.20, 86.80, Meghdoot), Kishangunj (24.50, 87.90, Meghdoot), Sagarpettah (22.90, 88.10, Meghdoot)

### Consignments tab
- Grid of exactly 6 selectable shipment cards using this exact mock data (compute the risk numbers by hand using the formulas below, do not invent plausible-looking numbers):

  1. Grapes, SHP-001, Amrai->Suryapatan, Class A, organic, weight 4200kg, volume 12m3, cargo_value 480000, temp range 4-12C, q10 2.2, base_shelf_life_hr 120, deadline 2026-08-24T18:00 — ROAD ONLY (same hub region, no rail candidate)
  2. Onions, SHP-002, Kanakpur->Ambapuri, Class B, weight 6800kg, volume 18m3, cargo_value 240000, delay_penalty_rate 0.06, sla_strict false, deadline 2026-08-26T12:00 — MULTIMODAL via road->Himkot, rail Himkot->Indranagar->Chandanpalli, road->Ambapuri
  3. Vaccines, SHP-003, Rudra Nagar->Meghdoot, Class A, medical, weight 1150kg, volume 3m3, cargo_value 1850000, temp range 2-8C, q10 2.5, base_shelf_life_hr 72, deadline 2026-08-25T06:00 — MULTIMODAL via road->Himkot, rail Himkot->Indranagar->Meghdoot (destination IS the hub, no final feeder leg)
  4. Auto Parts, SHP-004, Bhairavgarh->Suryapatan, Class B, weight 3400kg, volume 9m3, cargo_value 610000, delay_penalty_rate 0.04, sla_strict true, deadline 2026-08-27T09:00 — ROAD ONLY (same hub region)
  5. Textiles, SHP-005, Shantivan->Himkot, Class B, weight 5200kg, volume 15m3, cargo_value 390000, delay_penalty_rate 0.05, sla_strict false, deadline 2026-08-28T10:00 — MULTIMODAL via road->Meghdoot, rail Meghdoot->Indranagar->Himkot (destination IS the hub)
  6. Pharma Supplies, SHP-006, Devgiri->Suryapatan, Class A, medical, weight 900kg, volume 2m3, cargo_value 2100000, temp range 2-8C, q10 2.5, base_shelf_life_hr 60, deadline 2026-08-24T14:00 — MULTIMODAL via road->Chandanpalli, rail DIRECTLY Chandanpalli->Suryapatan (not via Indranagar — this uses the west-south direct edge)

- Each card: product name, class badge (blue/amber), subtype for Class A, route text, weight, cargo value, deadline. Selectable/deselectable, selected state has a colored outline.
- This mix is intentional: 2 road-only shipments in different regions, 3 multimodal shipments through the central hub, 1 multimodal shipment using the direct Suryapatan-Chandanpalli edge instead — the UI should make this topology legible, not just show "sometimes rail wins."

### Plan Comparison tab
- 3 candidate cards side by side: Cheapest (alpha 0.90, beta 0.10), Fastest / Lowest-Risk (alpha 0.20, beta 0.80), Balanced (alpha 0.55, beta 0.45).
- For freight_cost and expected_loss per candidate: compute plausible values where Cheapest has the LOWEST freight_cost and HIGHEST expected_loss of the three, Fastest/Lowest-Risk has the HIGHEST freight_cost and LOWEST expected_loss, and Balanced sits between both on each axis — this trade-off pattern must be visually obvious, since it's the core story of this tool. total_cost = freight_cost + expected_loss for every candidate, no exceptions.
- Below/above the cards: a Cost vs Risk scatter or bar chart (Recharts), simple axes, one point/bar per candidate, clearly labeled. Title it "Cost vs. Risk Trade-off" — nothing more elaborate.
- Groupings shown as small chip/tag elements (not bullet points) listing which shipment_ids are in each candidate.

### Risk & Route tab
- Risk Breakdown cards, one per selected shipment. Each shows: shipment name + class badge, risk_score as a percentage with a horizontal fill bar in the accent color, a monospace-styled code-block showing the LITERAL formula with real substituted numbers, and a bold "Expected Loss: [amount]" line.

  CRITICAL: the displayed risk_score and the displayed formula MUST be mathematically consistent — actually compute the formula's result and use that exact number as risk_score, do not pick a plausible-looking score and a separately-invented formula string. Show your work:
  - Grapes: risk = min(1, (transit_time_hr / 120) * 2.2^((T_actual-T_optimal)/10)) — pick a transit_time_hr consistent with the Amrai→Suryapatan road-only leg (~4-5hrs) and a small T_actual/T_optimal delta, then actually calculate the result.
  - Vaccines: if you set T_actual within [2,8], use the continuous formula with q10=2.5, base_shelf_life_hr=72; if you set T_actual outside [2,8], risk_score MUST be exactly 1.0 with breakdown text "Hard breach override — temperature excursion detected", not the decay formula.
  - Onions/Auto Parts: risk_score = delay_probability (pick a plausible 0.05-0.20 value), expected_loss = risk_score * cargo_value * delay_penalty_rate — verify this lands in the thousands-to-tens-of-thousands INR range, NOT millions (if your calculation produces a huge number, delay_penalty_rate is being misused — it must stay under 1.0).

- Also include a "Simulate Excursion" button on the Vaccines card that toggles T_actual outside the safe band and updates risk_score/breakdown live to demonstrate the hard-breach override.
- Route map (Leaflet, OSM tiles) for the currently active candidate, using the hub/satellite coordinates given above. For a road-only shipment (Grapes, Auto Parts), draw a single solid line origin->destination. For a multimodal shipment, draw: solid line (origin -> its nearest hub), dashed line (hub -> hub, the trunk rail segment actually used — note Pharma Supplies uses Chandanpalli->Suryapatan DIRECTLY, not via Indranagar, so don't hardcode Indranagar as always being on the path), solid line (hub -> destination, only if destination isn't itself a hub). Mark every hub actually used as a transfer point with a distinct icon and a small dwell-time label. Auto-fit map bounds to whichever checkpoints the active shipment's active route actually uses — this network spans the full country (roughly lat 12-30, lon 71-88), so don't use one fixed zoom level for every shipment; a short same-region shipment (Grapes) and a long cross-country one (Onions) need very different zoom/bounds.
- A "Dispatch [Active Plan Name] Plan" button: on click, shows a ~1s loading state, then a success state (button turns disabled/success-styled, label becomes "Dispatched", small confirmation toast appears). Resets to clickable if a different candidate becomes active. This is a frontend-only simulation, no backend call.

## States & robustness (production-quality bar)
- Every data-driven section needs a loading state, an empty state, and an error state (even though this build uses mock data for now, structure components so a real API integration later just swaps the data source, not the rendering logic).
- Responsive down to a reasonable tablet width; desktop-first is fine, but nothing should be totally broken at 1024px wide.
- Keyboard-navigable: shipment cards, tab bar, and candidate selector should all be reachable and operable via keyboard, with visible focus states.

Do not add features not described above (no user login, no free-text shipment entry, no live GPS tracking, no notifications system). After building, tell me explicitly what mock risk_score/breakdown values you actually computed for each of the 6 shipments so I can verify the math myself.
```

---

## PROMPT B — Wire to Real Backend

```
This frontend currently uses mock data matching the TypeScript interfaces defined at the start of the project. I now have a real backend running FastAPI, exposing:
- GET {API_BASE_URL}/seed-demo -> returns the list of Shipment objects
- POST {API_BASE_URL}/plan with body { shipment_ids: string[] } -> returns { candidates: CandidatePlan[], risk_breakdowns: Record<string, RiskScore> } (confirm this exact response shape against what I paste below if it differs)

Here is a real example response from my backend's POST /plan:
[paste actual JSON response here]

Read API_BASE_URL from an environment variable (Vite: import.meta.env.VITE_API_BASE_URL, with a .env.example documenting it) rather than hardcoding a URL.

Replace the mock data source with real fetch calls:
1. On app load / Consignments tab mount, call GET /seed-demo instead of using the hardcoded 4-shipment array
2. On "Generate Plan" / when moving to Plan Comparison, call POST /plan with the selected shipment_ids
3. Show a loading spinner during the fetch, and a clear, styled error state (not a blank screen or unhandled exception) if the request fails — include a retry button in the error state
4. If the field names or nesting in my real response differ even slightly from what you assumed during the mock build, write a small adapter function that maps the real response into the exact shape your components already expect — do not rewrite the components themselves to match new field names, keep that mapping isolated in one place (e.g. api/adapters.ts)

Do not change any of the visual design, formulas, or layout from the previous build — this is purely a data-source swap. Give me the updated files and the exact env variable I need to set locally to point at my backend.
```

---

## PROMPT C — Production Polish & QA Pass

```
Do a final polish and QA pass on this app before a hackathon demo. Do not add new features — this is a hardening pass only.

1. Accessibility: confirm every interactive element (buttons, tabs, card selection, the Simulate Excursion and Dispatch buttons) has a visible focus state and an appropriate aria-label where the visual label alone might not be clear to a screen reader (e.g. the risk score fill bar).
2. Error boundaries: wrap the main tab content in a React error boundary so a rendering bug in one tab doesn't blank the entire app.
3. Performance: confirm the map component isn't re-initializing on every re-render (a common Leaflet + React bug that causes flicker or memory growth) — show me how you're memoizing/guarding it if you make a change.
4. Consistency check: go through every screen and confirm the blue/amber Class A/B color coding is used identically everywhere, all currency values use the compact Indian lakh/crore formatting, and no placeholder/lorem-ipsum text remains anywhere.
5. Confirm the risk_score/breakdown consistency rule from Prompt A still holds after any changes made during backend integration (Prompt B) — recompute at least one example by hand and show me.
6. Give me a final checklist of anything you found that couldn't be fully fixed without more information from me, rather than declaring everything perfect.
```
