import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  fetchAllMenus,
  findByPodjestName,
  normalizeWeekMenus,
  computeContentHash,
  categorizeItem,
  PodjestDailyMenu,
} from "@/lib/podjest";
import { getCurrentWeekDates, isScheduledCheckTime, getTodayDateStr } from "@/lib/schedule";
import { FALLBACK_SOURCES } from "@/lib/sources";

async function handle(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const force = req.nextUrl.searchParams.get("force") === "true";
  if (!force && !isScheduledCheckTime()) {
    return NextResponse.json({ skipped: true, reason: "outside scheduled check window" });
  }

  const weekDates = getCurrentWeekDates();
  const todayStr = getTodayDateStr();
  const all = await fetchAllMenus();
  const restaurants = await prisma.restaurant.findMany({ where: { active: true } });

  const matched: string[] = [];
  const unmatched: string[] = [];
  const updatedDays: string[] = [];

  for (const restaurant of restaurants) {
    const raw = findByPodjestName(all, restaurant.podjestName);
    if (raw) matched.push(restaurant.podjestName);
    else unmatched.push(restaurant.podjestName);

    const dayMap = normalizeWeekMenus(raw, weekDates);
    const sourceTypeByDate = new Map<string, string>();
    for (const date of dayMap.keys()) sourceTypeByDate.set(date, raw?.menuType ?? "unknown");

    // Dedicated fallbacks exist because podjest.sk's data for that specific
    // restaurant has proven unreliable (e.g. stale/mismatched image-sourced
    // entries) - so when one is configured, it takes priority over podjest
    // for today, not just used when podjest has nothing at all.
    const fallback = FALLBACK_SOURCES[restaurant.podjestName];
    if (fallback) {
      const items = await fallback();
      if (items && items.length > 0) {
        const fallbackMenu: PodjestDailyMenu = { day: "", date: todayStr, items };
        dayMap.set(todayStr, fallbackMenu);
        sourceTypeByDate.set(todayStr, "pdf-fallback");
      }
    }

    for (const [dateStr, dailyMenu] of dayMap) {
      const date = new Date(`${dateStr}T00:00:00.000Z`);
      const contentHash = computeContentHash(dailyMenu.items);

      const existing = await prisma.dailyMenu.findUnique({
        where: { restaurantId_date: { restaurantId: restaurant.id, date } },
      });

      if (existing && existing.contentHash === contentHash) {
        await prisma.dailyMenu.update({
          where: { id: existing.id },
          data: { scrapedAt: new Date() },
        });
        continue;
      }

      updatedDays.push(`${restaurant.name} ${dateStr}`);
      const sourceType = sourceTypeByDate.get(dateStr) ?? "unknown";

      await prisma.dailyMenu.upsert({
        where: { restaurantId_date: { restaurantId: restaurant.id, date } },
        create: {
          restaurantId: restaurant.id,
          date,
          scrapedAt: new Date(),
          isNew: true,
          firstSeenAt: null,
          sourceType,
          contentHash,
          items: {
            create: dailyMenu.items.map((item, idx) => ({
              order: idx,
              category: categorizeItem(item),
              name: item.dish,
              price: item.price ?? null,
              allergens: item.allergens ?? [],
            })),
          },
        },
        update: {
          scrapedAt: new Date(),
          isNew: true,
          firstSeenAt: null,
          sourceType,
          contentHash,
          items: {
            deleteMany: {},
            create: dailyMenu.items.map((item, idx) => ({
              order: idx,
              category: categorizeItem(item),
              name: item.dish,
              price: item.price ?? null,
              allergens: item.allergens ?? [],
            })),
          },
        },
      });
    }
  }

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    matched,
    unmatched,
    updatedDays,
  });
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
