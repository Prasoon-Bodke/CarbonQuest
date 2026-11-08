"use client";

import * as React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Progress as ProgressBar } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BasisBadge } from "@/components/badges/BasisBadge";
import { RefreshCw, Target, Flame, Award, Plus, Trash2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { GoalRead, GoalCreate } from "@/types";

export default function GoalsAndImpactPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showNewGoalForm, setShowNewGoalForm] = React.useState(false);
  const [newGoalCategory, setNewGoalCategory] = React.useState<string>("overall");
  const [newGoalReductionPct, setNewGoalReductionPct] = React.useState<number>(15);
  const [newGoalDurationMonths, setNewGoalDurationMonths] = React.useState<number>(3);

  // Fetch live impact summary from backend
  const {
    data: impact,
    isLoading: impactLoading,
    refetch: refetchImpact,
    isFetching: isFetchingImpact,
  } = useQuery({
    queryKey: ["impact", "summary"],
    queryFn: () => api.impact.summary(),
    staleTime: 60 * 1000,
  });

  // Fetch user profile for monthly target
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: () => api.profile.get(),
    staleTime: 60 * 1000,
  });

  // Fetch rewards summary for streak & points
  const { data: rewards } = useQuery({
    queryKey: ["rewards", "summary"],
    queryFn: () => api.rewards.summary(),
    staleTime: 60 * 1000,
  });

  // Fetch user goals
  const {
    data: goals = [],
    isLoading: goalsLoading,
    refetch: refetchGoals,
  } = useQuery({
    queryKey: ["goals", "list"],
    queryFn: () => api.goals.list(),
    staleTime: 60 * 1000,
  });

  // Create goal mutation
  const createGoalMutation = useMutation({
    mutationFn: (newGoal: GoalCreate) => api.goals.create(newGoal),
    onSuccess: () => {
      toast({
        title: "Goal Created",
        description: `Set target of ${newGoalReductionPct}% reduction!`,
        variant: "success",
      });
      setShowNewGoalForm(false);
      queryClient.invalidateQueries({ queryKey: ["goals", "list"] });
    },
    onError: (err: any) => {
      toast({
        title: "Failed to create goal",
        description: err instanceof ApiError ? err.message : "Error saving goal",
        variant: "destructive",
      });
    },
  });

  // Delete goal mutation
  const deleteGoalMutation = useMutation({
    mutationFn: (goalId: string) => api.goals.delete(goalId),
    onSuccess: () => {
      toast({
        title: "Goal Removed",
        description: "Target has been deleted.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["goals", "list"] });
    },
  });

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const today = new Date();
    const endDate = new Date();
    endDate.setMonth(today.getMonth() + newGoalDurationMonths);

    createGoalMutation.mutate({
      goal_type: "reduction_pct",
      target_value: newGoalReductionPct,
      category: newGoalCategory === "overall" ? null : newGoalCategory,
      start_date: today.toISOString().split("T")[0],
      end_date: endDate.toISOString().split("T")[0],
    });
  };

  const estimatedSavingsKg = impact?.estimated?.saving_kg_month ?? 0;
  const targetKg = profile?.monthly_target_kg ?? 100;
  const achievedPct = targetKg > 0 ? Math.min(100, Math.round((estimatedSavingsKg / targetKg) * 100)) : 0;
  const loggingStreakDays = rewards?.streaks?.["logging"]?.current ?? 0;
  const totalPoints = rewards?.points_balance ?? 0;

  return (
    <AppShell>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Goals & Environmental Impact</h1>
            <p className="text-sm text-muted-foreground">
              Monitor your cumulative carbon reduction against personal climate targets.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchImpact();
                refetchGoals();
              }}
              disabled={isFetchingImpact}
            >
              <RefreshCw className={`h-4 w-4 mr-1.5 ${isFetchingImpact ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => setShowNewGoalForm(!showNewGoalForm)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              New Goal
            </Button>
          </div>
        </div>

        {/* Create Goal Form */}
        {showNewGoalForm && (
          <Card className="border-emerald-500/40 bg-emerald-50/20 dark:bg-emerald-950/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Define Carbon Reduction Goal</CardTitle>
              <CardDescription>
                Commit to a quantified percentage reduction over the upcoming months.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateGoal} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">Target Category</label>
                  <Select value={newGoalCategory} onValueChange={setNewGoalCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="overall">Overall Footprint</SelectItem>
                      <SelectItem value="transport">Transport</SelectItem>
                      <SelectItem value="electricity">Electricity</SelectItem>
                      <SelectItem value="food">Food & Diet</SelectItem>
                      <SelectItem value="shopping">Shopping</SelectItem>
                      <SelectItem value="waste">Waste</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">
                    Reduction Target (%)
                  </label>
                  <Input
                    type="number"
                    min={5}
                    max={80}
                    value={newGoalReductionPct}
                    onChange={(e) => setNewGoalReductionPct(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">Duration</label>
                  <Select
                    value={String(newGoalDurationMonths)}
                    onValueChange={(v) => setNewGoalDurationMonths(Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Months" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Month</SelectItem>
                      <SelectItem value="3">3 Months</SelectItem>
                      <SelectItem value="6">6 Months</SelectItem>
                      <SelectItem value="12">1 Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-3 flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowNewGoalForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={createGoalMutation.isPending}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {createGoalMutation.isPending ? "Creating..." : "Save Goal"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Top Impact Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription>Monthly Savings</CardDescription>
                <BasisBadge basis={impact?.estimated?.basis || "estimated"} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tabular-nums text-foreground">
                -{estimatedSavingsKg.toFixed(1)} kg
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Goal: {targetKg} kg CO₂e/mo ({impact?.estimated?.accepted_actions ?? 0} active actions)
              </p>
              <ProgressBar value={achievedPct} className="mt-3 h-2" />
              <p className="text-[11px] text-muted-foreground mt-1.5">
                {achievedPct}% of monthly target achieved
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription>Logging Streak</CardDescription>
                <Flame className="h-4 w-4 text-orange-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tabular-nums text-foreground">
                {loggingStreakDays}{" "}
                <span className="text-base font-normal text-muted-foreground">days</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Consistent habits multiply eco-points & accuracy
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription>Eco-Points Earned</CardDescription>
                <Award className="h-4 w-4 text-amber-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tabular-nums text-foreground">
                {totalPoints}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Redeemable for community badges & sustainability milestones
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Active Targets List */}
        <Card>
          <CardHeader>
            <CardTitle>Active Reduction Goals</CardTitle>
            <CardDescription>
              Custom reduction commitments configured for your profile.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {goalsLoading ? (
              <p className="text-sm text-muted-foreground">Loading active targets...</p>
            ) : goals.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                <p>No active custom goals configured yet.</p>
                <p className="text-xs mt-1">
                  Click "New Goal" above to commit to a 10%–20% carbon reduction milestone!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {goals.map((goal) => (
                  <div
                    key={goal.id}
                    className="flex items-center justify-between p-3.5 rounded-lg border border-border bg-card"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm capitalize">
                          {goal.category ? `${goal.category} Reduction` : "Overall Carbon Reduction"}
                        </span>
                        <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-500/30">
                          {goal.target_value}% Target
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {goal.start_date} to {goal.end_date} • Status: {goal.status}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteGoalMutation.mutate(goal.id)}
                      className="text-muted-foreground hover:text-destructive h-8 w-8 p-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
