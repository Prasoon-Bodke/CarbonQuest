"use client";

import * as React from "react";
import Link from "next/link";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Sparkles, Zap, Bus, Salad, TreePine, IndianRupee } from "lucide-react";
import { DEMO_BASELINE_PROFILE, simulateBehaviorChanges, BehaviorChange } from "@/lib/carbon/scenarios";

export function LiveHeroSimulator() {
  const [acReductionHours, setAcReductionHours] = React.useState(1);
  const [transitDays, setTransitDays] = React.useState(2);
  const [plantDays, setPlantDays] = React.useState(2);

  // Compute live deterministic simulation
  const changes: BehaviorChange[] = [
    { category: "electricity", type: "reduce_ac_hours", magnitude: acReductionHours },
    { category: "transport", type: "switch_commute_public_transit", magnitude: transitDays },
    { category: "food", type: "switch_diet_plant_based", magnitude: plantDays },
  ];

  const result = simulateBehaviorChanges(DEMO_BASELINE_PROFILE, changes);

  const treesEq = Math.round((result.absoluteMonthlySavingKg * 12 / 21) * 10) / 10;
  const kmAvoided = Math.round(result.absoluteMonthlySavingKg / 0.174);

  return (
    <Card className="border-emerald-600/30 bg-card/90 shadow-xl backdrop-blur-md overflow-hidden relative">
      <div className="absolute top-0 right-0 px-3 py-1 bg-emerald-600 text-white text-[10px] font-bold rounded-bl-lg tracking-wider uppercase flex items-center gap-1">
        <Sparkles className="h-3 w-3" /> Live Engine Computed
      </div>

      <CardContent className="p-6 md:p-7 space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="emerald" className="text-[11px]">Interactive What-If Demo</Badge>
            <span className="text-xs text-muted-foreground">Adjust sliders to see real Pune CEA Grid impact</span>
          </div>
          <h3 className="text-lg font-bold text-foreground mt-1.5">
            Test a Behavior Shift in Real Time
          </h3>
        </div>

        {/* Sliders Grid */}
        <div className="space-y-4">
          {/* Slider 1: AC Reduction */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <Zap className="h-3.5 w-3.5 text-amber-500" />
                Reduce AC runtime:
              </span>
              <span className="font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                {acReductionHours} hour{acReductionHours === 1 ? "" : "s"}/day
              </span>
            </div>
            <Slider
              value={[acReductionHours]}
              onValueChange={([val]) => setAcReductionHours(val)}
              min={0}
              max={3}
              step={1}
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>0 hrs</span>
              <span>1 hr (~12 kg saved)</span>
              <span>2 hrs</span>
              <span>3 hrs</span>
            </div>
          </div>

          {/* Slider 2: Public Bus/Metro */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <Bus className="h-3.5 w-3.5 text-blue-500" />
                Switch commute to PMPML Bus:
              </span>
              <span className="font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                {transitDays} day{transitDays === 1 ? "" : "s"}/week
              </span>
            </div>
            <Slider
              value={[transitDays]}
              onValueChange={([val]) => setTransitDays(val)}
              min={0}
              max={5}
              step={1}
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>0 days</span>
              <span>2 days (recommended)</span>
              <span>5 days</span>
            </div>
          </div>

          {/* Slider 3: Plant Based Meals */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <Salad className="h-3.5 w-3.5 text-emerald-500" />
                Plant-rich meals:
              </span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {plantDays} day{plantDays === 1 ? "" : "s"}/week
              </span>
            </div>
            <Slider
              value={[plantDays]}
              onValueChange={([val]) => setPlantDays(val)}
              min={0}
              max={7}
              step={1}
            />
          </div>
        </div>

        {/* Live Computed Output Card */}
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-300">
              Projected Monthly Reduction:
            </span>
            <div className="text-right">
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                -{result.absoluteMonthlySavingKg.toFixed(1)}
              </span>
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 ml-1">
                kg CO₂e/mo ({result.percentageSaving.toFixed(1)}%)
              </span>
            </div>
          </div>

          {/* Metrics Equivalence Strip */}
          <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-emerald-200/50 dark:border-emerald-800/40">
            <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
              <IndianRupee className="h-3.5 w-3.5 text-emerald-600" />
              <span>
                Save <strong className="tabular-nums">₹{result.estimatedCostSavingInrMonthly}</strong>/month
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
              <TreePine className="h-3.5 w-3.5 text-emerald-600" />
              <span>
                ≈ <strong className="tabular-nums">{treesEq}</strong> trees/yr offset
              </span>
            </div>
          </div>
        </div>

        {/* Call to action */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <Button asChild className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2 text-xs">
            <Link href="/dashboard">
              View Full Dashboard & Seeded Data
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full text-xs">
            <Link href="/simulator">
              Open Full Multi-Scenario Builder
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
