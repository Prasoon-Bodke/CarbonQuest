"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Calculator } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BasisBadgeProps {
  basis: "estimated" | "measured" | string;
  className?: string;
}

export function BasisBadge({ basis, className }: BasisBadgeProps) {
  const isMeasured = basis.toLowerCase() === "measured";

  if (isMeasured) {
    return (
      <Badge
        variant="outline"
        className={cn(
          "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-medium inline-flex items-center gap-1 text-[11px] px-2 py-0.5",
          className
        )}
      >
        <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
        Measured
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 font-medium inline-flex items-center gap-1 text-[11px] px-2 py-0.5",
        className
      )}
    >
      <Calculator className="h-3 w-3 text-amber-600 dark:text-amber-400" />
      Estimated
    </Badge>
  );
}
