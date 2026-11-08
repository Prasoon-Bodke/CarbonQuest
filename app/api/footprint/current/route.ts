import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { DEMO_BASELINE_PROFILE } from "@/lib/carbon/scenarios";
import { calculateFootprint } from "@/lib/carbon/engine";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });

    const snapshot = await prisma.footprintSnapshot.findFirst({
      where: { userId: user.id },
      orderBy: { periodStart: "desc" },
      include: { hotspots: { orderBy: { rank: "asc" } } },
    });

    if (!snapshot) {
      const computed = calculateFootprint(DEMO_BASELINE_PROFILE);
      return NextResponse.json({
        totalKg: computed.totalCo2eKg,
        byCategory: computed.byCategory,
        confidence: computed.overallConfidenceScore,
        confidenceRating: computed.confidenceRating,
        confidenceExplanation: computed.confidenceExplanation,
        calculatedAt: computed.calculatedAt,
        lineItems: Object.values(computed.byCategory).flatMap((c) => c.lineItems),
      });
    }

    return NextResponse.json({
      id: snapshot.id,
      totalKg: snapshot.totalKg,
      byCategory: JSON.parse(snapshot.byCategory),
      lineItems: JSON.parse(snapshot.lineItems),
      confidence: snapshot.confidence,
      calculatedAt: snapshot.createdAt,
      hotspots: snapshot.hotspots,
    });
  } catch (err: any) {
    return NextResponse.json({ error: { message: err?.message || "Footprint error" } }, { status: 500 });
  }
}
