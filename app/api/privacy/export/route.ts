import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });

    const fullData = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        consents: true,
        preferences: true,
        activities: true,
        trips: true,
        snapshots: { include: { hotspots: true } },
        userActions: { include: { checkins: true } },
        scenarios: true,
        goals: true,
        badges: { include: { badge: true } },
        pointsLedger: true,
        streak: true,
        ecoScoreHistory: true,
        redemptions: { include: { rewardItem: true } },
        conversations: { include: { messages: true } },
      },
    });

    return NextResponse.json({
      exportMetadata: {
        generatedAt: new Date().toISOString(),
        formatVersion: "1.0",
        system: "CarbonQuest Privacy & Data Portability Exporter",
      },
      userData: fullData,
    });
  } catch (err: any) {
    return NextResponse.json({ error: { message: err?.message } }, { status: 500 });
  }
}
