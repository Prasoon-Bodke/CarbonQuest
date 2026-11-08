import { CarbonCategory, CarbonInputProfile, DataQuality } from "./types";

export interface ConfidenceEvaluation {
  overallScore: number; // 0 - 100
  categoryScores: Record<CarbonCategory, number>;
  rating: "low" | "medium" | "high";
  explanations: string[];
}

export function calculateConfidence(
  profile: CarbonInputProfile,
  qualityOverrides?: Partial<Record<CarbonCategory, DataQuality>>
): ConfidenceEvaluation {
  const categoryScores: Record<CarbonCategory, number> = {
    transport: 70,
    electricity: 70,
    food: 75,
    shopping: 65,
    waste: 65,
  };

  const explanations: string[] = [];

  // Transport evaluation
  let transportScore = 60;
  if (profile.transport.distancePerTripKm > 0 && profile.transport.tripsPerWeek > 0) {
    transportScore += 25;
  }
  const tq = qualityOverrides?.transport || profile.transport.dataQuality || "estimated";
  if (tq === "measured") {
    transportScore += 15;
    explanations.push("Transport: Distances verified via trip log telemetry or precise odometer entries.");
  } else if (tq === "estimated") {
    transportScore += 5;
    explanations.push("Transport: Estimated from declared weekly trips and average commute distances.");
  } else {
    explanations.push("Transport: Based on generalized city transit heuristics.");
  }
  categoryScores.transport = Math.min(100, transportScore);

  // Electricity evaluation
  let elecScore = 55;
  if (profile.electricity.monthlyKwh && profile.electricity.monthlyKwh > 0) {
    elecScore += 35;
    explanations.push("Electricity: Exact kWh consumed extracted from utility bill (high precision).");
  } else if (profile.electricity.billAmountInr && profile.electricity.billAmountInr > 0) {
    elecScore += 25;
    explanations.push("Electricity: Converted from monthly bill using Pune MSEDCL slab tariff curve.");
  } else {
    elecScore += 15;
    explanations.push("Electricity: Inferred from AC hours/day and standard domestic appliances.");
  }
  if (profile.electricity.hasSolarRooftop) {
    elecScore += 10;
  }
  const eq = qualityOverrides?.electricity || profile.electricity.dataQuality || (profile.electricity.monthlyKwh ? "measured" : "estimated");
  if (eq === "measured") elecScore += 10;
  categoryScores.electricity = Math.min(100, elecScore);

  // Food evaluation
  let foodScore = 70;
  if (profile.food.dietType) foodScore += 15;
  if (profile.food.foodWasteLevel) foodScore += 10;
  categoryScores.food = Math.min(100, foodScore);
  explanations.push(`Food: Calibrated for Indian dietary patterns (${profile.food.dietType}) via ICMR / Poore & Nemecek.`);

  // Shopping evaluation
  let shopScore = 60;
  if (profile.shopping.clothingSpendMonthlyInr >= 0 && profile.shopping.electronicsSpendMonthlyInr >= 0) {
    shopScore += 25;
  }
  if (profile.shopping.secondHandPercentage > 0) shopScore += 10;
  categoryScores.shopping = Math.min(100, shopScore);
  explanations.push("Shopping: Calculated from declared monthly consumption bands and second-hand reuse share.");

  // Waste evaluation
  let wasteScore = 65;
  if (profile.waste.segregatesDryWaste || profile.waste.compostsOrganic) {
    wasteScore += 25;
    explanations.push("Waste: Waste audit accounts for organic composting and dry recycling segregation.");
  } else {
    wasteScore += 10;
    explanations.push("Waste: General municipal solid waste generation rate (CPCB Pune baseline).");
  }
  categoryScores.waste = Math.min(100, wasteScore);

  // Weighted overall score
  const weights: Record<CarbonCategory, number> = {
    transport: 0.30,
    electricity: 0.28,
    food: 0.22,
    shopping: 0.12,
    waste: 0.08,
  };

  const overallScore = Math.round(
    Object.keys(weights).reduce((acc, cat) => {
      const c = cat as CarbonCategory;
      return acc + categoryScores[c] * weights[c];
    }, 0)
  );

  let rating: "low" | "medium" | "high" = "medium";
  if (overallScore >= 80) rating = "high";
  else if (overallScore < 60) rating = "low";

  return {
    overallScore,
    categoryScores,
    rating,
    explanations,
  };
}
