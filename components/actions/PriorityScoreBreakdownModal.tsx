"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { PriorityScoreBreakdown } from "@/lib/recommendation/scoring";
import { Sparkles, Calculator, Zap, Sliders, ThumbsUp } from "lucide-react";

interface PriorityScoreModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  scoreBreakdown: PriorityScoreBreakdown;
  rationale: string;
}

export function PriorityScoreBreakdownModal({
  open,
  onOpenChange,
  title,
  scoreBreakdown,
  rationale,
}: PriorityScoreModalProps) {
  const { normalizedImpact, preferenceFit, feasibilityAndCost, behaviorAdjustment, weightedTotal, weightsUsed } =
    scoreBreakdown;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              <Sparkles className="h-4 w-4" />
            </div>
            <DialogTitle className="text-base font-bold">
              AI Priority Score Breakdown
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            {title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Headline Score */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20">
            <div>
              <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-300">
                Composite Priority Rank
              </span>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Formula: w₁·Impact + w₂·Pref + w₃·Feas + w₄·Behavior
              </p>
            </div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {weightedTotal}/100
            </div>
          </div>

          {/* Transparent 4 Factor Bars */}
          <div className="space-y-3 text-xs">
            {/* Factor 1: Normalized Impact */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-amber-500" />
                  1. Normalized CO₂ Impact ({weightsUsed.w1_impact * 100}%)
                </span>
                <span className="font-bold tabular-nums">{normalizedImpact}/100</span>
              </div>
              <Progress value={normalizedImpact} indicatorColor="bg-amber-500" />
            </div>

            {/* Factor 2: Preference Fit */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <ThumbsUp className="h-3.5 w-3.5 text-blue-500" />
                  2. User Preference Fit ({weightsUsed.w2_preference * 100}%)
                </span>
                <span className="font-bold tabular-nums">{preferenceFit}/100</span>
              </div>
              <Progress value={preferenceFit} indicatorColor="bg-blue-500" />
            </div>

            {/* Factor 3: Feasibility & Cost */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-emerald-500" />
                  3. Feasibility & Financial Cost ({weightsUsed.w3_feasibility * 100}%)
                </span>
                <span className="font-bold tabular-nums">{feasibilityAndCost}/100</span>
              </div>
              <Progress value={feasibilityAndCost} indicatorColor="bg-emerald-500" />
            </div>

            {/* Factor 4: Behavior Adjustment */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                  4. Past Behavior Adjustment ({weightsUsed.w4_behavior * 100}%)
                </span>
                <span className="font-bold tabular-nums font-mono">
                  {behaviorAdjustment >= 0 ? `+${behaviorAdjustment}` : behaviorAdjustment} pts
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Learned from accepted/completed actions and skip reasons.
              </p>
            </div>
          </div>

          {/* Adaptive Rationale Text */}
          <div className="p-3 rounded-lg border border-border bg-muted/40 text-xs space-y-1">
            <span className="font-semibold text-foreground">Adaptive Intelligence Rationale:</span>
            <p className="text-muted-foreground leading-relaxed">{rationale}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
