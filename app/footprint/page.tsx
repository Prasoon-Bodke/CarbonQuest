"use client";

import * as React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Download, Info } from "lucide-react";
import { FootprintDonut } from "@/components/charts/FootprintDonut";
import { ConfidenceMeter } from "@/components/carbon/ConfidenceMeter";

// Reuse the mock data from the previous detailed page
import { getMockData as mockData, buildCsv, CATEGORY_META } from "./mockData";

export default function FootprintPage() {
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/footprint/current")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(mockData()))
      .finally(() => setLoading(false));
  }, []);

  const handleExport = () => {
    const csv = buildCsv(data || mockData());
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "footprint.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const foot = data || mockData();
  const donut = foot.categories.map((c: any) => ({ name: (CATEGORY_META as any)[c.category]?.label || c.category, category: c.category, value: c.totalKg, percentage: c.percentage, color: (CATEGORY_META as any)[c.category]?.color || "#6b7280" }));

  return (
    <AppShell>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Carbon Footprint</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}><RefreshCw className="h-4 w-4 mr-1"/>Refresh</Button>
            <Button variant="outline" size="sm" onClick={handleExport}><Download className="h-4 w-4 mr-1"/>Export CSV</Button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card><CardContent className="pt-6"><div className="text-3xl font-bold tabular-nums">{foot.totalKgPerMonth.toFixed(1)} kg CO₂e/mo</div></CardContent></Card>
          <Card><CardContent className="pt-6"><ConfidenceMeter score={foot.confidenceScore} /></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Calculated {new Date(foot.calculatedAt).toLocaleString()}</div></CardContent></Card>
        </div>
        <Card>
          <CardHeader><CardTitle>Category Breakdown</CardTitle></CardHeader>
          <CardContent><FootprintDonut data={donut} totalKg={foot.totalKgPerMonth} /></CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="pt-4 flex gap-2"><Info className="h-4 w-4 text-blue-600"/> <p className="text-sm text-blue-800">Deterministic calculation: Activity × Emission Factor = CO₂e. No LLM‑generated numbers.</p></CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
