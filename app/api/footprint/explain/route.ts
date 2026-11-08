import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { EMISSION_FACTORS } from "@/lib/carbon/factors";
import { DEMO_BASELINE_PROFILE } from "@/lib/carbon/scenarios";
import { calculateFootprint } from "@/lib/carbon/engine";

export async function GET() {
  try {
    const user = await getSessionUser();
    let lineItems: any[] = [];
    let confidence = 82;
    let confidenceExplanation: string[] = [];

    if (user) {
      const snap = await prisma.footprintSnapshot.findFirst({
        where: { userId: user.id },
        orderBy: { periodStart: "desc" },
      });
      if (snap) {
        lineItems = JSON.parse(snap.lineItems);
        confidence = snap.confidence;
      }
    }

    if (!lineItems.length) {
      const computed = calculateFootprint(DEMO_BASELINE_PROFILE);
      lineItems = Object.values(computed.byCategory).flatMap((c) => c.lineItems);
      confidence = computed.overallConfidenceScore;
      confidenceExplanation = computed.confidenceExplanation;
    }

    return NextResponse.json({
      confidenceScore: confidence,
      confidenceExplanation,
      factorsCount: Object.keys(EMISSION_FACTORS).length,
      methodology: "GHG Protocol Corporate / Personal Accounting Standard (Tier 1 & Tier 2 Activity-Based Multiplication)",
      coreFormula: "CO₂e (kg) = Activity Amount × Emission Factor (kg CO₂e/unit)",
      lineItems,
      factors: Object.values(EMISSION_FACTORS).slice(0, 15),
    });
  } catch (err: any) {
    return NextResponse.json({ error: { message: err?.message } }, { status: 500 });
  }
}
