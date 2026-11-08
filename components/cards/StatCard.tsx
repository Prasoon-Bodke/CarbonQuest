import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  delta?: {
    value: number; // e.g. -14.2%
    isPositiveGood?: boolean; // for emissions, reduction (negative) is good!
    label?: string;
  };
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  accentColor?: string;
}

export function StatCard({
  title,
  value,
  unit,
  delta,
  subtitle,
  icon: Icon,
  accentColor = "text-primary",
}: StatCardProps) {
  const isReduction = delta && delta.value < 0;
  const isNeutral = delta && delta.value === 0;

  // For emissions, a negative delta (reduction) is great!
  const isFavorable = delta ? (delta.isPositiveGood ? delta.value > 0 : delta.value < 0) : true;

  return (
    <Card className="relative overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          {Icon && (
            <div className={cn("p-2 rounded-lg bg-muted/60", accentColor)}>
              <Icon className="h-4 w-4" />
            </div>
          )}
        </div>

        <div className="mt-3 flex items-baseline gap-1.5">
          <span className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
            {value}
          </span>
          {unit && <span className="text-xs text-muted-foreground font-medium">{unit}</span>}
        </div>

        {(delta || subtitle) && (
          <div className="mt-2.5 flex items-center gap-2 text-xs">
            {delta && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-medium tabular-nums text-[11px]",
                  isNeutral && "bg-muted text-muted-foreground",
                  !isNeutral && isFavorable && "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400",
                  !isNeutral && !isFavorable && "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400"
                )}
              >
                {isNeutral ? (
                  <Minus className="h-3 w-3" />
                ) : isReduction ? (
                  <ArrowDownRight className="h-3 w-3" />
                ) : (
                  <ArrowUpRight className="h-3 w-3" />
                )}
                {Math.abs(delta.value)}%
              </span>
            )}
            {subtitle && (
              <span className="text-[11px] text-muted-foreground truncate">{subtitle}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
