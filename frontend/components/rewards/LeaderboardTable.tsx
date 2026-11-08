import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Award, Trophy, Medal } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LeaderboardEntryItem {
  id: string;
  rank: number;
  displayName: string;
  city: string;
  group: string;
  ecoScore: number;
  co2AvoidedKg: number;
  points: number;
  optOut: boolean;
}

interface LeaderboardTableProps {
  entries: LeaderboardEntryItem[];
}

export function LeaderboardTable({ entries }: LeaderboardTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full text-left text-xs">
        <thead className="bg-muted/50 text-muted-foreground border-b border-border">
          <tr>
            <th className="p-3 w-14 text-center">Rank</th>
            <th className="p-3">Citizen / Student</th>
            <th className="p-3 hidden sm:table-cell">Campus / Group</th>
            <th className="p-3 text-right">Eco Score</th>
            <th className="p-3 text-right hidden md:table-cell">CO₂ Avoided</th>
            <th className="p-3 text-right">Points</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {entries.map((item, idx) => {
            const isTop3 = idx < 3;
            const isYou = item.displayName.includes("You");

            return (
              <tr
                key={item.id}
                className={cn(
                  "hover:bg-muted/40 transition-colors",
                  isYou && "bg-emerald-50/50 dark:bg-emerald-950/20 font-semibold"
                )}
              >
                <td className="p-3 text-center">
                  {idx === 0 ? (
                    <Trophy className="h-4 w-4 text-amber-500 mx-auto" />
                  ) : idx === 1 ? (
                    <Medal className="h-4 w-4 text-slate-400 mx-auto" />
                  ) : idx === 2 ? (
                    <Medal className="h-4 w-4 text-amber-700 mx-auto" />
                  ) : (
                    <span className="font-mono text-muted-foreground">#{idx + 1}</span>
                  )}
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground">{item.displayName}</span>
                    {isYou && (
                      <Badge variant="emerald" className="text-[9px] px-1.5 py-0">
                        YOU
                      </Badge>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground sm:hidden">{item.group}</span>
                </td>
                <td className="p-3 hidden sm:table-cell text-muted-foreground">
                  {item.group}
                </td>
                <td className="p-3 text-right">
                  <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                    {item.ecoScore}/100
                  </span>
                </td>
                <td className="p-3 text-right hidden md:table-cell tabular-nums font-medium text-foreground">
                  {item.co2AvoidedKg.toFixed(1)} kg
                </td>
                <td className="p-3 text-right font-mono font-bold text-foreground tabular-nums">
                  {item.points} pts
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
