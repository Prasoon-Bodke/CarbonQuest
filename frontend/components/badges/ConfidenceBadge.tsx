"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldAlert, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ConfidenceBadgeProps {
  confidence: number; // 0.0 - 1.0
  className?: string;
}

export function ConfidenceBadge({ confidence, className }: ConfidenceBadgeProps) {
  // Plan rule: label low < 0.4, medium 0.4-0.7, high > 0.7
  let label = "Medium";
  let colorClass = "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30";
  let Icon = Shield;

  if (confidence > 0.7) {
    label = "High Confidence";
    colorClass = "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
    Icon = ShieldCheck;
  } else if (confidence < 0.4) {
    label = "Low Confidence";
    colorClass = "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30";
    Icon = ShieldAlert;
  } else {
    label = "Medium Confidence";
    colorClass = "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30";
    Icon = Shield;
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium inline-flex items-center gap-1 text-[11px] px-2 py-0.5",
        colorClass,
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {label} ({Math.round(confidence * 100)}%)
    </Badge>
  );
}
