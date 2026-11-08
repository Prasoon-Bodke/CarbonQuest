# T2 Implementation Plan: Backend & Carbon Intelligence Prototype

> **Date**: 2026-11-08  
> **Author**: Backend & Carbon Intelligence Engineer (Teammate 2)  
> **Branch**: `feat/backend-prototype`  
> **Status**: PENDING HUMAN APPROVAL (Rule 6: Stop and wait for approval before coding)

---

## 1. Conflict & Ambiguity Resolutions (Rule 2)

| Conflict ID | Topic | Resolution Strategy |
|---|---|---|
| **C2** | Onboarding Endpoint | `contracts/API.md` currently does not specify an onboarding endpoint. Per CP-1 proposal, we specify `POST /me/onboarding` in contracts, which accepts baseline habit inputs and generates 28 days of historical activities through the standard validation and engine pipeline, idempotent via `dedupe_hash`. |
| **C5** | Model vs DDL Table Counts | Reconciled: `contracts/DATABASE.sql` has 17 sections defining exactly 20 tables (sections 14, 15, and 16 each define 2 tables). `backend/app/models/__init__.py` has 20 SQLAlchemy models matching the DDL tables 1:1. |
| **C8** | PostgreSQL Only | SQLite default will be replaced with PostgreSQL. Provide `backend/docker-compose.yml` for zero-friction local Postgres startup (`docker-compose up -d`) and configure `.env` with `DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/carbonquest` (or Supabase project URL). |
| **C10** | Action Catalog Size | `backend/data/action_catalog_seed.json` will be expanded from 6 to 14 verified actions covering all 5 sectors, with multiple difficulty tiers in transport (e.g., bus shift vs cycling shift). |
| **C11** | Dashboard Progress Fields (CP-2) | Add optional `target_kg` and `target_used_pct` to `FootprintSummary` (`GET /footprint/summary`), and optional `top_opportunity` to `FootprintHotspotsResponse` (`GET /footprint/hotspots`) sourced via `estimate_saving`. |
| **DA-1**| Dev Token Script | Create `backend/scripts/mint_dev_token.py` to sign valid short-lived JWTs with `sub="00000000-0000-0000-0000-000000000001"`, `aud="authenticated"`, and expiration, removing any insecure bypass flag in production. |

---

## 2. File-by-File Changes & Ownership Boundaries

### Files to Modify
1. `backend/app/core/config.py`: Default `DATABASE_URL` to PostgreSQL, ensure Supabase JWT settings.
2. `backend/app/core/security.py`: Verify Supabase JWT (RS256 via JWKS or HS256 via secret) checking signature, `exp`, `aud="authenticated"`, extracting `sub` as `user_id`. Fail with 401 `UNAUTHENTICATED` when invalid. Remove raw bypasses.
3. `backend/app/api/v1/profile.py`: Move queries to repository. Add `POST /me/onboarding` (CP-1).
4. `backend/app/api/v1/activities.py`: Add `PATCH /activities/{activity_id}`. Check consent on POST/PATCH (403 `CONSENT_REQUIRED`). Route queries through repository.
5. `backend/app/api/v1/footprint.py`: Implement real timeseries aggregation, previous-period change calculation, and CP-2 progress fields.
6. `backend/app/api/v1/simulations.py`: Wire to repository; use user's dynamic baseline footprint instead of hardcoded 128.0.
7. `backend/app/api/v1/impact.py`: Read `recommendations` table read-only for accepted actions; set `measured.available = false` per Task 10.
8. `backend/app/services/validation/rules.py` & `service.py`: Add multi-entry daily aggregate caps and z-score anomaly detection against user's history (minimum 5 entries).
9. `backend/app/services/carbon/impact.py`: Implement dynamic baseline query for `estimate_saving` and decrease confidence when historical data is short (<14 days).
10. `backend/data/action_catalog_seed.json`: Expand from 6 to 14 actions.
11. `backend/scripts/seed_demo.py`: Expand to generate 8 weeks of validated activity producing a distinct transport hotspot.
12. `contracts/API.md`: Document `POST /me/onboarding` and `PATCH /activities/{id}`.
13. `contracts/CHANGELOG.md`: Record contract additions (v1.1.0).

### Files to Create
1. `backend/docker-compose.yml`: Local PostgreSQL container configuration for local dev and CI.
2. `backend/scripts/mint_dev_token.py`: Developer CLI tool to mint test JWT tokens.
3. `backend/app/repositories/base.py`: Base generic repository.
4. `backend/app/repositories/profile.py`: `ProfileRepository`.
5. `backend/app/repositories/activity.py`: `ActivityRepository`.
6. `backend/app/repositories/emission.py`: `EmissionRepository`.
7. `backend/app/repositories/simulation.py`: `SimulationRepository`.
8. `backend/alembic/versions/001_initial_schema.py`: Clean initial linear Alembic migration.
9. `backend/tests/test_validation_edge_cases.py`: Tests for speed limits, daily caps, duplicate hashes, z-score detection, consent checks.
10. `backend/tests/test_ownership_isolation.py`: Tests verifying User A cannot read, modify, or delete User B data.
11. `contracts/examples/onboarding_post.json`: Contract example for CP-1.
12. `contracts/examples/activities_patch.json`: Contract example for PATCH /activities.

---

## 3. Step-by-Step Task Breakdown

### Task 1: PostgreSQL & Alembic Migration
1. Add `backend/docker-compose.yml` with PostgreSQL 16 image, port 5432, default credentials.
2. Update `backend/alembic/env.py` to target SQLAlchemy `Base.metadata`.
3. Generate initial linear migration `backend/alembic/versions/001_initial_schema.py`.
4. Run `alembic upgrade head` against PostgreSQL.
5. Seed emission factors, action catalog, and badges into PostgreSQL.
6. Build repository classes in `backend/app/repositories/` and refactor routes to eliminate direct DB queries.

### Task 2: Authentication & Token Minting
1. Update `backend/app/core/security.py`:
   - Verify JWT header `alg` (HS256 or RS256).
   - Validate `exp`, `nbf`, `aud` claim (`authenticated`).
   - Extract `sub` as `user_id`. Never accept `user_id` from query/body parameters.
2. Implement lazy profile creation inside `ProfileRepository` on authenticated `GET /me`.
3. Add `backend/scripts/mint_dev_token.py` (DA-1) to generate valid developer tokens using `SUPABASE_JWT_SECRET`.

### Task 3: Profile & Onboarding (CP-1)
1. In `backend/app/api/v1/profile.py`, implement `GET /me`, `PUT /me`, `POST /me/consents`.
2. Implement `POST /me/onboarding`:
   - Accepts baseline habits (commute mode & km/week, AC hours/day, dietary pattern, etc.).
   - Generates 28 days of discrete daily activities for the past 4 weeks.
   - Routes each activity through `ValidationService.validate()` and `CarbonEngine.calculate_emission()`.
   - Uses deterministic `dedupe_hash` so calling onboarding multiple times is strictly idempotent.
   - Sets `profile.onboarding_done = True`.

### Task 4: Emission Factors & Verification
1. Verify `backend/data/emission_factors_seed.csv` against `docs/SOURCES.md`.
2. In `FactorService.list_active_factors`: Filter for active rows (`valid_to IS NULL OR valid_to >= CURRENT_DATE`).
3. Ensure all factor calculations maintain immutable versions (append-only).

### Task 5: Activities, Validation & Recalculation
1. Check `profile.consent_tracking` before logging activities: return `403 Forbidden` (`code="CONSENT_REQUIRED"`) if false.
2. Enhance `ValidationService`:
   - Daily aggregate cap: Query total quantity logged on `occurred_on` for that `activity_key`.
   - Z-score check: If user has $\ge 5$ prior entries for `activity_key`, compute $\mu$ and $\sigma$. If $|x - \mu| > 3\sigma$, flag or reject with reason.
3. Add `PATCH /activities/{activity_id}`:
   - Verify ownership (`activity.user_id == current_user`).
   - Re-validate updated fields.
   - Recalculate emission record deterministically with `CarbonEngine.calculate_emission()`.
4. Ensure `DELETE /activities/{activity_id}` enforces ownership and cascades removal of emission record.

### Task 6: Footprint Aggregation & Hotspots
1. `GET /footprint/summary`:
   - Aggregate actual `emission_records` for current period (week/month) and previous period.
   - Compute `change_pct = ((current - previous) / previous) * 100`.
   - Compute CP-2 fields: `target_kg` from `profile.monthly_target_kg` and `target_used_pct = (current / target_kg) * 100`.
   - Basis is strictly `"estimated"`.
2. `GET /footprint/timeseries`:
   - Aggregate monthly or weekly sums from actual `emission_records` grouped by interval.
3. `GET /footprint/explain/{emission_record_id}`:
   - Return transparent formula, quantity, factor citation, and confidence score breakdown.
4. `GET /footprint/hotspots`:
   - Rank top emission drivers by total kg CO₂e and category share percentage.
   - Compute `vs_previous_pct` by comparing against previous equivalent period.
   - Provide deterministic `why` sentence constructed from values.
   - Include CP-2 `top_opportunity` from `estimate_saving` for top hotspot categories.

### Task 7: Action Catalog, Simulator & Saving Estimator
1. Expand `backend/data/action_catalog_seed.json` to 14 actions covering transport (bus shift, metro shift, cycling, EV transition), electricity (AC temp 24C, AC 1hr reduction, solar, LED swap), food (plant-based day, vegan swap, zero food waste), shopping (reusable bags, slow fashion), waste (wet waste composting, plastic segregation).
2. Refactor `estimate_saving`:
   - Query user's actual 30-day baseline consumption for that activity.
   - If user has <14 days of logged data, drop confidence by 0.2 with reason `"Limited baseline history (<14 days)"`.
3. `POST /simulations`:
   - Compute baseline from actual footprint.
   - Call shared `project_scenario()`.
   - Ensure invariant: `saving_kg_month == baseline_kg_month - projected_kg_month` exactly.
   - Persist history in `simulations` table.

### Task 8: Impact Summary
1. `GET /impact/summary`:
   - Query `recommendations` table read-only for count of `status IN ('accepted', 'completed')` and sum `estimated_saving_kg_month`.
   - Set `measured.available = False` with note: `"Requires at least 14 days of verified activity telemetry following action check-in"`.

### Task 9: Demo Seed & Data Generation
1. Update `backend/scripts/seed_demo.py`:
   - Generate realistic 8-week activity stream for Aarav Sharma across all 5 sectors.
   - Produce a prominent Transport hotspot (~40 kg CO₂e/month) dominated by petrol two-wheeler and car trips.
   - Ensure script is 100% idempotent via `dedupe_hash`.

### Task 10: Validation, Contracts & OpenAPI
1. Run `scripts/export_openapi.py` to regenerate `contracts/openapi.json`.
2. Add JSON examples for all new endpoints in `contracts/examples/`.
3. Update `contracts/API.md` and `contracts/CHANGELOG.md`.
4. Execute full pytest suite against running PostgreSQL and verify 100% pass rate.

---

## 4. Verification & Testing Strategy

- **Deterministic Math Tests**: Hand-calculate expected kg CO₂e for 5 distinct factor families and assert exact equality in tests.
- **Validation Rule Tests**:
  - Speed > 1.5x max limit $\to$ 422 rejected.
  - Non-flight distance > 2000 km $\to$ 422 rejected.
  - Quantity $\le 0$ $\to$ 422 rejected.
  - Multi-entry daily cap exceeded $\to$ 422 rejected.
  - Duplicate submission $\to$ 409 conflict.
  - Z-score $> 3.0$ on 6th entry $\to$ flagged/rejected.
  - Missing consent $\to$ 403 forbidden.
- **Tenant Isolation Tests**: Assert User A cannot read, edit, or delete User B's activities, simulations, or profile.
- **Shared Scenario Invariant Test**: Assert `project_scenario()` results from simulator match `estimate_saving()` outputs for identical parameter inputs.
- **Onboarding Idempotency Test**: Calling `POST /me/onboarding` twice produces zero duplicate activities.

---

## 5. Teammate Communication (Rule 9)
No modifications will be made to `frontend/` or `backend/app/ai/`. All frontend contract requests (such as generating TypeScript types from the updated `openapi.json`) will be logged in `docs/plans/T2-requests.md`.
