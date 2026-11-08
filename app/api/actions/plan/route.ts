import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });

    const activeActions = await prisma.userAction.findMany({
      where: { userId: user.id, status: "accepted" },
      include: { checkins: { orderBy: { date: "desc" }, take: 7 } },
      orderBy: { acceptedAt: "desc" },
    });

    const completedActions = await prisma.userAction.findMany({
      where: { userId: user.id, status: "completed" },
      include: { checkins: { orderBy: { date: "desc" }, take: 7 } },
      orderBy: { completedAt: "desc" },
    });

    const skippedActions = await prisma.userAction.findMany({
      where: { userId: user.id, status: "skipped" },
      orderBy: { acceptedAt: "desc" },
    });

    return NextResponse.json({
      activeActions,
      completedActions,
      skippedActions,
    });
  } catch (err: any) {
    return NextResponse.json({ error: { message: err?.message } }, { status: 500 });
  }
}
