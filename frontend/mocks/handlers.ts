/**
 * MSW handlers mocking FastAPI endpoints for frontend testing & local preview.
 * Generated from contracts/examples.
 */

export const handlers = [
  // Health
  {
    path: "/api/v1/health",
    method: "GET",
    response: { status: "ok", version: "1.0.0", timestamp: "2026-11-08T12:00:00Z" },
  },
  // Profile
  {
    path: "/api/v1/me",
    method: "GET",
    response: {
      id: "demo-user-pune",
      display_name: "Prasoon Bodke",
      age_band: "25-34",
      region_code: "IN",
      household_size: 2,
      monthly_target_kg: 100.0,
      consent_tracking: true,
      consent_leaderboard: true,
      onboarding_done: true,
    },
  },
];
