import * as React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, AlertTriangle, Flame, ShieldAlert } from "lucide-react";

export interface HotspotItem {
  id?: string;
  rank: number;
  category: string;
  lineItem: string;
  kg: number;
  percent: number;
  severity: "high" | "medium" | "low" | string;
}

interface HotspotRankListProps {
  hotspots: HotspotItem[];
  onSelectCategory?: (category: string) => void;
}

export function HotspotRankList({ hotspots, onSelectCategory }: HotspotRankListProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Flame className="h-4 w-4 text-rose-500" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Top Carbon Hotspots
          </h4>
        </div>
        <Button asChild variant="ghost" size="sm" className="h-7 text-xs text-emerald-600 gap-1">
          <Link href="/actions">
            Target Hotspots <ArrowRight className="h-3 w-3" />
          </Link>
        </Button>
      </div>

      <div className="space-y-2">
        {hotspots.map((item) => {
          const isHigh = item.severity === "high" || item.rank <= 2;
          const isMedium = item.severity === "medium";

          return (
            <div
              key={item.rank}
              onClick={() => onSelectCategory && onSelectCategory(item.category)}
              className="group flex items-center justify-between p-3 rounded-xl border border-border/70 bg-card hover:border-emerald-500/40 hover:bg-muted/30 cursor-pointer transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-bold text-foreground font-mono">
                  #{item.rank}
                </span>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-foreground group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                    {item.lineItem}
                  </span>
                  <span className="text-[10px] text-muted-foreground uppercase font-medium">
                    {item.category}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-xs font-bold text-foreground tabular-nums">
                    {item.kg.toFixed(1)} kg
                  </span>
                  <span className="text-[10px] text-muted-foreground ml-1 tabular-nums">
                    ({item.percent.toFixed(1)}%)
                  </span>
                </div>
                <Badge
                  variant={isHigh ? "rose" : isMedium ? "amber" : "outline"}
                  className="text-[10px] uppercase font-mono px-2 py-0.5"
                >
                  {isHigh ? "Hotspot" : isMedium ? "Medium" : "Normal"}
                </Badge>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
