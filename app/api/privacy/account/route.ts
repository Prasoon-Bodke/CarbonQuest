import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function DELETE(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });

    const { confirmation } = await req.json();
    if (confirmation !== "DELETE MY DATA") {
      return NextResponse.json(
        { error: { message: "Please type 'DELETE MY DATA' to confirm account erasure." } },
        { status: 400 }
      );
    }

    // Delete user cascades all children in Prisma schema
    await prisma.user.delete({
      where: { id: user.id },
    });

    return NextResponse.json({
      success: true,
      message: "Account and all associated telemetry, footprint records, and logs permanently deleted.",
    });
  } catch (err: any) {
    return NextResponse.json({ error: { message: err?.message } }, { status: 500 });
  }
}
