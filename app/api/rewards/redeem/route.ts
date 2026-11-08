import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });

    const { rewardItemId } = await req.json();
    const item = await prisma.rewardItem.findUnique({
      where: { id: rewardItemId },
    });

    if (!item) {
      return NextResponse.json({ error: { message: "Reward item not found" } }, { status: 404 });
    }

    // Check balance
    const pointsLedger = await prisma.pointsLedger.findMany({ where: { userId: user.id } });
    const balance = pointsLedger.reduce((acc, p) => acc + p.points, 0);

    if (balance < item.pointsCost) {
      return NextResponse.json(
        {
          error: {
            message: `Insufficient points: you have ${balance} points, but '${item.title}' requires ${item.pointsCost} points.`,
          },
        },
        { status: 400 }
      );
    }

    // Deduct points
    await prisma.pointsLedger.create({
      data: {
        userId: user.id,
        points: -item.pointsCost,
        actionType: "reward_redemption",
        description: `Redeemed: ${item.title}`,
      },
    });

    // Record redemption
    const redemption = await prisma.redemption.create({
      data: {
        userId: user.id,
        rewardItemId: item.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully redeemed '${item.title}'!`,
      newBalance: balance - item.pointsCost,
      redemption,
    });
  } catch (err: any) {
    return NextResponse.json({ error: { message: err?.message } }, { status: 500 });
  }
}
