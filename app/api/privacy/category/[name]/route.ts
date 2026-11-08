import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function DELETE(
  req: Request,
  { params }: { params: { name: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });

    const category = params.name.toLowerCase();
    let count = 0;

    if (category === "trips") {
      const res = await prisma.trip.deleteMany({ where: { userId: user.id } });
      count = res.count;
    } else if (category === "conversations") {
      const res = await prisma.chatConversation.deleteMany({ where: { userId: user.id } });
      count = res.count;
    } else if (category === "scenarios") {
      const res = await prisma.scenario.deleteMany({ where: { userId: user.id } });
      count = res.count;
    } else if (category === "activities") {
      const res = await prisma.activityInput.deleteMany({ where: { userId: user.id } });
      count = res.count;
    } else if (category === "actions") {
      const res = await prisma.userAction.deleteMany({ where: { userId: user.id } });
      count = res.count;
    } else {
      return NextResponse.json({ error: { message: `Unknown category '${category}'` } }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Deleted ${count} record(s) from category '${category}'`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: { message: err?.message } }, { status: 500 });
  }
}
