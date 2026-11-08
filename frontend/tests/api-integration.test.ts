/**
 * Integration test: Verifies the centralized API client against the live FastAPI backend.
 *
 * Run:
 *   1. Start the backend:  cd backend && uvicorn app.main:app --port 8000
 *   2. Run this test:      cd frontend && npx vitest run tests/api-integration.test.ts
 *
 * These tests require the backend to be running with seeded data.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { apiClient, ApiError, API_BASE_URL, http } from "../lib/api/client";
import { api } from "../lib/api/endpoints";
import { setAuthToken, clearAuthToken } from "../lib/supabase/client";

// Mint a token the same way mint_dev_token.py does, but inline for testing.
// We rely on NEXT_PUBLIC_DEV_TOKEN being set, or skip gracefully.
const DEV_TOKEN = process.env.NEXT_PUBLIC_DEV_TOKEN || "";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

async function isBackendUp(): Promise<boolean> {
  try {
    const res = await fetch(`${BACKEND_URL}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

describe("API Client Foundation", () => {
  let backendAvailable = false;

  beforeAll(async () => {
    backendAvailable = await isBackendUp();
    if (!backendAvailable) {
      console.warn(
        "⚠ Backend not running at " + BACKEND_URL + ". Skipping live integration tests."
      );
    }
  });

  describe("URL construction", () => {
    it("API_BASE_URL has no trailing slash", () => {
      expect(API_BASE_URL).not.toMatch(/\/$/);
    });

    it("API_BASE_URL includes /api/v1", () => {
      expect(API_BASE_URL).toContain("/api/v1");
    });
  });

  describe("Error class", () => {
    it("ApiError has correct semantic flags for 401", () => {
      const err = new ApiError("Unauthenticated", 401, "UNAUTHENTICATED");
      expect(err.isUnauthenticated).toBe(true);
      expect(err.isConsentRequired).toBe(false);
      expect(err.isNetworkError).toBe(false);
    });

    it("ApiError has correct semantic flags for 403", () => {
      const err = new ApiError("Consent required", 403, "CONSENT_REQUIRED");
      expect(err.isConsentRequired).toBe(true);
    });

    it("ApiError has correct semantic flags for 422", () => {
      const err = new ApiError("Validation", 422, "VALIDATION_ERROR", [
        { field: "quantity", issue: "Must be positive" },
      ]);
      expect(err.isValidationError).toBe(true);
      expect(err.details).toHaveLength(1);
    });

    it("ApiError has correct semantic flags for network error", () => {
      const err = new ApiError("Network failure", 0, "NETWORK_ERROR");
      expect(err.isNetworkError).toBe(true);
    });
  });

  describe("Auth token management", () => {
    it("setAuthToken and getAuthToken round-trip in-memory", async () => {
      const { getAuthToken } = await import("../lib/supabase/client");
      setAuthToken("test-token-123");
      expect(getAuthToken()).toBe("test-token-123");
      clearAuthToken();
      expect(getAuthToken()).toBeNull();
    });
  });

  describe("Live backend (conditional)", () => {
    it("GET /health returns status ok", async () => {
      if (!backendAvailable) return;
      const data = await api.health.check();
      expect(data).toHaveProperty("status", "ok");
      expect(data).toHaveProperty("version");
    });

    it("GET /me without token returns 401 ApiError", async () => {
      if (!backendAvailable) return;
      clearAuthToken();
      try {
        await api.profile.get();
        expect.fail("Should have thrown ApiError");
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        expect((err as ApiError).status).toBe(401);
        expect((err as ApiError).isUnauthenticated).toBe(true);
      }
    });

    it("GET /me with dev token returns profile", async () => {
      if (!backendAvailable || !DEV_TOKEN) return;
      setAuthToken(DEV_TOKEN);
      const profile = await api.profile.get();
      expect(profile).toHaveProperty("id");
      expect(profile).toHaveProperty("display_name");
      clearAuthToken();
    });

    it("GET /footprint/summary with token returns structured data", async () => {
      if (!backendAvailable || !DEV_TOKEN) return;
      setAuthToken(DEV_TOKEN);
      const summary = await api.footprint.summary();
      expect(summary).toHaveProperty("total_kg_co2e");
      expect(summary).toHaveProperty("by_category");
      expect(summary).toHaveProperty("basis");
      clearAuthToken();
    });

    it("GET /footprint/hotspots with token returns hotspot items", async () => {
      if (!backendAvailable || !DEV_TOKEN) return;
      setAuthToken(DEV_TOKEN);
      const hotspots = await api.footprint.hotspots();
      expect(hotspots).toHaveProperty("hotspots");
      expect(Array.isArray(hotspots.hotspots)).toBe(true);
      if (hotspots.hotspots.length > 0) {
        const first = hotspots.hotspots[0];
        expect(first).toHaveProperty("rank");
        expect(first).toHaveProperty("category");
        expect(first).toHaveProperty("why");
      }
      clearAuthToken();
    });

    it("GET /rewards/summary with token returns reward data", async () => {
      if (!backendAvailable || !DEV_TOKEN) return;
      setAuthToken(DEV_TOKEN);
      const rewards = await api.rewards.summary();
      expect(rewards).toHaveProperty("total_points");
      clearAuthToken();
    });

    it("POST /recommendations/generate with token returns items", async () => {
      if (!backendAvailable || !DEV_TOKEN) return;
      setAuthToken(DEV_TOKEN);
      const recs = await api.recommendations.generate({ max_items: 3 });
      expect(recs).toHaveProperty("cycle");
      expect(recs).toHaveProperty("items");
      expect(Array.isArray(recs.items)).toBe(true);
      clearAuthToken();
    });

    it("Authorization header is injected from cached token", async () => {
      if (!backendAvailable || !DEV_TOKEN) return;
      setAuthToken(DEV_TOKEN);
      // If we can get /me, the header was injected correctly
      const profile = await api.profile.get();
      expect(profile).toHaveProperty("id");
      clearAuthToken();
    });

    it("http.get convenience works identically", async () => {
      if (!backendAvailable) return;
      const data = await http.get<{ status: string }>("/health");
      expect(data.status).toBe("ok");
    });
  });

  // Activity Logging Tests
  describe("Activity Logging (Full 5 Categories)", () => {
    const testActivities = [
      // Transportation
      { category: "transport", activity_key: "transport.bus_km", quantity: 15, unit: "km" },
      { category: "transport", activity_key: "transport.car_petrol_km", quantity: 10, unit: "km" },
      { category: "transport", activity_key: "transport.two_wheeler_petrol_km", quantity: 20, unit: "km" },
      { category: "transport", activity_key: "transport.metro_km", quantity: 8, unit: "km" },
      { category: "transport", activity_key: "transport.car_cng_km", quantity: 12, unit: "km" },

      // Electricity
      { category: "electricity", activity_key: "electricity.grid_kwh", quantity: 15, unit: "kWh" },
      { category: "electricity", activity_key: "electricity.ac_hours", quantity: 3, unit: "hours" },
      { category: "electricity", activity_key: "electricity.lpg_cylinder", quantity: 0.5, unit: "cylinder" },

      // Food
      { category: "food", activity_key: "food.meal_veg", quantity: 2, unit: "meals" },
      { category: "food", activity_key: "food.meal_non_veg", quantity: 1.5, unit: "meals" },
      { category: "food", activity_key: "food.meal_vegan", quantity: 1, unit: "meals" },
      { category: "food", activity_key: "food.waste_kg", quantity: 0.5, unit: "kg" },

      // Shopping
      { category: "shopping", activity_key: "shopping.clothing_item", quantity: 1, unit: "item" },
      { category: "shopping", activity_key: "shopping.delivery_package", quantity: 3, unit: "package" },

      // Waste
      { category: "waste", activity_key: "waste.landfill_kg", quantity: 1, unit: "kg" },
      { category: "waste", activity_key: "waste.compost_kg", quantity: 0.5, unit: "kg" },
    ];

    it.each(testActivities)(
      "POST /activities creates activity for all 5 categories",
      async ({ category, activity_key, quantity, unit }) => {
        if (!backendAvailable || !DEV_TOKEN) return;
        setAuthToken(DEV_TOKEN);

        const today = new Date().toISOString().split("T")[0];

        const result = await api.activities.create({
          category: category as any,
          activity_key,
          quantity,
          unit,
          occurred_on: today,
          source: "manual",
          metadata: {},
        });

        expect(result).toHaveProperty("activity");
        expect(result).toHaveProperty("emission");
        expect(result.activity.category).toBe(category);
        expect(result.activity.activity_key).toBe(activity_key);

        // Emission should be calculated by backend
        if (result.emission) {
          expect(result.emission.kg_co2e).toBeGreaterThan(0);
          expect(result.emission.factor).toBeDefined();
          expect(result.emission.confidence).toBeGreaterThan(0);
        }
        clearAuthToken();
      }
    );

    it("Invalid quantity is rejected by backend validation", async () => {
      if (!backendAvailable || !DEV_TOKEN) return;
      setAuthToken(DEV_TOKEN);

      const today = new Date().toISOString().split("T")[0];

      try {
        await api.activities.create({
          category: "food",
          activity_key: "food.meal_veg",
          quantity: -1,
          unit: "meals",
          occurred_on: today,
          source: "manual",
          metadata: {},
        });
        expect.fail("Should have thrown ApiError");
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        expect((err as ApiError).status).toBe(422);
      }
      clearAuthToken();
    });

    it("GET /emission-factors lists factors by category", async () => {
      if (!backendAvailable || !DEV_TOKEN) return;
      setAuthToken(DEV_TOKEN);

      // Test each category has factors
      const categories = ["transport", "electricity", "food", "shopping", "waste"];
      for (const cat of categories) {
        const factors = await api.activities.factors({ category: cat });
        expect(Array.isArray(factors)).toBe(true);
        if (factors.length > 0) {
          expect(factors[0]).toHaveProperty("activity_key");
          expect(factors[0]).toHaveProperty("unit");
          expect(factors[0]).toHaveProperty("kg_co2e_per_unit");
        }
      }
      clearAuthToken();
    });

    it("GET /activities lists user activities", async () => {
      if (!backendAvailable || !DEV_TOKEN) return;
      setAuthToken(DEV_TOKEN);

      const activities = await api.activities.list();
      expect(activities).toHaveProperty("items");
      expect(activities).toHaveProperty("total");
      expect(Array.isArray(activities.items)).toBe(true);
      clearAuthToken();
    });
  });

  // Carbon Footprint Tests
  describe("Carbon Footprint Calculation", () => {
    it("GET /footprint/summary returns structured data", async () => {
      if (!backendAvailable || !DEV_TOKEN) return;
      setAuthToken(DEV_TOKEN);

      const summary = await api.footprint.summary();
      expect(summary).toHaveProperty("period");
      expect(summary).toHaveProperty("period_start");
      expect(summary).toHaveProperty("period_end");
      expect(summary).toHaveProperty("total_kg_co2e");
      expect(summary).toHaveProperty("basis");
      expect(summary).toHaveProperty("by_category");
      expect(summary).toHaveProperty("confidence");
      expect(summary).toHaveProperty("activity_count");

      // Validate by_category structure
      expect(Array.isArray(summary.by_category)).toBe(true);
      if (summary.by_category.length > 0) {
        const cat = summary.by_category[0];
        expect(cat).toHaveProperty("category");
        expect(cat).toHaveProperty("kg_co2e");
        expect(cat).toHaveProperty("share_pct");
      }
      clearAuthToken();
    });

    it("GET /footprint/summary period parameter works", async () => {
      if (!backendAvailable || !DEV_TOKEN) return;
      setAuthToken(DEV_TOKEN);

      const weekSummary = await api.footprint.summary({ period: "week" });
      expect(weekSummary.period).toBe("week");

      const daySummary = await api.footprint.summary({ period: "day" });
      expect(daySummary.period).toBe("day");
      clearAuthToken();
    });

    it("GET /footprint/timeseries returns series data", async () => {
      if (!backendAvailable || !DEV_TOKEN) return;
      setAuthToken(DEV_TOKEN);

      const timeseries = await api.footprint.timeseries();
      expect(timeseries).toHaveProperty("period");
      expect(timeseries).toHaveProperty("series");
      expect(Array.isArray(timeseries.series)).toBe(true);
      clearAuthToken();
    });
  });

  // Hotspot Detection Tests
  describe("Hotspot Detection", () => {
    it("GET /footprint/hotspots returns ranked hotspots", async () => {
      if (!backendAvailable || !DEV_TOKEN) return;
      setAuthToken(DEV_TOKEN);

      const hotspots = await api.footprint.hotspots();
      expect(hotspots).toHaveProperty("period");
      expect(hotspots).toHaveProperty("hotspots");
      expect(Array.isArray(hotspots.hotspots)).toBe(true);

      if (hotspots.hotspots.length > 0) {
        const first = hotspots.hotspots[0];
        expect(first).toHaveProperty("rank");
        expect(first).toHaveProperty("category");
        expect(first).toHaveProperty("activity_key");
        expect(first).toHaveProperty("kg_co2e");
        expect(first).toHaveProperty("share_pct");
        expect(first).toHaveProperty("why");
        expect(first).toHaveProperty("vs_previous_pct");
        expect(first.rank).toBeGreaterThanOrEqual(1);
      }
      clearAuthToken();
    });

    it("GET /footprint/hotspots top_n parameter works", async () => {
      if (!backendAvailable || !DEV_TOKEN) return;
      setAuthToken(DEV_TOKEN);

      const top3 = await api.footprint.hotspots({ top_n: 3 });
      expect(top3.hotspots.length).toBeLessThanOrEqual(3);

      const top5 = await api.footprint.hotspots({ top_n: 5 });
      expect(top5.hotspots.length).toBeLessThanOrEqual(5);
      clearAuthToken();
    });

    it("Hotspot why field provides actionable explanation", async () => {
      if (!backendAvailable || !DEV_TOKEN) return;
      setAuthToken(DEV_TOKEN);

      const hotspots = await api.footprint.hotspots();
      if (hotspots.hotspots.length > 0) {
        const why = hotspots.hotspots[0].why;
        expect(typeof why).toBe("string");
        expect(why.length).toBeGreaterThan(10);
      }
      clearAuthToken();
    });
  });

  // Dashboard Data Refresh Tests
  describe("Dashboard Data Refresh", () => {
    it("Multiple API calls can be awaited in parallel", async () => {
      if (!backendAvailable || !DEV_TOKEN) return;
      setAuthToken(DEV_TOKEN);

      const [footprint, hotspots, activities] = await Promise.all([
        api.footprint.summary(),
        api.footprint.hotspots(),
        api.activities.list(),
      ]);

      expect(footprint.total_kg_co2e).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(hotspots.hotspots)).toBe(true);
      expect(Array.isArray(activities.items)).toBe(true);
      clearAuthToken();
    });

    it("Response types match TypeScript definitions", async () => {
      if (!backendAvailable || !DEV_TOKEN) return;
      setAuthToken(DEV_TOKEN);

      const footprint = await api.footprint.summary();
      const hotspots = await api.footprint.hotspots();
      const activities = await api.activities.list();

      // Footprint summary type check
      expect(typeof footprint.total_kg_co2e).toBe("number");
      expect(typeof footprint.basis).toBe("string");
      expect(typeof footprint.confidence).toBe("number");
      expect(typeof footprint.activity_count).toBe("number");

      // Hotspots type check
      expect(Array.isArray(hotspots.hotspots)).toBe(true);

      // Activities type check
      expect(typeof activities.total).toBe("number");
      expect(Array.isArray(activities.items)).toBe(true);
      clearAuthToken();
    });
  });
});
