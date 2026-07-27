import { prisma } from "@/lib/prisma";
import { getCurrentWeekDates, getTodayDateStr, isPastCutoff } from "@/lib/schedule";

export type DisplayStatus = "today" | "upcoming" | "stale" | "none";

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

function toDisplayMenu(
  status: DisplayStatus,
  menu: {
    date: Date;
    id: string;
    firstSeenAt: Date | null;
    scrapedAt: Date;
    items: { id: string; order: number; category: string; name: string; price: string | null; allergens: number[]; checked: boolean }[];
  }
): DisplayMenu {
  return {
    status,
    date: menu.date.toISOString().slice(0, 10),
    dailyMenuId: menu.id,
    isNew: menu.firstSeenAt === null,
    scrapedAt: menu.scrapedAt.toISOString(),
    items: toItemDto(menu.items),
  };
}

/**
 * Resolves what a single restaurant's main-screen card should currently
 * display (spec 6.1, 6.4). Once today's date is past the 15:00 cutoff,
 * today's own (now-irrelevant) menu is skipped - but since the whole week
 * is already fetched in advance by the evening checks, the card advances
 * straight to the next known day instead of going blank.
 */
export async function resolveDisplayMenu(restaurantId: string): Promise<DisplayMenu> {
  const todayStr = getTodayDateStr();
  const pastCutoff = isPastCutoff();
  const weekDates = getCurrentWeekDates();

  const weekMenus = await prisma.dailyMenu.findMany({
    where: { restaurantId, date: { in: weekDates.map((d) => new Date(`${d}T00:00:00.000Z`)) } },
    include: { items: true },
    orderBy: { date: "asc" },
  });
  const dateKey = (d: Date) => d.toISOString().slice(0, 10);

  if (!pastCutoff) {
    const todayMenu = weekMenus.find((m) => dateKey(m.date) === todayStr);
    if (todayMenu) return toDisplayMenu("today", todayMenu);
  }

  const upcoming = weekMenus.find((m) => dateKey(m.date) > todayStr);
  if (upcoming) return toDisplayMenu("upcoming", upcoming);

  const lastKnown = await prisma.dailyMenu.findFirst({
    where: { restaurantId, date: { lt: new Date(`${todayStr}T00:00:00.000Z`) } },
    include: { items: true },
    orderBy: { date: "desc" },
  });
  if (lastKnown) return toDisplayMenu("stale", lastKnown);

  return { status: "none", date: null, dailyMenuId: null, isNew: false, scrapedAt: null, items: [] };
}
