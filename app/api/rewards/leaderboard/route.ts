import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const entries = await prisma.leaderboardEntry.findMany({
      where: { optOut: false },
      orderBy: [{ ecoScore: "desc" }, { co2AvoidedKg: "desc" }],
      take: 20,
    });

    const rewardCatalog = await prisma.rewardItem.findMany({
      where: { active: true },
    });

    return NextResponse.json({
      leaderboard: entries,
      rewardCatalog,
    });
  } catch (err: any) {
    return NextResponse.json({ error: { message: err?.message } }, { status: 500 });
  }
}
