import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });

    const snapshot = await prisma.footprintSnapshot.findFirst({
      where: { userId: user.id },
      orderBy: { periodStart: "desc" },
      include: {
        hotspots: {
          orderBy: { rank: "asc" },
        },
      },
    });

    if (!snapshot || !snapshot.hotspots.length) {
      // Fallback standard hotspots for Pune demo
      return NextResponse.json({
        hotspots: [
          { id: "h1", rank: 1, category: "transport", lineItem: "Two-Wheeler Commute (Petrol)", kg: 39.7, percent: 31.1, severity: "high" },
          { id: "h2", rank: 2, category: "electricity", lineItem: "Air Conditioning (Split AC)", kg: 32.1, percent: 25.1, severity: "high" },
          { id: "h3", rank: 3, category: "food", lineItem: "Dietary Baseline (Vegetarian)", kg: 28.0, percent: 21.9, severity: "medium" },
          { id: "h4", rank: 4, category: "shopping", lineItem: "Clothing & Fast Fashion", kg: 17.7, percent: 13.9, severity: "low" },
          { id: "h5", rank: 5, category: "waste", lineItem: "Unsegregated Landfill Waste", kg: 10.1, percent: 7.9, severity: "low" },
        ],
      });
    }

    return NextResponse.json({ hotspots: snapshot.hotspots });
  } catch (err: any) {
    return NextResponse.json({ error: { message: err?.message } }, { status: 500 });
  }
}
