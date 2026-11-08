import { prisma } from "../db";

export const DEMO_USER_ID = "user_demo_primary";

/**
 * Returns the active user for the request.
 * If authenticated cookie/session exists, returns that user.
 * In Demo Mode, defaults to the seeded primary demo user (Aarav Sharma).
 */
export async function getSessionUser() {
  // Query primary demo user
  const user = await prisma.user.findUnique({
    where: { id: DEMO_USER_ID },
    include: {
      preferences: true,
      streak: true,
      goals: { where: { status: "active" } },
    },
  });

  if (!user) {
    // If not seeded, find first user
    return await prisma.user.findFirst({
      include: {
        preferences: true,
        streak: true,
        goals: { where: { status: "active" } },
      },
    });
  }

  return user;
}
