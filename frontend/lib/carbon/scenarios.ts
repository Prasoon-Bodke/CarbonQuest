import { CarbonCategory, CarbonInputProfile, FootprintCalculationResult } from "./types";
import { calculateFootprint } from "./engine";

/**
 * Standard Demo Profile calibrated for the PCCOE Grand Challenge Pune demo narrative.
 * Generates:
 * Total: ~127.6 kg CO2e / month (~128 kg)
 * Transport: ~39.7 kg (~31%)
 * Electricity: ~32.1 kg (~25%)
 * Food: ~28.0 kg (~22%)
 * Shopping: ~17.7 kg (~14%)
 * Waste: ~10.1 kg (~8%)
 */
export const DEMO_BASELINE_PROFILE: CarbonInputProfile = {
  householdSize: 2,
  city: "Pune",
  transport: {
    commuteMode: "two_wheeler_petrol",
    distancePerTripKm: 18, // 18 km roundtrip
    tripsPerWeek: 5, // Mon-Fri college/work
    secondaryMode: "auto_rickshaw_cng",
    secondaryTripsPerWeek: 2,
    secondaryDistanceKm: 10,
    flightsDomesticPerYear: 1, // 1 domestic flight per year
    flightsInternationalPerYear: 0,
    dataQuality: "estimated",
  },
  electricity: {
    acCount: 1,
    acHoursPerDay: 2.0, // 2 hrs/day
    acStarRating: 3,
    lpgCylindersPerMonth: 0.5, // 1 cylinder per 2 months for household
    hasSolarRooftop: false,
    dataQuality: "estimated",
  },
  food: {
    dietType: "vegetarian",
    foodWasteLevel: "low",
    dataQuality: "estimated",
  },
  shopping: {
    clothingSpendMonthlyInr: 1800,
    electronicsSpendMonthlyInr: 1500,
    onlineDeliveriesPerMonth: 6,
    secondHandPercentage: 0,
    dataQuality: "estimated",
  },
  waste: {
    wasteVolumeLevel: "average",
    compostsOrganic: false,
    segregatesDryWaste: false,
    recyclesPaperPlastic: false,
    dataQuality: "estimated",
  },
};

export interface BehaviorChange {
  id?: string;
  category: CarbonCategory;
  type:
    | "reduce_ac_hours"
    | "increase_ac_temp"
    | "switch_commute_public_transit"
    | "switch_commute_cycle"
    | "carpool_commute"
    | "switch_diet_plant_based"
    | "reduce_food_waste"
    | "second_hand_shopping"
    | "reduce_online_deliveries"
    | "segregate_and_compost"
    | "install_rooftop_solar"
    | "custom";
  magnitude: number; // e.g. 1 hour, 2 days/week, 50%
  unit?: string;
  description?: string;
}

export interface ScenarioSimulationResult {
  baselineTotalKg: number;
  projectedTotalKg: number;
  absoluteMonthlySavingKg: number;
  percentageSaving: number;
  annualizedSavingKg: number;
  estimatedCostSavingInrMonthly: number;
  categoryDiffs: Record<
    CarbonCategory,
    {
      baselineKg: number;
      projectedKg: number;
      diffKg: number;
    }
  >;
  formulaExplanation: string;
  baseline: FootprintCalculationResult;
  projected: FootprintCalculationResult;
}

/**
 * Pure simulation function: takes a profile and a set of behavior changes,
 * computes the exact footprint before and after using the deterministic carbon engine.
 */
export function simulateBehaviorChanges(
  profile: CarbonInputProfile,
  changes: BehaviorChange[]
): ScenarioSimulationResult {
  const baseline = calculateFootprint(profile);

  // Clone profile deeply
  const projectedProfile: CarbonInputProfile = JSON.parse(JSON.stringify(profile));
  let estimatedCostSavingsInr = 0;
  const explanationParts: string[] = [];

  for (const change of changes) {
    switch (change.type) {
      case "reduce_ac_hours": {
        const reduction = Math.max(0, Math.min(projectedProfile.electricity.acHoursPerDay, change.magnitude));
        projectedProfile.electricity.acHoursPerDay = Math.max(0, projectedProfile.electricity.acHoursPerDay - reduction);
        // Cost saving: ~0.98 kWh/hr * 30.4 days * ₹8.5/kWh / household
        const kwhSaved = (0.98 * reduction * 30.4) / (projectedProfile.householdSize || 1);
        estimatedCostSavingsInr += Math.round(kwhSaved * 8.5);
        explanationParts.push(
          `Reduced AC runtime by ${reduction} hr/day: avoids ${(kwhSaved).toFixed(1)} kWh monthly grid power.`
        );
        break;
      }

      case "increase_ac_temp": {
        // Bureau of Energy Efficiency (BEE): each 1°C increase saves ~6% electricity
        const degrees = Math.max(1, Math.min(4, change.magnitude));
        const savingsRatio = 1 - degrees * 0.06;
        projectedProfile.electricity.acHoursPerDay = Math.max(
          0,
          projectedProfile.electricity.acHoursPerDay * savingsRatio
        );
        explanationParts.push(
          `Increased AC thermostat by ${degrees}°C: reduces compressor load by ~${degrees * 6}%.`
        );
        break;
      }

      case "switch_commute_public_transit": {
        // Replace 'magnitude' days per week of personal vehicle with bus/metro
        const daysSwitched = Math.min(projectedProfile.transport.tripsPerWeek, Math.max(1, change.magnitude));
        const originalTrips = projectedProfile.transport.tripsPerWeek;
        projectedProfile.transport.tripsPerWeek = Math.max(0, originalTrips - daysSwitched);
        projectedProfile.transport.secondaryMode = "bus_city";
        projectedProfile.transport.secondaryTripsPerWeek = daysSwitched;
        projectedProfile.transport.secondaryDistanceKm = projectedProfile.transport.distancePerTripKm;
        // Cost savings: petrol saved (~₹3.5/km) minus bus fare (~₹1.2/km)
        const kmSubstituted = daysSwitched * projectedProfile.transport.distancePerTripKm * 4.33;
        estimatedCostSavingsInr += Math.round(kmSubstituted * 2.3);
        explanationParts.push(
          `Substituted ${daysSwitched} commute days/week from personal vehicle to municipal transit.`
        );
        break;
      }

      case "switch_commute_cycle": {
        // Switch short trips or commute days to cycling
        const daysCycled = Math.min(projectedProfile.transport.tripsPerWeek, Math.max(1, change.magnitude));
        projectedProfile.transport.tripsPerWeek = Math.max(0, projectedProfile.transport.tripsPerWeek - daysCycled);
        // Petrol cost saved
        const kmCycled = daysCycled * projectedProfile.transport.distancePerTripKm * 4.33;
        estimatedCostSavingsInr += Math.round(kmCycled * 3.5);
        explanationParts.push(
          `Switched ${daysCycled} commute days/week to cycling (zero tailpipe and zero operational emissions).`
        );
        break;
      }

      case "carpool_commute": {
        // Effective distance or trips halved through shared ride
        const shareFactor = Math.max(0.5, 1 - (change.magnitude / 100));
        projectedProfile.transport.distancePerTripKm = Math.round(projectedProfile.transport.distancePerTripKm * shareFactor);
        explanationParts.push(`Shared ride pooling applied with ${change.magnitude}% passenger load improvement.`);
        break;
      }

      case "switch_diet_plant_based": {
        projectedProfile.food.dietType = "vegan";
        explanationParts.push("Transitioned to 100% plant-based whole foods diet (zero ruminant and dairy supply chains).");
        break;
      }

      case "reduce_food_waste": {
        projectedProfile.food.foodWasteLevel = "low";
        explanationParts.push("Adopted meal planning and zero-waste storage to minimize edible organic food spoilage.");
        break;
      }

      case "second_hand_shopping": {
        projectedProfile.shopping.secondHandPercentage = Math.min(100, Math.max(10, change.magnitude));
        explanationParts.push(`Procured ${projectedProfile.shopping.secondHandPercentage}% apparel & electronics through circular pre-owned channels.`);
        break;
      }

      case "reduce_online_deliveries": {
        const drop = Math.min(projectedProfile.shopping.onlineDeliveriesPerMonth, change.magnitude);
        projectedProfile.shopping.onlineDeliveriesPerMonth = Math.max(0, projectedProfile.shopping.onlineDeliveriesPerMonth - drop);
        explanationParts.push(`Consolidated shipments, avoiding ${drop} last-mile courier trips per month.`);
        break;
      }

      case "segregate_and_compost": {
        projectedProfile.waste.segregatesDryWaste = true;
        projectedProfile.waste.compostsOrganic = true;
        explanationParts.push("Diverted wet waste to home composting and segregated clean dry recyclables.");
        break;
      }

      case "install_rooftop_solar": {
        projectedProfile.electricity.hasSolarRooftop = true;
        // Typical 1 kWp rooftop solar in Pune generates ~120 kWh/month
        projectedProfile.electricity.solarGenerationKwhPerMonth = change.magnitude > 0 ? change.magnitude : 120;
        estimatedCostSavingsInr += Math.round((projectedProfile.electricity.solarGenerationKwhPerMonth / (projectedProfile.householdSize || 1)) * 8.5);
        explanationParts.push(`Commissioned rooftop solar yielding ${projectedProfile.electricity.solarGenerationKwhPerMonth} clean kWh monthly.`);
        break;
      }

      default:
        break;
    }
  }

  const projected = calculateFootprint(projectedProfile);

  const absoluteMonthlySavingKg = Math.max(0, Math.round((baseline.totalCo2eKg - projected.totalCo2eKg) * 100) / 100);
  const percentageSaving =
    baseline.totalCo2eKg > 0 ? Math.round((absoluteMonthlySavingKg / baseline.totalCo2eKg) * 1000) / 10 : 0;
  const annualizedSavingKg = Math.round(absoluteMonthlySavingKg * 12 * 10) / 10;

  const categories: CarbonCategory[] = ["transport", "electricity", "food", "shopping", "waste"];
  const categoryDiffs: Record<CarbonCategory, { baselineKg: number; projectedKg: number; diffKg: number }> = {} as any;

  categories.forEach((cat) => {
    const baseKg = baseline.byCategory[cat]?.co2eKg || 0;
    const projKg = projected.byCategory[cat]?.co2eKg || 0;
    categoryDiffs[cat] = {
      baselineKg: baseKg,
      projectedKg: projKg,
      diffKg: Math.round((baseKg - projKg) * 100) / 100,
    };
  });

  return {
    baselineTotalKg: baseline.totalCo2eKg,
    projectedTotalKg: projected.totalCo2eKg,
    absoluteMonthlySavingKg,
    percentageSaving,
    annualizedSavingKg,
    estimatedCostSavingInrMonthly: estimatedCostSavingsInr,
    categoryDiffs,
    formulaExplanation:
      explanationParts.join(" ") || "Behavioral adjustment simulated via verified emission factors.",
    baseline,
    projected,
  };
}
