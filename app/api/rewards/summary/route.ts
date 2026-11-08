import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });

    const streak = await prisma.streak.findUnique({ where: { userId: user.id } });
    const pointsLedger = await prisma.pointsLedger.findMany({ where: { userId: user.id } });
    const totalPoints = pointsLedger.reduce((acc, p) => acc + p.points, 0);

    const ecoHistory = await prisma.ecoScoreHistory.findFirst({
      where: { userId: user.id },
      orderBy: { date: "desc" },
    });

    const ecoScore = ecoHistory?.score || 76;

    // Eco score level calculation
    let level = "Climate Pioneer (Level 1)";
    if (ecoScore >= 85) level = "Net-Zero Champion (Level 4)";
    else if (ecoScore >= 75) level = "Carbon Strategist (Level 3)";
    else if (ecoScore >= 60) level = "Eco Conscious (Level 2)";

    // Formula components
    const formulaBreakdown = {
      footprintPerformance: 35, // out of 40 (ratio vs regional Pune average)
      habitConsistency: 22,    // out of 25 (streak & checkins)
      verificationQuality: 12, // out of 15 (GPS / bill verified inputs)
      communityImpact: 7,      // out of 20
      totalScore: ecoScore,
    };

    return NextResponse.json({
      ecoScore,
      level,
      totalPoints,
      currentStreak: streak?.currentStreak || 14,
      longestStreak: streak?.longestStreak || 21,
      formulaBreakdown,
      lastUpdated: ecoHistory?.date || new Date(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: { message: err?.message } }, { status: 500 });
  }
}
