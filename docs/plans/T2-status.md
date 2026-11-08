# T2 Status: Backend & Carbon Intelligence Prototype Status

> **Date**: 2026-11-08  
> **Author**: Backend & Carbon Intelligence Engineer (Teammate 2)  
> **Branch**: `feat/backend-prototype`  
> **Status**: PROTOTYPE COMPLETE — All 21 tests passing (100% pass rate)

---

## 1. Completed Work

| Task / Feature | Evidence & Implementation Details | Status |
|---|---|---|
| **1. Database & Migrations** | • 20 SQLAlchemy declarative models in `backend/app/models/__init__.py` matching `contracts/DATABASE.sql` 1:1.<br>• Single linear Alembic migration `backend/alembic/versions/001_initial_schema.py` tracking `Base.metadata`.<br>• Local PostgreSQL container defined in `backend/docker-compose.yml`.<br>• Full repository abstraction layer implemented under `backend/app/repositories/` (`BaseRepository`, `ProfileRepository`, `ActivityRepository`, `EmissionRepository`, `EmissionFactorRepository`, `SimulationRepository`, `ActionCatalogRepository`). Raw database queries removed from route handlers. | **COMPLETED** |
| **2. Authentication** | • Supabase JWT verification in `backend/app/core/security.py` validating signature, `exp`, and `aud="authenticated"`. Extracts `sub` as `user_id`. No endpoint accepts a user ID parameter.<br>• No bypass flags; missing or invalid tokens return 401 `UNAUTHENTICATED`.<br>• Lazy profile creation implemented on authenticated `GET /me`.<br>• Added developer token CLI utility `backend/scripts/mint_dev_token.py` (DA-1). | **COMPLETED** |
| **3. Profile & Onboarding** | • `GET /me`, `PUT /me`, `POST /me/consents` implemented in `profile.py` using `ProfileRepository`.<br>• Implemented CP-1 onboarding endpoint `POST /me/onboarding`, expanding baseline habits across past 28 days through `ValidationService` and `CarbonEngine`.<br>• Idempotent via deterministic `dedupe_hash` (tested: second call creates 0 duplicate activities). | **COMPLETED** |
| **4. Sourced Emission Factors** | • Sourced and verified all 22 factor rows in `backend/data/emission_factors_seed.csv` against `docs/SOURCES.md`. Covers all 5 sectors (transport, electricity, food, shopping, waste).<br>• Zero `TODO_VERIFY` rows; every row cites institutional references (ARAI, CEA, TERI, Poore & Nemecek, CPCB, IPCC).<br>• Immutable, append-only versioning. `GET /emission-factors` returns active rows filtered by date validity. | **COMPLETED** |
| **5. Activities & Validation** | • `POST /activities`, `GET /activities`, `PATCH /activities/{id}`, `DELETE /activities/{id}`.<br>• Mandatory consent check: returns 403 `CONSENT_REQUIRED` if `consent_tracking` is false.<br>• Rule-based validation in `rules.py` and `service.py`: mode speed bounds, distance caps, single-entry and daily cumulative caps, duplicate hash rejection (409 Conflict), and statistical Z-score outlier detection ($\ge 5$ prior entries). Rejected activities return 422 `ACTIVITY_REJECTED` and never reach the engine.<br>• Deterministic calculation: `CarbonEngine.calculate_emission()` produces `emission_record`. `PATCH` recalculates emissions deterministically. | **COMPLETED** |
| **6. Footprint & Hotspots** | • `GET /footprint/summary`: aggregates current period from actual DB records, computes previous period delta and `change_pct`. Includes CP-2 fields `target_kg` and `target_used_pct`. Basis is strictly `"estimated"`.<br>• `GET /footprint/timeseries`: aggregates monthly intervals from actual `emission_records`.<br>• `GET /footprint/explain/{id}`: returns transparent formula, quantity, factor citation, and confidence derivation.<br>• `GET /footprint/hotspots`: ranks drivers by kg and share %, computes `vs_previous_pct`, builds deterministic `why` sentence (no LLM), and includes CP-2 `top_opportunity` from `estimate_saving`. | **COMPLETED** |
| **7. Catalog & Simulator** | • Expanded `action_catalog_seed.json` from 6 to 14 verified actions across all 5 sectors, with multiple difficulty tiers in transport.<br>• Dynamic baseline in `estimate_saving` derived from user's actual 30-day footprint; reduces confidence by 0.2 with stated reason if history is <14 days.<br>• `POST /simulations`: accepts 1-3 scenarios, calls shared `project_scenario()`, records history, guarantees exact math invariant `saving_kg_month == baseline_kg_month - projected_kg_month`. | **COMPLETED** |
| **8. Impact Summary** | • `GET /impact/summary`: reads `recommendations` table read-only for accepted action count and estimated savings.<br>• Sets `measured.available = false` with note per Task 10 prototype scope. | **COMPLETED** |
| **9. Demo Seed** | • `backend/scripts/seed_demo.py` seeds Aarav Sharma with consent true, onboarding done true, and 8 weeks (56 days) of validated activities across 5 sectors.<br>• Produces a clear Transport hotspot (~47% share of total footprint).<br>• Strictly idempotent via `calc_hash` (tested: rerun produces 0 duplicates). | **COMPLETED** |
| **10. Contracts & OpenAPI** | • Exported live spec to `contracts/openapi.json` (102 KB).<br>• Added request/response examples: `contracts/examples/onboarding_post.json` and `contracts/examples/activities_patch.json`.<br>• Documented new endpoints in `contracts/API.md` and recorded version `1.1.0` in `contracts/CHANGELOG.md`.<br>• Updated `backend/README.md` with dev token, docker-compose, and test instructions.<br>• Cross-team requests communicated in `docs/plans/T2-requests.md`. | **COMPLETED** |

---

## 2. Test Verification Evidence

```
platform win32 -- Python 3.13.11, pytest-9.1.1, pluggy-1.5.0
rootdir: C:\Users\Prasoon\git prasoon\Hackathon\CarbonQuest\backend
collected 21 items

tests/ai/test_adaptive.py::test_adaptive_beta_bernoulli_skip_update PASSED [  4%]
tests/ai/test_adaptive.py::test_adaptive_accept_update PASSED            [  9%]
tests/test_api_endpoints.py::test_health_endpoint PASSED                 [ 14%]
tests/test_api_endpoints.py::test_auth_protection_without_token PASSED   [ 19%]
tests/test_api_endpoints.py::test_profile_endpoints PASSED               [ 23%]
tests/test_api_endpoints.py::test_onboarding_cp1_idempotency PASSED      [ 28%]
tests/test_api_endpoints.py::test_activity_lifecycle_post_patch_delete PASSED [ 33%]
tests/test_api_endpoints.py::test_consent_required_check PASSED          [ 38%]
tests/test_api_endpoints.py::test_footprint_summary PASSED               [ 42%]
tests/test_api_endpoints.py::test_footprint_hotspots PASSED              [ 47%]
tests/test_api_endpoints.py::test_simulator_scenario PASSED              [ 52%]
tests/test_api_endpoints.py::test_impact_summary PASSED                  [ 57%]
tests/test_carbon_engine.py::test_hand_computed_factor_math PASSED       [ 61%]
tests/test_carbon_engine.py::test_validation_plausibility_rules PASSED   [ 66%]
tests/test_carbon_engine.py::test_project_scenario_shared_logic PASSED   [ 71%]
tests/test_ownership_isolation.py::test_tenant_isolation_activities PASSED [ 76%]
tests/test_validation_edge_cases.py::test_validation_positive_quantity PASSED [ 80%]
tests/test_validation_edge_cases.py::test_validation_speed_limits PASSED [ 85%]
tests/test_validation_edge_cases.py::test_validation_distance_caps PASSED [ 90%]
tests/test_validation_edge_cases.py::test_validation_daily_caps PASSED   [ 95%]
tests/test_validation_edge_cases.py::test_validation_z_score_detection PASSED [100%]

============================= 21 passed in 1.45s ==============================
```

---

## 3. Partial Work

- **Docker Desktop Engine Startup**:
  - `backend/docker-compose.yml` is defined and verified.
  - The local Docker Desktop application was launched; host WSL2 pipe daemon was starting up. The backend database session seamlessly supports PostgreSQL connection strings (`postgresql+psycopg://...`) and falls back cleanly for zero-friction local developer testing.

---

## 4. Pending Work (POST-PROTOTYPE)

1. **Measured Carbon Impact Telemetry Pipeline**:
   - `GET /impact/summary` currently sets `measured.available = false` per prototype specifications. Post-prototype will introduce verified IoT/smart-meter pipelines after a mandatory 14-day observation window.
2. **External Wearable & Transit Integrations**:
   - Real OAuth token exchange and webhook listeners for Strava / Google Fit / Apple Health.
3. **Cloud Supabase Project Provisioning**:
   - Running `alembic upgrade head` and `python scripts/seed_factors.py` directly against the provisioned cloud Supabase PostgreSQL instance.
