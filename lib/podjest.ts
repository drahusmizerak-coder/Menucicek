import crypto from "node:crypto";

const PODJEST_API_URL =
  "https://p02--denne-menu-backend-service--g2g82zb7czjf.code.run/api/menus";

const CACHE_TTL_MS = 60_000;

export interface PodjestMenuItem {
  dish: string;
  price?: string;
  allergens?: number[];
  /** Set explicitly by fallback sources that already know the category; podjest.sk itself never sets this. */
  category?: "polievka" | "hlavne";
}

export interface PodjestDailyMenu {
  day: string;
  date: string; // YYYY-MM-DD, not always trustworthy paired with `day`
  items: PodjestMenuItem[];
}

export interface PodjestRestaurant {
  id: string;
  name: string;
  url?: string;
  menuType?: string;
  dailyMenus: PodjestDailyMenu[];
  lastFetched?: string;
}

let cache: { data: PodjestRestaurant[]; fetchedAt: number } | null = null;

/** Fetches the full podjest.sk restaurant/menu list, cached in-memory for CACHE_TTL_MS. */
export async function fetchAllMenus(): Promise<PodjestRestaurant[]> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.data;
  }
  const res = await fetch(PODJEST_API_URL, {
    headers: { "User-Agent": "Menucicek/1.0 (+denne menu SNV)" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`podjest.sk API returned ${res.status}`);
  }
  const data = (await res.json()) as PodjestRestaurant[];
  cache = { data, fetchedAt: Date.now() };
  return data;
}

export function findByPodjestName(
  all: PodjestRestaurant[],
  podjestName: string
): PodjestRestaurant | undefined {
  return all.find((r) => r.name === podjestName);
}

// weekDates is always Monday..Friday, in that order (see getCurrentWeekDates).
const SK_WEEKDAY_NAMES = ["Pondelok", "Utorok", "Streda", "Štvrtok", "Piatok"];

/**
 * Maps date -> daily menu for the given (Mon-Fri) week. The source's `date`
 * and `day` fields are each independently unreliable in ways confirmed by
 * real data: `date` can be off by a day or a whole stale week while `day`
 * still names the right weekday (seen on Grillbar - date one day early,
 * correct "Pondelok" label), and some entries carry no date/day at all.
 * Resolved in order of confidence:
 *   1. `date` falls inside the target week - trust it directly.
 *   2. `date` doesn't match, but `day` names one of the week's weekdays
 *      that's still unfilled - use it for that weekday.
 *   3. Leftover entries with neither a usable date nor day - fill any
 *      still-missing day, in order, as a last resort.
 */
export function normalizeWeekMenus(
  raw: PodjestRestaurant | undefined,
  weekDates: string[]
): Map<string, PodjestDailyMenu> {
  const map = new Map<string, PodjestDailyMenu>();
  if (!raw) return map;
  const weekSet = new Set(weekDates);
  const dateByWeekday = new Map(SK_WEEKDAY_NAMES.map((name, i) => [name, weekDates[i]]));
  const byWeekdayLabel = new Map<string, PodjestDailyMenu>();
  const undated: PodjestDailyMenu[] = [];

  for (const dm of raw.dailyMenus ?? []) {
    if (dm.date && weekSet.has(dm.date)) {
      map.set(dm.date, dm);
    } else if (dm.day && dateByWeekday.has(dm.day)) {
      byWeekdayLabel.set(dm.day, dm);
    } else if (!dm.date && dm.items?.length) {
      undated.push(dm);
    }
  }

  for (const [weekday, date] of dateByWeekday) {
    if (!map.has(date) && byWeekdayLabel.has(weekday)) {
      map.set(date, byWeekdayLabel.get(weekday)!);
    }
  }

  const stillMissing = weekDates.filter((d) => !map.has(d));
  for (let i = 0; i < stillMissing.length && i < undated.length; i++) {
    map.set(stillMissing[i], undated[i]);
  }

  return map;
}

/** Stable hash of a day's items, used to detect real menu changes. */
export function computeContentHash(items: PodjestMenuItem[]): string {
  const normalized = items
    .map((i) => `${i.dish}|${i.price ?? ""}|${(i.allergens ?? []).join(",")}`)
    .join(";");
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

/** Simple name-based heuristic: soup vs. everything else - unless the source already knows. */
export function categorizeItem(item: PodjestMenuItem): "polievka" | "hlavne" {
  return item.category ?? (/polievk/i.test(item.dish) ? "polievka" : "hlavne");
}
