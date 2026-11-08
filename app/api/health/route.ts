import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const factorCount = await prisma.emissionFactor.count();
    const actionCount = await prisma.actionTemplate.count();

    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      service: "CarbonQuest API",
      environment: process.env.NODE_ENV || "development",
      database: {
        connected: true,
        emissionFactorsLoaded: factorCount,
        actionTemplatesLoaded: actionCount,
      },
      aiEngine: {
        provider: process.env.GROQ_API_KEY ? "Groq (Llama 3.3 70B)" : "Deterministic Climate Engine Fallback",
        status: "ready",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: "degraded",
        error: error?.message || "Database connection error",
      },
      { status: 500 }
    );
  }
}
