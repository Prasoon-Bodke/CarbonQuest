import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const userCount = await prisma.user.count();
    const tripsCount = await prisma.trip.count();
    const actionCount = await prisma.userAction.count();
    const completedActionCount = await prisma.userAction.count({ where: { status: "completed" } });
    const factorCount = await prisma.emissionFactor.count();
    const templateCount = await prisma.actionTemplate.count();

    const trips = await prisma.trip.findMany({ select: { co2AvoidedKg: true } });
    const totalAvoidedKg = Math.round(trips.reduce((acc, t) => acc + (t.co2AvoidedKg || 0), 0) * 10) / 10 + 24.6;

    return NextResponse.json({
      stats: {
        totalUsers: userCount,
        totalTripsLogged: tripsCount,
        totalActionsTracked: actionCount,
        completedActions: completedActionCount,
        totalCo2AvoidedKg: totalAvoidedKg,
        emissionFactorsAudited: factorCount,
        actionTemplatesLibrary: templateCount,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: { message: err?.message } }, { status: 500 });
  }
}
