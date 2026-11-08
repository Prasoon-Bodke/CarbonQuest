"use client";

import * as React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Award,
  Flame,
  Trophy,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  Lock,
  Leaf,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

export default function RewardsPage() {
  const [activeTab, setActiveTab] = React.useState<"badges" | "leaderboard">("badges");

  // Load reward summary
  const {
    data: summary,
    isLoading: summaryLoading,
    refetch: refetchSummary,
    isFetching: isFetchingSummary,
  } = useQuery({
    queryKey: ["rewards", "summary"],
    queryFn: () => api.rewards.summary(),
    staleTime: 60 * 1000,
  });

  // Load community leaderboard
  const {
    data: leaderboardData,
    isLoading: leaderboardLoading,
    refetch: refetchLeaderboard,
  } = useQuery({
    queryKey: ["rewards", "leaderboard"],
    queryFn: () => api.rewards.leaderboard(),
    staleTime: 60 * 1000,
  });

  const streaks = summary?.streaks || {};
  const loggingStreak = streaks["logging"] || { current: 0, longest: 0 };
  const actionStreak = streaks["action_completion"] || { current: 0, longest: 0 };
  const badges = summary?.badges || [];

  const leaderboard = (leaderboardData as any)?.leaderboard || [];

  return (
    <AppShell>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Eco-Rewards & Recognition</h1>
            <p className="text-sm text-muted-foreground">
              Earn points, unlock verifiable sustainability badges, and track community leadership.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchSummary();
              refetchLeaderboard();
            }}
            disabled={isFetchingSummary}
          >
            <RefreshCw className={`h-4 w-4 mr-1.5 ${isFetchingSummary ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Top Points & Eco Score Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-emerald-500/10 via-card to-card border-emerald-500/30">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription>Eco-Score</CardDescription>
                <Leaf className="h-4 w-4 text-emerald-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tabular-nums text-foreground">
                {summary?.eco_score ?? 0}
                <span className="text-sm font-normal text-muted-foreground ml-1">/ 1000</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Composite audited climate index</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500/10 via-card to-card border-amber-500/30">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription>Points Balance</CardDescription>
                <Sparkles className="h-4 w-4 text-amber-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tabular-nums text-foreground">
                {summary?.points_balance ?? 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Earned via verified carbon reduction</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500/10 via-card to-card border-orange-500/30">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription>Logging Streak</CardDescription>
                <Flame className="h-4 w-4 text-orange-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tabular-nums text-foreground">
                {loggingStreak.current}{" "}
                <span className="text-sm font-normal text-muted-foreground">days</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Personal best: {loggingStreak.longest} days
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tab Selection: Badges vs Leaderboard */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full sm:w-80 grid-cols-2">
            <TabsTrigger value="badges">Badges ({badges.length})</TabsTrigger>
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          </TabsList>

          {/* Badges Tab */}
          <TabsContent value="badges" className="space-y-4 pt-4">
            {summaryLoading ? (
              <div className="py-12 text-center text-sm text-muted-foreground">Loading badges...</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {badges.map((badge: any) => {
                  const isEarned = Boolean(badge.awarded_at);
                  return (
                    <Card
                      key={badge.id || badge.key}
                      className={
                        isEarned
                          ? "border-emerald-500/40 bg-emerald-50/10 dark:bg-emerald-950/10"
                          : "opacity-60 bg-muted/20 border-dashed"
                      }
                    >
                      <CardContent className="pt-6 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="text-3xl">{badge.icon || "🌱"}</div>
                          {isEarned ? (
                            <Badge
                              variant="outline"
                              className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/30 flex items-center gap-1"
                            >
                              <CheckCircle2 className="h-3 w-3" /> Earned
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs flex items-center gap-1">
                              <Lock className="h-3 w-3" /> Locked
                            </Badge>
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm text-foreground">{badge.title}</h3>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {badge.description}
                          </p>
                        </div>
                        {isEarned && (
                          <div className="text-[11px] text-muted-foreground pt-1 border-t border-border/50">
                            Unlocked {new Date(badge.awarded_at).toLocaleDateString()}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard" className="pt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-amber-500" /> Regional Sustainability Leaderboard
                </CardTitle>
                <CardDescription>
                  Anonymous community benchmark of verified CO₂ avoided and active eco-scores.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {leaderboardLoading ? (
                  <div className="py-12 text-center text-sm text-muted-foreground">
                    Loading leaderboard...
                  </div>
                ) : leaderboard.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    Leaderboard rankings will appear as members log activities.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {leaderboard.map((item: any, idx: number) => {
                      const rank = item.rank || idx + 1;
                      const isTop3 = rank <= 3;
                      return (
                        <div
                          key={idx}
                          className={`flex items-center justify-between p-3.5 rounded-lg border ${
                            isTop3
                              ? "bg-amber-50/20 dark:bg-amber-950/10 border-amber-500/30"
                              : "bg-card border-border"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`w-6 text-center font-bold text-sm ${
                                rank === 1
                                  ? "text-amber-500"
                                  : rank === 2
                                  ? "text-slate-400"
                                  : rank === 3
                                  ? "text-amber-700"
                                  : "text-muted-foreground"
                              }`}
                            >
                              #{rank}
                            </span>
                            <div>
                              <p className="font-semibold text-sm text-foreground">
                                {item.display_name || `EcoExplorer #${rank}`}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Avoided: {item.co2_avoided_kg?.toFixed(1) ?? 0} kg CO₂e
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                              {item.eco_score ?? item.points ?? 0} pts
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
