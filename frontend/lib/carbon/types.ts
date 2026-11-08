export type CarbonCategory = "transport" | "electricity" | "food" | "shopping" | "waste";

export type DataQuality = "measured" | "estimated" | "defaulted";

export interface EmissionFactorEntry {
  id: string;
  category: CarbonCategory;
  subcategory: string;
  unit: string;
  value: number; // in kg CO2e per unit
  source: string; // e.g., "India CEA CO2 Baseline Database v19"
  year: number;
  region: string; // e.g., "India / Pune", "Global (IPCC AR6)"
  notes?: string;
  active: boolean;
}

export interface LineItemCalculation {
  id: string;
  category: CarbonCategory;
  lineItem: string;
  activity: number;
  unit: string;
  factor: number;
  factorSource: string;
  factorYear: number;
  co2eKg: number;
  dataQuality: DataQuality;
  formulaText: string;
  notes?: string;
}

export interface CategorySummary {
  category: CarbonCategory;
  co2eKg: number;
  percentage: number;
  lineItems: LineItemCalculation[];
  confidenceScore: number; // 0 - 100
}

export interface FootprintCalculationResult {
  totalCo2eKg: number;
  byCategory: Record<CarbonCategory, CategorySummary>;
  overallConfidenceScore: number; // 0 - 100
  confidenceRating: "low" | "medium" | "high";
  confidenceExplanation: string[];
  calculatedAt: string;
}

// User Profile inputs that feed into the deterministic carbon engine
export interface CarbonInputProfile {
  // Profile meta
  householdSize: number; // For shared home/electricity calculations
  city?: string;

  // Transport
  transport: {
    commuteMode:
      | "car_petrol"
      | "car_diesel"
      | "car_cng"
      | "car_ev"
      | "two_wheeler_petrol"
      | "two_wheeler_ev"
      | "auto_rickshaw_cng"
      | "bus_city"
      | "metro_rail"
      | "train_suburban"
      | "bicycle"
      | "walk";
    distancePerTripKm: number;
    tripsPerWeek: number;
    secondaryMode?: string;
    secondaryTripsPerWeek?: number;
    secondaryDistanceKm?: number;
    flightsDomesticPerYear?: number;
    flightsInternationalPerYear?: number;
    dataQuality?: DataQuality;
  };

  // Electricity / Home
  electricity: {
    monthlyKwh?: number; // Measured or estimated
    billAmountInr?: number; // If bill amount entered, tariff estimation (~₹8/kWh in Pune/MSEDCL)
    acCount: number;
    acHoursPerDay: number;
    acStarRating?: number; // 1-5 stars, defaults to 3-star
    acTempSetting?: number; // e.g., 22-26 C
    lpgCylindersPerMonth: number; // 14.2 kg domestic LPG cylinders
    hasSolarRooftop: boolean;
    solarGenerationKwhPerMonth?: number;
    dataQuality?: DataQuality;
  };

  // Food
  food: {
    dietType: "vegan" | "vegetarian" | "eggetarian" | "non_veg_low" | "non_veg_medium" | "non_veg_high";
    meatFrequencyPerWeek?: number; // 0-7
    dairyServingsPerDay?: number; // 0-4
    foodWasteLevel: "low" | "medium" | "high"; // low: 5%, medium: 20%, high: 35%
    eatingOutMealsPerWeek?: number;
    dataQuality?: DataQuality;
  };

  // Shopping
  shopping: {
    clothingSpendMonthlyInr: number;
    electronicsSpendMonthlyInr: number;
    onlineDeliveriesPerMonth: number;
    secondHandPercentage: number; // 0 - 100%
    dataQuality?: DataQuality;
  };

  // Waste
  waste: {
    wasteVolumeLevel: "minimal" | "average" | "high"; // kg per person estimation
    compostsOrganic: boolean;
    segregatesDryWaste: boolean;
    recyclesPaperPlastic: boolean;
    dataQuality?: DataQuality;
  };
}
