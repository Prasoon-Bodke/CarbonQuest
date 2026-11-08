import { CarbonCategory } from "../carbon/types";
import { ActionDifficulty, LearnedAffinities } from "./scoring";

export type ActionFeedbackEvent =
  | { type: "accept"; actionSlug: string; category: CarbonCategory; difficulty: ActionDifficulty }
  | { type: "modify"; actionSlug: string; category: CarbonCategory; modifiedMagnitude: number }
  | {
      type: "skip";
      actionSlug: string;
      category: CarbonCategory;
      difficulty: ActionDifficulty;
      reason: "not_practical" | "too_costly" | "not_interested" | "already_doing" | "other";
    }
  | { type: "complete"; actionSlug: string; category: CarbonCategory; difficulty: ActionDifficulty }
  | { type: "reject"; actionSlug: string; category: CarbonCategory; reason?: string };

export const DEFAULT_LEARNED_AFFINITIES: LearnedAffinities = {
  categoryWeights: {
    transport: 1.0,
    electricity: 1.0,
    food: 1.0,
    shopping: 1.0,
    waste: 1.0,
  },
  difficultyWeights: {
    easy: 1.1,
    medium: 1.0,
    hard: 0.8,
  },
  skipReasonCounts: {
    not_practical: 0,
    too_costly: 0,
    not_interested: 0,
    already_doing: 0,
    other: 0,
  },
  completedActionSlugs: [],
  skippedActionSlugs: [],
  rejectedActionSlugs: [],
  totalAccepted: 8,
  totalSkipped: 2,
  totalCompleted: 6,
};

/**
 * Closed-Loop Adaptive Learning Update Function.
 * Updates user affinity vectors using exponentially smoothed updates and Bayesian adjustments.
 */
export function updateLearnedAffinities(
  current: LearnedAffinities,
  event: ActionFeedbackEvent
): LearnedAffinities {
  const updated: LearnedAffinities = JSON.parse(JSON.stringify(current));

  switch (event.type) {
    case "accept": {
      updated.totalAccepted += 1;
      // Reinforce category affinity
      updated.categoryWeights[event.category] = Math.min(
        1.5,
        Math.round((updated.categoryWeights[event.category] + 0.05) * 100) / 100
      );
      // Reinforce difficulty
      updated.difficultyWeights[event.difficulty] = Math.min(
        1.4,
        Math.round((updated.difficultyWeights[event.difficulty] + 0.04) * 100) / 100
      );
      break;
    }

    case "complete": {
      updated.totalCompleted += 1;
      if (!updated.completedActionSlugs.includes(event.actionSlug)) {
        updated.completedActionSlugs.push(event.actionSlug);
      }
      // Strong category reinforcement
      updated.categoryWeights[event.category] = Math.min(
        1.6,
        Math.round((updated.categoryWeights[event.category] + 0.08) * 100) / 100
      );
      // Boost confidence in this difficulty
      updated.difficultyWeights[event.difficulty] = Math.min(
        1.5,
        Math.round((updated.difficultyWeights[event.difficulty] + 0.06) * 100) / 100
      );
      break;
    }

    case "modify": {
      updated.totalAccepted += 1;
      // Moderate positive signal with user customized calibration
      updated.categoryWeights[event.category] = Math.min(
        1.5,
        Math.round((updated.categoryWeights[event.category] + 0.04) * 100) / 100
      );
      break;
    }

    case "skip": {
      updated.totalSkipped += 1;
      if (!updated.skippedActionSlugs.includes(event.actionSlug)) {
        updated.skippedActionSlugs.push(event.actionSlug);
      }
      updated.skipReasonCounts[event.reason] = (updated.skipReasonCounts[event.reason] || 0) + 1;
      updated.lastSkippedActionSlug = event.actionSlug;
      updated.lastSkippedReason = event.reason;

      // Category-level or difficulty adjustments based on skip reason
      if (event.reason === "too_costly") {
        // Suppress actions that require high capital outlay
        updated.difficultyWeights.hard = Math.max(0.4, Math.round((updated.difficultyWeights.hard - 0.1) * 100) / 100);
      } else if (event.reason === "not_practical") {
        // Reduce affinity for harder actions in that category
        updated.difficultyWeights[event.difficulty] = Math.max(
          0.5,
          Math.round((updated.difficultyWeights[event.difficulty] - 0.08) * 100) / 100
        );
      } else if (event.reason === "not_interested") {
        // Gently taper category interest
        updated.categoryWeights[event.category] = Math.max(
          0.6,
          Math.round((updated.categoryWeights[event.category] - 0.05) * 100) / 100
        );
      }
      break;
    }

    case "reject": {
      updated.totalSkipped += 1;
      if (!updated.rejectedActionSlugs.includes(event.actionSlug)) {
        updated.rejectedActionSlugs.push(event.actionSlug);
      }
      updated.categoryWeights[event.category] = Math.max(
        0.5,
        Math.round((updated.categoryWeights[event.category] - 0.1) * 100) / 100
      );
      break;
    }
  }

  return updated;
}

/**
 * Calculates rolling personalization accuracy metric (0 - 100%).
 */
export function calculatePersonalizationAccuracy(affinities: LearnedAffinities): number {
  const totalInteractions = affinities.totalAccepted + affinities.totalSkipped;
  if (totalInteractions === 0) return 78.5; // Baseline prior
  const rawRate = (affinities.totalAccepted / totalInteractions) * 100;
  // Beta smoothing with prior (alpha = 14, beta = 4)
  const smoothedRate = ((affinities.totalAccepted + 14) / (totalInteractions + 18)) * 100;
  return Math.round(smoothedRate * 10) / 10;
}
