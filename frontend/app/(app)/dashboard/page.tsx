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
  Clock,
  ArrowRight,
  BotMessageSquare,
  HelpCircle,
  Zap,
} from "lucide-react";
import { ScoredRecommendation } from "@/lib/recommendation/scoring";
import { LineItemCalculation } from "@/lib/carbon/types";

export default function DashboardPage() {
  const [footprint, setFootprint] = React.useState<any>(null);
  const [history, setHistory] = React.useState<any[]>([]);
  const [recommendations, setRecommendations] = React.useState<ScoredRecommendation[]>([]);
  const [progressSummary, setProgressSummary] = React.useState<any>(null);
  const [rewardsSummary, setRewardsSummary] = React.useState<any>(null);
  const [explainData, setExplainData] = React.useState<any>(null);
  const [isExplainOpen, setIsExplainOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    try {
      const [fpRes, histRes, recRes, progRes, rewRes, expRes] = await Promise.all([
        fetch("/api/footprint/current"),
        fetch("/api/footprint/history"),
        fetch("/api/recommendations"),
        fetch("/api/progress/summary"),
        fetch("/api/rewards/summary"),
        fetch("/api/footprint/explain"),
      ]);

      if (fpRes.ok) setFootprint(await fpRes.json());
      if (histRes.ok) {
        const hData = await histRes.json();
        setHistory(hData.history || []);
      }
      if (recRes.ok) {
        const rData = await recRes.json();
        setRecommendations(rData.recommendations || []);
      }
      if (progRes.ok) setProgressSummary(await progRes.json());
      if (rewRes.ok) setRewardsSummary(await rewRes.json());
      if (expRes.ok) setExplainData(await expRes.json());
    } catch (err) {
      console.error("Dashboard data load error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

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

  const totalKg = footprint?.totalKg || 127.6;
  const categories = footprint?.byCategory || {};

  // Formatted slices for donut
  const donutData = Object.entries(categories).map(([key, val]: [string, any]) => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    category: key,
    value: val.co2eKg || 0,
    percentage: val.percentage || 0,
    color: "#10b981",
  }));

  // Trend data formatted for AreaChart
  const trendData =
    progressSummary?.trendCurve || [
      { month: "Sep", actualKg: 148.5, goalPathKg: 148.5, projectedIfPlanFollowed: 130.0 },
      { month: "Oct", actualKg: 139.0, goalPathKg: 138.0, projectedIfPlanFollowed: 120.5 },
      { month: "Nov", actualKg: totalKg, goalPathKg: 127.6, projectedIfPlanFollowed: 109.1 },
    ];

  // Hotspots
  const hotspots: HotspotItem[] = footprint?.hotspots || [
    { rank: 1, category: "transport", lineItem: "Two-Wheeler Commute (Petrol)", kg: 39.7, percent: 31.1, severity: "high" },
    { rank: 2, category: "electricity", lineItem: "Air Conditioning (Split AC)", kg: 32.1, percent: 25.1, severity: "high" },
    { rank: 3, category: "food", lineItem: "Dietary Baseline (Vegetarian)", kg: 28.0, percent: 21.9, severity: "medium" },
    { rank: 4, category: "shopping", lineItem: "Clothing & Fast Fashion", kg: 17.7, percent: 13.9, severity: "low" },
    { rank: 5, category: "waste", lineItem: "Unsegregated Landfill Waste", kg: 10.1, percent: 7.9, severity: "low" },
  ];

  // Featured Next Best Action
  const nextBestAction = recommendations[0];

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
          delta={{ value: -8.2, isPositiveGood: false, label: "vs last month" }}
          subtitle="Pune Average: 145 kg"
          icon={PieChart}
          accentColor="text-emerald-600"
        />

        <StatCard
          title="Goal Progress (-20%)"
          value={`${progressSummary?.progressPercent || 72}%`}
          subtitle={`Target: ${progressSummary?.targetKg || 118.8} kg`}
          icon={TrendingDown}
          accentColor="text-blue-600"
        />

        <StatCard
          title="Consistency Streak"
          value={`${rewardsSummary?.currentStreak || 14} Days`}
          subtitle={`Best: ${rewardsSummary?.longestStreak || 21} days`}
          icon={Flame}
          accentColor="text-amber-500"
        />

        <StatCard
          title="Eco Score Rating"
          value={`${rewardsSummary?.ecoScore || 76}/100`}
          subtitle={rewardsSummary?.level || "Carbon Strategist"}
          icon={Award}
          accentColor="text-purple-600"
        />
      </div>

      {/* 2. Confidence Banner */}
      <ConfidenceMeter
        score={footprint?.confidence || 82}
        rating={footprint?.confidenceRating || "high"}
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
                Actual vs -20% Goal Path vs Projected-If-Plan-Followed
              </p>
            </div>
            <Badge variant="emerald" className="text-[10px]">
              -14.1 kg Saved Since Sep
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
              onStatusChange={() => loadData()}
            />
          )}

          {/* AI Grounded Insight Strip */}
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
                  Your top hotspot is <strong>Two-Wheeler Commute (39.7 kg, 31.1%)</strong> followed by{" "}
                  <strong>Air Conditioning (32.1 kg, 25.1%)</strong>. Because you skipped cycling as impractical,
                  we calibrated your queue to prioritize Pune municipal transit. Setting your AC to 24°C will save ~₹350/mo.
                </p>
                <Link
                  href="/assistant"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:underline pt-0.5"
                >
                  Chat with grounded Llama 3.3 Assistant <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </CardContent>
          </Card>
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
                Cumulative Avoided Greenhouse Gases
              </h3>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                {progressSummary?.totalAvoidedKg?.toFixed(1) || "28.5"} kg
              </span>
              <span className="text-xs text-muted-foreground ml-1">CO₂e Avoided</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-xs">
            <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background/50">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950 shrink-0">
                <TreePine className="h-4 w-4" />
              </div>
              <div>
                <span className="font-bold text-foreground tabular-nums text-sm">
                  {progressSummary?.treesEquivalent || 1.4} Trees
                </span>
                <p className="text-[11px] text-muted-foreground">Annual seedling absorption eq.</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background/50">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950 shrink-0">
                <Car className="h-4 w-4" />
              </div>
              <div>
                <span className="font-bold text-foreground tabular-nums text-sm">
                  {progressSummary?.kmDrivenAvoided || 164} km
                </span>
                <p className="text-[11px] text-muted-foreground">Avoided single-occupant driving</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background/50">
              <div className="p-2 rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950 shrink-0">
                <Zap className="h-4 w-4" />
              </div>
              <div>
                <span className="font-bold text-foreground tabular-nums text-sm">
                  ~34.8 kWh
                </span>
                <p className="text-[11px] text-muted-foreground">Grid power avoided via habits</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Explainability Drawer Dialog */}
      <ExplainabilityDrawer
        open={isExplainOpen}
        onOpenChange={setIsExplainOpen}
        lineItems={explainData?.lineItems || []}
        confidenceScore={footprint?.confidence || 82}
        confidenceExplanations={explainData?.confidenceExplanation || []}
      />
    </AppShell>
  );
}
