# Agent Execution Prompts v2 — Antigravity Edition, Production-Grade

Paired with PROJECT_CONTEXT.md v2. This document adapts the web chat execution pipeline into autonomous agent prompts optimized for Google Antigravity. Since Antigravity can execute terminal commands, edit files directly, run test suites, and debug its own code, all manual copy-paste handshakes, terminal instructions, and verification steps have been streamlined into direct execution directives.

## Workspace Setup & Directives

- Ensure `PROJECT_CONTEXT.md v2` is present in the project workspace root.
- Antigravity should run terminal commands (`pytest`, `pip`, `npm`, `docker compose`) autonomously and resolve any failures before moving to subsequent tasks.
- Maintain the local workspace as the ultimate source of truth.

---

## PROMPT 0 — Repo Scaffold & Environment Initialization

Read `PROJECT_CONTEXT.md v2` and confirm understanding of:

- Solo-build context with no team roles.
- Frozen formulas, schemas, and rejected approaches in Sections 2–4 (including v2 Class B formula updates and `delay_penalty_rate` unit rules).
- Approved tools and datasets in Section 7.
- Section 9 production engineering standards applying throughout execution.

**Execution Directive:**

- Create the complete directory structure matching Section 6, including `.env.example`, `Dockerfile`, `docker-compose.yml`, `.github/workflows/ci.yml`, `core/logging.py`, `core/exceptions.py`, and `repository/shipment_repository.py`.
- Generate `backend/requirements.txt` (including `pydantic-settings` and `pytest-cov`) and `frontend/package.json` per Section 7.
- Install all backend and frontend dependencies in the workspace shell and verify clean installation.

---

## PROMPT 1 — Core Schemas & Static Data Files

Review `PROJECT_CONTEXT.md v2` Sections 3, 4, 5, and 7.

**Execution Directive:**

- Create models in `backend/app/models/`: `shipment.py`, `legs.py`, `risk_models.py`, and `plan_models.py` with full Pydantic validation (class exclusivity validators, probability bounds $ge/le$, and dimensionless `delay_penalty_rate`).
- Create static data files under `backend/data/`:
  - `checkpoints_geocoded.json`: All 20 cities (5 hubs + 15 satellites) with lat/lon, type, and nearest_hub.
  - `decay_constants.json`: $Q_{10}$ values (medical=2.5, organic=2.2).
  - `rail_schedules.json` & `rail_station_graph.json`: Fictional 5-hub trunk network per Section 5.
  - `dwell_time_matrix.json`: Hub transfer buffer hours.
  - `seed_shipments.json`: 6 seed shipments with dimensionless `delay_penalty_rate` ($0.00$ to $1.00$).
- Write `backend/tests/test_schemas.py` to validate all JSON files against their respective models.
- Execute `pytest backend/tests/test_schemas.py` autonomously and verify all tests pass.

---

## PROMPT 2 — Ingestion & Classification Engines

Review Sections 3 and 8.

**Execution Directive:**

- Implement `backend/app/engine/ingestion.py` and `backend/app/engine/classification.py`. Ensure classification dynamically reads $Q_{10}$/temperature parameters from `decay_constants.json` and enforces non-defaulted Class B attributes.
- Implement unit tests in `backend/tests/test_ingestion.py` and `backend/tests/test_classification.py` covering all 6 seed shipments.
- Run `pytest` across the new test modules autonomously and resolve any failures.

---

## PROMPT 3 — Road, Rail, and Modal Candidate Engines

Review Section 7 routing guidelines.

**Execution Directive:**

- Implement `backend/app/engine/road_route.py`: Call OSRM public demo API via `httpx` with explicit timeouts and single-retry exponential backoff. Raise a custom exception on network failure.
- Implement `backend/app/engine/rail_route.py`: Enforce Section 4 non-hub origin/destination aggregation rules strictly (check nearest hubs, identical hub edge cases, and valid trunk edge connections).
- Implement `backend/app/engine/input_entry.py`.
- Create `backend/tests/test_routing.py` to test seed corridors, non-trunk pairs (e.g., Himkot→Meghdoot), same-hub pairs, and mock OSRM network timeout conditions.
- Execute `pytest backend/tests/test_routing.py` and verify candidate construction rules.

---

## PROMPT 4 — Risk Evaluation Engine (v2 Standards)

Review Section 4 for Class A formulas and corrected Class B rules.

**Execution Directive:**

- Implement `backend/app/engine/risk.py`:
  - Compute `risk_score` and breakdown within the same function execution context.
  - Enforce Class A hard-breach overrides and continuous decay logic using $Q_{10}$ values from static data.
  - For Class B, calculate `expected_loss = risk_score * cargo_value * delay_penalty_rate` with explicit bounds assertions on `delay_penalty_rate`.
- Write `backend/tests/test_risk.py` asserting string breakdown parity with numeric calculations.
- Run `pytest backend/tests/test_risk.py` and confirm zero mathematical desynchronization.

---

## PROMPT 5 — OR-Tools Optimization Engine

Review Sections 2 and 4.

**Execution Directive:**

- Implement `backend/app/engine/optimization_engine.py` and `backend/app/engine/grouping_scheduler.py` using a single OR-Tools CP-SAT model solved 3 times with frozen $\alpha/\beta$ weight parameters and warm-start solver hints.
- Implement `backend/tests/test_optimization.py` running against all 6 seed shipments.
- Create `backend/scripts/stress_test_latency.py` to run 20 repeated solves and report $p_{50}$/$p_{95}$ latency metrics.
- Run the benchmark script in the workspace shell and verify $p_{95}$ latency meets sub-2-second target limits.

---

## PROMPT 6 — Orchestrator & FastAPI Application Layer

Review Section 6 and Sections 9.1–9.2.

**Execution Directive:**

- Implement custom exceptions in `backend/app/core/exceptions.py`.
- Implement structured JSON logging with correlation IDs in `backend/app/core/logging.py`.
- Set up configuration handling via `pydantic-settings` in `backend/app/config.py` and populate `backend/.env.example`.
- Build `backend/app/repository/shipment_repository.py` and `backend/app/engine/orchestrator.py`.
- Build API routes (`POST /plan`, `GET /health`, `GET /seed-demo`) in `backend/app/api/` with custom exception handlers and restricted CORS (`http://localhost:5173`).
- Write `backend/tests/test_e2e.py` and `backend/tests/test_error_handling.py` (covering 400 bad payload, 404 missing shipment, and 502 gateway routing failure).
- Run the complete test suite using `pytest` and verify all tests pass cleanly.

---

## PROMPT 7 — Frontend Scaffold & Mock Integration

Review Sections 6 and 7.

**Execution Directive:**

- Create `frontend/src/mocks/fixtures.js` using real backend responses from prior runs.
- Implement design system assets in `frontend/src/styles/theme.js`.
- Build React UI components: `ShipmentIntakeForm.jsx`, `ClassificationBadge.jsx`, `RiskExplainCard.jsx`, `PlanComparison.jsx`, `RouteMap.jsx`, and `CandidateSelector.jsx`.
- Create `frontend/.env.example` containing `VITE_API_BASE_URL`.
- Run `npm run build` or the dev preview to verify clean component rendering without console errors.

---

## PROMPT 8 — Frontend-Backend Integration

Review Section 9 error-handling guidelines.

**Execution Directive:**

- Implement `frontend/src/api/client.js` with structured error boundary handlers for network, $4xx$, and $5xx$ status codes.
- Connect all React components to live API endpoints (`/seed-demo`, `/plan`).
- Create `backend/scripts/seed_demo_corridor.py` for standard demo setup.
- Execute both backend and frontend environments, trigger API calls, and verify graceful UI degradation when backend service stops.

---

## PROMPT 9 — Full Suite Execution & Benchmark Polish

Review Sections 4, 5, 8, and 9.

**Execution Directive:**

- Execute full backend test suite (`pytest --cov=app`) and fix any regressions without modifying frozen project parameters.
- Run `backend/scripts/stress_test_latency.py` and confirm $p_{95}$ latency remains under 2 seconds.
- Validate domain boundary conditions across seed data:
  - Vaccines reflect $1.0$ risk score under temperature breach conditions.
  - Class B cost and loss values maintain comparable scalar magnitudes.
  - Single-mode and multimodal transport candidates assign routes as specified in Section 5.
- Verify graceful error state handling in UI when backend server connections are interrupted.

---

## PROMPT 10 — Environment & Configuration Hardening

Review Section 9.1.

**Execution Directive:**

- Audit codebase for hardcoded settings (CORS origins, base URLs, timeouts, debug flags).
- Refactor configuration via `pydantic-settings` in `backend/app/config.py`.
- Update `backend/.env.example` and `frontend/.env.example` with documented keys.
- Refactor dependent source modules to read dynamically from configuration classes.

---

## PROMPT 11 — Resiliency & Error Recovery Audit

Review Section 9.2.

**Execution Directive:**

- Audit routes, background tasks, and external calls for unhandled stack traces, missing timeouts, or fallback synthetic data risk.
- Ensure explicit HTTP timeout wrappers and backoff mechanics across all outbound web requests.
- Update `backend/tests/test_error_handling.py` with cases for network timeouts, payload bounds breaches, and invalid IDs.
- Run `pytest backend/tests/test_error_handling.py` and verify explicit structured JSON error payloads for all failure conditions.

---

## PROMPT 12 — Observability & Request Tracing

Review Section 9.3.

**Execution Directive:**

- Configure structured JSON logging in `backend/app/core/logging.py` featuring auto-generated UUID request correlation IDs.
- Attach HTTP logging middleware in `backend/app/main.py` recording HTTP method, path, response status, and duration ($ms$).
- Execute server, perform automated curl requests against endpoints, and verify correlation ID propagation across log lines.

---

## PROMPT 13 — Containerization & CI Integration

Review Section 9.5.

**Execution Directive:**

- Create production `backend/Dockerfile` and `frontend/Dockerfile`.
- Implement root `docker-compose.yml` linking both services and injecting `VITE_API_BASE_URL`.
- Create `.github/workflows/ci.yml` running backend `pytest` and frontend build passes on commits to main.
- Execute `docker compose up --build` autonomously, verify container startup health, and ensure services communicate correctly inside the container network.

---

## PROMPT 14 — Security, Documentation, and Readiness Audit

Review Section 9.7 and Section 9 overall.

**Execution Directive:**

- Enforce strict origin mapping in CORS setup (disable wildcard `*`).
- Add input payload array length constraints to `POST /plan` in `backend/app/api/routes.py`.
- Verify OpenAPI docs remain functional at `/docs`.
- Draft comprehensive `README.md` covering system purpose, directory topology, setup steps, test commands, benchmark scripts, and architecture design rationale.
- Perform an automated workspace audit across all Section 9 verification gates (configuration, resiliency, logging, testing, containerization, security) and print a consolidated readiness evaluation.