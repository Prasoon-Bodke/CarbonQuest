import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { DEMO_BASELINE_PROFILE, simulateBehaviorChanges } from "@/lib/carbon/scenarios";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });

    const scenarios = await prisma.scenario.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    const parsed = scenarios.map((s) => ({
      id: s.id,
      name: s.name,
      changes: JSON.parse(s.changes),
      result: JSON.parse(s.resultJson),
      createdAt: s.createdAt,
    }));

    return NextResponse.json({ scenarios: parsed });
  } catch (err: any) {
    return NextResponse.json({ error: { message: err?.message } }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });

    const body = await req.json();
    const { name, changes } = body;

    if (!name || !changes?.length) {
      return NextResponse.json({ error: { message: "Name and changes are required" } }, { status: 400 });
    }

    // Run simulation to verify and store result
    const result = simulateBehaviorChanges(DEMO_BASELINE_PROFILE, changes);

    const created = await prisma.scenario.create({
      data: {
        userId: user.id,
        name,
        changes: JSON.stringify(changes),
        resultJson: JSON.stringify(result),
      },
    });

    return NextResponse.json({
      success: true,
      scenario: {
        id: created.id,
        name: created.name,
        changes,
        result,
        createdAt: created.createdAt,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: { message: err?.message } }, { status: 500 });
  }
}
