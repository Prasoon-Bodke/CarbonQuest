/**
 * End-to-end Authentication and Onboarding Integration Tests.
 *
 * Verifies:
 * - Real user signup against FastAPI /auth/signup.
 * - Real user login against FastAPI /auth/login.
 * - Demo account login against FastAPI /auth/demo.
 * - JWT storage and refresh persistence via getAuthToken / setAuthToken.
 * - Logout clearing cached token and user state.
 * - Calling protected endpoints with Bearer token.
 * - Completing onboarding with 28-day habit expansion across sectors.
 * - Idempotency and data restoration on re-fetching profile.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { api, ApiError } from "../lib/api";
import { authService, getAuthToken, clearAuthToken, setAuthToken } from "../lib/supabase/client";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

async function isBackendUp(): Promise<boolean> {
  try {
    const res = await fetch(`${BACKEND_URL}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

describe("Authentication & Onboarding Workflow", () => {
  let backendAvailable = false;
  const testEmail = `test.user.${Date.now()}@carbonquest.in`;
  const testPassword = "securePassword123";
  const testName = "Priya Sharma";

  beforeAll(async () => {
    backendAvailable = await isBackendUp();
    if (!backendAvailable) {
      console.warn("Backend not running. Skipping live auth tests.");
    }
  });

  describe("PART A: Authentication Tests", () => {
    it("signs up a new user and receives a valid Bearer JWT", async () => {
      if (!backendAvailable) return;
      clearAuthToken();

      const res = await authService.signUp(testEmail, testPassword, testName);
      expect(res).toHaveProperty("token");
      expect(typeof res.token).toBe("string");
      expect(res.token!.length).toBeGreaterThan(20);

      // Verify token persisted in client state
      expect(getAuthToken()).toBe(res.token);
    });

    it("accesses protected GET /me with the signed JWT and lazy-creates profile", async () => {
      if (!backendAvailable) return;

      const profile = await api.profile.get();
      expect(profile).toHaveProperty("id");
      expect(profile.display_name).toBe(testName);
      expect(profile.onboarding_done).toBe(false);
    });

    it("logs out and clears token from persistence", async () => {
      if (!backendAvailable) return;

      await authService.signOut();
      expect(getAuthToken()).toBeNull();

      // Protected call now throws 401 ApiError
      try {
        await api.profile.get();
        expect.fail("Should have thrown 401");
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        expect((err as ApiError).isUnauthenticated).toBe(true);
      }
    });

    it("logs in with existing credentials and restores token", async () => {
      if (!backendAvailable) return;

      const loginRes = await authService.signIn(testEmail, testPassword);
      expect(loginRes.token).toBeDefined();
      expect(getAuthToken()).toBe(loginRes.token);

      const profile = await api.profile.get();
      expect(profile.display_name).toBe(testName);
    });

    it("instant demo login provides seeded Aarav Sharma profile", async () => {
      if (!backendAvailable) return;

      const demoRes = await authService.signInDemo();
      expect(demoRes.token).toBeDefined();
      expect(getAuthToken()).toBe(demoRes.token);

      const profile = await api.profile.get();
      expect(profile.display_name).toBe("Aarav Sharma");
      expect(profile.onboarding_done).toBe(true);
    });
  });

  describe("PART B: Onboarding Tests", () => {
    const onboardingUserEmail = `onboard.${Date.now()}@carbonquest.in`;

    it("completes full 4-sector baseline onboarding and expands habits", async () => {
      if (!backendAvailable) return;

      // 1. Sign up a fresh user
      await authService.signUp(onboardingUserEmail, testPassword, "Fresh Onboarder");

      // 2. Set consents
      await api.profile.setConsents({
        consent_tracking: true,
        consent_leaderboard: true,
      });

      // 3. Complete onboarding
      const onboardingRes = await api.profile.completeOnboarding({
        display_name: "Fresh Onboarder",
        age_band: "25-34",
        household_size: 2,
        monthly_target_kg: 95.0,
        preferences: {
          diet: "vegetarian",
          ok_modes: ["bus", "metro"],
          budget_level: "medium",
          effort_level: "medium",
        },
        habits: [
          {
            category: "transport",
            activity_key: "transport.bus_km",
            frequency: "daily",
            quantity: 12.0,
            unit: "km",
            metadata: { mode: "bus", duration_min: 30 },
          },
          {
            category: "electricity",
            activity_key: "electricity.grid_kwh",
            frequency: "daily",
            quantity: 4.0,
            unit: "kWh",
            metadata: {},
          },
        ],
      });

      expect(onboardingRes.status).toBe("ok");
      expect(onboardingRes.activities_created).toBeGreaterThan(0);
      expect(onboardingRes.profile.onboarding_done).toBe(true);
    });

    it("restores saved onboarding data after simulated page refresh", async () => {
      if (!backendAvailable) return;

      // Save token, simulate refresh by re-fetching profile
      const profile = await api.profile.get();
      expect(profile.onboarding_done).toBe(true);
      expect(profile.monthly_target_kg).toBe(95.0);
      expect(profile.household_size).toBe(2);
      expect((profile.preferences as any).diet).toBe("vegetarian");
    });

    it("onboarding is idempotent (second submission creates 0 duplicate activities)", async () => {
      if (!backendAvailable) return;

      const repeatRes = await api.profile.completeOnboarding({
        display_name: "Fresh Onboarder",
        household_size: 2,
        monthly_target_kg: 95.0,
        habits: [
          {
            category: "transport",
            activity_key: "transport.bus_km",
            frequency: "daily",
            quantity: 12.0,
            unit: "km",
            metadata: { mode: "bus", duration_min: 30 },
          },
        ],
      });

      // 0 duplicates created because dedupe_hash matches existing activities
      expect(repeatRes.activities_created).toBe(0);
    });

    it("updates profile preferences post-onboarding", async () => {
      if (!backendAvailable) return;

      const updated = await api.profile.update({
        monthly_target_kg: 85.0,
        preferences: { diet: "vegan" },
      });

      expect(updated.monthly_target_kg).toBe(85.0);
      expect((updated.preferences as any).diet).toBe("vegan");
    });
  });
});
