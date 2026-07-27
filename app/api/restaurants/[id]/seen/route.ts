import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentWeekDates } from "@/lib/schedule";

// Marks all of this restaurant's current-week menus as seen, clearing the
// NEW badge globally (spec 9.4 - shared, not per-user).
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const weekDates = getCurrentWeekDates();

  const result = await prisma.dailyMenu.updateMany({
    where: {
      restaurantId: id,
      date: { in: weekDates.map((d) => new Date(`${d}T00:00:00.000Z`)) },
      firstSeenAt: null,
    },
    data: { firstSeenAt: new Date() },
  });

  return NextResponse.json({ updated: result.count });
}
