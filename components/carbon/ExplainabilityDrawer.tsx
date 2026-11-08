"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { LineItemCalculation } from "@/lib/carbon/types";
import { Calculator, ShieldCheck, BookOpen, ExternalLink } from "lucide-react";

interface ExplainabilityDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lineItems: LineItemCalculation[];
  confidenceScore: number;
  confidenceExplanations?: string[];
}

export function ExplainabilityDrawer({
  open,
  onOpenChange,
  lineItems,
  confidenceScore,
  confidenceExplanations = [],
}: ExplainabilityDrawerProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              <Calculator className="h-4 w-4" />
            </div>
            <DialogTitle className="text-base font-bold">
              Carbon Calculation Explainability & Methodology
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            Every footprint metric in CarbonQuest is deterministic and verifiable. No LLM approximations.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Core Law Formula Banner */}
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-950/30 p-4 space-y-2">
            <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-800 dark:text-emerald-300">
              Governing Equation (GHG Protocol Corporate / Tier 1 Standard)
            </span>
            <div className="font-mono text-sm font-bold text-foreground">
              Emissions (kg CO₂e) = Activity Amount × Emission Factor
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Activity data is multiplied directly against peer-reviewed, regional emission factors
              published by the India Central Electricity Authority (CEA), IPCC AR6, ARAI, and TERI.
            </p>
          </div>

          {/* Confidence Breakdown */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Data Confidence Rating: <strong className="tabular-nums">{confidenceScore}%</strong>
              </span>
              <Badge variant="emerald" className="text-[10px] uppercase font-mono">
                {confidenceScore >= 80 ? "High Precision" : "Moderate Baseline"}
              </Badge>
            </div>
            {confidenceExplanations.length > 0 && (
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside pt-1">
                {confidenceExplanations.map((exp, i) => (
                  <li key={i}>{exp}</li>
                ))}
              </ul>
            )}
          </div>

          {/* Line Item Detailed Inspection */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Line-Item Breakdown & Provenance
            </h4>

            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {lineItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-border/80 bg-background/50 p-3 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">{item.lineItem}</span>
                      <Badge
                        variant={
                          item.dataQuality === "measured"
                            ? "emerald"
                            : item.dataQuality === "estimated"
                            ? "blue"
                            : "outline"
                        }
                        className="text-[9px] uppercase px-1.5 py-0"
                      >
                        {item.dataQuality}
                      </Badge>
                    </div>
                    <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                      {item.co2eKg > 0 ? `${item.co2eKg.toFixed(2)} kg` : `${item.co2eKg.toFixed(2)} kg (Offset)`}
                    </span>
                  </div>

                  {/* Formula Calculation text */}
                  <div className="font-mono text-[11px] bg-muted/50 p-2 rounded text-foreground">
                    {item.formulaText}
                  </div>

                  {/* Source and Citation */}
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-0.5">
                    <span className="truncate max-w-xs">
                      <strong>Source:</strong> {item.factorSource} ({item.factorYear})
                    </span>
                    <span className="tabular-nums font-mono">
                      Factor: {item.factor} kg/{item.unit}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
