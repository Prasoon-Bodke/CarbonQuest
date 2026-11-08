"use client";

import * as React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Button } from "@/components/ui/button";
import { Table, Eye } from "lucide-react";

interface CategorySlice {
  name: string;
  category: string;
  value: number; // in kg
  percentage: number;
  color: string;
}

interface FootprintDonutProps {
  data: CategorySlice[];
  totalKg: number;
  onSliceClick?: (category: string) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  transport: "#2563eb",
  electricity: "#d97706",
  food: "#059669",
  shopping: "#7c3aed",
  waste: "#db2777",
};

export function FootprintDonut({ data, totalKg, onSliceClick }: FootprintDonutProps) {
  const [showTable, setShowTable] = React.useState(false);

  const formattedData = data.map((d) => ({
    ...d,
    color: CATEGORY_COLORS[d.category] || d.color || "#10b981",
  }));

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Category Composition
        </h4>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-muted-foreground gap-1.5"
          onClick={() => setShowTable(!showTable)}
        >
          {showTable ? <Eye className="h-3.5 w-3.5" /> : <Table className="h-3.5 w-3.5" />}
          {showTable ? "View Chart" : "Accessible Table"}
        </Button>
      </div>

      {!showTable ? (
        <div className="relative h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={formattedData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={95}
                paddingAngle={3}
                onClick={(entry) => onSliceClick && onSliceClick(entry.category)}
                cursor="pointer"
              >
                {formattedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload as CategorySlice;
                    return (
                      <div className="rounded-lg border border-border bg-card p-2.5 shadow-md text-xs">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: d.color }}
                          />
                          <span className="font-semibold text-foreground">{d.name}</span>
                        </div>
                        <div className="mt-1 text-muted-foreground">
                          <span className="font-bold text-foreground tabular-nums">
                            {d.value.toFixed(1)} kg
                          </span>{" "}
                          ({d.percentage.toFixed(1)}%)
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Centered Total Metrics */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-bold text-foreground tabular-nums">
              {totalKg.toFixed(1)}
            </span>
            <span className="text-[11px] font-medium text-muted-foreground">kg CO₂e/mo</span>
          </div>
        </div>
      ) : (
        /* Accessible Table Alternative */
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="p-2.5">Category</th>
                <th className="p-2.5 text-right">Emissions (kg CO₂e)</th>
                <th className="p-2.5 text-right">Share (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {formattedData.map((row) => (
                <tr key={row.category} className="hover:bg-muted/30">
                  <td className="p-2.5 flex items-center gap-2 font-medium">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: row.color }}
                    />
                    {row.name}
                  </td>
                  <td className="p-2.5 text-right font-bold tabular-nums">
                    {row.value.toFixed(1)}
                  </td>
                  <td className="p-2.5 text-right tabular-nums text-muted-foreground">
                    {row.percentage.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Category Legend Pill Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
        {formattedData.map((d) => (
          <div
            key={d.category}
            onClick={() => onSliceClick && onSliceClick(d.category)}
            className="flex items-center gap-2 p-1.5 rounded-md hover:bg-muted/40 cursor-pointer transition-colors"
          >
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: d.color }}
            />
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-medium text-foreground truncate">{d.name}</span>
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {d.value.toFixed(1)} kg ({d.percentage.toFixed(0)}%)
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
