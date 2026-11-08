import * as React from "react";
import { ShieldCheck, HelpCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ConfidenceMeterProps {
  score: number; // 0 - 100
  rating?: "low" | "medium" | "high";
  onOpenExplainability?: () => void;
}

export function ConfidenceMeter({ score, rating = "high", onOpenExplainability }: ConfidenceMeterProps) {
  const isHigh = score >= 80;
  const isMedium = score >= 60 && score < 80;

  return (
    <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-card">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "p-2 rounded-lg shrink-0",
            isHigh && "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
            isMedium && "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
            !isHigh && !isMedium && "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
          )}
        >
          <ShieldCheck className="h-4 w-4" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground">
              Calculation Confidence: <strong className="tabular-nums">{score}%</strong>
            </span>
            <span
              className={cn(
                "rounded px-1.5 py-0.2 text-[10px] font-bold uppercase",
                isHigh && "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300",
                isMedium && "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300",
                !isHigh && !isMedium && "bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300"
              )}
            >
              {rating}
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground">
            Audited against CEA Grid Database & ARAI transport factors
          </span>
        </div>
      </div>

      {onOpenExplainability && (
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenExplainability}
          className="h-7 text-xs gap-1.5 shrink-0"
        >
          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
          Explain Math
        </Button>
      )}
    </div>
  );
}
