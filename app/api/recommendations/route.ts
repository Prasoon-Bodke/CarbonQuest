import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { ACTIONS_LIBRARY } from "@/lib/recommendation/actionsLibrary";
import {
  calculatePriorityScore,
  LearnedAffinities,
  UserPreferences,
} from "@/lib/recommendation/scoring";
import { DEFAULT_LEARNED_AFFINITIES } from "@/lib/recommendation/adaptive";
import { DEMO_BASELINE_PROFILE } from "@/lib/carbon/scenarios";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });

    const prefRecord = await prisma.preferenceProfile.findUnique({
      where: { userId: user.id },
    });

    const userPrefs: UserPreferences = {
      willingCategories: prefRecord
        ? JSON.parse(prefRecord.willingCategories)
        : ["transport", "electricity", "food", "shopping", "waste"],
      budgetSensitivity: (prefRecord?.budgetSensitivity as any) || "medium",
      maxPreferredDifficulty: (prefRecord?.preferredDifficulty as any) || "medium",
    };

    const affinities: LearnedAffinities = prefRecord?.learnedAffinities
      ? JSON.parse(prefRecord.learnedAffinities)
      : DEFAULT_LEARNED_AFFINITIES;

    // Fetch user actions to know what is already accepted or skipped
    const existingActions = await prisma.userAction.findMany({
      where: { userId: user.id },
    });
    const acceptedSlugs = existingActions.filter((a) => a.status === "accepted").map((a) => a.actionSlug);
    const skippedSlugs = existingActions.filter((a) => a.status === "skipped").map((a) => a.actionSlug);

    // Score all action templates
    const recommendations = ACTIONS_LIBRARY.map((template) => {
      const scored = calculatePriorityScore(
        template,
        DEMO_BASELINE_PROFILE,
        userPrefs,
        affinities,
        25 // max available impact
      );

      let userStatus: "available" | "accepted" | "skipped" | "completed" = "available";
      if (acceptedSlugs.includes(template.slug)) userStatus = "accepted";
      else if (skippedSlugs.includes(template.slug)) userStatus = "skipped";
      else if (affinities.completedActionSlugs.includes(template.slug)) userStatus = "completed";

      return {
        ...scored,
        userStatus,
      };
    });

    // Sort by priorityScore descending
    recommendations.sort((a, b) => b.priorityScore - a.priorityScore);

    return NextResponse.json({
      recommendations,
      count: recommendations.length,
      topRecommendation: recommendations[0],
    });
  } catch (err: any) {
    return NextResponse.json({ error: { message: err?.message } }, { status: 500 });
  }
}
