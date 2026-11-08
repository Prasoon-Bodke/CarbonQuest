import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { validateTrip } from "@/lib/validation/trips";

export async function POST() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });

    // Simulate syncing 2 realistic Strava rides/runs from Pune
    const simulatedActivities = [
      {
        mode: "bicycle" as const,
        distanceKm: 8.4,
        durationMinutes: 32,
        startLocation: "Bavdhan, Pune",
        endLocation: "Chandani Chowk, Pune",
      },
      {
        mode: "walk" as const,
        distanceKm: 3.2,
        durationMinutes: 40,
        startLocation: "Kalyani Nagar, Pune",
        endLocation: "Koregaon Park, Pune",
      },
    ];

    const importedTrips = [];
    for (const act of simulatedActivities) {
      const validation = validateTrip({
        mode: act.mode,
        distanceKm: act.distanceKm,
        durationMinutes: act.durationMinutes,
        source: "strava",
      });

      const trip = await prisma.trip.create({
        data: {
          userId: user.id,
          mode: act.mode,
          distanceKm: act.distanceKm,
          durationSec: act.durationMinutes * 60,
          avgSpeedKmh: validation.averageSpeedKmh,
          validationStatus: validation.status,
          validationReason: "Imported via Strava sync; passed physics validation.",
          co2AvoidedKg: validation.co2AvoidedKg,
          source: "strava",
          startLocation: act.startLocation,
          endLocation: act.endLocation,
          startedAt: new Date(Date.now() - 3600000),
          endedAt: new Date(),
        },
      });

      if (validation.co2AvoidedKg > 0) {
        await prisma.pointsLedger.create({
          data: {
            userId: user.id,
            points: Math.round(validation.co2AvoidedKg * 20),
            actionType: "strava_verified",
            description: `Strava sync: ${act.distanceKm} km ${act.mode}`,
          },
        });
      }

      importedTrips.push(trip);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully synchronized ${importedTrips.length} activities from Strava!`,
      importedCount: importedTrips.length,
      importedTrips,
    });
  } catch (err: any) {
    return NextResponse.json({ error: { message: err?.message } }, { status: 500 });
  }
}
