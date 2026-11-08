# Contracts Changelog (`contracts/CHANGELOG.md`)

All contract changes require unanimous agreement across Teammate 1 (Frontend), Teammate 2 (Backend), and Teammate 3 (AI).

---

## [1.1.0] - 2026-11-08

### Added (T2 Prototype Extensions)
- Formalized CP-1 endpoint `POST /me/onboarding` for expanding baseline habits across 28 days with idempotency guarantees.
- Added `PATCH /activities/{id}` endpoint allowing partial updates with automatic emission recalculation.
- Added CP-2 progress fields to `GET /footprint/summary`: `target_kg` and `target_used_pct`.
- Added CP-2 opportunity field to `GET /footprint/hotspots`: `top_opportunity` linking top emission drivers with catalog actions.
- Expanded action catalog from 6 to 14 verified actions across all 5 sectors.
- Added contract examples: `contracts/examples/onboarding_post.json` and `contracts/examples/activities_patch.json`.

---

## [1.0.0] - 2026-11-08

### Baseline Contract Freeze
- Established single unified FastAPI service under `/api/v1`.
- Formalized Supabase PostgreSQL schema with UUID keys and UTC timestamps.
- Defined canonical dot-notation for all activity keys (`transport.bus_km`, `electricity.ac_hours`, etc.).
- Standardized error response envelope with required `X-Request-ID` header.
- Established frozen Python signatures in `contracts/PY_INTERFACES.md`.
- Added contract examples under `contracts/examples/`.
