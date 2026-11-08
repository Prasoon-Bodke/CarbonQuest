# Contracts Changelog (`contracts/CHANGELOG.md`)

All contract changes require unanimous agreement across Teammate 1 (Frontend), Teammate 2 (Backend), and Teammate 3 (AI).

---

## [1.0.0] - 2026-11-08

### Baseline Contract Freeze
- Established single unified FastAPI service under `/api/v1`.
- Formalized Supabase PostgreSQL schema with UUID keys and UTC timestamps.
- Defined canonical dot-notation for all activity keys (`transport.bus_km`, `electricity.ac_hours`, etc.).
- Standardized error response envelope with required `X-Request-ID` header.
- Established frozen Python signatures in `contracts/PY_INTERFACES.md`.
- Added contract examples under `contracts/examples/`.
