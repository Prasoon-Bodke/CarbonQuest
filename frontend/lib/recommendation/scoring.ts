import { CarbonCategory, CarbonInputProfile } from "../carbon/types";
import { BehaviorChange, simulateBehaviorChanges } from "../carbon/scenarios";

export type ActionDifficulty = "easy" | "medium" | "hard";
export type CostImpact = "saves_money" | "neutral" | "costs_money";

export interface ActionTemplateDefinition {
  id: string;
  slug: string;
  title: string;
  category: CarbonCategory;
  description: string;
  difficulty: ActionDifficulty;
  costImpact: CostImpact;
  changeType: BehaviorChange["type"];
  defaultMagnitude: number;
  unit: string;
  tags: string[];
  applicableIf?: (profile: CarbonInputProfile) => boolean;
  computeMagnitudeForUser?: (profile: CarbonInputProfile) => number;
}

export interface UserPreferences {
  willingCategories: CarbonCategory[];
  budgetSensitivity: "low" | "medium" | "high";
  maxPreferredDifficulty: ActionDifficulty;
  preferredDaysPerWeek?: number;
}

export interface LearnedAffinities {
  categoryWeights: Record<CarbonCategory, number>; // baseline 1.0, adjusted via feedback
  difficultyWeights: Record<ActionDifficulty, number>; // baseline 1.0
  skipReasonCounts: Record<string, number>;
  completedActionSlugs: string[];
  skippedActionSlugs: string[];
  rejectedActionSlugs: string[];
  lastSkippedReason?: string;
  lastSkippedActionSlug?: string;
  totalAccepted: number;
  totalSkipped: number;
  totalCompleted: number;
}

export interface PriorityScoreBreakdown {
  normalizedImpact: number; // 0 - 100
  preferenceFit: number; // 0 - 100
  feasibilityAndCost: number; // 0 - 100
  behaviorAdjustment: number; // -30 to +30
  weightedTotal: number; // 0 - 100
  weightsUsed: {
    w1_impact: number;
    w2_preference: number;
    w3_feasibility: number;
    w4_behavior: number;
  };
}

export interface ScoredRecommendation {
  actionId: string;
  template: ActionTemplateDefinition;
  estimatedKgPerMonth: number;
  estimatedCostSavingsInr: number;
  priorityScore: number;
  scoreBreakdown: PriorityScoreBreakdown;
  rationale: string;
  userMagnitude: number;
}

export const SCORING_WEIGHTS = {
  w1_impact: 0.35,
  w2_preference: 0.25,
  w3_feasibility: 0.20,
  w4_behavior: 0.20,
};

/**
 * Calculates the transparent 4-factor priority score for an action template.
 */
export function calculatePriorityScore(
  template: ActionTemplateDefinition,
  profile: CarbonInputProfile,
  preferences: UserPreferences,
  affinities: LearnedAffinities,
  maxAvailableImpactKg: number = 25
): ScoredRecommendation {
  // 1. Calculate user-specific impact via carbon engine
  const userMagnitude = template.computeMagnitudeForUser
    ? template.computeMagnitudeForUser(profile)
    : template.defaultMagnitude;

  const sim = simulateBehaviorChanges(profile, [
    {
      category: template.category,
      type: template.changeType,
      magnitude: userMagnitude,
    },
  ]);

  const estimatedKg = sim.absoluteMonthlySavingKg;
  const costSavingsInr = sim.estimatedCostSavingInrMonthly;

  // Normalized Impact (0 - 100)
  const safeMaxImpact = Math.max(1, maxAvailableImpactKg);
  const normalizedImpact = Math.min(100, Math.round((estimatedKg / safeMaxImpact) * 100));

  // Preference Fit (0 - 100)
  let prefScore = 50;
  if (preferences.willingCategories.includes(template.category)) {
    prefScore += 35;
  }
  if (preferences.maxPreferredDifficulty === "hard") prefScore += 15;
  else if (preferences.maxPreferredDifficulty === "medium" && template.difficulty !== "hard") prefScore += 15;
  else if (preferences.maxPreferredDifficulty === "easy" && template.difficulty === "easy") prefScore += 15;
  const preferenceFit = Math.min(100, Math.max(0, prefScore));

  // Feasibility & Cost (0 - 100)
  let feasScore = 60;
  if (template.difficulty === "easy") feasScore += 25;
  else if (template.difficulty === "medium") feasScore += 10;
  else feasScore -= 10;

  if (template.costImpact === "saves_money") feasScore += 15;
  else if (template.costImpact === "neutral") feasScore += 5;
  else if (preferences.budgetSensitivity === "high") feasScore -= 20;

  const feasibilityAndCost = Math.min(100, Math.max(0, feasScore));

  // Past Behavior Adjustment (-30 to +30)
  let behaviorAdj = 0;
  const catWeight = affinities.categoryWeights[template.category] ?? 1.0;
  const diffWeight = affinities.difficultyWeights[template.difficulty] ?? 1.0;

  behaviorAdj += (catWeight - 1.0) * 20;
  behaviorAdj += (diffWeight - 1.0) * 15;

  // If action already completed, slightly deprioritize or keep moderate
  if (affinities.completedActionSlugs.includes(template.slug)) {
    behaviorAdj -= 10;
  }

  // If this specific action was skipped recently, penalize strongly
  if (affinities.skippedActionSlugs.includes(template.slug)) {
    behaviorAdj -= 25;
  }

  // Closed loop rule: If user skipped cycling due to practicality, boost bus/public transit!
  let adaptationRationale = "";
  if (
    affinities.lastSkippedActionSlug === "commute_cycle_2days" &&
    affinities.lastSkippedReason?.toLowerCase().includes("practical")
  ) {
    if (template.slug === "commute_bus_2days" || template.slug === "commute_metro_2days") {
      behaviorAdj += 30; // Direct adaptive pivot!
      adaptationRationale = "Because you skipped cycling as impractical, we prioritized this accessible public transit alternative.";
    }
  }

  const boundedBehaviorAdj = Math.min(30, Math.max(-30, Math.round(behaviorAdj)));

  // Weighted Total (0 - 100)
  const weightedTotal = Math.round(
    Math.min(
      100,
      Math.max(
        0,
        SCORING_WEIGHTS.w1_impact * normalizedImpact +
          SCORING_WEIGHTS.w2_preference * preferenceFit +
          SCORING_WEIGHTS.w3_feasibility * feasibilityAndCost +
          SCORING_WEIGHTS.w4_behavior * ((boundedBehaviorAdj + 30) / 0.6) // normalize -30..+30 into 0..100
      )
    )
  );

  // Dynamic Rationale
  let rationale = adaptationRationale;
  if (!rationale) {
    if (estimatedKg >= 10) {
      rationale = `High-impact opportunity: saves ~${estimatedKg.toFixed(1)} kg CO₂e/mo (${template.costImpact === "saves_money" ? "reduces monthly bills" : "low cost"}).`;
    } else if (template.difficulty === "easy") {
      rationale = `Quick-win habit: zero financial friction with verified ~${estimatedKg.toFixed(1)} kg CO₂e/mo savings.`;
    } else {
      rationale = `Targeted for your ${template.category} footprint profile to support steady progress toward your climate goal.`;
    }
  }

  return {
    actionId: template.id,
    template,
    estimatedKgPerMonth: estimatedKg,
    estimatedCostSavingsInr: costSavingsInr,
    priorityScore: weightedTotal,
    scoreBreakdown: {
      normalizedImpact,
      preferenceFit,
      feasibilityAndCost,
      behaviorAdjustment: boundedBehaviorAdj,
      weightedTotal,
      weightsUsed: SCORING_WEIGHTS,
    },
    rationale,
    userMagnitude,
  };
}
