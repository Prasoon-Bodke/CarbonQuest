import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: { message: "No active user found" } }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        location: user.location,
        householdSize: user.householdSize,
        onboardingStatus: user.onboardingStatus,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: { message: err?.message || "Session error" } }, { status: 500 });
  }
}
