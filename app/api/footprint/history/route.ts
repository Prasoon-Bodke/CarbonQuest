import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });

    const snapshots = await prisma.footprintSnapshot.findMany({
      where: { userId: user.id },
      orderBy: { periodStart: "asc" },
      take: 12,
    });

    const history = snapshots.map((s) => ({
      id: s.id,
      date: s.periodStart.toISOString().substring(0, 7), // YYYY-MM
      totalKg: s.totalKg,
      confidence: s.confidence,
      byCategory: JSON.parse(s.byCategory),
    }));

    return NextResponse.json({ history });
  } catch (err: any) {
    return NextResponse.json({ error: { message: err?.message } }, { status: 500 });
  }
}
