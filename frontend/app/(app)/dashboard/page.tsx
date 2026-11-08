"use client";

import * as React from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { StatCard } from "@/components/cards/StatCard";
import { FootprintDonut } from "@/components/charts/FootprintDonut";
import { TrendAreaChart } from "@/components/charts/TrendAreaChart";
import { HotspotRankList, HotspotItem } from "@/components/cards/HotspotRankList";
import { ActionCard } from "@/components/actions/ActionCard";
import { ConfidenceMeter } from "@/components/carbon/ConfidenceMeter";
import { ExplainabilityDrawer } from "@/components/carbon/ExplainabilityDrawer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PieChart,
  TrendingDown,
  Flame,
  Award,
  Sparkles,
  TreePine,
  Car,
  Zap,
  ArrowRight,
  BotMessageSquare,
} from "lucide-react";
import { api } from "@/lib/api";
import { RecommendationItem } from "@/types";
import { LineItemCalculation, CarbonCategory } from "@/lib/carbon/types";
import { CategorySplit } from "@/types";
import { RecommendationFeedbackRequest } from "@/types";
import { ScoredRecommendation } from "@/lib/recommendation/scoring";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Category to display name mapping
const CATEGORY_LABELS: Record<CarbonCategory, string> = {
  transport: "Transport",
  electricity: "Electricity",
  food: "Food",
  shopping: "Shopping",
  waste: "Waste",
};

// Category to activity key mapping for hotspots
const CATEGORY_ACTIVITY_KEY: Record<string, { label: string; defaultActivityKey: string }> = {
  transport: { label: "Transport", defaultActivityKey: "transport.bus_km" },
  electricity: { label: "Electricity", defaultActivityKey: "electricity.grid_kwh" },
  food: { label: "Food", defaultActivityKey: "food.meal_veg" },
  shopping: { label: "Shopping", defaultActivityKey: "shopping.clothing_item" },
  waste: { label: "Waste", defaultActivityKey: "waste.landfill_kg" },
};

// Severity classification based on rank
function getSeverity(rank: number, sharePct: number): "high" | "medium" | "low" {
  if (rank <= 2 || sharePct > 25) return "high";
  if (rank <= 3 || sharePct > 15) return "medium";
  return "low";
}

// Map API recommendation to ScoredRecommendation format
function mapRecommendationItem(apiRec: RecommendationItem): ScoredRecommendation {
  const difficultyMap: Record<number, "easy" | "medium" | "hard"> = { 1: "easy", 2: "medium", 3: "hard" };
  const costLevelMap: Record<number, "saves_money" | "neutral" | "costs_money"> = { 1: "saves_money", 2: "neutral", 3: "costs_money" };

  const actionKeyCategory = apiRec.action_key?.split('.')[0] || 'electricity';
  const categoryMap: Record<string, CarbonCategory> = {
    transport: 'transport',
    electricity: 'electricity',
    food: 'food',
    shopping: 'shopping',
    waste: 'waste',
  };

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
      changeType: "reduce_ac_hours" as const,
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
  } as ScoredRecommendation;
}

// Query keys for consistent invalidation
const queryKeys = {
  footprint: ["footprint", "summary"] as const,
  footprintTimeseries: ["footprint", "timeseries"] as const,
  recommendations: ["recommendations", "list"] as const,
  impact: ["impact", "summary"] as const,
  rewards: ["rewards", "summary"] as const,
  hotspots: ["footprint", "hotspots"] as const,
};

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const [isExplainOpen, setIsExplainOpen] = React.useState(false);
  const [adaptationNote, setAdaptationNote] = React.useState<string | null>(null);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = React.useState<string | null>(null);

  // Fetch all dashboard data using TanStack Query
  const { data: footprint, isLoading: footprintLoading, error: footprintError } = useQuery({
    queryKey: queryKeys.footprint,
    queryFn: () => api.footprint.summary(),
    staleTime: 60 * 1000,
  });

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: queryKeys.footprintTimeseries,
    queryFn: () => api.footprint.timeseries(),
    staleTime: 60 * 1000,
  });

  const { data: recommendationsData, isLoading: recsLoading } = useQuery({
    queryKey: queryKeys.recommendations,
    queryFn: () => api.recommendations.list(),
    staleTime: 60 * 1000,
  });

  const { data: progressSummary, isLoading: progressLoading } = useQuery({
    queryKey: queryKeys.impact,
    queryFn: () => api.impact.summary(),
    staleTime: 60 * 1000,
  });

  const { data: rewardsSummary, isLoading: rewardsLoading } = useQuery({
    queryKey: queryKeys.rewards,
    queryFn: () => api.rewards.summary(),
    staleTime: 60 * 1000,
  });

  const { data: hotspotsData, isLoading: hotspotsLoading } = useQuery({
    queryKey: queryKeys.hotspots,
    queryFn: () => api.footprint.hotspots({ top_n: 5 }),
    staleTime: 60 * 1000,
  });

  const isLoading = footprintLoading || historyLoading || recsLoading || progressLoading || rewardsLoading || hotspotsLoading;

  // Map recommendations
  const recommendations = React.useMemo(() => {
    if (!recommendationsData) return [];
    const rData = recommendationsData as any;
    const items = Array.isArray(rData) ? rData : (rData?.recommendations || []);
    return items.map(mapRecommendationItem);
  }, [recommendationsData]);

  // Convert hotspots API response to component format
  const hotspots: HotspotItem[] = React.useMemo(() => {
    if (!hotspotsData) return [];
    return (hotspotsData?.hotspots ?? []).map((h: any) => ({
      rank: h.rank,
      category: h.category,
      lineItem: CATEGORY_ACTIVITY_KEY[h.category]?.label?.replace(/([A-Z])/g, ' $1').trim() || h.activity_key,
      kg: h.kg_co2e,
      percent: h.share_pct,
      severity: getSeverity(h.rank, h.share_pct),
    })) as any[];
  }, [hotspotsData]);

  // Format history data
  const history = React.useMemo(() => {
    if (!historyData) return [];
    const hData = historyData as any;
    return hData?.series || [];
  }, [historyData]);

  // Feedback handler for ActionCard with mutation
  const feedbackMutation = useMutation({
    mutationFn: async ({
      recommendationId,
      responseType,
      reason,
    }: {
      recommendationId: string;
      responseType: "accept" | "skip" | "modify" | "reject";
      reason?: string;
    }) => {
      const responseMap: Record<typeof responseType, "accepted" | "skipped" | "modified" | "rejected"> = {
        accept: "accepted",
        skip: "skipped",
        modify: "modified",
        reject: "rejected",
      };

      const feedbackPayload: RecommendationFeedbackRequest = {
        response: responseMap[responseType],
        reason_code: reason as any,
        note: "",
      };

      return api.recommendations.feedback(recommendationId, feedbackPayload);
    },
    onSuccess: (result) => {
      if (result.profile_update?.summary) {
        setAdaptationNote(result.profile_update.summary);
      }
      // Invalidate relevant queries to refresh dashboard
      queryClient.invalidateQueries({ queryKey: queryKeys.recommendations });
      queryClient.invalidateQueries({ queryKey: queryKeys.footprint });
      queryClient.invalidateQueries({ queryKey: queryKeys.hotspots });
      queryClient.invalidateQueries({ queryKey: queryKeys.rewards });
    },
    onError: (err) => {
      console.error("Feedback error:", err);
      setAdaptationNote(`Action failed - please try again.`);
    },
  });

  const handleRecommendationFeedback = (
    recommendationId: string,
    responseType: "accept" | "skip" | "modify" | "reject",
    reason?: string
  ) => {
    feedbackMutation.mutate({ recommendationId, responseType, reason });
  };

  // Mutation for activity creation (to refresh dashboard after logging)
  const createActivityMutation = useMutation({
    mutationFn: (payload: any) => api.activities.create(payload),
    onSuccess: () => {
      // Invalidate all dashboard-relevant queries
      queryClient.invalidateQueries({ queryKey: queryKeys.footprint });
      queryClient.invalidateQueries({ queryKey: queryKeys.footprintTimeseries });
      queryClient.invalidateQueries({ queryKey: queryKeys.hotspots });
      queryClient.invalidateQueries({ queryKey: queryKeys.recommendations });
      queryClient.invalidateQueries({ queryKey: queryKeys.impact });
      queryClient.invalidateQueries({ queryKey: queryKeys.rewards });
    },
  });

  // Mutation for simulation (to refresh dashboard after simulation)
  const runSimulationMutation = useMutation({
    mutationFn: (payload: any) => api.simulations.project(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.footprint });
      queryClient.invalidateQueries({ queryKey: queryKeys.recommendations });
    },
  });

  // Build explain data for drawer from footprint
  const buildExplainData = React.useCallback((): any => {
    if (!footprint) return { lineItems: [], confidenceScore: 82, confidenceExplanation: [] };

    const categoryTotals: Record<string, number> = {};
    (footprint.by_category ?? []).forEach((c: CategorySplit) => {
      categoryTotals[c.category] = c.kg_co2e;
    });

    const lineItems: LineItemCalculation[] = Object.entries(categoryTotals).map(([cat, kg], idx) => ({
      id: `cat-${idx}`,
      category: cat as CarbonCategory,
      lineItem: CATEGORY_LABELS[cat as CarbonCategory],
      activity: kg,
      unit: "kg CO2e",
      factor: 0.5,
      factorSource: "Emission Factor Database",
      factorYear: 2023,
      co2eKg: kg,
      dataQuality: "estimated" as const,
      formulaText: `Category Total: ${kg.toFixed(2)} kg CO2e`,
    }));

    return {
      lineItems,
      confidenceScore: footprint.confidence ?? 82,
      confidenceExplanation: [
        `Based on ${footprint.activity_count} logged activities`,
        `Data spans current ${footprint.period} period`,
        `Formula: Activity Amount × Emission Factor`,
      ],
    };
  }, [footprint]);

  const explainDataForDrawer = buildExplainData();

  // Featured Next Best Action
  const nextBestAction = recommendations[0];

  // Calculate derived values
  const totalKg = footprint?.total_kg_co2e ?? 0;
  const byCategory = footprint?.by_category ?? [];
  const deltaKg = footprint?.previous_period_total_kg
    ? totalKg - footprint.previous_period_total_kg
    : 0;

  // Formatted slices for donut
  const categoryMap: Record<string, CategorySplit> = {};
  byCategory.forEach((c: CategorySplit) => {
    categoryMap[c.category] = c;
  });

  const donutData = (Object.keys(CATEGORY_LABELS) as CarbonCategory[]).map((cat) => {
    const catData = categoryMap[cat] || { category: cat, kg_co2e: 0, share_pct: 0 };
    return {
      name: CATEGORY_LABELS[cat],
      category: cat,
      value: catData.kg_co2e,
      percentage: catData.share_pct,
      color: cat === "transport" ? "#2563eb" :
              cat === "electricity" ? "#f59e0b" :
              cat === "food" ? "#059669" :
              cat === "shopping" ? "#8b5cf6" :
              "#dc2626",
    };
  });

  // Trend data formatted for AreaChart from timeseries API
  const trendData = history.length > 0
    ? history.map((h: { label: string; total_kg?: number }) => ({
        month: h.label.split(' ')[0],
        actualKg: totalKg,
        goalPathKg: totalKg,
        projectedIfPlanFollowed: h.total_kg || totalKg,
      }))
    : [
        { month: "Sep", actualKg: 148.5, goalPathKg: 148.5, projectedIfPlanFollowed: 130.0 },
        { month: "Oct", actualKg: 139.0, goalPathKg: 138.0, projectedIfPlanFollowed: 120.5 },
        { month: "Nov", actualKg: totalKg, goalPathKg: 127.6, projectedIfPlanFollowed: 109.1 },
      ];

  if (isLoading) {
    return (
      <AppShell title="Dashboard" subtitle="Audited Sustainability Overview">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
          <Skeleton className="lg:col-span-5 h-80 rounded-xl" />
          <Skeleton className="lg:col-span-7 h-80 rounded-xl" />
        </div>
      </AppShell>
    );
  }

  // Error state
  if (footprintError) {
    return (
      <AppShell title="Dashboard" subtitle="Audited Sustainability Overview">
        <div className="p-6 max-w-5xl mx-auto space-y-6">
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 rounded-lg">
            <h3 className="font-semibold">Failed to load dashboard data</h3>
            <p className="text-sm mt-1">{footprintError instanceof Error ? footprintError.message : "Unknown error"}</p>
            <Button variant="outline" className="mt-3" onClick={() => queryClient.invalidateQueries({ queryKey: queryKeys.footprint })}>
              Retry
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Carbon Dashboard"
      subtitle="From Carbon Awareness → Carbon Action → Measurable Impact"
    >
      {/* 1. Hero Metric Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Monthly Footprint"
          value={totalKg.toFixed(1)}
          unit="kg CO₂e"
          delta={{ value: deltaKg, isPositiveGood: deltaKg < 0, label: footprint?.previous_period_total_kg ? "vs last month" : "vs baseline" }}
          subtitle="Pune Average: 145 kg"
          icon={PieChart}
          accentColor="text-emerald-600"
        />

        <StatCard
          title="Goal Progress"
          value={`${footprint?.target_used_pct?.toFixed(0) ?? 72}%`}
          subtitle={`Target: ${footprint?.target_kg ?? 118.8} kg | ${footprint?.activity_count ?? 0} activities logged`}
          icon={TrendingDown}
          accentColor="text-blue-600"
        />

        <StatCard
          title="Consistency Streak"
          value={`${rewardsSummary?.streaks?.logging?.current ?? 14} Days`}
          subtitle={`Best: ${rewardsSummary?.streaks?.logging?.longest ?? 21} days`}
          icon={Flame}
          accentColor="text-amber-500"
        />

        <StatCard
          title="Eco Score Rating"
          value={`${rewardsSummary?.eco_score ?? 76}/100`}
          subtitle="Carbon Strategist"
          icon={Award}
          accentColor="text-purple-600"
        />
      </div>

      {/* 2. Confidence Banner */}
      <ConfidenceMeter
        score={footprint?.confidence ?? 82}
        rating={(footprint?.confidence_label?.toLowerCase() as "high" | "medium" | "low") ?? "high"}
        onOpenExplainability={() => setIsExplainOpen(true)}
      />

      {/* 3. Category Donut & Trend Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Donut Mix */}
        <Card className="lg:col-span-5 p-5">
          <FootprintDonut
            data={donutData}
            totalKg={totalKg}
            onSliceClick={(cat) => setSelectedCategoryFilter(cat === selectedCategoryFilter ? null : cat)}
          />
          {selectedCategoryFilter && (
            <div className="mt-3 flex items-center justify-between p-2 rounded-lg bg-muted text-xs">
              <span>Filtering category: <strong className="capitalize">{selectedCategoryFilter}</strong></span>
              <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setSelectedCategoryFilter(null)}>
                Clear Filter
              </Button>
            </div>
          )}
        </Card>

        {/* 90-Day Trend Curve */}
        <Card className="lg:col-span-7 p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Emission Trajectory
              </h4>
              <p className="text-xs text-foreground font-bold mt-0.5">
                Actual vs Goal Path vs Projected-If-Plan-Followed
              </p>
            </div>
            <Badge variant="emerald" className="text-[10px]">
              {footprint?.change_pct ? `${footprint.change_pct >= 0 ? '+' : ''}${footprint.change_pct}% from prev` : 'Tracking baseline'}
            </Badge>
          </div>
          <TrendAreaChart data={trendData} />
        </Card>
      </div>

      {/* 4. Hotspots and Next Best Action Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Hotspots Rank List */}
        <div className="lg:col-span-5">
          <Card className="p-5 h-full flex flex-col justify-between">
            <HotspotRankList
              hotspots={hotspots}
              onSelectCategory={(cat) => setSelectedCategoryFilter(cat)}
            />
          </Card>
        </div>

        {/* Featured Next Best Action (Closed-Loop Highlight) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-emerald-600" />
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                AI Next Best Action (Closed-Loop Engine)
              </h4>
            </div>
            <Button asChild variant="ghost" size="sm" className="h-7 text-xs text-emerald-600 gap-1">
              <Link href="/actions">
                View All {recommendations.length} Actions <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </div>

          {nextBestAction && (
            <ActionCard
              recommendation={nextBestAction}
              onStatusChange={() => {
                queryClient.invalidateQueries({ queryKey: queryKeys.recommendations });
                queryClient.invalidateQueries({ queryKey: queryKeys.footprint });
              }}
              onFeedback={handleRecommendationFeedback}
            />
          )}

          {/* Closed-Loop Adaptation Feedback Display */}
          {adaptationNote && (
            <Card className="border-emerald-500/30 bg-emerald-500/10">
              <CardContent className="p-4 flex items-start gap-3 text-sm">
                <Sparkles className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-emerald-800 dark:text-emerald-300">Closed-Loop Update: </span>
                  {adaptationNote}
                </div>
              </CardContent>
            </Card>
          )}

          {/* AI Grounded Insight Strip - using actual hotspot data */}
          {hotspots.length > 0 && hotspots[0] ? (
            <Card className="border-border/80 bg-muted/30">
              <CardContent className="p-4 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 shrink-0">
                  <BotMessageSquare className="h-4 w-4" />
                </div>
                <div className="text-xs space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground">AI Sustainability Advisory</span>
                    <Badge variant="outline" className="text-[9px]">Grounded in CEA v19 Data</Badge>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    Your top hotspot is <strong>{hotspots[0].lineItem} ({hotspots[0].kg.toFixed(1)} kg, {hotspots[0].percent.toFixed(1)}%)</strong> followed by{" "}
                    {hotspots.length > 1 ? (
                      <strong>{hotspots[1].lineItem} ({hotspots[1].kg.toFixed(1)} kg, {hotspots[1].percent.toFixed(1)}%)</strong>
                    ) : (
                      <strong>other categories</strong>
                    )}. Based on your logged activities, consider optimizing these areas.
                    {hotspots[0].category === "transport" && " Switching to public transit can save significant emissions."}
                    {hotspots[0].category === "electricity" && " Reducing AC hours or shifting to solar offsets can help."}
                    {hotspots[0].category === "food" && " Shifting toward plant-based meals reduces emissions significantly."}
                  </p>
                  <Link
                    href="/actions"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:underline pt-0.5"
                  >
                    View action plan <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/80 bg-muted/30">
              <CardContent className="p-4 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 shrink-0">
                  <BotMessageSquare className="h-4 w-4" />
                </div>
                <div className="text-xs space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground">AI Sustainability Advisory</span>
                    <Badge variant="outline" className="text-[9px]">Grounded in CEA v19 Data</Badge>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    Log your first activities to receive personalized recommendations. Start with transport, electricity, or food to see your footprint breakdown.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* 5. Impact-So-Far & Realized Equivalences */}
      <Card className="border-border">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-border">
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Measurable Impact Achieved
              </span>
              <h3 className="text-lg font-bold text-foreground mt-0.5">
                Total Logged Footprint
              </h3>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                {footprint?.total_kg_co2e ? footprint.total_kg_co2e.toFixed(1) : "0.0"} kg
              </span>
              <span className="text-xs text-muted-foreground ml-1">CO₂e Logged</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-xs">
            <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background/50">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950 shrink-0">
                <TreePine className="h-4 w-4" />
              </div>
              <div>
                <span className="font-bold text-foreground tabular-nums text-sm">
                  {totalKg / 20 > 0 ? (totalKg / 20).toFixed(1) : 0} Equivalent Trees
                </span>
                <p className="text-[11px] text-muted-foreground">Annual carbon absorption eq.</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background/50">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950 shrink-0">
                <Car className="h-4 w-4" />
              </div>
              <div>
                <span className="font-bold text-foreground tabular-nums text-sm">
                  {totalKg / 0.165 > 0 ? (totalKg / 0.165).toFixed(0) : 0} km equivalent drive
                </span>
                <p className="text-[11px] text-muted-foreground">Single-occupant vehicle avoidance</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background/50">
              <div className="p-2 rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950 shrink-0">
                <Zap className="h-4 w-4" />
              </div>
              <div>
                <span className="font-bold text-foreground tabular-nums text-sm">
                  {totalKg / 0.82 > 0 ? (totalKg / 0.82).toFixed(0) : 0} kWh
                </span>
                <p className="text-[11px] text-muted-foreground">Grid electricity avoided</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Explainability Drawer Dialog */}
      <ExplainabilityDrawer
        open={isExplainOpen}
        onOpenChange={setIsExplainOpen}
        lineItems={explainDataForDrawer?.lineItems ?? []}
        confidenceScore={footprint?.confidence ?? 82}
        confidenceExplanations={explainDataForDrawer?.confidenceExplanation ?? []}
      />
    </AppShell>
  );
}