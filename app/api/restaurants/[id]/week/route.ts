import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentWeekDates } from "@/lib/schedule";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const restaurant = await prisma.restaurant.findUnique({ where: { id } });
  if (!restaurant) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const weekDates = getCurrentWeekDates();
  const menus = await prisma.dailyMenu.findMany({
    where: {
      restaurantId: id,
      date: { in: weekDates.map((d) => new Date(`${d}T00:00:00.000Z`)) },
    },
    include: { items: true },
  });

  const byDate = new Map(menus.map((m) => [m.date.toISOString().slice(0, 10), m]));

  const days = weekDates.map((date) => {
    const m = byDate.get(date);
    if (!m) return { date, dailyMenuId: null, isNew: false, items: [] };
    return {
      date,
      dailyMenuId: m.id,
      isNew: m.firstSeenAt === null,
      items: [...m.items]
        .sort((a, b) => a.order - b.order)
        .map((i) => ({
          id: i.id,
          category: i.category,
          name: i.name,
          price: i.price,
          allergens: i.allergens,
          checked: i.checked,
        })),
    };
  });

  return NextResponse.json({
    restaurant: { id: restaurant.id, name: restaurant.name, address: restaurant.address, websiteUrl: restaurant.websiteUrl },
    days,
  });
}
