import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { generateSustainabilityChatResponse, GroundingContext } from "@/lib/ai/groq";

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });

    const { messages, conversationId } = await req.json();

    if (!messages?.length) {
      return NextResponse.json({ error: { message: "Messages array required" } }, { status: 400 });
    }

    // 1. Fetch grounded user data
    const snapshot = await prisma.footprintSnapshot.findFirst({
      where: { userId: user.id },
      orderBy: { periodStart: "desc" },
      include: { hotspots: { orderBy: { rank: "asc" } } },
    });

    const activeGoal = await prisma.goal.findFirst({
      where: { userId: user.id, status: "active" },
    });

    const activeActions = await prisma.userAction.findMany({
      where: { userId: user.id, status: "accepted" },
      take: 5,
    });

    const skippedActions = await prisma.userAction.findMany({
      where: { userId: user.id, status: "skipped" },
      take: 3,
    });

    const totalMonthlyKg = snapshot ? snapshot.totalKg : 127.6;
    let byCategoryMap: Record<string, { kg: number; percentage: number }> = {};
    if (snapshot) {
      const parsedCat = JSON.parse(snapshot.byCategory);
      Object.entries(parsedCat).forEach(([k, v]: [string, any]) => {
        byCategoryMap[k] = { kg: v.co2eKg, percentage: v.percentage };
      });
    } else {
      byCategoryMap = {
        transport: { kg: 39.7, percentage: 31.1 },
        electricity: { kg: 32.1, percentage: 25.1 },
        food: { kg: 28.0, percentage: 21.9 },
        shopping: { kg: 17.7, percentage: 13.9 },
        waste: { kg: 10.1, percentage: 7.9 },
      };
    }

    const groundingContext: GroundingContext = {
      userName: user.name,
      totalMonthlyKg,
      breakdown: byCategoryMap,
      hotspots: snapshot?.hotspots?.map((h) => ({
        rank: h.rank,
        category: h.category,
        lineItem: h.lineItem,
        kg: h.kg,
        percent: h.percent,
      })) || [
        { rank: 1, category: "transport", lineItem: "Two-Wheeler Commute", kg: 39.7, percent: 31.1 },
        { rank: 2, category: "electricity", lineItem: "Air Conditioning", kg: 32.1, percent: 25.1 },
      ],
      activeGoal: activeGoal
        ? {
            targetPercent: activeGoal.targetPercent,
            deadline: activeGoal.deadline.toISOString().substring(0, 10),
            baselineKg: activeGoal.baselineKg,
          }
        : undefined,
      activePlan: activeActions.map((a) => ({
        title: a.title,
        category: a.category,
        estimatedMonthlyKg: a.estimatedMonthlyKg,
      })),
      recentSkippedActions: skippedActions.map((s) => ({
        title: s.title,
        reason: s.skipReason || "not_practical",
      })),
    };

    // 2. Call AI module (Groq Llama 3.3 70B or deterministic fallback)
    const aiResult = await generateSustainabilityChatResponse(messages, groundingContext);

    // 3. Persist in conversation if ID provided or create new
    let convId = conversationId;
    if (!convId) {
      const conv = await prisma.chatConversation.create({
        data: {
          userId: user.id,
          title: messages[messages.length - 1].content.substring(0, 40) + "...",
        },
      });
      convId = conv.id;
    }

    const lastUserMsg = messages[messages.length - 1];
    await prisma.chatMessage.create({
      data: {
        conversationId: convId,
        role: "user",
        content: lastUserMsg.content,
      },
    });

    await prisma.chatMessage.create({
      data: {
        conversationId: convId,
        role: "assistant",
        content: aiResult.content,
        toolCalls: aiResult.toolCalls ? JSON.stringify(aiResult.toolCalls) : null,
        groundingRefs: JSON.stringify({
          totalMonthlyKg,
          modelUsed: aiResult.modelUsed,
          groundingUsed: aiResult.groundingUsed,
        }),
      },
    });

    return NextResponse.json({
      conversationId: convId,
      message: {
        role: "assistant",
        content: aiResult.content,
        toolCalls: aiResult.toolCalls,
        groundingUsed: aiResult.groundingUsed,
        modelUsed: aiResult.modelUsed,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: { message: err?.message } }, { status: 500 });
  }
}
