"use client";

import * as React from "react";
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface TrendDataPoint {
  month: string;
  actualKg: number;
  goalPathKg?: number;
  projectedIfPlanFollowed?: number;
}

interface TrendAreaChartProps {
  data: TrendDataPoint[];
}

export function TrendAreaChart({ data }: TrendAreaChartProps) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="projectedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
          <XAxis
            dataKey="month"
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
                return (
                  <div className="rounded-lg border border-border bg-card p-3 shadow-md text-xs space-y-1">
                    <p className="font-semibold text-foreground">{label}</p>
                    {payload.map((entry, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-4">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: entry.color }}
                          />
                          {entry.name}:
                        </span>
                        <span className="font-bold text-foreground tabular-nums">
                          {Number(entry.value).toFixed(1)} kg
                        </span>
                      </div>
                    ))}
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
          <Area
            type="monotone"
            dataKey="actualKg"
            name="Actual Footprint"
            stroke="#10b981"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#actualGradient)"
          />
          <Line
            type="monotone"
            dataKey="goalPathKg"
            name="Goal Trajectory (-20%)"
            stroke="#f59e0b"
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={false}
          />
          <Area
            type="monotone"
            dataKey="projectedIfPlanFollowed"
            name="Projected (Plan Followed)"
            stroke="#3b82f6"
            strokeWidth={1.5}
            strokeDasharray="2 2"
            fillOpacity={1}
            fill="url(#projectedGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
