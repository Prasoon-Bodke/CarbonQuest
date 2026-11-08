"use client";

import * as React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Download, Info, ShieldCheck, Calendar, Activity as ActivityIcon } from "lucide-react";
import { FootprintDonut } from "@/components/charts/FootprintDonut";
import { ConfidenceMeter } from "@/components/carbon/ConfidenceMeter";
import { BasisBadge } from "@/components/badges/BasisBadge";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  transport: { label: "Transport", color: "#2563eb" },
  electricity: { label: "Electricity", color: "#d97706" },
  food: { label: "Food & Diet", color: "#059669" },
  shopping: { label: "Shopping", color: "#7c3aed" },
  waste: { label: "Waste", color: "#db2777" },
};

export default function FootprintPage() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["footprint", "summary", "full"],
    queryFn: () => api.footprint.summary({ period: "month" }),
    staleTime: 60 * 1000,
  });

  const totalKg = data?.total_kg_co2e ?? 0;
  const confidenceScore = Math.round((data?.confidence ?? 0.8) * 100);
  const confidenceRating =
    confidenceScore >= 80 ? "high" : confidenceScore >= 60 ? "medium" : "low";

  const categories = data?.by_category ?? [];

  const donut = categories.map((c) => ({
    name: CATEGORY_META[c.category]?.label || c.category,
    category: c.category,
    value: c.kg_co2e,
    percentage: c.share_pct,
    color: CATEGORY_META[c.category]?.color || "#6b7280",
  }));

  const handleExport = () => {
    if (!categories.length) return;
    const rows = ["Category,Total CO2e (kg),Percentage (%),Basis"];
    categories.forEach((c) => {
      rows.push(
        `"${CATEGORY_META[c.category]?.label || c.category}",${c.kg_co2e},${c.share_pct.toFixed(1)}%,"${data?.basis || "estimated"}"`
      );
    });
    rows.push(`"Total",${totalKg},100%,"${data?.basis || "estimated"}"`);

    const csvContent = rows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `carbonquest_audit_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Carbon Footprint Audit</h1>
            <p className="text-sm text-muted-foreground">
              Audited 30-day emissions breakdown powered by verified India emission factors.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={`h-4 w-4 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={isLoading || !categories.length}
            >
              <Download className="h-4 w-4 mr-1.5" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription>Total Emissions</CardDescription>
                <BasisBadge basis={(data?.basis as any) || "estimated"} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tabular-nums">
                {isLoading ? "..." : `${totalKg.toFixed(1)} kg`}
              </div>
              <p className="text-xs text-muted-foreground mt-1">CO₂e over active 30-day baseline</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Calculation Confidence</CardDescription>
            </CardHeader>
            <CardContent>
              <ConfidenceMeter score={confidenceScore} rating={confidenceRating} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Audit Details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-foreground">
                <ActivityIcon className="h-4 w-4 text-emerald-600" />
                <span>{data?.activity_count ?? 0} activities audited</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span>
                  Period: {data?.period_start ?? "—"} to {data?.period_end ?? "—"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Category Breakdown Donut */}
        <Card>
          <CardHeader>
            <CardTitle>Category Breakdown</CardTitle>
            <CardDescription>
              Proportional distribution of carbon emissions across lifestyle sectors.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                Loading footprint breakdown...
              </div>
            ) : categories.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-muted-foreground text-sm">
                <p>No activity records logged for this period yet.</p>
                <p className="text-xs mt-1">Log your transportation or electricity usage to generate insights.</p>
              </div>
            ) : (
              <FootprintDonut data={donut} totalKg={totalKg} />
            )}
          </CardContent>
        </Card>

        {/* Mathematical Provenance Notice */}
        <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900/40 dark:bg-blue-950/20">
          <CardContent className="pt-4 flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900 dark:text-blue-200 space-y-1">
              <p className="font-semibold">Deterministic Provenance Guarantee</p>
              <p className="text-xs text-blue-800 dark:text-blue-300">
                All carbon numbers are deterministically computed via{" "}
                <code className="bg-blue-100 dark:bg-blue-900 px-1 py-0.5 rounded text-[11px]">
                  kg CO₂e = Activity Quantity × Sourced Emission Factor
                </code>
                . Emission factors are cited from published government benchmarks (CEA Grid Database 2024, MoRTH, ARAI). No LLM hallucination or approximate generative arithmetic is ever used for carbon totals.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
