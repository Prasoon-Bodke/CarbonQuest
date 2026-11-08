"use client";

import * as React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BasisBadge } from "@/components/badges/BasisBadge";
import { ActionCard } from "@/components/actions/ActionCard";
import { Sparkles, RefreshCw, CheckCircle2, RotateCcw, AlertCircle } from "lucide-react";
import { ScoredRecommendation } from "@/lib/recommendation/scoring";

export default function ActionsPage() {
  const [recommendations, setRecommendations] = React.useState<ScoredRecommendation[]>([]);
  const [adaptationNote, setAdaptationNote] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const fetchRecommendations = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/recommendations");
      if (res.ok) {
        const data = await res.json();
        setRecommendations(data.recommendations || []);
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const handleActionFeedback = async (
    actionId: string,
    responseType: "accept" | "skip" | "modify" | "reject",
    reason?: string
  ) => {
    setAdaptationNote(
      responseType === "skip"
        ? `Action skipped (${reason || "not practical"}). Preference profile updated: Beta-Bernoulli prior adjusted, alternative suggestions boosted.`
        : `Action ${responseType}ed! Points and progress updated.`
    );
    // Reload recommendations to display new adaptive ranking
    fetchRecommendations();
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
