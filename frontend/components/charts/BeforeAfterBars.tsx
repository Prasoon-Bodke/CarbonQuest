"use client";

import * as React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface CategoryDiff {
  category: string;
  baselineKg: number;
  projectedKg: number;
  diffKg: number;
}

interface BeforeAfterBarsProps {
  data: CategoryDiff[];
}

export function BeforeAfterBars({ data }: BeforeAfterBarsProps) {
  const formatted = data.map((d) => ({
    ...d,
    categoryName: d.category.charAt(0).toUpperCase() + d.category.slice(1),
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={formatted} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
          <XAxis
            dataKey="categoryName"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            unit=" kg"
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload as CategoryDiff & { categoryName: string };
                return (
                  <div className="rounded-lg border border-border bg-card p-3 shadow-md text-xs space-y-1">
                    <p className="font-semibold text-foreground">{label}</p>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">Current Baseline:</span>
                      <span className="font-bold tabular-nums">{item.baselineKg.toFixed(1)} kg</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-emerald-600 font-semibold">Simulated Plan:</span>
                      <span className="font-bold text-emerald-600 tabular-nums">
                        {item.projectedKg.toFixed(1)} kg
                      </span>
                    </div>
                    <div className="border-t border-border pt-1 flex items-center justify-between gap-4 font-bold text-emerald-700 dark:text-emerald-400">
                      <span>Avoided CO₂:</span>
                      <span className="tabular-nums">-{item.diffKg.toFixed(1)} kg</span>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            wrapperStyle={{ fontSize: "11px", paddingBottom: "10px" }}
          />
          <Bar dataKey="baselineKg" name="Current Baseline" fill="#94a3b8" radius={[4, 4, 0, 0]} />
          <Bar dataKey="projectedKg" name="Simulated Plan" fill="#10b981" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
