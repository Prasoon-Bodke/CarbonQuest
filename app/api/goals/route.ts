import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });

    const goal = await prisma.goal.findFirst({
      where: { userId: user.id, status: "active" },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ goal });
  } catch (err: any) {
    return NextResponse.json({ error: { message: err?.message } }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });

    const body = await req.json();
    const { targetPercent = 20, deadlineDays = 90 } = body;

    // Get current baseline footprint
    const currentSnap = await prisma.footprintSnapshot.findFirst({
      where: { userId: user.id },
      orderBy: { periodStart: "desc" },
    });
    const baselineKg = currentSnap ? currentSnap.totalKg : 127.6;
    const deadline = new Date(Date.now() + Number(deadlineDays) * 86400000);

    // Deactivate previous active goals
    await prisma.goal.updateMany({
      where: { userId: user.id, status: "active" },
      data: { status: "expired" },
    });

    const newGoal = await prisma.goal.create({
      data: {
        userId: user.id,
        targetPercent: Number(targetPercent),
        baselineKg,
        currentKg: baselineKg,
        deadline,
        status: "active",
      },
    });

    return NextResponse.json({ success: true, goal: newGoal });
  } catch (err: any) {
    return NextResponse.json({ error: { message: err?.message } }, { status: 500 });
  }
}
