import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { updateLearnedAffinities } from "@/lib/recommendation/adaptive";
import { LearnedAffinities } from "@/lib/recommendation/scoring";
import { ACTIONS_LIBRARY } from "@/lib/recommendation/actionsLibrary";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });

    const body = await req.json();
    const { action, reason, modifiedMagnitude } = body; // action: 'accept' | 'modify' | 'skip' | 'complete'
    const slug = params.id;

    const template = ACTIONS_LIBRARY.find((a) => a.slug === slug || a.id === slug);
    const category = template?.category || "transport";
    const difficulty = template?.difficulty || "medium";
    const title = template?.title || slug;

    // Fetch existing preference profile to update learned affinities
    const prefRecord = await prisma.preferenceProfile.findUnique({
      where: { userId: user.id },
    });

    let affinities: LearnedAffinities = prefRecord?.learnedAffinities
      ? JSON.parse(prefRecord.learnedAffinities)
      : {
          categoryWeights: { transport: 1, electricity: 1, food: 1, shopping: 1, waste: 1 },
          difficultyWeights: { easy: 1.1, medium: 1.0, hard: 0.8 },
          skipReasonCounts: { not_practical: 0, too_costly: 0, not_interested: 0, already_doing: 0, other: 0 },
          completedActionSlugs: [],
          skippedActionSlugs: [],
          rejectedActionSlugs: [],
          totalAccepted: 0,
          totalSkipped: 0,
          totalCompleted: 0,
        };

    let userAction = await prisma.userAction.findFirst({
      where: { userId: user.id, actionSlug: slug },
    });

    let pointsAwarded = 0;
    let badgeUnlocked: string | null = null;

    if (action === "accept") {
      affinities = updateLearnedAffinities(affinities, {
        type: "accept",
        actionSlug: slug,
        category,
        difficulty,
      });

      if (userAction) {
        userAction = await prisma.userAction.update({
          where: { id: userAction.id },
          data: { status: "accepted", skipReason: null },
        });
      } else {
        userAction = await prisma.userAction.create({
          data: {
            userId: user.id,
            actionSlug: slug,
            title,
            category,
            status: "accepted",
            estimatedMonthlyKg: template?.defaultMagnitude ? template.defaultMagnitude * 3.5 : 5.0,
          },
        });
      }
    } else if (action === "modify") {
      affinities = updateLearnedAffinities(affinities, {
        type: "modify",
        actionSlug: slug,
        category,
        modifiedMagnitude: modifiedMagnitude || 1,
      });

      if (userAction) {
        userAction = await prisma.userAction.update({
          where: { id: userAction.id },
          data: {
            status: "accepted",
            modifiedParams: JSON.stringify({ magnitude: modifiedMagnitude }),
          },
        });
      } else {
        userAction = await prisma.userAction.create({
          data: {
            userId: user.id,
            actionSlug: slug,
            title,
            category,
            status: "accepted",
            modifiedParams: JSON.stringify({ magnitude: modifiedMagnitude }),
          },
        });
      }
    } else if (action === "skip") {
      affinities = updateLearnedAffinities(affinities, {
        type: "skip",
        actionSlug: slug,
        category,
        difficulty,
        reason: reason || "not_practical",
      });

      if (userAction) {
        userAction = await prisma.userAction.update({
          where: { id: userAction.id },
          data: { status: "skipped", skipReason: reason || "not_practical" },
        });
      } else {
        userAction = await prisma.userAction.create({
          data: {
            userId: user.id,
            actionSlug: slug,
            title,
            category,
            status: "skipped",
            skipReason: reason || "not_practical",
          },
        });
      }
    } else if (action === "complete") {
      affinities = updateLearnedAffinities(affinities, {
        type: "complete",
        actionSlug: slug,
        category,
        difficulty,
      });

      pointsAwarded = 50;

      if (userAction) {
        userAction = await prisma.userAction.update({
          where: { id: userAction.id },
          data: { status: "completed", completedAt: new Date() },
        });
      } else {
        userAction = await prisma.userAction.create({
          data: {
            userId: user.id,
            actionSlug: slug,
            title,
            category,
            status: "completed",
            completedAt: new Date(),
          },
        });
      }

      // Record points in ledger
      await prisma.pointsLedger.create({
        data: {
          userId: user.id,
          points: pointsAwarded,
          actionType: "action_completed",
          description: `Completed climate habit: ${title}`,
        },
      });

      // Update Streak
      const streak = await prisma.streak.findUnique({ where: { userId: user.id } });
      if (streak) {
        await prisma.streak.update({
          where: { userId: user.id },
          data: {
            currentStreak: streak.currentStreak + 1,
            longestStreak: Math.max(streak.longestStreak, streak.currentStreak + 1),
            lastActiveDate: new Date(),
          },
        });
      }

      // Check if Century Club badge unlocked (> 100 kg avoided)
      const allCheckins = await prisma.actionCheckin.aggregate({
        where: { userAction: { userId: user.id } },
        _sum: { estimatedKgAvoided: true },
      });
      const totalAvoided = (allCheckins._sum.estimatedKgAvoided || 0) + 12.3;
      if (totalAvoided >= 100) {
        const hasBadge = await prisma.userBadge.findFirst({
          where: { userId: user.id, badgeId: "badge_century_club" },
        });
        if (!hasBadge) {
          await prisma.userBadge.create({
            data: { userId: user.id, badgeId: "badge_century_club" },
          });
          badgeUnlocked = "100kg CO₂e Avoided";
        }
      }
    }

    // Save updated affinities
    if (prefRecord) {
      await prisma.preferenceProfile.update({
        where: { id: prefRecord.id },
        data: { learnedAffinities: JSON.stringify(affinities) },
      });
    }

    return NextResponse.json({
      success: true,
      userAction,
      updatedAffinities: affinities,
      pointsAwarded,
      badgeUnlocked,
      message:
        action === "skip" && reason === "not_practical" && slug.includes("cycle")
          ? "Skipped cycling recorded: public transit alternatives will now be boosted in your recommendations."
          : `Action ${action} successful.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: { message: err?.message } }, { status: 500 });
  }
}
