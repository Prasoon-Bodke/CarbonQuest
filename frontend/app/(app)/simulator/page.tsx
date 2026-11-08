"use client";

import * as React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BasisBadge } from "@/components/badges/BasisBadge";
import { ConfidenceBadge } from "@/components/badges/ConfidenceBadge";
import { BeforeAfterBars } from "@/components/charts/BeforeAfterBars";
import {
  Cpu,
  RotateCcw,
  Sparkles,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  History,
  Save,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface SimulationScenario {
  label: string;
  change_type: string;
  activity_key: string;
  params: Record<string, unknown>;
}

interface ScenarioResult {
  label: string;
  projected_kg_month: number;
  saving_kg_month: number;
  saving_pct: number;
  confidence: number;
  feasibility: { difficulty: number; cost_level: number };
  assumptions: Array<{ key: string; label: string; value: number; unit: string; source: string }>;
}

interface SimulationResponse {
  id: string;
  baseline_kg_month: number;
  results: ScenarioResult[];
}

interface SimulationHistoryItem {
  id: string;
  scenarios: SimulationScenario[];
  baseline_kg_month: number;
  projected_kg_month: number;
  saving_kg_month: number;
  basis: string;
  confidence: number;
  created_at: string;
}

const initialScenarios: SimulationScenario[] = [
  {
    label: "Reduce AC Hours",
    change_type: "reduce_quantity",
    activity_key: "electricity.ac_hours",
    params: { delta_per_day: 1, ac_power_kw: 1.5 },
  },
  {
    label: "Shift to Bus Transit",
    change_type: "shift_mode",
    activity_key: "transport.bus_km",
    params: { shift_auto_to_bus: true, trips_per_week: 2, trip_distance_km: 10 },
  },
];

export default function SimulatorPage() {
  const [scenarios, setScenarios] = useState<SimulationScenario[]>(initialScenarios);
  const [results, setResults] = useState<ScenarioResult[]>([]);
  const [baselineKg, setBaselineKg] = useState<number | null>(null);
  const [simulationId, setSimulationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const queryClient = useQueryClient();

  // Fetch user's baseline footprint
  const { data: footprint, isLoading: footprintLoading, error: footprintError } = useQuery({
    queryKey: ["footprint", "summary"],
    queryFn: () => api.footprint.summary(),
    staleTime: 60 * 1000,
  });

  // Fetch simulation history
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ["simulations", "history"],
    queryFn: () => api.simulations.list({ limit: 20 }),
    enabled: showHistory,
    staleTime: 60 * 1000,
  });

  // Update baseline when footprint loads
  React.useEffect(() => {
    if (footprint?.total_kg_co2e !== undefined) {
      setBaselineKg(footprint.total_kg_co2e);
    }
  }, [footprint]);

  // Run simulation mutation
  const runSimulationMutation = useMutation({
    mutationFn: (scenarios: SimulationScenario[]) => api.simulations.project({ scenarios }),
    onSuccess: (data: SimulationResponse) => {
      setResults(data.results || []);
      setBaselineKg(data.baseline_kg_month);
      setSimulationId(data.id);
      setError(null);
      // Invalidate simulation history to include new simulation
      queryClient.invalidateQueries({ queryKey: ["simulations", "history"] });
    },
    onError: (err: any) => {
      setError(err.message || "Simulation failed");
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  const handleRunSimulation = async () => {
    setIsLoading(true);
    setError(null);
    runSimulationMutation.mutate(scenarios);
  };

  // Auto-run simulation when scenarios change (with debounce)
  // The dependency array is intentionally minimal to prevent re-running on state changes
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (!isLoading) {
        handleRunSimulation();
      }
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarios]);

  const totalSavingKg = results.reduce((sum, r) => sum + r.saving_kg_month, 0);
  const projectedKg = baselineKg !== null ? Math.max(0, baselineKg - totalSavingKg) : 0;
  const savingPct = baselineKg && baselineKg > 0 ? Math.round((totalSavingKg / baselineKg) * 1000) / 10 : 0;

  const historyItems: SimulationHistoryItem[] = (historyData as any)?.items || [];

  return (
    <AppShell>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">
                What-If Scenario Simulator
              </h1>
              <BasisBadge basis="estimated" />
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Simulate habit modifications and estimate projected footprint reductions using backend carbon engine.
              {footprintLoading && <span className="ml-2 text-xs text-amber-600">(Loading baseline...)</span>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              disabled={historyLoading}
            >
              <History className={`h-4 w-4 mr-1.5 ${historyLoading ? "animate-spin" : ""}`} />
              {showHistory ? "Hide History" : "Show History"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRunSimulation}
              disabled={isLoading || footprintLoading || baselineKg === null}
            >
              <RotateCcw className={`h-4 w-4 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
              Recalculate
            </Button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 rounded-lg flex items-center gap-2 text-sm">
            <AlertCircle className="h-5 w-5" />
            {error}
            <Button variant="ghost" size="sm" className="ml-auto" onClick={handleRunSimulation}>
              Retry
            </Button>
          </div>
        )}

        {/* Loading Baseline Skeleton */}
        {footprintLoading && baselineKg === null && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Interactive Scenario Levers</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">Reduce AC Hours/Day</span>
                        <Skeleton className="w-20 h-6" />
                      </div>
                      <Skeleton className="h-4 w-full" />
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">Bus Transit Trips/Week</span>
                        <Skeleton className="w-20 h-6" />
                      </div>
                      <Skeleton className="h-4 w-full" />
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div className="space-y-4">
                <Card className="border-primary/30">
                  <CardHeader>
                    <CardTitle className="text-base">Projected Impact</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-32 w-full" />
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        {!footprintLoading && baselineKg !== null && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Controls */}
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Interactive Scenario Levers</CardTitle>
                  <CardDescription>
                    Modify daily routines and view live deterministic projections from the carbon engine.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* AC Reduction */}
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">Reduce AC Hours/Day</span>
                      <span className="font-bold tabular-nums text-primary">
                        {String(scenarios[0].params.delta_per_day)} hrs
                      </span>
                    </div>
                    <Slider
                      min={0}
                      max={5}
                      step={0.5}
                      value={[Number(scenarios[0].params.delta_per_day) || 0]}
                      onValueChange={(val) => {
                        setScenarios(prev => [
                          { ...prev[0], params: { ...prev[0].params, delta_per_day: val[0] } },
                          prev[1],
                        ]);
                      }}
                      disabled={isLoading}
                    />
                    <div className="text-xs text-muted-foreground flex justify-between">
                      <span>0 hrs (No change)</span>
                      <span className="text-emerald-600 font-medium">
                        {results[0]?.saving_kg_month?.toFixed(1) ?? "0"} kg CO₂e/mo
                      </span>
                      <span>5 hrs/day</span>
                    </div>
                  </div>

                  {/* Transit Shift */}
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">Bus Transit Trips/Week</span>
                      <span className="font-bold tabular-nums text-primary">
                        {String(scenarios[1].params.trips_per_week)} trips
                      </span>
                    </div>
                    <Slider
                      min={0}
                      max={7}
                      step={1}
                      value={[Number(scenarios[1].params.trips_per_week) || 0]}
                      onValueChange={(val) => {
                        setScenarios(prev => [
                          prev[0],
                          { ...prev[1], params: { ...prev[1].params, trips_per_week: val[0] } },
                        ]);
                      }}
                      disabled={isLoading}
                    />
                    <div className="text-xs text-muted-foreground flex justify-between">
                      <span>0 trips</span>
                      <span className="text-emerald-600 font-medium">
                        {results[1]?.saving_kg_month?.toFixed(1) ?? "0"} kg CO₂e/mo
                      </span>
                      <span>7 trips/week</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Calculation Assumptions from Backend */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Calculation Assumptions & Sourcing</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-muted-foreground">
                  {results[0]?.assumptions && results[0].assumptions.length > 0 ? (
                    results[0].assumptions.map((assumption, idx) => (
                      <div key={idx} className="flex justify-between py-1 border-b last:border-0">
                        <span>{assumption.label}:</span>
                        <span className="font-mono text-foreground">
                          {assumption.value} {assumption.unit} ({assumption.source})
                        </span>
                      </div>
                    ))
                  ) : (
                    <>
                      <div className="flex justify-between py-1 border-b">
                        <span>AC Rated Power draw:</span>
                        <span className="font-mono text-foreground">1.5 kW (3-Star 1.5 Ton Split)</span>
                      </div>
                      <div className="flex justify-between py-1 border-b">
                        <span>Grid Emission Factor:</span>
                        <span className="font-mono text-foreground">0.82 kg CO₂e/kWh (CEA Grid Factor v19)</span>
                      </div>
                      <div className="flex justify-between py-1 border-b">
                        <span>Bus vs Auto Factor Delta:</span>
                        <span className="font-mono text-foreground">0.038 kg CO₂e/pkm (TERI/ARAI 2023)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Veg to Non-Veg Meal Delta:</span>
                        <span className="font-mono text-foreground">1.37 kg CO₂e/meal (Poore & Nemecek 2018)</span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Results Summary */}
            <div className="space-y-4">
              <Card className="border-primary/30">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Projected Impact</CardTitle>
                    <ConfidenceBadge confidence={results[0]?.confidence ?? 0.82} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Estimated Monthly Savings</div>
                    <div className="text-3xl font-extrabold text-emerald-600 tabular-nums">
                      -{totalSavingKg.toFixed(1)} <span className="text-base font-normal">kg CO₂e</span>
                    </div>
                    <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                      {savingPct}% reduction from baseline
                    </div>
                  </div>

                  <div className="pt-2 border-t space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Current Baseline:</span>
                      <span className="font-semibold tabular-nums">{baselineKg?.toFixed(1) ?? "—"} kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Projected Footprint:</span>
                      <span className="font-semibold tabular-nums text-primary">{projectedKg.toFixed(1)} kg</span>
                    </div>
                  </div>

                  <BeforeAfterBars
                    data={[{
                      category: "Total Monthly",
                      baselineKg: baselineKg ?? 0,
                      projectedKg,
                      diffKg: projectedKg - (baselineKg ?? 0),
                    }]}
                  />

                  {/* Individual Scenario Results */}
                  {results.length > 0 && (
                    <div className="pt-4 border-t space-y-3">
                      <h4 className="text-sm font-semibold">Scenario Breakdown</h4>
                      {results.map((result, idx) => (
                        <div key={idx} className="p-3 bg-muted/30 rounded-lg space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium">{result.label}</span>
                            <Badge variant="outline" className="text-xs">
                              Confidence: {Math.round((result.confidence || 0) * 100)}%
                            </Badge>
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Saving: {result.saving_kg_month.toFixed(1)} kg ({result.saving_pct.toFixed(1)}%)</span>
                            <span>Projected: {result.projected_kg_month.toFixed(1)} kg</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Simulation History */}
              {showHistory && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Simulation History</CardTitle>
                      {historyLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {historyLoading ? (
                      <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                          <Skeleton key={i} className="h-20 w-full" />
                        ))}
                      </div>
                    ) : historyItems.length === 0 ? (
                      <div className="py-8 text-center text-muted-foreground">
                        <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No simulation history yet. Run a simulation to see it here.</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {historyItems.map((item) => (
                          <div
                            key={item.id}
                            className="p-3 bg-muted/30 rounded-lg border hover:border-primary/30 transition-colors cursor-pointer"
                            onClick={() => {
                              // Load this simulation's scenarios
                              setScenarios(item.scenarios);
                              setBaselineKg(item.baseline_kg_month);
                              setResults(item.scenarios.map(s => ({
                                label: s.label,
                                projected_kg_month: item.projected_kg_month,
                                saving_kg_month: item.saving_kg_month,
                                saving_pct: item.baseline_kg_month > 0
                                  ? (item.saving_kg_month / item.baseline_kg_month) * 100
                                  : 0,
                                confidence: item.confidence,
                                feasibility: { difficulty: 2, cost_level: 1 },
                                assumptions: [],
                              })));
                              setShowHistory(false);
                            }}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="font-medium text-sm">
                                  {new Date(item.created_at).toLocaleString()}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {item.scenarios.map(s => s.label).join(", ")}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-semibold text-emerald-600">
                                  -{item.saving_kg_month.toFixed(1)} kg
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {((item.saving_kg_month / Math.max(1, item.baseline_kg_month)) * 100).toFixed(1)}%
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}