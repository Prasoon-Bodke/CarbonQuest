import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { validateTrip, TripTelemetryInput } from "@/lib/validation/trips";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });

    const trips = await prisma.trip.findMany({
      where: { userId: user.id },
      orderBy: { startedAt: "desc" },
      take: 25,
    });

    return NextResponse.json({ trips });
  } catch (err: any) {
    return NextResponse.json({ error: { message: err?.message } }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });

    const body: TripTelemetryInput & {
      startLocation?: string;
      endLocation?: string;
    } = await req.json();

    // 1. Run server-side physics validation
    const validation = validateTrip(body);

    const durationSec = Math.round(body.durationMinutes * 60);

    // 2. Persist trip
    const trip = await prisma.trip.create({
      data: {
        userId: user.id,
        mode: body.mode,
        distanceKm: body.distanceKm,
        durationSec,
        avgSpeedKmh: validation.averageSpeedKmh,
        maxSpeedKmh: body.maxSpeedKmh || validation.averageSpeedKmh * 1.2,
        steps: body.stepCount,
        validationStatus: validation.status,
        validationReason: validation.reason,
        co2AvoidedKg: validation.co2AvoidedKg,
        source: body.source || "manual",
        startLocation: body.startLocation || "Pune Origin",
        endLocation: body.endLocation || "Pune Destination",
        startedAt: new Date(Date.now() - durationSec * 1000),
        endedAt: new Date(),
      },
    });

    // 3. If valid, award points and update avoided CO2
    let pointsAwarded = 0;
    if (validation.isValid && validation.co2AvoidedKg > 0) {
      pointsAwarded = Math.max(10, Math.round(validation.co2AvoidedKg * 20));
      await prisma.pointsLedger.create({
        data: {
          userId: user.id,
          points: pointsAwarded,
          actionType: "verified_trip",
          description: `Logged verified green transit: ${body.distanceKm} km (${body.mode})`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      trip,
      validation,
      pointsAwarded,
    });
  } catch (err: any) {
    return NextResponse.json({ error: { message: err?.message } }, { status: 500 });
  }
}
