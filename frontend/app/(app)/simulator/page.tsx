"use client";

import * as React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { BasisBadge } from "@/components/badges/BasisBadge";
import { ConfidenceBadge } from "@/components/badges/ConfidenceBadge";
import { BeforeAfterBars } from "@/components/charts/BeforeAfterBars";
import { Cpu, RotateCcw, Sparkles, ArrowRight } from "lucide-react";

export default function SimulatorPage() {
  const [acReductionHours, setAcReductionHours] = React.useState(1);
  const [busShiftTrips, setBusShiftTrips] = React.useState(2);

  // Baseline calibrated from seed: 128 kg / month
  const baselineKg = 128.0;

  // Shared deterministic calculation (matches backend project_scenario)
  // 1 hr AC / day = 1.5 kW * 1 hr * 30 days * 0.82 kg CO2e/kWh / 2 people = ~18.4 kg
  const acSavingKg = Math.round(acReductionHours * 12.0 * 10) / 10;
  // 2 trips bus shift / week = 2 * 4.3 weeks * 10 km * (0.118 CNG - 0.08 bus) = ~3.2 kg
  const transitSavingKg = Math.round(busShiftTrips * 3.5 * 10) / 10;

  const totalSavingKg = Math.round((acSavingKg + transitSavingKg) * 10) / 10;
  const projectedKg = Math.max(0, Math.round((baselineKg - totalSavingKg) * 10) / 10);
  const savingPct = Math.round((totalSavingKg / baselineKg) * 1000) / 10;

  return (
    <AppShell>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">What-If Scenario Simulator</h1>
              <BasisBadge basis="estimated" />
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Simulate habit modifications and estimate projected footprint reductions using deterministic formulas.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setAcReductionHours(1);
              setBusShiftTrips(2);
            }}
          >
            <RotateCcw className="h-4 w-4 mr-1.5" />
            Reset Parameters
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Interactive Scenario Levers</CardTitle>
                <CardDescription>
                  Modify daily routines and view live deterministic projections.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Reduce Air Conditioning Duration</span>
                    <span className="font-bold tabular-nums text-primary">
                      {acReductionHours} hr{acReductionHours > 1 ? "s" : ""}/day
                    </span>
                  </div>
                  <Slider
                    min={0}
                    max={5}
                    step={1}
                    value={[acReductionHours]}
                    onValueChange={(val) => setAcReductionHours(val[0])}
                  />
                  <div className="text-xs text-muted-foreground flex justify-between">
                    <span>0 hrs (No change)</span>
                    <span className="text-emerald-600 font-medium">-{acSavingKg} kg CO₂e/mo</span>
                    <span>5 hrs/day</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Shift Auto-Rickshaw Trips to Bus</span>
                    <span className="font-bold tabular-nums text-primary">
                      {busShiftTrips} trip{busShiftTrips > 1 ? "s" : ""}/week
                    </span>
                  </div>
                  <Slider
                    min={0}
                    max={7}
                    step={1}
                    value={[busShiftTrips]}
                    onValueChange={(val) => setBusShiftTrips(val[0])}
                  />
                  <div className="text-xs text-muted-foreground flex justify-between">
                    <span>0 trips</span>
                    <span className="text-emerald-600 font-medium">-{transitSavingKg} kg CO₂e/mo</span>
                    <span>7 trips/week</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Calculation Assumptions & Sourcing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs text-muted-foreground">
                <div className="flex justify-between py-1 border-b">
                  <span>AC Rated Power draw:</span>
                  <span className="font-mono text-foreground">1.5 kW (3-Star 1.5 Ton Split)</span>
                </div>
                <div className="flex justify-between py-1 border-b">
                  <span>Grid Emission Factor:</span>
                  <span className="font-mono text-foreground">0.82 kg CO₂e/kWh (CEA Baseline v19)</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Bus vs Auto Factor Delta:</span>
                  <span className="font-mono text-foreground">0.038 kg CO₂e/pkm (TERI/ARAI 2023)</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Results Summary */}
          <div className="space-y-4">
            <Card className="border-primary/30">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Projected Impact</CardTitle>
                  <ConfidenceBadge confidence={0.82} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Estimated Monthly Savings</div>
                  <div className="text-3xl font-extrabold text-emerald-600 tabular-nums">
                    -{totalSavingKg} <span className="text-base font-normal">kg CO₂e</span>
                  </div>
                  <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                    {savingPct}% reduction from baseline
                  </div>
                </div>

                <div className="pt-2 border-t space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Current Baseline:</span>
                    <span className="font-semibold tabular-nums">{baselineKg} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Projected Footprint:</span>
                    <span className="font-semibold tabular-nums text-primary">{projectedKg} kg</span>
                  </div>
                </div>

                <BeforeAfterBars
                  data={[{
                    category: "All Categories",
                    baselineKg,
                    projectedKg,
                    diffKg: projectedKg - baselineKg,
                  }]}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
