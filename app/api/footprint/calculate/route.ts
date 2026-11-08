import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { CarbonInputProfile } from "@/lib/carbon/types";
import { calculateFootprint } from "@/lib/carbon/engine";

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    const body = await req.json();
    const profile: CarbonInputProfile = body.profile;
    const saveSnapshot: boolean = body.saveSnapshot ?? false;

    if (!profile) {
      return NextResponse.json({ error: { message: "Profile inputs are required" } }, { status: 400 });
    }

    const result = calculateFootprint(profile);

    if (saveSnapshot && user) {
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const snapshot = await prisma.footprintSnapshot.create({
        data: {
          userId: user.id,
          periodStart,
          periodEnd,
          totalKg: result.totalCo2eKg,
          byCategory: JSON.stringify(result.byCategory),
          lineItems: JSON.stringify(Object.values(result.byCategory).flatMap((c) => c.lineItems)),
          confidence: result.overallConfidenceScore,
          version: 1,
        },
      });

      // Compute and save hotspots
      const allLineItems = Object.values(result.byCategory).flatMap((c) => c.lineItems);
      const sorted = [...allLineItems].sort((a, b) => b.co2eKg - a.co2eKg).slice(0, 5);

      for (let i = 0; i < sorted.length; i++) {
        const item = sorted[i];
        const pct = result.totalCo2eKg > 0 ? (item.co2eKg / result.totalCo2eKg) * 100 : 0;
        await prisma.hotspot.create({
          data: {
            snapshotId: snapshot.id,
            category: item.category,
            lineItem: item.lineItem,
            rank: i + 1,
            kg: item.co2eKg,
            percent: Math.round(pct * 10) / 10,
            severity: i === 0 || pct > 25 ? "high" : pct > 15 ? "medium" : "low",
          },
        });
      }
    }

    return NextResponse.json({ result });
  } catch (err: any) {
    return NextResponse.json({ error: { message: err?.message } }, { status: 500 });
  }
}
