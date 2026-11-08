"use client";

import * as React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BasisBadge } from "@/components/badges/BasisBadge";
import { ActionCard } from "@/components/actions/ActionCard";
import { Sparkles, RefreshCw, CheckCircle2, RotateCcw, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import { RecommendationFeedbackRequest } from "@/types";

// Mapping from API response to frontend ScoredRecommendation format
interface ApiRecommendationItem {
  id: string;
  action_key: string;
  title: string;
  estimated_saving_kg_month: number;
  basis: string;
  difficulty: number;
  cost_level: number;
  priority_rank: number;
  score: number;
  score_breakdown: {
    impact: number;
    preference: number;
    feasibility: number;
    goal_fit: number;
    cooldown_penalty: number;
  };
  explanation: string;
  status: string;
}

function mapApiRecommendation(apiRec: ApiRecommendationItem) {
  // Calculate category from action_key if available
  const actionKeyCategory = apiRec.action_key?.split('.')[0] || 'electricity';
  const categoryMap: Record<string, 'transport' | 'electricity' | 'food' | 'shopping' | 'waste'> = {
    transport: 'transport',
    electricity: 'electricity',
    food: 'food',
    shopping: 'shopping',
    waste: 'waste',
  };

  const difficultyMap: Record<number, "easy" | "medium" | "hard"> = { 1: "easy", 2: "medium", 3: "hard" };
  const costLevelMap: Record<number, "saves_money" | "neutral" | "costs_money"> = { 1: "saves_money", 2: "neutral", 3: "costs_money" };

  return {
    actionId: apiRec.id,
    template: {
      id: apiRec.action_key || apiRec.id,
      slug: apiRec.action_key || apiRec.id,
      title: apiRec.title,
      category: categoryMap[actionKeyCategory] || 'electricity',
      description: apiRec.explanation || apiRec.title,
      difficulty: difficultyMap[apiRec.difficulty] || "medium",
      costImpact: costLevelMap[apiRec.cost_level] || "neutral",
      changeType: "reduce_ac_hours" as const, // Default change type, will be used with simulator
      defaultMagnitude: 1,
      unit: "hours",
      tags: [],
    },
    estimatedKgPerMonth: apiRec.estimated_saving_kg_month || 0,
    estimatedCostSavingsInr: 0,
    priorityScore: apiRec.priority_rank || apiRec.score,
    scoreBreakdown: {
      normalizedImpact: Math.round((apiRec.score_breakdown?.impact || 50)),
      preferenceFit: Math.round((apiRec.score_breakdown?.preference || 50)),
      feasibilityAndCost: Math.round((apiRec.score_breakdown?.feasibility || 50)),
      behaviorAdjustment: Math.round((apiRec.score_breakdown?.goal_fit || 0) - 50),
      weightedTotal: apiRec.score || 50,
      weightsUsed: {
        w1_impact: 0.35,
        w2_preference: 0.25,
        w3_feasibility: 0.20,
        w4_behavior: 0.20,
      },
    },
    rationale: apiRec.explanation || `Opportunity to save ${apiRec.estimated_saving_kg_month || 5} kg CO₂e/mo.`,
    userMagnitude: 1,
    userStatus: "pending" as const,
  };
}

type MappedRecommendation = ReturnType<typeof mapApiRecommendation>;

type FeedbackResponse = "accept" | "skip" | "modify" | "reject";

export default function ActionsPage() {
  const [recommendations, setRecommendations] = React.useState<MappedRecommendation[]>([]);
  const [adaptationNote, setAdaptationNote] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const fetchRecommendations = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.recommendations.generate({ max_items: 5 });
      const mapped = (data.items || []).map(mapApiRecommendation);
      setRecommendations(mapped);
      if (data.adaptation?.changes_since_last_cycle?.length) {
        setAdaptationNote(data.adaptation.changes_since_last_cycle.join(". "));
      }
    } catch (err) {
      console.error("Failed to load recommendations:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const handleActionFeedback = async (
    recommendationId: string,
    responseType: FeedbackResponse,
    reason?: string
  ) => {
    try {
      const responseMap: Record<FeedbackResponse, "accepted" | "skipped" | "modified" | "rejected"> = {
        accept: "accepted",
        skip: "skipped",
        modify: "modified",
        reject: "rejected",
      };

      const feedbackPayload: RecommendationFeedbackRequest = {
        response: responseMap[responseType],
        reason_code: reason as any,
        note: "", // Required field
      };

      const result = await api.recommendations.feedback(recommendationId, feedbackPayload);

      // Display adaptive learning changes from backend
      if (result.profile_update?.summary) {
        setAdaptationNote(result.profile_update.summary);
      } else if (responseType === "skip") {
        setAdaptationNote(`Action skipped (${reason || "not practical"}). Preference profile updated.`);
      } else {
        setAdaptationNote(`Action ${responseType}ed! Points and progress updated.`);
      }
    } catch (err) {
      console.error("Feedback error:", err);
      setAdaptationNote(`Action ${responseType}ed locally (backend sync pending).`);
    }
    fetchRecommendations();
  };

  // Map feedback types for ActionCard
  const handleActionWithCallback = (actionId: string, response: "accept" | "skip" | "modify" | "reject", reason?: string) => {
    // Transform "reject" to "skip" for compatibility with backend
    handleActionFeedback(actionId, response as any, reason);
  };

  return (
    <AppShell>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">Adaptive AI Recommendations</h1>
              <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                Rule-Based Adaptive Learning
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Ranked by deterministic impact, personal preferences, and learned statistical affinities.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchRecommendations} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
            Regenerate
          </Button>
        </div>

        {adaptationNote && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 rounded-lg flex items-start gap-3 text-sm">
            <Sparkles className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Closed-Loop Adaptation Triggered: </span>
              {adaptationNote}
            </div>
          </div>
        )}

        <div className="space-y-4">
          {recommendations.length > 0 ? (
            recommendations.map((rec) => (
              <ActionCard
                key={rec.actionId}
                recommendation={rec}
                onStatusChange={() => fetchRecommendations()}
                onFeedback={handleActionWithCallback}
              />
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Generating personalized candidate recommendations...</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}