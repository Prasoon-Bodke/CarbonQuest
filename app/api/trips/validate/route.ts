import { NextResponse } from "next/server";
import { validateTrip, TripTelemetryInput } from "@/lib/validation/trips";

export async function POST(req: Request) {
  try {
    const body: TripTelemetryInput = await req.json();
    const result = validateTrip(body);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (err: any) {
    return NextResponse.json({ error: { message: err?.message } }, { status: 500 });
  }
}
