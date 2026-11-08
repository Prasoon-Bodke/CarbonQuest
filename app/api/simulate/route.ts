import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { DEMO_BASELINE_PROFILE, simulateBehaviorChanges, BehaviorChange } from "@/lib/carbon/scenarios";

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    const body = await req.json();
    const changes: BehaviorChange[] = body.changes || [];

    if (!changes.length) {
      return NextResponse.json(
        { error: { message: "At least one behavior change is required to simulate" } },
        { status: 400 }
      );
    }

    const result = simulateBehaviorChanges(DEMO_BASELINE_PROFILE, changes);

    return NextResponse.json({
      success: true,
      result,
      changesEvaluated: changes.length,
      disclaimer: "Estimates calculated deterministically using CEA Grid v19 and IPCC AR6 standard emission factors.",
    });
  } catch (err: any) {
    return NextResponse.json({ error: { message: err?.message } }, { status: 500 });
  }
}
