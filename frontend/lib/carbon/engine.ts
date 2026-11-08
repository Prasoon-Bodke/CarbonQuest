import {
  CarbonCategory,
  CarbonInputProfile,
  CategorySummary,
  FootprintCalculationResult,
  LineItemCalculation,
} from "./types";
import { EMISSION_FACTORS } from "./factors";
import { calculateConfidence } from "./confidence";

export const WEEKS_PER_MONTH = 4.33;
export const DAYS_PER_MONTH = 30.4;

/**
 * Deterministic and explainable Carbon Calculation Engine.
 * Follows the fundamental GHG protocol equation:
 *   CO2e (kg) = Activity Amount × Emission Factor
 */
export function calculateFootprint(profile: CarbonInputProfile): FootprintCalculationResult {
  const lineItemsByCategory: Record<CarbonCategory, LineItemCalculation[]> = {
    transport: [],
    electricity: [],
    food: [],
    shopping: [],
    waste: [],
  };

  // 1. TRANSPORT CALCULATION
  const t = profile.transport;
  const factorKey = `transport_${t.commuteMode}`;
  const factorEntry = EMISSION_FACTORS[factorKey] || EMISSION_FACTORS["transport_two_wheeler_petrol"];

  // Monthly commute distance = trips/week * km/trip * 4.33 weeks
  const monthlyCommuteKm = Math.round(t.tripsPerWeek * t.distancePerTripKm * WEEKS_PER_MONTH * 10) / 10;
  const commuteCo2e = Math.round(monthlyCommuteKm * factorEntry.value * 100) / 100;

  lineItemsByCategory.transport.push({
    id: "transport_primary_commute",
    category: "transport",
    lineItem: `Primary Commute (${factorEntry.subcategory})`,
    activity: monthlyCommuteKm,
    unit: "km/month",
    factor: factorEntry.value,
    factorSource: factorEntry.source,
    factorYear: factorEntry.year,
    co2eKg: commuteCo2e,
    dataQuality: t.dataQuality || "estimated",
    formulaText: `${monthlyCommuteKm} km × ${factorEntry.value} kg CO₂e/km = ${commuteCo2e} kg CO₂e`,
    notes: `${t.tripsPerWeek} trips/week @ ${t.distancePerTripKm} km per trip`,
  });

  // Secondary mode if specified
  if (t.secondaryMode && (t.secondaryTripsPerWeek || 0) > 0 && (t.secondaryDistanceKm || 0) > 0) {
    const secFactorKey = `transport_${t.secondaryMode}`;
    const secFactor = EMISSION_FACTORS[secFactorKey] || EMISSION_FACTORS["transport_auto_rickshaw_cng"];
    const secKm = Math.round((t.secondaryTripsPerWeek || 0) * (t.secondaryDistanceKm || 0) * WEEKS_PER_MONTH * 10) / 10;
    const secCo2e = Math.round(secKm * secFactor.value * 100) / 100;

    lineItemsByCategory.transport.push({
      id: "transport_secondary_transit",
      category: "transport",
      lineItem: `Secondary Mode (${secFactor.subcategory})`,
      activity: secKm,
      unit: "km/month",
      factor: secFactor.value,
      factorSource: secFactor.source,
      factorYear: secFactor.year,
      co2eKg: secCo2e,
      dataQuality: "estimated",
      formulaText: `${secKm} km × ${secFactor.value} kg CO₂e/km = ${secCo2e} kg CO₂e`,
      notes: `${t.secondaryTripsPerWeek} trips/week @ ${t.secondaryDistanceKm} km`,
    });
  }

  // Aviation (Domestic / Short haul flights)
  if (t.flightsDomesticPerYear && t.flightsDomesticPerYear > 0) {
    const flightFactor = EMISSION_FACTORS["transport_flight_domestic"];
    // Average domestic flight distance in India ~1100 km (e.g. Pune - Delhi/Bangalore)
    const annualKm = t.flightsDomesticPerYear * 1100;
    const monthlyFlightKm = Math.round((annualKm / 12) * 10) / 10;
    const flightCo2e = Math.round(monthlyFlightKm * flightFactor.value * 100) / 100;

    lineItemsByCategory.transport.push({
      id: "transport_flights_domestic",
      category: "transport",
      lineItem: `Domestic Aviation (${t.flightsDomesticPerYear} flights/year amortized)`,
      activity: monthlyFlightKm,
      unit: "passenger-km/month",
      factor: flightFactor.value,
      factorSource: flightFactor.source,
      factorYear: flightFactor.year,
      co2eKg: flightCo2e,
      dataQuality: "estimated",
      formulaText: `${monthlyFlightKm} km/mo × ${flightFactor.value} kg CO₂e/p-km = ${flightCo2e} kg CO₂e`,
      notes: "Calculated with 1.9x Radiative Forcing Index (ICAO/DEFRA standard)",
    });
  }

  // Aviation (International / Long haul flights)
  if (t.flightsInternationalPerYear && t.flightsInternationalPerYear > 0) {
    const flightFactor = EMISSION_FACTORS["transport_flight_international"];
    const annualKm = t.flightsInternationalPerYear * 4500;
    const monthlyFlightKm = Math.round((annualKm / 12) * 10) / 10;
    const flightCo2e = Math.round(monthlyFlightKm * flightFactor.value * 100) / 100;

    lineItemsByCategory.transport.push({
      id: "transport_flights_international",
      category: "transport",
      lineItem: `International Aviation (${t.flightsInternationalPerYear} flights/year amortized)`,
      activity: monthlyFlightKm,
      unit: "passenger-km/month",
      factor: flightFactor.value,
      factorSource: flightFactor.source,
      factorYear: flightFactor.year,
      co2eKg: flightCo2e,
      dataQuality: "estimated",
      formulaText: `${monthlyFlightKm} km/mo × ${flightFactor.value} kg CO₂e/p-km = ${flightCo2e} kg CO₂e`,
    });
  }

  // 2. ELECTRICITY / HOME ENERGY CALCULATION
  const e = profile.electricity;
  const gridFactor = EMISSION_FACTORS["electricity_grid"];
  const householdDivisor = Math.max(1, profile.householdSize || 1);

  // AC calculation:
  // Rated kW: 3-star split AC avg duty cycle power draw = 0.95 kW
  // Monthly kWh = acCount * (acHoursPerDay * DAYS_PER_MONTH) * 0.95 kW
  const acEffectiveKw = 0.98; // Realistic average compressor power
  const acMonthlyKwh = Math.round(e.acCount * e.acHoursPerDay * DAYS_PER_MONTH * acEffectiveKw * 10) / 10;
  const acPersonalKwh = Math.round((acMonthlyKwh / householdDivisor) * 10) / 10;
  const acCo2e = Math.round(acPersonalKwh * gridFactor.value * 100) / 100;

  lineItemsByCategory.electricity.push({
    id: "electricity_air_conditioning",
    category: "electricity",
    lineItem: `Air Conditioning (${e.acCount} units, ${e.acHoursPerDay} hrs/day)`,
    activity: acPersonalKwh,
    unit: "kWh/month (per-capita)",
    factor: gridFactor.value,
    factorSource: gridFactor.source,
    factorYear: gridFactor.year,
    co2eKg: acCo2e,
    dataQuality: e.dataQuality || "estimated",
    formulaText: `${acPersonalKwh} kWh × ${gridFactor.value} kg CO₂e/kWh = ${acCo2e} kg CO₂e`,
    notes: `${e.acHoursPerDay} hrs/day across ${e.acCount} AC(s), split across ${householdDivisor} occupant(s)`,
  });

  // Base electricity (lighting, fans, refrigerator, electronics)
  let baseHomeKwh = 0;
  if (e.monthlyKwh && e.monthlyKwh > 0) {
    // Measured kWh minus the modeled AC fraction
    baseHomeKwh = Math.max(0, Math.round(((e.monthlyKwh - acMonthlyKwh) / householdDivisor) * 10) / 10);
  } else if (e.billAmountInr && e.billAmountInr > 0) {
    // MSEDCL tariff estimation: approx ₹8.5 per kWh including fixed charges & fuel adjustment
    const estimatedTotalKwh = Math.round((e.billAmountInr / 8.5) * 10) / 10;
    baseHomeKwh = Math.max(0, Math.round(((estimatedTotalKwh - acMonthlyKwh) / householdDivisor) * 10) / 10);
  } else {
    // Default baseline for appliances per occupant in urban India ~12 kWh/month
    baseHomeKwh = 11.2;
  }

  const baseCo2e = Math.round(baseHomeKwh * gridFactor.value * 100) / 100;
  lineItemsByCategory.electricity.push({
    id: "electricity_appliances_lighting",
    category: "electricity",
    lineItem: "Appliances, Lighting & Refrigeration",
    activity: baseHomeKwh,
    unit: "kWh/month (per-capita)",
    factor: gridFactor.value,
    factorSource: gridFactor.source,
    factorYear: gridFactor.year,
    co2eKg: baseCo2e,
    dataQuality: e.monthlyKwh ? "measured" : "estimated",
    formulaText: `${baseHomeKwh} kWh × ${gridFactor.value} kg CO₂e/kWh = ${baseCo2e} kg CO₂e`,
    notes: "Baseline home electricity share excluding AC cooling",
  });

  // LPG Cooking
  if (e.lpgCylindersPerMonth > 0) {
    const lpgFactor = EMISSION_FACTORS["electricity_lpg"];
    // 1 cylinder = 14.2 kg LPG
    const personalLpgKg = Math.round(((e.lpgCylindersPerMonth * 14.2) / householdDivisor) * 100) / 100;
    const lpgCo2e = Math.round(personalLpgKg * lpgFactor.value * 100) / 100;

    lineItemsByCategory.electricity.push({
      id: "electricity_lpg_cooking",
      category: "electricity",
      lineItem: `LPG Cooking Gas (${e.lpgCylindersPerMonth} cylinder/month)`,
      activity: personalLpgKg,
      unit: "kg LPG/month",
      factor: lpgFactor.value,
      factorSource: lpgFactor.source,
      factorYear: lpgFactor.year,
      co2eKg: lpgCo2e,
      dataQuality: "estimated",
      formulaText: `${personalLpgKg} kg LPG × ${lpgFactor.value} kg CO₂e/kg = ${lpgCo2e} kg CO₂e`,
    });
  }

  // Solar Rooftop Offset
  if (e.hasSolarRooftop && (e.solarGenerationKwhPerMonth || 0) > 0) {
    const solarFactor = EMISSION_FACTORS["electricity_solar_offset"];
    const personalSolarKwh = Math.round(((e.solarGenerationKwhPerMonth || 0) / householdDivisor) * 10) / 10;
    const solarAvoidedCo2e = Math.round(personalSolarKwh * Math.abs(solarFactor.value) * 100) / 100;

    lineItemsByCategory.electricity.push({
      id: "electricity_solar_offset",
      category: "electricity",
      lineItem: "Rooftop Solar Clean Energy Generation",
      activity: personalSolarKwh,
      unit: "kWh/month generated",
      factor: solarFactor.value,
      factorSource: solarFactor.source,
      factorYear: solarFactor.year,
      co2eKg: -solarAvoidedCo2e,
      dataQuality: "measured",
      formulaText: `-${personalSolarKwh} kWh × 0.82 kg CO₂e/kWh = -${solarAvoidedCo2e} kg CO₂e`,
      notes: "Grid offset credit from on-site rooftop photovoltaic array",
    });
  }

  // 3. FOOD CALCULATION
  const f = profile.food;
  const foodKey = `food_diet_${f.dietType}`;
  const dietFactor = EMISSION_FACTORS[foodKey] || EMISSION_FACTORS["food_diet_vegetarian"];

  // Waste multiplier
  let wasteMultiplier = 1.0;
  if (f.foodWasteLevel === "low") wasteMultiplier = 0.95;
  else if (f.foodWasteLevel === "medium") wasteMultiplier = 1.05;
  else if (f.foodWasteLevel === "high") wasteMultiplier = 1.20;

  const adjustedDailyFactor = Math.round(dietFactor.value * wasteMultiplier * 1000) / 1000;
  const foodMonthlyCo2e = Math.round(DAYS_PER_MONTH * adjustedDailyFactor * 100) / 100;

  lineItemsByCategory.food.push({
    id: "food_primary_diet",
    category: "food",
    lineItem: `Dietary Baseline (${dietFactor.subcategory})`,
    activity: DAYS_PER_MONTH,
    unit: "days/month",
    factor: adjustedDailyFactor,
    factorSource: dietFactor.source,
    factorYear: dietFactor.year,
    co2eKg: foodMonthlyCo2e,
    dataQuality: f.dataQuality || "estimated",
    formulaText: `${DAYS_PER_MONTH} days × ${adjustedDailyFactor} kg CO₂e/day (${f.foodWasteLevel} waste index) = ${foodMonthlyCo2e} kg CO₂e`,
    notes: `${dietFactor.notes}. Food waste factor: ${wasteMultiplier}x`,
  });

  // 4. SHOPPING & CONSUMER GOODS CALCULATION
  const s = profile.shopping;
  const clothingFactor = EMISSION_FACTORS["shopping_clothing"];
  const electronicsFactor = EMISSION_FACTORS["shopping_electronics"];
  const deliveryFactor = EMISSION_FACTORS["shopping_online_delivery"];

  // Second-hand discount factor (reduces embodied emissions by up to 70% on reused portion)
  const reuseFactor = 1.0 - (Math.min(100, Math.max(0, s.secondHandPercentage || 0)) / 100) * 0.70;

  // Clothing (per ₹100 spend)
  const clothingActivityUnits = Math.round((s.clothingSpendMonthlyInr / 100) * 10) / 10;
  const clothingCo2e = Math.round(clothingActivityUnits * clothingFactor.value * reuseFactor * 100) / 100;
  lineItemsByCategory.shopping.push({
    id: "shopping_clothing",
    category: "shopping",
    lineItem: "Clothing & Apparel",
    activity: clothingActivityUnits,
    unit: "hundred INR spend",
    factor: clothingFactor.value,
    factorSource: clothingFactor.source,
    factorYear: clothingFactor.year,
    co2eKg: clothingCo2e,
    dataQuality: s.dataQuality || "estimated",
    formulaText: `(₹${s.clothingSpendMonthlyInr} / 100) × ${clothingFactor.value} kg × ${reuseFactor.toFixed(2)} reuse factor = ${clothingCo2e} kg CO₂e`,
    notes: s.secondHandPercentage > 0 ? `${s.secondHandPercentage}% second-hand discount applied` : undefined,
  });

  // Electronics (per ₹100 spend amortized)
  const elecActivityUnits = Math.round((s.electronicsSpendMonthlyInr / 100) * 10) / 10;
  const electronicsCo2e = Math.round(elecActivityUnits * electronicsFactor.value * 100) / 100;
  lineItemsByCategory.shopping.push({
    id: "shopping_electronics",
    category: "shopping",
    lineItem: "Consumer Electronics & Gadgets",
    activity: elecActivityUnits,
    unit: "hundred INR spend",
    factor: electronicsFactor.value,
    factorSource: electronicsFactor.source,
    factorYear: electronicsFactor.year,
    co2eKg: electronicsCo2e,
    dataQuality: "estimated",
    formulaText: `(₹${s.electronicsSpendMonthlyInr} / 100) × ${electronicsFactor.value} kg = ${electronicsCo2e} kg CO₂e`,
  });

  // Online e-commerce deliveries
  if (s.onlineDeliveriesPerMonth > 0) {
    const deliveryCo2e = Math.round(s.onlineDeliveriesPerMonth * deliveryFactor.value * 100) / 100;
    lineItemsByCategory.shopping.push({
      id: "shopping_deliveries",
      category: "shopping",
      lineItem: `E-Commerce Deliveries (${s.onlineDeliveriesPerMonth} parcels/month)`,
      activity: s.onlineDeliveriesPerMonth,
      unit: "deliveries/month",
      factor: deliveryFactor.value,
      factorSource: deliveryFactor.source,
      factorYear: deliveryFactor.year,
      co2eKg: deliveryCo2e,
      dataQuality: "estimated",
      formulaText: `${s.onlineDeliveriesPerMonth} packages × ${deliveryFactor.value} kg CO₂e/delivery = ${deliveryCo2e} kg CO₂e`,
    });
  }

  // 5. WASTE CALCULATION
  const w = profile.waste;
  const landfillFactor = EMISSION_FACTORS["waste_landfill_unsegregated"];

  // Monthly waste volume in kg
  let wasteKgPerMonth = 14.0; // Pune average per person ~0.45 kg/day * 30.4 days
  if (w.wasteVolumeLevel === "minimal") wasteKgPerMonth = 9.0;
  else if (w.wasteVolumeLevel === "high") wasteKgPerMonth = 22.0;

  const baselineWasteCo2e = Math.round(wasteKgPerMonth * landfillFactor.value * 100) / 100;
  lineItemsByCategory.waste.push({
    id: "waste_municipal_landfill",
    category: "waste",
    lineItem: "Municipal Solid Waste Baseline",
    activity: wasteKgPerMonth,
    unit: "kg waste/month",
    factor: landfillFactor.value,
    factorSource: landfillFactor.source,
    factorYear: landfillFactor.year,
    co2eKg: baselineWasteCo2e,
    dataQuality: w.dataQuality || "estimated",
    formulaText: `${wasteKgPerMonth} kg × ${landfillFactor.value} kg CO₂e/kg = ${baselineWasteCo2e} kg CO₂e`,
    notes: "Assumes standard urban municipal collection and landfill disposal",
  });

  // Composting credit
  if (w.compostsOrganic) {
    const compostFactor = EMISSION_FACTORS["waste_composting_credit"];
    const compostKg = Math.round(wasteKgPerMonth * 0.50 * 10) / 10; // ~50% wet organic fraction
    const compostCreditCo2e = Math.round(compostKg * Math.abs(compostFactor.value) * 100) / 100;

    lineItemsByCategory.waste.push({
      id: "waste_compost_credit",
      category: "waste",
      lineItem: "Organic Waste Home Composting",
      activity: compostKg,
      unit: "kg organic waste",
      factor: compostFactor.value,
      factorSource: compostFactor.source,
      factorYear: compostFactor.year,
      co2eKg: -compostCreditCo2e,
      dataQuality: "estimated",
      formulaText: `-${compostKg} kg × 0.52 kg CO₂e/kg avoided = -${compostCreditCo2e} kg CO₂e`,
      notes: "Prevents anaerobic methane formation in municipal dump sites",
    });
  }

  // Recycling segregation credit
  if (w.segregatesDryWaste) {
    const recycleFactor = EMISSION_FACTORS["waste_recycling_credit"];
    const recycleKg = Math.round(wasteKgPerMonth * 0.30 * 10) / 10;
    const recycleCreditCo2e = Math.round(recycleKg * Math.abs(recycleFactor.value) * 100) / 100;

    lineItemsByCategory.waste.push({
      id: "waste_recycling_credit",
      category: "waste",
      lineItem: "Dry Waste Segregation & Recycling",
      activity: recycleKg,
      unit: "kg dry waste",
      factor: recycleFactor.value,
      factorSource: recycleFactor.source,
      factorYear: recycleFactor.year,
      co2eKg: -recycleCreditCo2e,
      dataQuality: "estimated",
      formulaText: `-${recycleKg} kg × 0.38 kg CO₂e/kg avoided = -${recycleCreditCo2e} kg CO₂e`,
      notes: "Recycling papers, cartons, plastics via formal/informal kabadiwala network",
    });
  }

  // Calculate totals and percentages
  const categories: CarbonCategory[] = ["transport", "electricity", "food", "shopping", "waste"];
  let totalCo2e = 0;
  const categoryTotals: Record<CarbonCategory, number> = {
    transport: 0,
    electricity: 0,
    food: 0,
    shopping: 0,
    waste: 0,
  };

  categories.forEach((cat) => {
    const catSum = lineItemsByCategory[cat].reduce((acc, item) => acc + item.co2eKg, 0);
    const roundedCatSum = Math.max(0, Math.round(catSum * 100) / 100);
    categoryTotals[cat] = roundedCatSum;
    totalCo2e += roundedCatSum;
  });

  totalCo2e = Math.round(totalCo2e * 100) / 100;

  const confidence = calculateConfidence(profile);

  const byCategory: Record<CarbonCategory, CategorySummary> = {} as any;
  categories.forEach((cat) => {
    const catKg = categoryTotals[cat];
    const percentage = totalCo2e > 0 ? Math.round((catKg / totalCo2e) * 1000) / 10 : 0;
    byCategory[cat] = {
      category: cat,
      co2eKg: catKg,
      percentage,
      lineItems: lineItemsByCategory[cat],
      confidenceScore: confidence.categoryScores[cat],
    };
  });

  return {
    totalCo2eKg: totalCo2e,
    byCategory,
    overallConfidenceScore: confidence.overallScore,
    confidenceRating: confidence.rating,
    confidenceExplanation: confidence.explanations,
    calculatedAt: new Date().toISOString(),
  };
}
