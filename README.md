# CarbonQuest

> **PCCOE International Grand Challenge 2026** · *Theme: AI for Climate Change*  
> An explainable, closed-loop carbon footprint auditing and adaptive sustainability recommendation platform.

---

## 1. Project Overview

CarbonQuest transforms individual climate action through an auditable, closed-loop system:

$$\text{Track} \longrightarrow \text{Validate} \longrightarrow \text{Calculate} \longrightarrow \text{Analyze} \longrightarrow \text{Prioritize} \longrightarrow \text{Simulate} \longrightarrow \text{Act} \longrightarrow \text{Measure} \longrightarrow \text{Learn} \longrightarrow \text{Adapt}$$

### Architectural Guarantees (Day 0 Locks)
1. **Unified FastAPI Backend**: One single backend service (`backend/app`). Next.js is responsible only for frontend presentation. No business logic in Next.js API route handlers.
2. **Supabase Auth + PostgreSQL**: Frontend authenticates via Supabase Auth and forwards its JWT to FastAPI. FastAPI verifies the JWT and filters by tenant ID. Frontend never queries database tables directly.
3. **LLM Writes Words Only**: Groq Llama 3.3 70B generates natural language explanations and advisory dialogue. All numbers (kg CO₂e, percentage savings, scores, ranks, confidence) come strictly from deterministic Python functions.
4. **Estimated vs. Measured Provenance**: Every saving carries `basis = 'estimated'` or `basis = 'measured'` with distinct badges in the UI.
5. **Adaptive Rule-Based Statistical Learning**: Explainable per-user preference model using conjugate Beta-Bernoulli distributions per action plus category weighting. Not ungrounded ML.

---

## 2. Monorepo Directory Structure

```
carbonquest/
│
├── frontend/                     # Teammate 1 (UI & Presentation)
│   ├── app/                      # Next.js App Router
│   │   ├── (marketing)/          # Landing page
│   │   ├── (auth)/               # Login & signup
│   │   └── (app)/                # Authenticated application views
│   │       ├── onboarding/       # Baseline audit wizard
│   │       ├── dashboard/        # Category donut, trend, hotspots
│   │       ├── log/              # Quick-log forms & CSV upload
│   │       ├── footprint/        # Audit details & explainability drawer
│   │       ├── actions/          # Ranked recommendations & feedback loop
│   │       ├── simulator/        # What-if scenario testing
│   │       ├── goals/            # Target setting & progress
│   │       ├── rewards/          # Streaks, badges & leaderboard
│   │       ├── chat/             # Grounded AI advisor
│   │       └── settings/privacy/ # Consent & GDPR data deletion
│   ├── components/               # Radix UI, shadcn, charts, badges, layout
│   ├── lib/                      # FastAPI client (lib/api), Supabase auth (lib/supabase)
│   ├── mocks/                    # MSW handlers derived from contracts
│   ├── package.json
│   └── README.md
│
├── backend/                      # Teammate 2 (Backend) + Teammate 3 (AI)
│   ├── app/
│   │   ├── main.py               # FastAPI application (mounts app.ai.router)
│   │   ├── core/                 # Config, security, errors, deps, logging
│   │   ├── db/                   # Database engine, session, base
│   │   ├── models/               # SQLAlchemy 2 declarative models
│   │   ├── schemas/              # Pydantic v2 schemas
│   │   ├── repositories/         # Database access abstractions
│   │   ├── api/v1/               # REST API endpoints (owned by T2)
│   │   ├── services/             # Validation, carbon engine, simulator, rewards
│   │   └── ai/                   # AI & Adaptive Module (owned by T3)
│   │       ├── router.py         # AI FastAPI router
│   │       ├── config.py, repo.py
│   │       ├── recommender/      # Candidates, 4-factor scoring, ranker, cooldown
│   │       ├── adaptive/         # Beta-Bernoulli preference learning
│   │       ├── feedback/         # Feedback ingestion & rewards hook
│   │       ├── explain/          # LLM explanation builder & validator
│   │       ├── chat/             # Grounded chatbot, context, guardrails
│   │       └── llm/              # Groq client & deterministic fallback
│   ├── data/                     # Verified seed CSVs (emission factors) & JSONs
│   ├── alembic/                  # Database migration scripts
│   ├── scripts/                  # Factor & demo user seed scripts
│   ├── tests/                    # Pytest test suite
│   ├── requirements.txt
│   └── README.md
│
├── contracts/                    # Agreed Day 0 Shared Contracts
│   ├── API.md                    # REST API specification under /api/v1
│   ├── DATABASE.sql              # Canonical PostgreSQL schema
│   ├── ENUMS.md                  # Canonical enums and activity key specifications
│   ├── PY_INTERFACES.md          # Frozen Python signatures between T2 and T3
│   ├── CHANGELOG.md              # Contract version log
│   ├── openapi.json              # Committed OpenAPI 3.1 specification
│   └── examples/                 # Request & response payloads per endpoint
│
├── docs/                         # Technical Documentation
│   ├── ARCHITECTURE.md           # Runtime diagrams, data flow & security
│   ├── SOURCES.md                # Published emission factor citations & formulas
│   ├── DEMO_SCRIPT.md            # 3-minute scripted evaluation walkthrough
│   └── ai/
│       └── PROMPTS.md            # AI prompts, grounding context & guardrails
│
├── scripts/                      # Developer utility scripts (run_all, export_openapi)
├── .github/                      # GitHub CODEOWNERS, PR template, CI workflow
├── .gitignore
├── .env.example
└── README.md
```

---

## 3. Technology Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Recharts, Lucide Icons, TanStack Query, React Hook Form, Zod.
- **Backend**: Python 3.11+, FastAPI, Pydantic v2, SQLAlchemy 2, Alembic, psycopg, Pandas, NumPy, PyJWT.
- **AI & Adaptive Intelligence**: Groq API (Llama 3.3 70B Versatile), Explainable Beta-Bernoulli preference model, 4-factor weighted recommendation scoring, rule-based adaptive learning.
- **Database & Auth**: PostgreSQL (Supabase) + Supabase Auth.

---

## 4. Local Development Setup

### Prerequisites
- Node.js `v18+` or `v20+` and `npm`
- Python `3.11+`

### Step 1: Backend Setup
```bash
cd backend
python -m venv venv

# Activate virtual environment:
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install dependencies:
pip install -r requirements.txt

# Configure environment:
cp .env.example .env

# Seed verified emission factors and demo user:
python scripts/seed_factors.py
python scripts/seed_demo.py

# Launch FastAPI server:
uvicorn app.main:app --reload --port 8000
```
API Documentation will be live at: [http://localhost:8000/docs](http://localhost:8000/docs)

### Step 2: Frontend Setup
In a new terminal window:
```bash
cd frontend

# Install dependencies:
npm install

# Configure environment:
cp .env.example .env.local

# Start Next.js development server:
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Single-Command Launch (Alternative)
From the repository root:
```bash
python scripts/run_all.py
# Or on Windows:
scripts\run_all.bat
```

---

## 5. Running Tests

### Backend Test Suite
```bash
cd backend
pytest tests
```
Executes unit tests verifying:
- Activity plausibility rules (speed limits, caps, duplicate detection)
- Deterministic carbon calculations and scenario projections
- Adaptive Beta-Bernoulli preference updates (skip action lowering priority rank)
- FastAPI endpoint contracts

### Frontend Checks
```bash
cd frontend
npm run lint
npm run typecheck
```

---

## 6. Teammate Ownership Matrix

| Folder | Owner | Responsibilities |
|---|---|---|
| `/frontend/` | Teammate 1 | All pages, components, charts, and API client integration |
| `/backend/` (except `app/ai/`) | Teammate 2 | FastAPI core, DB models, migrations, validation, carbon engine, simulator |
| `/backend/app/ai/`, `/docs/ai/` | Teammate 3 | Recommender, Beta-Bernoulli learning, explanations, chatbot, Groq client |
| `/contracts/` | All Three (T1, T2, T3) | API specification, DATABASE.sql, ENUMS.md, PY_INTERFACES.md |
