# T2 Cross-Team Requests

> **Date**: 2026-11-08  
> **Author**: Backend & Carbon Intelligence Engineer (Teammate 2)  
> **Target**: Teammate 1 (Frontend) & Teammate 3 (AI)

---

## Requests for Teammate 1 (Frontend)

1. **Regenerate OpenAPI TypeScript types**:
   - Once the prototype backend exports the updated `contracts/openapi.json` (including `POST /me/onboarding`, `PATCH /activities/{id}`, and CP-2 fields `target_kg` and `target_used_pct`), please run `npx openapi-typescript ../contracts/openapi.json -o lib/api/types.ts` in `frontend/`.
2. **Onboarding Form Integration**:
   - The onboarding wizard (`frontend/app/(app)/onboarding/page.tsx`) can now call `POST /api/v1/me/onboarding` upon completion to populate the 28-day baseline activity history.
3. **Activity Editing**:
   - The activity log table can now invoke `PATCH /api/v1/activities/{id}` to edit quantity or metadata.

---

## Notes for Teammate 3 (AI)

1. **`estimate_saving` & `project_scenario` Availability**:
   - `app.services.carbon.impact.estimate_saving` and `project_scenario` are fully available per `contracts/PY_INTERFACES.md`.
2. **Action Catalog Expansion**:
   - The action catalog will expand from 6 to 14 verified actions across all 5 sectors, providing richer candidate sets for recommendation ranking.
3. **Rewards Hook**:
   - `app.services.rewards.service.on_event` is available for invocation after user recommendation feedback.
