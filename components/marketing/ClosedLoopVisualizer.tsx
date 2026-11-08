import * as React from "react";
import { Radio, ShieldCheck, PieChart, Sparkles, Cpu, CheckCircle2, RotateCw } from "lucide-react";

const STEPS = [
  {
    step: "01",
    name: "Track",
    icon: Radio,
    description: "Capture daily commutes, utility bills, meals, and spending seamlessly.",
  },
  {
    step: "02",
    name: "Validate",
    icon: ShieldCheck,
    description: "Physics telemetry engine verifies velocities & rejects spoofed trips.",
  },
  {
    step: "03",
    name: "Analyze",
    icon: PieChart,
    description: "Activity × Factor calculations reveal hotspots with 100% explainability.",
  },
  {
    step: "04",
    name: "Prioritize",
    icon: Sparkles,
    description: "4-factor scoring matches high impact with your budget & willingness.",
  },
  {
    step: "05",
    name: "Simulate",
    icon: Cpu,
    description: "Test behavior shifts in the What-If engine before committing to a plan.",
  },
  {
    step: "06",
    name: "Adapt",
    icon: RotateCw,
    description: "Skipping cycling due to practicality immediately boosts bus transit.",
  },
];

export function ClosedLoopVisualizer() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
      {STEPS.map((s, idx) => {
        const Icon = s.icon;
        return (
          <div
            key={s.step}
            className="group relative rounded-xl border border-border/80 bg-card p-4 hover:border-emerald-500/50 hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                  {s.step}
                </span>
                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <h4 className="font-bold text-sm text-foreground mt-2">{s.name}</h4>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {s.description}
              </p>
            </div>
            {idx < STEPS.length - 1 && (
              <div className="hidden lg:block absolute -right-2 top-1/2 -translate-y-1/2 z-10 text-muted-foreground/30">
                →
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
