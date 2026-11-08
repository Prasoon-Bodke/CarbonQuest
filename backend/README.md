# CarbonQuest Backend & AI Intelligence Service

Unified FastAPI backend hosting the deterministic carbon calculation engine, intelligent activity validation, what-if simulator, and adaptive rule-based intelligence module.

## Architecture & Responsibilities

- **Teammate 2 (Backend & Carbon Intelligence)**:
  - Database models (`SQLAlchemy 2`), Alembic migrations, database sessions
  - Supabase JWT authentication verification (`get_current_user` dependency extracting `sub` as `user_id`)
  - Intelligent rule-based activity validation (speed bounds per mode, daily caps, deduplication)
  - Deterministic carbon engine (`Activity × Published Sourced Emission Factor`)
  - What-If Simulator engine and shared `project_scenario()` calculation
  - Rewards engine (eco score, points ledger, badges, streaks, and cross-module `on_event` hook)
  - Privacy management (machine-readable GDPR export and irreversible erasure)
- **Teammate 3 (AI & Adaptive Intelligence)**:
  - Resides entirely within `app/ai/`
  - Candidate generation, weighted scoring, and priority ranking
  - Explainable per-user preference model using Beta-Bernoulli conjugate distributions
  - Adaptive feedback learning (updating beta priors and category weights upon skip/accept)
  - Grounded sustainability chatbot with guardrails and Groq Llama 3.3 70B integration
  - Graceful deterministic fallback when LLM is unavailable or offline

## Directory Structure
```
backend/
├── app/
│   ├── main.py                     # FastAPI application entrypoint (mounts app.ai.router)
│   ├── core/                       # Config, security, errors, deps, logging
│   ├── db/                         # Session, SQLAlchemy Base
│   ├── models/                     # Declarative database models
│   ├── schemas/                    # Pydantic v2 schemas
│   ├── repositories/               # Database access abstraction
│   ├── api/v1/                     # REST routes owned by T2
│   ├── services/                   # Validation, carbon engine, simulator, rewards, goals
│   └── ai/                         # Module owned by T3
│       ├── router.py               # Exposes FastAPI router
│       ├── config.py, repo.py      # AI config & DB repository
│       ├── recommender/            # Candidates, 4-factor scoring, ranker, cooldown
│       ├── adaptive/               # Beta-Bernoulli update, profile, metrics
│       ├── feedback/               # Feedback ingestion & rewards hook
│       ├── explain/                # Explanation builder & number validator
│       ├── chat/                   # Context builder, prompts, guardrails, service
│       └── llm/                    # Groq client & deterministic fallback
├── data/                           # Seed datasets (CSV factors, JSON actions, badges)
├── alembic/                        # Database migration scripts
├── scripts/                        # Seeding scripts (seed_factors.py, seed_demo.py)
├── tests/                          # Pytest suite
├── .env.example
├── requirements.txt
└── README.md
```

## Setup & Local Execution

1. Create a Python virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On Linux/macOS:
   source venv/bin/activate
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
4. Run factor and demo seeding scripts:
   ```bash
   python scripts/seed_factors.py
   python scripts/seed_demo.py
   ```
5. Start the server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   Interactive OpenAPI documentation is live at [http://localhost:8000/docs](http://localhost:8000/docs).
