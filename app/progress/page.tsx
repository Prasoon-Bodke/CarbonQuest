"use client";

import * as React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress as ProgressBar } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/toast";

interface ProgressSummary {
  totalSavingKg: number;
  targetKg: number;
  achievedPercent: number;
  streakDays: number;
  points: number;
  trends: { month: string; value: number }[];
}

export default function ProgressPage() {
  const [summary, setSummary] = React.useState<ProgressSummary | null>(null);
  const [loading, setLoading] = React.useState(true);
  const { toast } = useToast();

  const load = React.useCallback(() => {
    setLoading(true);
    fetch("/api/progress/summary")
      .then((r) => r.json())
      .then((json) => setSummary(json))
      .catch(() => setSummary(getMock()))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  if (loading || !summary) {
    return (
      <AppShell>
        <div className="p-6 max-w-4xl mx-auto space-y-4">
          <Card><CardContent className="pt-6"><div className="h-6 w-1/3 bg-muted rounded" /></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="h-6 w-2/3 bg-muted rounded" /></CardContent></Card>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Progress & Impact</h1>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-1.5" /> Refresh
          </Button>
        </div>

        {/* Monthly Savings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Monthly Savings</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-3xl font-bold tabular-nums text-foreground">
              -{summary.totalSavingKg.toFixed(1)} kg CO₂e/mo
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Target: {summary.targetKg} kg CO₂e/mo
            </p>
            <ProgressBar value={summary.achievedPercent} className="mt-2 h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {summary.achievedPercent.toFixed(0)}% of target achieved
            </p>
          </CardContent>
        </Card>

        {/* Streak & Points */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Streak & Points</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 flex gap-8">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Streak</p>
              <p className="text-2xl font-bold tabular-nums text-foreground">{summary.streakDays} days</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Points</p>
              <p className="text-2xl font-bold tabular-nums text-foreground">{summary.points}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function getMock(): ProgressSummary {
  return {
    totalSavingKg: 12.4,
    targetKg: 20,
    achievedPercent: 62,
    streakDays: 14,
    points: 845,
    trends: [
      { month: "Jan", value: 10 },
      { month: "Feb", value: 9 },
      { month: "Mar", value: 11 },
    ],
  };
}
