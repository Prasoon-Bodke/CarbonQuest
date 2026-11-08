/**
 * Strongly typed endpoint operations for the CarbonQuest API.
 * Maps 1:1 to FastAPI route definitions in backend/app/api/v1 and backend/app/ai/router.py.
 */

import { http } from "./client";
import type {
  AuthResponse,
  SignupRequest,
  LoginRequest,
  ProfileRead,
  ProfileUpdate,
  ConsentUpdate,
  OnboardingInput,
  OnboardingResponse,
  ActivityCreate,
  ActivityUpdate,
  ActivityCreateResponse,
  ActivityListResponse,
  FootprintSummary,
  FootprintHotspotsResponse,
  FootprintExplainResponse,
  ActionCatalogResponse,
  SimulationRequest,
  SimulationResponse,
  GoalCreate,
  GoalRead,
  ImpactSummaryResponse,
  RewardSummaryResponse,
  RecommendationGenerateRequest,
  RecommendationGenerateResponse,
  RecommendationFeedbackRequest,
  RecommendationFeedbackResponse,
  ActionLogCreate,
  ActionLogRead,
  AdaptiveProfileResponse,
  AdaptiveMetricsResponse,
  ChatMessageRequest,
  ChatMessageResponse,
} from "@/types";

export const api = {
  // Health
  health: {
    check: () => http.get<{ status: string; version: string; timestamp: string }>("/health"),
  },

  // Auth (Local development / fallback auth when Supabase is unconfigured)
  auth: {
    signup: (payload: SignupRequest) => http.post<AuthResponse>("/auth/signup", payload),
    login: (payload: LoginRequest) => http.post<AuthResponse>("/auth/login", payload),
    demo: () => http.post<AuthResponse>("/auth/demo"),
  },

  // Profile & Onboarding
  profile: {
    get: () => http.get<ProfileRead>("/me"),
    update: (payload: ProfileUpdate) => http.put<ProfileRead>("/me", payload),
    setConsents: (payload: ConsentUpdate) =>
      http.post<{ status: string; consent_tracking: boolean; consent_leaderboard: boolean }>("/me/consents", payload),
    completeOnboarding: (payload: OnboardingInput) =>
      http.post<OnboardingResponse>("/me/onboarding", payload),
    exportData: () => http.get<Record<string, unknown>>("/me/export"),
    deleteData: () => http.delete<{ status: string; message: string }>("/me"),
  },

  // Activities & Factors
  activities: {
    list: (params?: { category?: string; start_date?: string; end_date?: string; limit?: number; offset?: number }) =>
      http.get<ActivityListResponse>("/activities", { params }),
    create: (payload: ActivityCreate) =>
      http.post<ActivityCreateResponse>("/activities", payload),
    update: (activityId: string, payload: ActivityUpdate) =>
      http.patch<ActivityCreateResponse>(`/activities/${activityId}`, payload),
    delete: (activityId: string) =>
      http.delete<{ status: string; deleted_id: string }>(`/activities/${activityId}`),
    factors: (params?: { category?: string }) =>
      http.get<any[]>("/emission-factors", { params }),
  },

  // Footprint & Hotspots
  footprint: {
    summary: (params?: { period_start?: string; period_end?: string; period?: string; ref_date?: string }) =>
      http.get<FootprintSummary>("/footprint/summary", { params }),
    timeseries: (params?: { period?: string; months_back?: number }) =>
      http.get<{ period: string; series: { label: string; total_kg: number }[] }>("/footprint/timeseries", { params }),
    hotspots: (params?: { period?: string; top_n?: number }) =>
      http.get<FootprintHotspotsResponse>("/footprint/hotspots", { params }),
    explain: (emissionRecordId: string) =>
      http.get<FootprintExplainResponse>(`/footprint/explain/${emissionRecordId}`),
  },

  // Action Catalog
  catalog: {
    list: (params?: { category?: string }) =>
      http.get<ActionCatalogResponse>("/actions/catalog", { params }),
  },

  // What-If Simulator
  simulations: {
    project: (payload: SimulationRequest) =>
      http.post<SimulationResponse>("/simulations", payload),
    list: (params?: { limit?: number }) =>
      http.get<any>("/simulations", { params }),
  },

  // Goals
  goals: {
    list: () => http.get<GoalRead[]>("/goals"),
    create: (payload: GoalCreate) => http.post<GoalRead>("/goals", payload),
    delete: (goalId: string) => http.delete<{ status: string; deleted_id: string }>(`/goals/${goalId}`),
  },

  // Impact & Rewards
  impact: {
    summary: () => http.get<ImpactSummaryResponse>("/impact/summary"),
  },
  rewards: {
    summary: () => http.get<RewardSummaryResponse>("/rewards/summary"),
    badges: () => http.get<any[]>("/rewards/badges"),
    leaderboard: () => http.get<any[]>("/rewards/leaderboard"),
    redeem: (points: number, reason: string) =>
      http.post<any>("/rewards/redeem", null, { params: { points, reason } }),
  },

  // Recommendations & Adaptive AI
  recommendations: {
    generate: (payload: RecommendationGenerateRequest = { max_items: 5 }) =>
      http.post<RecommendationGenerateResponse>("/recommendations/generate", payload),
    list: (params?: { cycle?: number; status?: string }) =>
      http.get<any[]>("/recommendations", { params }),
    feedback: (recommendationId: string, payload: RecommendationFeedbackRequest) =>
      http.post<RecommendationFeedbackResponse>(`/recommendations/${recommendationId}/feedback`, payload),
    explain: (recommendationId: string) =>
      http.get<any>(`/recommendations/${recommendationId}/explanation`),
    logAction: (payload: ActionLogCreate) =>
      http.post<ActionLogRead>("/action-logs", payload),
    listActionLogs: () => http.get<ActionLogRead[]>("/action-logs"),
  },

  // Adaptive Metrics & Profile
  adaptive: {
    profile: () => http.get<AdaptiveProfileResponse>("/adaptive/profile"),
    metrics: () => http.get<AdaptiveMetricsResponse>("/adaptive/metrics"),
  },

  // Grounded Chat
  chat: {
    send: (payload: ChatMessageRequest) =>
      http.post<ChatMessageResponse>("/chat/messages", payload),
    sessions: () => http.get<any[]>("/chat/sessions"),
    session: (sessionId: string) => http.get<any>(`/chat/sessions/${sessionId}`),
  },
};
