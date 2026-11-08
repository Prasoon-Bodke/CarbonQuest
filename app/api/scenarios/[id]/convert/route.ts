import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { ACTIONS_LIBRARY } from "@/lib/recommendation/actionsLibrary";
import { BehaviorChange } from "@/lib/carbon/scenarios";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });

    const scenario = await prisma.scenario.findFirst({
      where: { id: params.id, userId: user.id },
    });

    if (!scenario) {
      return NextResponse.json({ error: { message: "Scenario not found" } }, { status: 404 });
    }

    const changes: BehaviorChange[] = JSON.parse(scenario.changes);
    const convertedActions = [];

    for (const change of changes) {
      // Find matching action template
      const template = ACTIONS_LIBRARY.find((a) => a.changeType === change.type);
      const actionSlug = template?.slug || change.type;
      const title = template?.title || `Simulated Habit: ${change.type}`;
      const category = change.category;

      // Upsert into user actions
      const existing = await prisma.userAction.findFirst({
        where: { userId: user.id, actionSlug },
      });

      if (!existing) {
        const created = await prisma.userAction.create({
          data: {
            userId: user.id,
            actionSlug,
            title,
            category,
            status: "accepted",
            modifiedParams: JSON.stringify({ magnitude: change.magnitude }),
            estimatedMonthlyKg: 8.5,
          },
        });
        convertedActions.push(created);
      } else {
        const updated = await prisma.userAction.update({
          where: { id: existing.id },
          data: {
            status: "accepted",
            modifiedParams: JSON.stringify({ magnitude: change.magnitude }),
          },
        });
        convertedActions.push(updated);
      }
    }

    // Award XP/Points for converting a scenario
    await prisma.pointsLedger.create({
      data: {
        userId: user.id,
        points: 40,
        actionType: "scenario_converted",
        description: `Converted scenario '${scenario.name}' into real climate plan`,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully converted scenario '${scenario.name}' into ${convertedActions.length} active plan action(s)!`,
      convertedActions,
    });
  } catch (err: any) {
    return NextResponse.json({ error: { message: err?.message } }, { status: 500 });
  }
}
