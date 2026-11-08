export type TripMode =
  | "walk"
  | "bicycle"
  | "bus_city"
  | "metro_rail"
  | "train_suburban"
  | "auto_rickshaw_cng"
  | "two_wheeler_petrol"
  | "two_wheeler_ev"
  | "car_petrol"
  | "car_diesel"
  | "car_cng"
  | "car_ev";

export type ValidationStatus = "valid" | "suspicious" | "rejected";

export interface TripTelemetryInput {
  mode: TripMode;
  distanceKm: number;
  durationMinutes: number;
  maxSpeedKmh?: number;
  startLat?: number;
  startLng?: number;
  endLat?: number;
  endLng?: number;
  stepCount?: number;
  source: "gps_live" | "manual_entry" | "strava" | "csv_import";
}

export interface TripValidationResult {
  status: ValidationStatus;
  isValid: boolean;
  averageSpeedKmh: number;
  reason: string;
  co2AvoidedKg: number; // vs personal car baseline if active/public transit
  flaggedReasons: string[];
}

/**
 * Calculates Great-Circle distance between two coordinates in kilometers using Haversine formula.
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

/**
 * Physical bounds and plausible speed thresholds for transport modes.
 */
interface ModePhysicsRules {
  minSpeedKmh: number;
  expectedAvgSpeedKmh: number;
  maxSuspiciousSpeedKmh: number;
  maxPhysicalSpeedKmh: number;
  maxSingleTripDistanceKm: number;
  stepRatePerKmMin?: number;
}

const MODE_RULES: Record<TripMode, ModePhysicsRules> = {
  walk: {
    minSpeedKmh: 1.0,
    expectedAvgSpeedKmh: 4.8,
    maxSuspiciousSpeedKmh: 9.0, // Fast jog / power walk
    maxPhysicalSpeedKmh: 15.0, // Sprint speed, impossible over multi-km distance
    maxSingleTripDistanceKm: 35.0,
    stepRatePerKmMin: 1100,
  },
  bicycle: {
    minSpeedKmh: 4.0,
    expectedAvgSpeedKmh: 16.0,
    maxSuspiciousSpeedKmh: 30.0,
    maxPhysicalSpeedKmh: 45.0, // Above 45 km/h is motorized traffic velocity
    maxSingleTripDistanceKm: 150.0,
  },
  bus_city: {
    minSpeedKmh: 3.0,
    expectedAvgSpeedKmh: 18.0,
    maxSuspiciousSpeedKmh: 65.0,
    maxPhysicalSpeedKmh: 85.0,
    maxSingleTripDistanceKm: 80.0,
  },
  metro_rail: {
    minSpeedKmh: 10.0,
    expectedAvgSpeedKmh: 35.0,
    maxSuspiciousSpeedKmh: 80.0,
    maxPhysicalSpeedKmh: 95.0,
    maxSingleTripDistanceKm: 50.0,
  },
  train_suburban: {
    minSpeedKmh: 10.0,
    expectedAvgSpeedKmh: 45.0,
    maxSuspiciousSpeedKmh: 100.0,
    maxPhysicalSpeedKmh: 120.0,
    maxSingleTripDistanceKm: 150.0,
  },
  auto_rickshaw_cng: {
    minSpeedKmh: 5.0,
    expectedAvgSpeedKmh: 24.0,
    maxSuspiciousSpeedKmh: 50.0,
    maxPhysicalSpeedKmh: 65.0,
    maxSingleTripDistanceKm: 60.0,
  },
  two_wheeler_petrol: {
    minSpeedKmh: 5.0,
    expectedAvgSpeedKmh: 32.0,
    maxSuspiciousSpeedKmh: 75.0,
    maxPhysicalSpeedKmh: 110.0,
    maxSingleTripDistanceKm: 300.0,
  },
  two_wheeler_ev: {
    minSpeedKmh: 5.0,
    expectedAvgSpeedKmh: 30.0,
    maxSuspiciousSpeedKmh: 70.0,
    maxPhysicalSpeedKmh: 95.0,
    maxSingleTripDistanceKm: 150.0,
  },
  car_petrol: {
    minSpeedKmh: 5.0,
    expectedAvgSpeedKmh: 35.0,
    maxSuspiciousSpeedKmh: 110.0,
    maxPhysicalSpeedKmh: 150.0,
    maxSingleTripDistanceKm: 1000.0,
  },
  car_diesel: {
    minSpeedKmh: 5.0,
    expectedAvgSpeedKmh: 35.0,
    maxSuspiciousSpeedKmh: 110.0,
    maxPhysicalSpeedKmh: 150.0,
    maxSingleTripDistanceKm: 1000.0,
  },
  car_cng: {
    minSpeedKmh: 5.0,
    expectedAvgSpeedKmh: 32.0,
    maxSuspiciousSpeedKmh: 100.0,
    maxPhysicalSpeedKmh: 140.0,
    maxSingleTripDistanceKm: 800.0,
  },
  car_ev: {
    minSpeedKmh: 5.0,
    expectedAvgSpeedKmh: 35.0,
    maxSuspiciousSpeedKmh: 110.0,
    maxPhysicalSpeedKmh: 150.0,
    maxSingleTripDistanceKm: 600.0,
  },
};

/**
 * Validates a trip against physical plausibility rules.
 * Prevents gaming in the rewards and progress engine.
 */
export function validateTrip(telemetry: TripTelemetryInput): TripValidationResult {
  const flaggedReasons: string[] = [];
  const { mode, distanceKm, durationMinutes, maxSpeedKmh, stepCount } = telemetry;

  // Sanity check for negative or zero values
  if (distanceKm <= 0) {
    return {
      status: "rejected",
      isValid: false,
      averageSpeedKmh: 0,
      reason: "Distance must be greater than 0 km.",
      co2AvoidedKg: 0,
      flaggedReasons: ["Non-positive distance"],
    };
  }

  if (durationMinutes <= 0) {
    return {
      status: "rejected",
      isValid: false,
      averageSpeedKmh: 0,
      reason: "Duration must be greater than 0 minutes.",
      co2AvoidedKg: 0,
      flaggedReasons: ["Non-positive duration"],
    };
  }

  const hours = durationMinutes / 60;
  const avgSpeed = Math.round((distanceKm / hours) * 10) / 10;
  const rules = MODE_RULES[mode] || MODE_RULES.two_wheeler_petrol;

  // Rule 1: Extreme speed impossibility check
  if (avgSpeed > rules.maxPhysicalSpeedKmh) {
    flaggedReasons.push(
      `Impossible speed: Claimed mode '${mode}' averaged ${avgSpeed} km/h (physical limit: ${rules.maxPhysicalSpeedKmh} km/h).`
    );
  }

  // Rule 2: Max speed sensor check
  if (maxSpeedKmh && maxSpeedKmh > rules.maxPhysicalSpeedKmh * 1.25) {
    flaggedReasons.push(
      `Peak speed spike: Recorded peak speed of ${maxSpeedKmh} km/h exceeds plausible ceiling for '${mode}'.`
    );
  }

  // Rule 3: Extreme distance check for single trip
  if (distanceKm > rules.maxSingleTripDistanceKm) {
    flaggedReasons.push(
      `Distance anomaly: ${distanceKm} km exceeds maximum plausible single trip for '${mode}' (${rules.maxSingleTripDistanceKm} km).`
    );
  }

  // Rule 4: Walking step verification if pedometer data present
  if (mode === "walk" && stepCount !== undefined) {
    const expectedSteps = distanceKm * 1200;
    if (stepCount < expectedSteps * 0.3) {
      flaggedReasons.push(
        `Cadence mismatch: Pedometer recorded only ${stepCount} steps for ${distanceKm} km (expected ~${Math.round(expectedSteps)} steps).`
      );
    }
  }

  // Rule 5: Suspicious threshold check
  let status: ValidationStatus = "valid";
  let reason = "Trip telemetry passed physics plausibility validation.";

  if (flaggedReasons.length > 0) {
    // If it violates physical limits, reject
    if (avgSpeed > rules.maxPhysicalSpeedKmh || distanceKm > rules.maxSingleTripDistanceKm) {
      status = "rejected";
      reason = `Trip rejected: ${flaggedReasons.join("; ")}`;
    } else {
      status = "suspicious";
      reason = `Trip flagged for review: ${flaggedReasons.join("; ")}`;
    }
  } else if (avgSpeed > rules.maxSuspiciousSpeedKmh) {
    status = "suspicious";
    reason = `Average speed (${avgSpeed} km/h) is higher than typical urban range for ${mode}. Requires user confirmation.`;
    flaggedReasons.push(`High average speed: ${avgSpeed} km/h`);
  }

  // CO2 avoided calculation (relative to an average single occupant car @ 0.174 kg/km)
  let co2AvoidedKg = 0;
  if (status === "valid") {
    const carBaselineFactor = 0.174;
    let tripEmissionFactor = 0;
    if (mode === "walk" || mode === "bicycle") tripEmissionFactor = 0;
    else if (mode === "bus_city") tripEmissionFactor = 0.035;
    else if (mode === "metro_rail") tripEmissionFactor = 0.022;
    else if (mode === "two_wheeler_petrol") tripEmissionFactor = 0.045;
    else if (mode === "two_wheeler_ev") tripEmissionFactor = 0.019;
    else tripEmissionFactor = carBaselineFactor;

    if (tripEmissionFactor < carBaselineFactor) {
      co2AvoidedKg = Math.max(0, Math.round(distanceKm * (carBaselineFactor - tripEmissionFactor) * 100) / 100);
    }
  }

  return {
    status,
    isValid: status === "valid",
    averageSpeedKmh: avgSpeed,
    reason,
    co2AvoidedKg,
    flaggedReasons,
  };
}
