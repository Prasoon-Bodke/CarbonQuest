import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const templates = await prisma.actionTemplate.findMany({
      orderBy: [{ category: "asc" }, { title: "asc" }],
    });
    return NextResponse.json({ templates, count: templates.length });
  } catch (err: any) {
    return NextResponse.json({ error: { message: err?.message } }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, title, description, difficulty, costImpact, active } = body;

    const updated = await prisma.actionTemplate.update({
      where: { id },
      data: {
        title: title !== undefined ? title : undefined,
        description: description !== undefined ? description : undefined,
        difficulty: difficulty !== undefined ? difficulty : undefined,
        costImpact: costImpact !== undefined ? costImpact : undefined,
        active: active !== undefined ? Boolean(active) : undefined,
      },
    });

    return NextResponse.json({ success: true, template: updated });
  } catch (err: any) {
    return NextResponse.json({ error: { message: err?.message } }, { status: 500 });
  }
}
