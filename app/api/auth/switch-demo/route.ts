import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();
    const user = await prisma.user.findUnique({
      where: { id: userId || "user_demo_primary" },
    });

    if (!user) {
      return NextResponse.json({ error: { message: "User not found" } }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        location: user.location,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: { message: err?.message || "Switch error" } }, { status: 500 });
  }
}
