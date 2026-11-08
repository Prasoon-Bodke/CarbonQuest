"use client";

import * as React from "react";
import { Flame, Calendar, Award } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StreakCalendarProps {
  currentStreak: number;
  longestStreak: number;
}

export function StreakCalendar({ currentStreak, longestStreak }: StreakCalendarProps) {
  // Generate last 28 days
  const days = Array.from({ length: 28 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (27 - i));
    const isCompleted = i >= 28 - currentStreak; // Active streak days
    return {
      date: d,
      dayNum: d.getDate(),
      month: d.toLocaleDateString("en-US", { month: "short" }),
      isCompleted,
    };
  });

  return (
    <Card className="border-border">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-foreground">Habit Consistency Streak</h4>
              <p className="text-xs text-muted-foreground">Every daily check-in extends your momentum</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-right">
            <div>
              <span className="text-2xl font-black text-amber-600 dark:text-amber-400 tabular-nums">
                {currentStreak}
              </span>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase">Current Days</p>
            </div>
            <div className="hidden sm:block border-l border-border pl-4">
              <span className="text-lg font-bold text-foreground tabular-nums">
                {longestStreak}
              </span>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase">Longest</p>
            </div>
          </div>
        </div>

        {/* 28-day Heatmap Grid */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium">
            <span>4 Weeks Consistency Heatmap</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
              {Math.round((currentStreak / 28) * 100)}% Habit Adherence
            </span>
          </div>

          <div className="grid grid-cols-7 sm:grid-cols-14 gap-1.5">
            {days.map((day, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all cursor-default",
                  day.isCompleted
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold"
                    : "border-border/60 bg-muted/30 text-muted-foreground/60"
                )}
                title={`${day.month} ${day.dayNum}: ${day.isCompleted ? "Habit logged" : "No activity"}`}
              >
                <span className="text-[10px] tabular-nums">{day.dayNum}</span>
                {day.isCompleted && (
                  <div className="h-1 w-1 rounded-full bg-emerald-500 mt-1" />
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
