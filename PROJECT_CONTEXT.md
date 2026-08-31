# PROJECT CONTEXT v2 — AI Multimodal Freight Consolidation & Cold-Chain Risk Prediction
### Production-Grade Reference — Persistent context for any coding agent working on this project

**Read this file in full before writing any code.** This supersedes the v1 context file — several formulas and field definitions below were corrected after bugs were found in UI review (see Section 10). If you have any earlier v1-based code, it must be updated to match this version, not the other way around.

This project is built by **one person**, solo, across every layer. "Production-grade" here means **engineering discipline appropriate for a real deployment** (error handling, config management, logging, containerization, typed contracts, tests) applied to a **deliberately fixed, hackathon-scoped feature set** — it does not mean expanding scope. If you find yourself about to add authentication, multi-tenant data isolation, horizontal autoscaling, or anything else not explicitly listed in this document, stop and flag it instead of building it.

---

## 1. Problem Statement

MSME and agri-logistics shippers in India lose money two structurally different ways: **perishable cargo spoils in transit** (temperature × time), or **non-perishable cargo arrives late and incurs contractual/economic penalties**. This system ingests shipments, classifies them into Class A (perishable) or Class B (non-perishable), computes mode-specific risk for each, and produces 3 optimized consolidation/scheduling plans (Cheapest, Fastest/Lowest-Risk, Balanced) — all within a 2-second solve budget, using **pure deterministic physics/math**, no ML black boxes.

---

## 2. Non-Negotiable Architectural Decisions

| Area | Kept | Explicitly removed / rejected |
|---|---|---|
| Risk modeling | Pure Q10/Arrhenius physics (Class A), delay-probability × economic-loss model (Class B) | XGBoost correction layer, SHAP explainability layer, LLM narration of results |
| Routing | Fixed checkpoints, road via live/cached API, rail via static timetable — both precomputed once | Multi-depot dynamic routing, open route search inside the solver |
| Optimization | Solver only groups shipments + schedules departures on a fixed cost/time matrix, solved 3× with different objective weights, reusing one model | Solver performing route discovery; rebuilding the solver model per candidate |
| Real-time features | None needed for the MVP | WebSocket live simulator, live GPS tracking |
| Explainability | Literal formula + substituted numbers, shown directly in the UI, **guaranteed to match the actual computed score** | Any approximation layer (SHAP-style charts, LLM-generated explanations) |
| Multi-tenancy / auth | None — single-operator demo tool | User accounts, roles, permissions, org-level data isolation |
| Data layer | JSON seed data behind a thin repository interface (Section 9.6) | A managed production database cluster, migrations framework, ORM complexity beyond what the interface needs |

**If you ever find yourself about to suggest an ML model, a new black-box scoring layer, live route search inside the solver, authentication, or a real-time layer — stop. That was already considered and rejected.**

---

## 3. Core Data Schemas (frozen — extend only, never restructure without explicit approval)

```python
# models/shipment.py
from pydantic import BaseModel, Field, model_validator
from typing import Optional, Literal
from datetime import datetime

class ShipmentBase(BaseModel):
    shipment_id: str
    origin: str
    destination: str
    weight_kg: float = Field(..., gt=0)
    volume_m3: float = Field(..., gt=0)
    deadline: datetime
    cargo_value: float = Field(..., gt=0)   # INR
    product_category: str
    shipment_class: Literal["A", "B"]

class ClassAAttributes(BaseModel):
    product_subtype: Literal["medical", "organic"]
    temperature_min: float
    temperature_max: float
    q10: float
    base_shelf_life_hr: float
    hard_breach_override: bool = True   # medical only — see Section 4

class ClassBAttributes(BaseModel):
    # v2 CORRECTED UNITS — see Section 10, Bug #1.
    # delay_penalty_rate is a DIMENSIONLESS FRACTION (0.0-1.0), representing the
    # fraction of cargo_value contractually at risk if the shipment is late — NOT
    # an absolute INR/hour rate. Typical realistic range: 0.01-0.15.
    delay_penalty_rate: float = Field(..., ge=0, le=1)
    sla_strict: bool

class Shipment(ShipmentBase):
    class_a: Optional[ClassAAttributes] = None
    class_b: Optional[ClassBAttributes] = None

    @model_validator(mode="after")
    def enforce_class_exclusivity(self):
        if self.shipment_class == "A":
            assert self.class_a is not None and self.class_b is None
        else:
            assert self.class_b is not None and self.class_a is None
        return self
```

```python
# models/legs.py
class RoadLeg(BaseModel):
    mode: str = "road"
    origin: str
    destination: str
    distance_km: float
    transit_time_hr: float
    delay_probability: float = Field(..., ge=0, le=1)
    num_trucks: int
    cost_per_truck: float

class RailLeg(BaseModel):
    mode: str = "rail"
    origin: str
    destination: str
    distance_km: float
    transit_time_hr: float
    dwell_time_hr: float
    delay_probability: float = Field(..., ge=0, le=1)
    num_bogeys: int
    cost_per_bogey: float
```

```python
# models/risk_models.py
class RiskScore(BaseModel):
    risk_score: float = Field(..., ge=0, le=1)
    expected_loss: float          # INR
    breakdown: str                 # literal formula string, MUST be computed from
                                    # the same values that produced risk_score —
                                    # see Section 4's "single source of truth" rule
```

```python
# models/plan_models.py
class CandidatePlan(BaseModel):
    label: Literal["Cheapest", "Fastest / Lowest-Risk", "Balanced"]
    alpha: float
    beta: float
    freight_cost: float
    expected_loss: float
    total_cost: float
    eta_hr: float
    groupings: list[str]
```

---

## 4. Frozen Formulas & Constants (v2 — corrected)

### Spoilage risk (Class A) — unchanged, correct as-is
```
breached = not (temperature_min <= T_actual <= temperature_max)

if product_subtype == "medical" and breached:
    risk_score = 1.0
else:
    fraction_consumed = (transit_time_hr / base_shelf_life_hr) * (q10 ** ((T_actual - T_optimal) / 10))
    risk_score = min(1.0, fraction_consumed)

expected_loss = risk_score * cargo_value
```

| Subtype | Q10 | Optimal temp band |
|---|---|---|
| Medical (e.g. 2–8°C vaccines) | **2.5** | 2°C–8°C |
| Organic produce | 2.0–3.0 (default 2.2) | product-specific (e.g. 4°C–12°C) |

### Delay-loss risk (Class B) — **v2 CORRECTED FORMULA**
```
risk_score = delay_probability

# v1 multiplied cargo_value x an INR/hour rate, producing INR^2 — fixed in v2:
# delay_penalty_rate is now a dimensionless fraction (0.0-1.0) of cargo_value
# at risk if the shipment breaches SLA. See Section 10, Bug #1.
expected_loss = risk_score * cargo_value * delay_penalty_rate
```

**Sanity check before shipping this formula anywhere:** for any seed shipment, `expected_loss` for Class B should land in the same rough order of magnitude as `freight_cost` for that shipment group — if it's off by more than ~2 orders of magnitude, `delay_penalty_rate` in the seed data is almost certainly still using v1's INR/hour convention. Check seed data units explicitly, don't just trust the formula is right because it matches this document.

### "Single source of truth" rule for breakdown strings (v2 — new, closes Bug #2)
`RiskScore.breakdown` is a **rendering of the exact computation that produced `risk_score`**, not a separately-authored display string. Implementation-wise: build the breakdown string by formatting the actual variables used in the calculation (f-string with the real `transit_time_hr`, `base_shelf_life_hr`, `q10`, etc.), never a template with placeholder-looking numbers. If you ever generate `risk_score` and `breakdown` in two separate code paths, you will eventually desync them — write one function that returns both together.

### Transfer / dwell time (road↔rail switch) — unchanged
```
total_leg_time_hr = transit_time_hr(leg_in) + transfer_buffer_hr + dwell_time_hr(rail_leg) + transit_time_hr(leg_out)
arrival_time_at_transfer ∈ [next_scheduled_departure - transfer_buffer_hr, next_scheduled_departure]
```
`transfer_buffer_hr`: 2 hr generic cargo, 3 hr cold-chain.

### Rail Aggregation for Non-Hub Origins/Destinations (v3 — new, required for the 20-city network)

Only the 5 hub cities named in Section 5 have direct rail service between each other (the trunk edges listed there). For any shipment where the origin and/or destination is a road-only satellite town, `rail_route.py` builds ONE aggregate `RailLeg` candidate using this fixed procedure:

1. Look up the nearest hub to the origin and the nearest hub to the destination, using the static mapping table in Section 5 — this is a fixed lookup, not a live nearest-neighbor calculation, to keep the demo deterministic.
2. If origin's nearest hub equals destination's nearest hub, there is no rail advantage for this pair — `rail_route.py` returns `None` (this is the existing "no rail leg" case, not an error; don't force a rail candidate that's just feeder-road distance with no trunk benefit).
3. If no direct trunk edge connects origin's nearest hub to destination's nearest hub (check Section 5's trunk edge list exactly — e.g. Himkot↔Meghdoot has no direct trunk edge), return `None`. **Do not implement multi-hop rail pathfinding across the trunk network** — this MVP only resolves a single trunk edge per shipment, matching the "no route search in the solver" principle in Section 2.
4. Otherwise, aggregate: feeder road (origin → nearest hub, via `road_route.py`) + trunk rail (hub → hub, from `rail_schedules.json`) + feeder road (nearest hub → destination, via `road_route.py`, skipped if destination IS the hub). `dwell_time_hr` sums the `transfer_buffer_hr` at each hub transfer plus any scheduled rail dwell from the timetable.
5. Return this as one `RailLeg` object. The frontend map should still visually render the feeder-road + trunk-rail + feeder-road structure with a transfer-node marker at each hub used — but to the optimizer, it's a single modal candidate, exactly like the original single-hub example this network generalizes.

### Objective weights (α · freight_cost + β · expected_loss), α+β=1 — unchanged

| Candidate | α | β |
|---|---|---|
| Cheapest | 0.90 | 0.10 |
| Fastest / Lowest-Risk | 0.20 | 0.80 |
| Balanced | 0.55 | 0.45 |

Solve all 3 by building the CP-SAT model once and re-minimizing with a swapped objective vector — never rebuild per candidate.

---

## 5. Demo Network & Seed Data (v3 — expanded to 20 cities)

**Every city name below is fictional**, invented for this demo — none represent real places, and no claims about real Indian rail/road infrastructure should ever be attributed to this data. This is a deliberate choice: since the rail data has to be hand-authored either way (Section 7 — no live freight-rail API exists), inventing city names makes it unambiguous that this is synthetic demo data, not a misrepresentation of real infrastructure.

### Network structure: 5 multimodal hubs + 15 road-only satellite towns

**Multimodal hubs** (road AND rail service — the only cities that act as transfer points):

| Hub | Lat | Lon | Region |
|---|---|---|---|
| Indranagar Junction | 21.15 | 79.08 | Central |
| Himkot | 29.40 | 76.60 | North |
| Suryapatan | 22.30 | 71.20 | West |
| Chandanpalli | 13.50 | 78.10 | South |
| Meghdoot | 23.60 | 87.40 | East |

**Road-only satellite towns** (no direct rail — reachable only by road, or by road-to-nearest-hub-then-rail per the aggregation rule in Section 4):

| Town | Lat | Lon | Nearest Hub |
|---|---|---|---|
| Kanakpur | 29.05 | 75.90 | Himkot |
| Rudra Nagar | 30.10 | 77.25 | Himkot |
| Panchvati Khurd | 28.70 | 76.95 | Himkot |
| Amrai | 21.90 | 72.10 | Suryapatan |
| Bhairavgarh | 22.80 | 70.50 | Suryapatan |
| Nilgiri Basti | 21.40 | 73.00 | Suryapatan |
| Vasantnagar | 23.10 | 71.80 | Suryapatan |
| Devgiri | 12.90 | 77.50 | Chandanpalli |
| Ratnapur | 14.20 | 78.60 | Chandanpalli |
| Harishpur | 13.00 | 79.40 | Chandanpalli |
| Ambapuri | 12.50 | 77.90 | Chandanpalli |
| Shantivan | 24.10 | 88.20 | Meghdoot |
| Ganganpalli | 23.20 | 86.80 | Meghdoot |
| Kishangunj | 24.50 | 87.90 | Meghdoot |
| Sagarpettah | 22.90 | 88.10 | Meghdoot |

### Rail trunk edges (the ONLY city pairs with direct rail service)
- Indranagar Junction ↔ Himkot
- Indranagar Junction ↔ Suryapatan
- Indranagar Junction ↔ Chandanpalli
- Indranagar Junction ↔ Meghdoot
- Suryapatan ↔ Chandanpalli (direct west–south line, bypasses the central hub)

No other hub pair is directly connected — e.g. Himkot↔Meghdoot has no trunk edge, so per Section 4's aggregation rule, a shipment between those regions has no rail option under this MVP. Road routing (via OSRM/live API) works between **any** two checkpoints, hub or satellite — only rail is topology-limited, which is realistic and is exactly what should push some shipments to road-only and others to multimodal.

### Seed Shipments (v3 — expanded from 4 to 6 to exercise the wider network)

| # | Shipment | Class | Subtype | Origin → Destination | Route Type |
|---|---|---|---|---|---|
| 1 | Grapes | A | Organic | Amrai → Suryapatan | Road only — same hub region, no rail benefit |
| 2 | Onions | B | — | Kanakpur → Ambapuri | Multimodal: road→Himkot, rail Himkot→Indranagar→Chandanpalli, road→Ambapuri |
| 3 | Vaccines | A | Medical | Rudra Nagar → Meghdoot | Multimodal: road→Himkot, rail Himkot→Indranagar→Meghdoot (destination is the hub) |
| 4 | Auto Parts | B | — | Bhairavgarh → Suryapatan | Road only — same hub region |
| 5 | Textiles | B | — | Shantivan → Himkot | Multimodal: road→Meghdoot, rail Meghdoot→Indranagar→Himkot (destination is the hub) |
| 6 | Pharma Supplies | A | Medical | Devgiri → Suryapatan | Multimodal: road→Chandanpalli, rail via the direct Chandanpalli↔Suryapatan edge (not via Indranagar) |

This mix deliberately covers: two road-only shipments in different regions (so "road-only" reads as a general network property, not a one-off special case), three multimodal shipments routed through the central hub, and one multimodal shipment using the direct Suryapatan↔Chandanpalli edge instead — so the demo shows the network has real topology, not one fixed path.

**When authoring `seed_shipments.json`:** set `delay_penalty_rate` for Class B shipments as a decimal fraction (e.g. `0.04`–`0.08`), not a raw rupee figure. Set `cargo_value` realistically so `freight_cost` and `expected_loss` land in comparable ranges — verify by hand-computing at least one shipment's expected_loss before trusting the seed file.

---

## 6. Repository Layout (production-oriented, still solo-buildable)

```
freight-consolidation/
├── backend/
│   ├── app/
│   │   ├── main.py, config.py                # config.py now uses pydantic-settings, see 9.1
│   │   ├── api/routes.py, api/schemas.py
│   │   ├── models/  (shipment.py, legs.py, risk_models.py, plan_models.py)
│   │   ├── engine/  (ingestion, classification, road_route, rail_route,
│   │   │             input_entry, risk, optimization_engine,
│   │   │             grouping_scheduler, orchestrator)
│   │   ├── repository/                        # NEW — thin data-access layer, see 9.6
│   │   │   └── shipment_repository.py
│   │   ├── core/                               # NEW
│   │   │   ├── logging.py                      # structured logging setup, see 9.3
│   │   │   └── exceptions.py                    # custom exception classes, see 9.2
│   ├── data/  (checkpoints_geocoded.json, rail_schedules.json, rail_station_graph.json,
│   │           dwell_time_matrix.json, decay_constants.json, seed_shipments.json)
│   ├── tests/  (unit tests per engine + test_e2e.py + test_error_handling.py [NEW])
│   ├── .env.example                             # NEW — documents required env vars, no real secrets
│   ├── Dockerfile                               # NEW
│   └── requirements.txt
├── frontend/
│   ├── src/  (App.jsx, styles/theme.js, components/*, api/client.js, mocks/fixtures.js)
│   ├── .env.example                             # NEW — VITE_API_BASE_URL etc.
│   └── Dockerfile                               # NEW
├── scripts/  (seed_demo_corridor.py, stress_test_latency.py)
├── docker-compose.yml                           # NEW — wires backend + frontend
├── .github/workflows/ci.yml                     # NEW — lint + test on push
└── README.md                                    # NEW — setup, run, and demo instructions
```

---

## 7. Approved Tools, Libraries & Data Sources

| Need | Approved choice |
|---|---|
| Backend framework | FastAPI + Uvicorn, Pydantic v2 |
| Config/secrets | `pydantic-settings`, `.env` file (gitignored), `.env.example` committed |
| Solver | Google OR-Tools (CP-SAT) |
| Road routing | OSRM public demo server (dev), TomTom Routing API (if a key is supplied) |
| Geocoding | Nominatim (OpenStreetMap), cached, never called live in the request path |
| Rail data | Hand-built static JSON — no public live freight-rail API exists in India |
| Frontend framework | React + Vite (TypeScript preferred for production-grade type safety) |
| Map rendering | Leaflet + OpenStreetMap tiles |
| Charts | Recharts |
| Testing | Pytest + `pytest-cov` for coverage reporting |
| Logging | Python's standard `logging` module with a JSON formatter (no new heavy dependency needed) |
| Containerization | Docker, `docker-compose` for local multi-service orchestration |
| CI | GitHub Actions (lint + test on every push) |
| Rate limiting (if needed) | `slowapi` — only add if you actually observe the OSRM free tier being exceeded, don't pre-emptively add |

Do not use anything outside this list without flagging it to the user first.

---

## 8. Anti-Hallucination & Scope Discipline Rules

1. Never invent a library, API, dataset, or file not listed in Section 7 or the repo tree in Section 6.
2. Never claim a real-time data source exists where none does (Indian freight rail — always the static table).
3. Never reintroduce anything from the "removed" column in Section 2.
4. Never change a frozen formula, schema field, or constant in Sections 3–4 without the user explicitly asking to change it in that message.
5. This is a solo build — never introduce role-based/team language.
6. Re-read this file before generating code in any new session.
7. When uncertain about a real-world fact, say so rather than stating it as certain.
8. **New for v2:** "Production-grade" is a request for engineering rigor (error handling, logging, config, containerization, tests — Section 9), not a request to expand the feature set. If a production concern seems to require a new feature (e.g. "handle concurrent users" reading as "build auth"), ask before building it.

---

## 9. Production Engineering Standards

### 9.1 Environment & Secrets Management
- All configuration (API keys, base URLs, CORS origins, debug flags) goes through a `pydantic-settings` `Settings` class reading from `.env`.
- `.env` is gitignored. `.env.example` is committed and lists every required variable with a placeholder value and a one-line comment on what it's for.
- No API keys, secrets, or credentials are ever hardcoded in source files, committed to git, or printed in logs.

### 9.2 Error Handling & Input Validation
- Every FastAPI route returns structured error responses (`{"error": "...", "detail": "..."}`) with correct HTTP status codes (400 for validation, 404 for missing shipment IDs, 502/503 for upstream routing-API failures) — never a bare 500 with a stack trace leaking to the client.
- Define custom exception classes in `core/exceptions.py` (e.g. `RailLegNotFoundError`, `RoutingProviderUnavailableError`) and a FastAPI exception handler that maps them to clean JSON responses.
- **Graceful degradation, not silent failure:** if the road routing API times out or errors, the request should fail clearly with a 502 and a human-readable message — never fall back to fabricated route data. If rail has no valid leg for a pair, that's the existing `None` case (expected, not an error) and must be handled distinctly from an actual API failure.
- All external HTTP calls (OSRM, Nominatim) use an explicit timeout and at least one retry with backoff before failing.

### 9.3 Logging & Observability
- Structured logging (JSON format) at the application boundary — log every request's method, path, status code, and duration.
- Log levels used correctly: INFO for normal flow, WARNING for degraded-but-handled situations (e.g. rail leg not found, falling back to road-only), ERROR for actual failures.
- Never log full shipment PII/cargo values at INFO level if this were ever to hold real customer data — for this hackathon demo it's fine, but structure logs as if it mattered, since that's the point of doing this properly.
- Include a request-scoped correlation ID (simple UUID per request) in every log line tied to that request, to make tracing a single `/plan` call through the logs possible.

### 9.4 Testing Standards
- Every engine file has a corresponding unit test file (already true from Prompts 1–6).
- Add `test_error_handling.py`: assert that a malformed shipment payload returns 400, an unknown shipment_id returns 404, and a simulated routing-API timeout returns 502 with a clean error body (mock the HTTP call to raise a timeout).
- Target meaningful coverage on `engine/` and `api/` (aim for ~80%+, but don't chase 100% by writing low-value tests).
- `test_e2e.py` and `stress_test_latency.py` remain as the integration/performance checks.

### 9.5 Containerization & Local Orchestration
- `backend/Dockerfile`: multi-stage if it meaningfully reduces image size, otherwise a simple single-stage Python image is fine for this scope.
- `frontend/Dockerfile`: builds the static production bundle and serves it (e.g. via a lightweight static server), or run in dev mode for the demo — pick whichever is simpler to keep working reliably before demo day.
- `docker-compose.yml` at the repo root brings up both services with one command (`docker compose up`) and wires the frontend's API base URL to the backend service.
- `README.md` documents exact setup and run steps for someone (a judge, or future-you) who has never seen this repo before.

### 9.6 Data Layer Abstraction
- Even though the demo runs on JSON seed data, engine code should not read `seed_shipments.json` directly scattered across multiple files. Instead, a single `repository/shipment_repository.py` exposes functions like `get_shipment(shipment_id)` and `list_shipments()`, and every other module goes through it.
- This is the one deliberate "over-engineering for the demo's actual needs" allowed in this project — it costs almost nothing to build now and means swapping JSON for SQLite/Postgres later touches one file, not the whole codebase.

### 9.7 Security Basics (proportionate to scope — this is not a public-facing production system)
- CORS is locked to explicit origins (e.g. `http://localhost:5173`, plus your deployed frontend URL if hosted) — never `allow_origins=["*"]` even for a demo.
- Basic request size limits on the `/plan` endpoint (reject absurdly large `shipment_ids` lists) to avoid trivial resource exhaustion.
- FastAPI's automatic OpenAPI/Swagger docs at `/docs` stay enabled — useful for judges to inspect the real API contract directly, and there's no sensitive data at stake here.

---

## 10. Fixed Bugs (do not reintroduce)

**Bug #1 — Class B unit mismatch (fixed in Section 4):** the original `delay_penalty_rate` was defined as "INR per hour late" and multiplied directly against `cargo_value`, producing INR² and expected-loss values in the hundreds of millions for ordinary shipments. Fixed by redefining `delay_penalty_rate` as a dimensionless fraction (0.0–1.0) of `cargo_value` at risk. If you see `delay_penalty_rate` values above 1.0 anywhere in seed data or code, that's the v1 bug resurfacing.

**Bug #2 — Risk score / breakdown string desync:** a shipment's displayed `risk_score` (e.g. 0.17) didn't match what its own displayed `breakdown` formula actually computed (e.g. the formula shown evaluated to 0.22). Fixed by the "single source of truth" rule in Section 4 — one function must produce both values together from the same inputs, never two independently-authored strings.

**Bug #3 — Wrong Q10 constant used in a UI mock:** a demo showed Vaccines using Q10=3.2 instead of the frozen medical constant of 2.5. Always pull `q10` from `decay_constants.json` / the frozen table in Section 4, never a locally invented demo value.
