import { prisma } from "@/lib/prisma";
import { getCurrentWeekDates, getTodayDateStr, isPastCutoff } from "@/lib/schedule";

export type DisplayStatus = "today" | "upcoming" | "stale" | "hidden" | "none";

export interface DisplayMenu {
  status: DisplayStatus;
  date: string | null;
  dailyMenuId: string | null;
  isNew: boolean;
  scrapedAt: string | null;
  items: {
    id: string;
    category: string;
    name: string;
    price: string | null;
    allergens: number[];
    checked: boolean;
  }[];
}

function toItemDto(items: { id: string; order: number; category: string; name: string; price: string | null; allergens: number[]; checked: boolean }[]) {
  return [...items]
    .sort((a, b) => a.order - b.order)
    .map((i) => ({
    id: i.id,
    category: i.category,
    name: i.name,
    price: i.price,
    allergens: i.allergens,
    checked: i.checked,
  }));
}

/** Resolves what a single restaurant's main-screen card should currently display (spec 6.1, 6.4). */
export async function resolveDisplayMenu(restaurantId: string): Promise<DisplayMenu> {
  const todayStr = getTodayDateStr();

  if (isPastCutoff()) {
    return { status: "hidden", date: todayStr, dailyMenuId: null, isNew: false, scrapedAt: null, items: [] };
  }

  const weekDates = getCurrentWeekDates();
  const weekMenus = await prisma.dailyMenu.findMany({
    where: { restaurantId, date: { in: weekDates.map((d) => new Date(`${d}T00:00:00.000Z`)) } },
    include: { items: true },
    orderBy: { date: "asc" },
  });

  const dateKey = (d: Date) => d.toISOString().slice(0, 10);

  const todayMenu = weekMenus.find((m) => dateKey(m.date) === todayStr);
  if (todayMenu) {
    return {
      status: "today",
      date: todayStr,
      dailyMenuId: todayMenu.id,
      isNew: todayMenu.firstSeenAt === null,
      scrapedAt: todayMenu.scrapedAt.toISOString(),
      items: toItemDto(todayMenu.items),
    };
  }

  const upcoming = weekMenus.find((m) => dateKey(m.date) > todayStr);
  if (upcoming) {
    return {
      status: "upcoming",
      date: dateKey(upcoming.date),
      dailyMenuId: upcoming.id,
      isNew: upcoming.firstSeenAt === null,
      scrapedAt: upcoming.scrapedAt.toISOString(),
      items: toItemDto(upcoming.items),
    };
  }

  const lastKnown = await prisma.dailyMenu.findFirst({
    where: { restaurantId },
    include: { items: true },
    orderBy: { date: "desc" },
  });
  if (lastKnown) {
    return {
      status: "stale",
      date: dateKey(lastKnown.date),
      dailyMenuId: lastKnown.id,
      isNew: false,
      scrapedAt: lastKnown.scrapedAt.toISOString(),
      items: toItemDto(lastKnown.items),
    };
  }

  return { status: "none", date: null, dailyMenuId: null, isNew: false, scrapedAt: null, items: [] };
}
