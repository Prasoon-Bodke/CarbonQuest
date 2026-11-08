import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });

    const body = await req.json();
    const { done = true, notes, estimatedKgAvoided = 0.5 } = body;
    const actionId = params.id;

    // Check action ownership
    const userAction = await prisma.userAction.findFirst({
      where: {
        id: actionId,
        userId: user.id,
      },
    });

    if (!userAction) {
      return NextResponse.json({ error: { message: "Action not found" } }, { status: 404 });
    }

    const checkin = await prisma.actionCheckin.create({
      data: {
        userActionId: userAction.id,
        done,
        notes: notes || "Daily habit confirmed",
        estimatedKgAvoided: Number(estimatedKgAvoided),
      },
    });

    // Add points for daily checkin
    await prisma.pointsLedger.create({
      data: {
        userId: user.id,
        points: 15,
        actionType: "habit_checkin",
        description: `Check-in: ${userAction.title}`,
      },
    });

    return NextResponse.json({ success: true, checkin });
  } catch (err: any) {
    return NextResponse.json({ error: { message: err?.message } }, { status: 500 });
  }
}
