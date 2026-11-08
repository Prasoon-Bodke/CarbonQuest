import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });

    const allBadges = await prisma.badge.findMany({ orderBy: { xpReward: "asc" } });
    const userBadges = await prisma.userBadge.findMany({
      where: { userId: user.id },
    });

    const earnedBadgeIds = new Map(userBadges.map((ub) => [ub.badgeId, ub.earnedAt]));

    const badges = allBadges.map((b) => ({
      ...b,
      earned: earnedBadgeIds.has(b.id),
      earnedAt: earnedBadgeIds.get(b.id) || null,
    }));

    return NextResponse.json({
      badges,
      totalEarned: userBadges.length,
      totalAvailable: allBadges.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: { message: err?.message } }, { status: 500 });
  }
}
