"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { PriorityScoreBreakdownModal } from "./PriorityScoreBreakdownModal";
import { ScoredRecommendation } from "@/lib/recommendation/scoring";
import {
  Check,
  X,
  Sliders,
  Cpu,
  Sparkles,
  Info,
  DollarSign,
  TrendingDown,
  Clock,
  IndianRupee,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";

interface ActionCardProps {
  recommendation: ScoredRecommendation & { userStatus?: string };
  onStatusChange?: () => void;
}

export function ActionCard({ recommendation, onStatusChange }: ActionCardProps) {
  const { toast } = useToast();
  const [isBreakdownOpen, setIsBreakdownOpen] = React.useState(false);
  const [isSkipModalOpen, setIsSkipModalOpen] = React.useState(false);
  const [isModifyOpen, setIsModifyOpen] = React.useState(false);
  const [modifiedMagnitude, setModifiedMagnitude] = React.useState(recommendation.userMagnitude);
  const [isLoading, setIsLoading] = React.useState(false);

  const { template, estimatedKgPerMonth, estimatedCostSavingsInr, priorityScore, scoreBreakdown, rationale, userStatus } =
    recommendation;

  const handleAction = async (action: "accept" | "modify" | "skip" | "complete", reason?: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/actions/${template.slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          reason,
          modifiedMagnitude: action === "modify" ? modifiedMagnitude : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({
          title: `Action ${action === "skip" ? "Skipped" : action === "accept" ? "Added to Plan" : "Updated"}`,
          description: data.message || "Recommendation queue updated.",
          variant: action === "skip" ? "info" : "success",
        });
        setIsSkipModalOpen(false);
        setIsModifyOpen(false);
        if (onStatusChange) onStatusChange();
      } else {
        toast({ title: "Action failed", description: data.error?.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const difficultyColors = {
    easy: "emerald" as const,
    medium: "amber" as const,
    hard: "rose" as const,
  };

  return (
    <>
      <Card className="hover:border-emerald-500/40 hover:shadow-md transition-all overflow-hidden flex flex-col justify-between">
        <CardContent className="p-5 space-y-4">
          {/* Header row: category badge + priority score button */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">
                {template.category}
              </Badge>
              <Badge variant={difficultyColors[template.difficulty]} className="text-[10px] capitalize">
                {template.difficulty}
              </Badge>
            </div>

            <button
              onClick={() => setIsBreakdownOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-50/60 dark:bg-emerald-950/40 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 hover:scale-105 transition-transform"
              title="Click to view transparent priority score formula"
            >
              <Sparkles className="h-3 w-3 text-emerald-600" />
              <span>{priorityScore} pts</span>
            </button>
          </div>

          {/* Action Title and Description */}
          <div>
            <h4 className="font-bold text-sm text-foreground leading-snug">{template.title}</h4>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
              {template.description}
            </p>
          </div>

          {/* Impact & Cost Metrics Pill Box */}
          <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg border border-border/80 bg-muted/30 text-xs">
            <div className="flex items-center gap-1.5">
              <TrendingDown className="h-3.5 w-3.5 text-emerald-600" />
              <span className="font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                -{estimatedKgPerMonth.toFixed(1)} kg
              </span>
              <span className="text-[10px] text-muted-foreground">/mo</span>
            </div>

            <div className="flex items-center gap-1.5">
              <IndianRupee className="h-3.5 w-3.5 text-amber-600" />
              <span className="font-bold text-foreground tabular-nums">
                ₹{estimatedCostSavingsInr}
              </span>
              <span className="text-[10px] text-muted-foreground">/mo save</span>
            </div>
          </div>

          {/* Rationale pill */}
          <div className="text-[11px] text-muted-foreground bg-background/60 p-2 rounded border border-border/50">
            <strong>Why now:</strong> {rationale}
          </div>

          {/* Inline Modify Drawer if toggled */}
          {isModifyOpen && (
            <div className="p-3 rounded-lg border border-border bg-card space-y-2 text-xs">
              <span className="font-semibold text-foreground">Adjust Target Magnitude:</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={modifiedMagnitude}
                  onChange={(e) => setModifiedMagnitude(Number(e.target.value))}
                  min={1}
                  max={7}
                  className="w-16 rounded border border-input px-2 py-1 text-center font-bold"
                />
                <span className="text-muted-foreground">{template.unit}</span>
                <Button
                  size="sm"
                  className="ml-auto h-7 text-xs bg-emerald-600 text-white"
                  onClick={() => handleAction("modify")}
                  disabled={isLoading}
                >
                  Save & Accept
                </Button>
              </div>
            </div>
          )}

          {/* Action Buttons Row */}
          <div className="flex items-center gap-2 pt-2 border-t border-border/80">
            {userStatus === "accepted" ? (
              <Button
                size="sm"
                className="w-full bg-emerald-600 text-white gap-1.5 text-xs h-8"
                onClick={() => handleAction("complete")}
                disabled={isLoading}
              >
                <Check className="h-3.5 w-3.5" />
                Mark Habit Done (+50 pts)
              </Button>
            ) : (
              <>
                <Button
                  size="sm"
                  className="flex-1 bg-primary text-primary-foreground text-xs h-8 gap-1 shadow-sm"
                  onClick={() => handleAction("accept")}
                  disabled={isLoading}
                >
                  <Check className="h-3.5 w-3.5" />
                  Accept Plan
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-2.5 text-xs"
                  onClick={() => setIsModifyOpen(!isModifyOpen)}
                  title="Customize frequency or magnitude"
                >
                  <Sliders className="h-3.5 w-3.5" />
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-2.5 text-xs text-muted-foreground hover:text-rose-600"
                  onClick={() => setIsSkipModalOpen(true)}
                  title="Skip action with feedback reason"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>

                <Button asChild size="sm" variant="ghost" className="h-8 px-2.5 text-xs text-blue-600" title="Simulate this behavior shift">
                  <Link href={`/simulator?type=${template.changeType}&mag=${recommendation.userMagnitude}`}>
                    <Cpu className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Priority Score Breakdown Modal */}
      <PriorityScoreBreakdownModal
        open={isBreakdownOpen}
        onOpenChange={setIsBreakdownOpen}
        title={template.title}
        scoreBreakdown={scoreBreakdown}
        rationale={rationale}
      />

      {/* Skip with Reason Feedback Modal (Mandatory Closed-Loop Requirement) */}
      <Dialog open={isSkipModalOpen} onOpenChange={setIsSkipModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Help Us Adapt Your Plan</DialogTitle>
            <DialogDescription className="text-xs">
              Why are you skipping &quot;{template.title}&quot;? We use your reason to train future recommendations.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 pt-2">
            {[
              { key: "not_practical", label: "Not practical for my daily routine" },
              { key: "too_costly", label: "Requires too much budget/investment" },
              { key: "already_doing", label: "I am already doing this habit" },
              { key: "not_interested", label: "Not interested right now" },
              { key: "other", label: "Other reason" },
            ].map((reason) => (
              <Button
                key={reason.key}
                variant="outline"
                className="w-full justify-start text-xs h-9 hover:bg-muted"
                onClick={() => handleAction("skip", reason.key)}
                disabled={isLoading}
              >
                {reason.label}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
