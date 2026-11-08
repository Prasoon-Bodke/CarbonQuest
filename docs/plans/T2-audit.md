# T2 Audit: Backend & Carbon Intelligence Baseline Audit

> **Date**: 2026-11-08  
> **Author**: Backend & Carbon Intelligence Engineer (Teammate 2)  
> **Scope**: Baseline audit of existing backend, data, contracts, and endpoint implementations prior to prototype development.

---

## 1. Prototype Endpoint & Module Audit Table

| Endpoint or Module | Implemented | Returns Real Data | Tested | Gap |
|---|---|---|---|---|
| `GET /api/v1/health` | Yes | Yes | Yes (200 OK) | None. Returns service name, version, and ISO timestamp. |
| `GET /api/v1/me` | Yes | Yes | Yes (200 OK) | Lazy creation exists, but uses fallback demo user rather than verifying real Supabase JWT claims (audience/sub) and does not use a repository layer. |
| `PUT /api/v1/me` | Yes | Yes | Yes (200 OK) | Queries and mutates SQLAlchemy model directly inside route handler; needs repository abstraction. |
| `POST /api/v1/me/consents` | Yes | Yes | Yes (200 OK) | Updates consent flags directly in route handler; needs repository abstraction. |
| `POST /api/v1/me/onboarding` | No | No | No (404) | CP-1 proposal: Endpoint not yet created. Must expand 28-day baseline habits into dated activities via validation & carbon engine pipeline, idempotent through dedupe_hash. |
| `GET /api/v1/me/export` | Yes | Yes | Yes (200 OK) | Queries 5 tables directly in privacy route; needs repository abstraction. |
| `DELETE /api/v1/me` | Yes | Yes | Yes (200 OK) | Direct cascade delete in route handler; needs repository abstraction. |
| `GET /api/v1/emission-factors` | Yes | Yes (when seeded) | Yes (200 OK) | Direct query in `FactorService`. Missing active version filter (`valid_to IS NULL` or `>= today`). |
| `POST /api/v1/activities` | Yes | Yes | Yes (200 OK) | Missing mandatory consent check (must return 403 `CONSENT_REQUIRED` if `consent_tracking` is false). Validation lacks z-score anomaly check and multi-entry daily aggregate caps. Route performs raw DB commits; needs repository. |
| `GET /api/v1/activities` | Yes | Yes | Yes (200 OK) | Raw DB query in route handler; needs repository. |
| `PATCH /api/v1/activities/{id}` | No | No | No (405) | Endpoint does not exist! Task 5 requires PATCH to update activity and recalculate `emission_record`. |
| `DELETE /api/v1/activities/{id}` | Yes | Yes | Yes (200 OK) | Direct DB query in route handler; needs repository. |
| `GET /api/v1/footprint/summary` | Yes | Partial | Yes (200 OK) | Calculates from DB records if present, but falls back to hardcoded demo dict if empty. Lacks previous-period comparison calculation from actual historical records. Lacks CP-2 `target_kg` and `target_used_pct`. |
| `GET /api/v1/footprint/timeseries` | Partial | No (Hardcoded) | Yes (200 OK) | Returns hardcoded 4-month list (`[{"label":"Aug","total_kg":142.0},...]`). Must calculate real historical intervals from DB `emission_records`. |
| `GET /api/v1/footprint/hotspots` | Yes | Partial | Yes (200 OK) | Calculates rankings from DB if records exist, else fallback. Missing `vs_previous_pct` from real history and optional CP-2 `top_opportunity` from `estimate_saving`. |
| `GET /api/v1/footprint/explain/{id}` | Yes | Yes | Yes (200 OK) | Direct query in route handler; returns formula, inputs, factors, and audit confidence. |
| `GET /api/v1/actions/catalog` | Yes | Yes (when seeded) | Yes (200 OK) | Seed catalog currently has only 6 actions (C10 conflict). Needs expansion to at least 12 actions across all 5 categories. |
| `POST /api/v1/simulations` | Yes | Yes | Yes (200 OK) | Calls `project_scenario()`. However, uses a hardcoded baseline (128.0) rather than calculating the user's actual baseline from logged activities. |
| `GET /api/v1/simulations` | Yes | Yes | Yes (200 OK) | Direct DB query in route handler; needs repository. |
| `GET /api/v1/impact/summary` | Partial | No (Hardcoded) | Yes (200 OK) | Has hardcoded dummy values (`total_est_saving = 26.0`, `measured.available = true`, dummy action). Must read `recommendations` table read-only and set `measured.available = false` per Task 10. |
| `app.services.carbon.impact.estimate_saving` | Yes | Partial | Yes (Internal) | Signature matches `PY_INTERFACES.md`, but hardcodes `baseline_kg = 128.0` and fixed confidence rather than reading user history. |
| `app.services.rewards.service.on_event` | Yes | Yes | Yes (Internal) | Cross-module hook implemented; updates streak, ledger, and checks badges. |

---

## 2. Explicit Audit Questions

### (a) 21 models versus 17 DDL tables versus the Plan tables: Which differ and why?
- **Finding**: In `contracts/DATABASE.sql`, there are **17 numbered sections**, but sections 14, 15, and 16 each define **two distinct tables**:
  - Section 14 defines `badges` AND `user_badges` (2 tables)
  - Section 15 defines `streaks` AND `points_ledger` (2 tables)
  - Section 16 defines `chat_sessions` AND `chat_messages` (2 tables)
  - Therefore, `contracts/DATABASE.sql` actually specifies **20 physical relational tables**.
- **Model Count**: `backend/app/models/__init__.py` contains exactly **20 SQLAlchemy model classes**:
  1. `Profile` (`profiles`)
  2. `UserPreferenceProfile` (`user_preference_profile`)
  3. `EmissionFactor` (`emission_factors`)
  4. `Activity` (`activities`)
  5. `EmissionRecord` (`emission_records`)
  6. `FootprintSnapshot` (`footprint_snapshots`)
  7. `ActionCatalog` (`action_catalog`)
  8. `Recommendation` (`recommendations`)
  9. `RecommendationFeedback` (`recommendation_feedback`)
  10. `ActionLog` (`action_logs`)
  11. `Simulation` (`simulations`)
  12. `Goal` (`goals`)
  13. `EcoScore` (`eco_scores`)
  14. `Badge` (`badges`)
  15. `UserBadge` (`user_badges`)
  16. `Streak` (`streaks`)
  17. `PointsLedger` (`points_ledger`)
  18. `ChatSession` (`chat_sessions`)
  19. `ChatMessage` (`chat_messages`)
  20. `IntegrationConnection` (`integration_connections`)
- **Difference Explanation**: Previous documentation colloquially cited "21 models" by counting an auxiliary or conceptual entity, but the actual schema count across both SQLAlchemy models and DDL tables is **identical at 20 tables**. There is zero discrepancy in relational structure.

### (b) Seed factors: Do all rows have required provenance, any TODO_VERIFY rows, and are all 5 categories covered?
- **Inspection of `backend/data/emission_factors_seed.csv`**:
  - Total factor rows: **22 rows**.
  - All 5 categories are present: `transport` (10 rows), `electricity` (4 rows), `food` (4 rows), `shopping` (2 rows), `waste` (2 rows).
  - Every single row has non-empty values for: `source_name`, `source_url`, `source_year`, `region_code` (`IN`), `unit`, and `version` (`1`).
  - There are **ZERO `TODO_VERIFY` or unverified placeholder rows**.
  - Every row cites an authoritative institutional source (ARAI, MoEFCC, CEA, TERI, Poore & Nemecek, CPCB, IPCC, ICAO, WEF, Ellen MacArthur Foundation).

### (c) Which validation rules exist?
- **Speed bounds per mode**: **Exists**. `SPEED_LIMITS` dictionary in `rules.py` enforces minimum and maximum plausibility speed limits for walk, bicycle, two_wheeler, car, bus, metro, and auto (e.g., rejecting speeds exceeding 1.5x physical maximum).
- **Distance caps**: **Exists**. `max_dist` bounds per mode and a global >2000 km non-flight transit distance rejection.
- **Daily caps**: **Partial**. `MAX_DAILY_ACTIVITY` caps single-entry quantity (e.g. 300 kWh grid, 24h AC, 10 meals, 50kg waste). However, it does not aggregate multiple entries submitted on the same date for the same user.
- **Duplicates**: **Exists**. `calculate_dedupe_hash(user_id, activity_key, occurred_on, quantity)` generates a SHA-256 hash stored in `activities.dedupe_hash`. Duplicate submission returns `409 Conflict`.
- **Z-score against user's own history**: **Missing / Gap**. Neither `rules.py` nor `service.py` currently checks statistical deviation against the user's historical mean and standard deviation. This must be implemented with a documented minimum history threshold (e.g., minimum 5 prior entries for that activity_key).

### (d) Is `repositories/` empty and where do route handlers query the database?
- **Finding**: `backend/app/repositories/__init__.py` is currently empty.
- **Direct Queries in Route Handlers**:
  - `backend/app/api/v1/profile.py`: Directly calls `db.query(Profile)...`
  - `backend/app/api/v1/activities.py`: Directly calls `db.query(Activity)...`
  - `backend/app/api/v1/footprint.py`: Directly calls `db.query(EmissionRecord)...` in explain
  - `backend/app/api/v1/simulations.py`: Directly calls `db.query(Simulation)...`
  - `backend/app/api/v1/impact.py`: Directly calls `db.query(Recommendation)...`
  - `backend/app/api/v1/privacy.py`: Directly calls `db.query(Profile)...`, `Activity`, `Recommendation`, `ActionLog`, `Simulation`
- **Resolution**: Need to introduce repository classes (`ProfileRepository`, `ActivityRepository`, `EmissionFactorRepository`, `SimulationRepository`, `FootprintRepository`) to encapsulate database queries and separate data access from HTTP transport.

### (e) Do the simulator and `estimate_saving` both call `project_scenario()`?
- **Finding**: **Yes**.
  - In `backend/app/services/simulator/service.py`: Calls `project_scenario(...)` in line 18.
  - In `backend/app/services/carbon/impact.py`: `estimate_saving(...)` calls `project_scenario(...)` in line 196.
  - Both share the identical mathematical projection function, fulfilling Day 0 Decision 6.

### (f) Does `estimate_saving` match its signature in `contracts/PY_INTERFACES.md`?
- **Finding**: **Yes, signature matches**:
  ```python
  def estimate_saving(
      db: Session,
      user_id: str,
      action_key: str,
      params: Optional[Dict[str, Any]] = None,
  ) -> SavingEstimate:
  ```
- **Internal Gap**: The implementation currently uses a static fallback `baseline_kg = 128.0` and static confidence, instead of calculating the baseline from the user's actual 30-day activity history and lowering confidence when historical data is insufficient.
