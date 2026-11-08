import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const factors = await prisma.emissionFactor.findMany({
      orderBy: [{ category: "asc" }, { subcategory: "asc" }],
    });
    return NextResponse.json({ factors, count: factors.length });
  } catch (err: any) {
    return NextResponse.json({ error: { message: err?.message } }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, value, notes, active } = body;

    if (!id || value === undefined) {
      return NextResponse.json({ error: { message: "Factor ID and value are required" } }, { status: 400 });
    }

    const updated = await prisma.emissionFactor.update({
      where: { id },
      data: {
        value: Number(value),
        notes: notes !== undefined ? notes : undefined,
        active: active !== undefined ? Boolean(active) : undefined,
      },
    });

    return NextResponse.json({ success: true, factor: updated });
  } catch (err: any) {
    return NextResponse.json({ error: { message: err?.message } }, { status: 500 });
  }
}
