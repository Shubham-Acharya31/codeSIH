# AI Multimodal Consignment Consolidation & Cold-Chain Risk Prediction Engine

> **Production-Grade Logistics Optimization Platform** for MSME and agri-logistics shippers across India.
> Built with **Deterministic Physics ($Q_{10}$/Arrhenius Spoilage)**, **Dimensionless Economic Delay Risk Modeling**, and **Google OR-Tools CP-SAT Multimodal Solver**.

---

## 1. Overview & Core Mathematical Guarantees

MSME and agri-logistics shippers face two structurally distinct risk mechanisms:
1. **Perishable Cargo (Class A):** Temperature $\times$ Time spoilage physics.
2. **Non-Perishable Cargo (Class B):** Contractual SLA breach and delivery delay penalties.

This platform automates multimodal routing, risk evaluation, and consolidation scheduling across a **20-City Network (5 Multimodal Hubs + 15 Satellite Towns)** in **sub-50ms** solve latency without heuristic black-boxes.

### Frozen Mathematical Formulas

#### Class A (Perishable Spoilage Risk)
$$\text{breached} = \neg (T_{\min} \le T_{\text{actual}} \le T_{\max})$$

- **Medical Cargo (e.g. Vaccines):** If breached and $\text{hard\_breach\_override} = \text{True}$, $\text{risk\_score} = 1.00$ ($100\%$ loss).
- **Continuous Decay:**
$$\text{fraction\_consumed} = \left(\frac{\text{transit\_time\_hr} + \text{dwell\_time\_hr}}{\text{base\_shelf\_life\_hr}}\right) \times Q_{10}^{\frac{T_{\text{actual}} - T_{\text{optimal}}}{10}}$$
$$\text{risk\_score} = \min(1.0, \max(0.0, \text{fraction\_consumed}))$$
$$\text{expected\_loss} = \text{risk\_score} \times \text{cargo\_value}$$

| Subtype | $Q_{10}$ Factor | Safe Temperature Band | Base Shelf Life | Hard Breach Trigger |
|---|---|---|---|---|
| **Medical Vaccines** | **2.5** | $2.0^\circ\text{C} - 8.0^\circ\text{C}$ | $48.0\text{h}$ | **Instant 1.0 Risk Override** |
| **Organic Produce (Grapes)** | **2.2** | $4.0^\circ\text{C} - 12.0^\circ\text{C}$ | $72.0\text{h}$ | Continuous Decay |

#### Class B (Economic Delay Loss — v2 Corrected Formula)
$$\text{risk\_score} = \text{delay\_probability}$$
$$\text{expected\_loss} = \text{risk\_score} \times \text{cargo\_value} \times \text{delay\_penalty\_rate}$$
*Note: $\text{delay\_penalty\_rate}$ is strictly a dimensionless fraction ($0.0 \le \text{rate} \le 1.0$), ensuring realistic monetary scale.*

#### Multi-Objective Optimization Scenarios (OR-Tools CP-SAT)
$$\min \left( \alpha \cdot \text{freight\_cost} + \beta \cdot \text{expected\_loss} \right), \quad \alpha + \beta = 1.0$$

| Scenario | $\alpha$ (Cost Weight) | $\beta$ (Risk Weight) | Characteristics |
|---|---|---|---|
| **Cheapest** | $0.90$ | $0.10$ | Maximizes rail bulk consolidation; lowest freight cost |
| **Fastest / Lowest-Risk** | $0.20$ | $0.80$ | Prioritizes direct highway road dispatch; minimal dwell time |
| **Balanced** | $0.55$ | $0.45$ | Optimal compromise between freight expenditure and cold-chain risk |

---

## 2. Network Topology (20 Cities)

- **5 Multimodal Hubs (Road + Trunk Rail):**
  - `Indranagar Junction` (Central: 21.15, 79.08)
  - `Himkot` (North: 29.40, 76.60)
  - `Suryapatan` (West: 22.30, 71.20)
  - `Chandanpalli` (South: 13.50, 78.10)
  - `Meghdoot` (East: 23.60, 87.40)
- **5 Direct Trunk Rail Corridors:**
  1. Indranagar Junction $\leftrightarrow$ Himkot
  2. Indranagar Junction $\leftrightarrow$ Suryapatan
  3. Indranagar Junction $\leftrightarrow$ Chandanpalli
  4. Indranagar Junction $\leftrightarrow$ Meghdoot
  5. Suryapatan $\leftrightarrow$ Chandanpalli (Direct West-South Bypass)
- **15 Road-Only Satellite Towns:**
  - *Himkot Satellites:* Kanakpur, Rudra Nagar, Panchvati Khurd
  - *Suryapatan Satellites:* Amrai, Bhairavgarh, Nilgiri Basti, Vasantnagar
  - *Chandanpalli Satellites:* Devgiri, Ratnapur, Harishpur, Ambapuri
  - *Meghdoot Satellites:* Shantivan, Ganganpalli, Kishangunj, Sagarpettah

---

## 3. Directory Layout

```
SIH NEW/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── routes.py                 # REST Endpoints (/health, /seed-demo, /plan)
│   │   │   └── schemas.py                # Pydantic Request & Response DTOs
│   │   ├── core/
│   │   │   ├── exceptions.py             # Custom structured exceptions
│   │   │   └── logging.py                # JSON structured logging with UUID tracing
│   │   ├── engine/
│   │   │   ├── classification.py         # Q10 & SLA rule enrichment
│   │   │   ├── grouping_scheduler.py     # Vehicle packing & corridor consolidation
│   │   │   ├── ingestion.py              # Payload parsing & validation
│   │   │   ├── input_entry.py            # Modal candidate generator
│   │   │   ├── optimization_engine.py    # Google OR-Tools CP-SAT multi-solve
│   │   │   ├── orchestrator.py           # Pipeline coordinator
│   │   │   ├── rail_route.py             # 5-hub trunk & feeder aggregator
│   │   │   ├── risk.py                   # Deterministic physics & single-source formulas
│   │   │   └── road_route.py             # OSRM wrapper with timeout/backoff & fallback
│   │   ├── models/
│   │   │   ├── legs.py                   # RoadLeg & RailLeg schemas
│   │   │   ├── plan_models.py            # CandidatePlan & ShipmentPlanDetail schemas
│   │   │   ├── risk_models.py            # RiskScore schema
│   │   │   └── shipment.py               # Shipment & Class A/B attributes
│   │   ├── repository/
│   │   │   └── shipment_repository.py    # Data-access abstraction layer
│   │   ├── config.py                     # pydantic-settings configuration
│   │   └── main.py                       # FastAPI application & middleware
│   ├── data/                             # Static checkpoints, schedules & seed shipments
│   ├── scripts/
│   │   ├── seed_demo_corridor.py         # CLI demo verification script
│   │   └── stress_test_latency.py        # 20-solve CP-SAT latency benchmark
│   ├── tests/                            # 31 comprehensive pytest unit & e2e test cases
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/client.ts                 # Axios client with fallback
│   │   ├── components/                   # React UI components (Tabs, Maps, Badges, Cards)
│   │   ├── mocks/fixtures.ts             # Static demo fixtures
│   │   ├── styles/theme.ts               # Theme tokens (Class A #2F6FED, Class B #E28A2B)
│   │   ├── types/index.ts                # TypeScript interfaces mirroring backend models
│   │   ├── utils/formatters.ts           # Indian currency (₹L/Cr) & date formatters
│   │   ├── App.tsx                       # Main dashboard state & tab coordinator
│   │   ├── main.tsx
│   │   └── index.css                     # Tailwind CSS & custom styles
│   ├── Dockerfile
│   ├── package.json
│   └── vite.config.ts
├── docker-compose.yml
├── .github/workflows/ci.yml
└── README.md
```

---

## 4. Setup & Running Locally

### Option A: Local Python & Node Setup

#### 1. Backend Setup:
```bash
# In project root:
.venv\Scripts\python.exe -m pip install -r backend/requirements.txt

# Run backend API server:
.venv\Scripts\uvicorn.exe backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```
API Documentation will be live at: **http://localhost:8000/docs**

#### 2. Frontend Setup:
```bash
cd frontend
npm install
npm run dev
```
Frontend Dashboard will be live at: **http://localhost:5173**

---

### Option B: Docker Compose (One-Command Orchestration)

```bash
docker compose up --build
```
- **Backend API:** `http://localhost:8000`
- **Frontend App:** `http://localhost:5173`

---

## 5. Verification & Test Suites

### Backend Automated Test Suite (31 Tests, 92% Coverage):
```bash
.venv\Scripts\pytest --cov=backend/app backend/tests/ -v
```

### CP-SAT Optimization Latency Stress Test (Target: $p_{95} < 2000\text{ms}$):
```bash
.venv\Scripts\python backend/scripts/stress_test_latency.py
```
*Current benchmark: $p_{50} = 46.58\text{ms}, p_{95} = 55.16\text{ms}$ (~36x faster than budget).*

### Frontend Production Build Test:
```bash
cd frontend && npm run build
```

---

## 6. API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Service health and version status |
| `GET` | `/api/v1/checkpoints` | Returns the 20 geocoded network cities and 5 hubs |
| `GET` | `/api/v1/seed-demo` | Returns the 6 seed consignments |
| `POST` | `/api/v1/plan` | Generates 3 Pareto-optimal consolidation plans |

### Sample Plan Request:
```json
{
  "shipment_ids": ["SHP-001", "SHP-002", "SHP-003", "SHP-004", "SHP-005", "SHP-006"],
  "simulated_temp_c": 5.0
}
```
