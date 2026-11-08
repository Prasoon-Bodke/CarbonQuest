import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });

    return NextResponse.json({ user });
  } catch (err: any) {
    return NextResponse.json({ error: { message: err?.message } }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });

    const body = await req.json();
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: body.name !== undefined ? body.name : user.name,
        location: body.location !== undefined ? body.location : user.location,
        householdSize: body.householdSize !== undefined ? Number(body.householdSize) : user.householdSize,
        homeType: body.homeType !== undefined ? body.homeType : user.homeType,
        units: body.units !== undefined ? body.units : user.units,
        theme: body.theme !== undefined ? body.theme : user.theme,
      },
    });

    return NextResponse.json({ user: updated });
  } catch (err: any) {
    return NextResponse.json({ error: { message: err?.message } }, { status: 500 });
  }
}
