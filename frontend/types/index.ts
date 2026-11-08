/**
 * Frontend TypeScript types generated from OpenAPI 3.1 schema.
 * Re-exports all raw paths and components and provides convenient aliases.
 */
import type { components, paths } from "./api";

export type { components, paths };

// Helper generic to extract a schema by name
export type Schema<T extends keyof components["schemas"]> = components["schemas"][T];

// Authentication
export type AuthResponse = components["schemas"]["AuthResponse"];
export type AuthResponseUser = components["schemas"]["AuthResponseUser"];
export type SignupRequest = components["schemas"]["SignupRequest"];
export type LoginRequest = components["schemas"]["LoginRequest"];

// Profile & Onboarding
export type ProfileRead = components["schemas"]["ProfileRead"];
export type ProfileUpdate = components["schemas"]["ProfileUpdate"];
export type ConsentUpdate = components["schemas"]["ConsentUpdate"];
export type HabitInput = components["schemas"]["HabitInput"];
export type OnboardingInput = components["schemas"]["OnboardingInput"];
export type OnboardingResponse = components["schemas"]["OnboardingResponse"];

// Activities & Factors
export type ActivityCreate = components["schemas"]["ActivityCreate"];
export type ActivityUpdate = components["schemas"]["ActivityUpdate"];
export type ActivityCreateResponse = components["schemas"]["ActivityCreateResponse"];
export type ActivityListResponse = components["schemas"]["ActivityListResponse"];
export type ActivityReadItem = components["schemas"]["ActivityReadItem"];
export type EmissionResult = components["schemas"]["EmissionResult"];
export type EmissionFactorRef = components["schemas"]["EmissionFactorRef"];

// Footprint & Hotspots
export type FootprintSummary = components["schemas"]["FootprintSummary"];
export type FootprintHotspotsResponse = components["schemas"]["FootprintHotspotsResponse"];
export type HotspotItem = components["schemas"]["HotspotItem"];
export type HotspotOpportunity = components["schemas"]["HotspotOpportunity"];
export type FootprintExplainResponse = components["schemas"]["FootprintExplainResponse"];
export type CategorySplit = components["schemas"]["CategorySplit"];
export type TrendPoint = components["schemas"]["TrendPoint"];

// Catalog & What-If Simulations
export type ActionDef = components["schemas"]["ActionDef"];
export type ActionCatalogResponse = components["schemas"]["ActionCatalogResponse"];
export type ScenarioInput = components["schemas"]["ScenarioInput"];
export type ScenarioResult = components["schemas"]["ScenarioResult"];
export type ScenarioAssumption = components["schemas"]["ScenarioAssumption"];
export type SimulationRequest = components["schemas"]["SimulationRequest"];
export type SimulationResponse = components["schemas"]["SimulationResponse"];

// Recommendations & Adaptive AI
export type RecommendationItem = components["schemas"]["RecommendationItem"];
export type ScoreBreakdown = components["schemas"]["ScoreBreakdown"];
export type AdaptationSummary = components["schemas"]["AdaptationSummary"];
export type RecommendationGenerateRequest = components["schemas"]["RecommendationGenerateRequest"];
export type RecommendationGenerateResponse = components["schemas"]["RecommendationGenerateResponse"];
export type RecommendationFeedbackRequest = components["schemas"]["RecommendationFeedbackRequest"];
export type RecommendationFeedbackResponse = components["schemas"]["RecommendationFeedbackResponse"];
export type ActionLogCreate = components["schemas"]["ActionLogCreate"];
export type ActionLogRead = components["schemas"]["ActionLogRead"];
export type AdaptiveProfileResponse = components["schemas"]["AdaptiveProfileResponse"];
export type AdaptiveMetricsResponse = components["schemas"]["AdaptiveMetricsResponse"];

// Goals, Impact & Rewards
export type GoalCreate = components["schemas"]["GoalCreate"];
export type GoalRead = components["schemas"]["GoalRead"];
export type ImpactSummaryResponse = components["schemas"]["ImpactSummaryResponse"];
export type RewardSummaryResponse = components["schemas"]["RewardSummaryResponse"];
export type BadgeRead = components["schemas"]["BadgeRead"];
export type StreakInfo = components["schemas"]["StreakInfo"];

// Chat
export type ChatMessageRequest = components["schemas"]["ChatMessageRequest"];
export type ChatMessageResponse = components["schemas"]["ChatMessageResponse"];
export type ChatGrounding = components["schemas"]["ChatGrounding"];

// Standardized Error Envelopes (matching app/core/errors.py)
export interface ApiErrorDetail {
  field?: string;
  issue?: string;
  [key: string]: unknown;
}

export interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[];
    request_id?: string;
  };
}
