import { fetchHotelMetropolTodayMenu, FallbackMenuItem } from "./hotelMetropol";

/**
 * One-off fallbacks for restaurants whose podjest.sk data is unreliable,
 * keyed by Restaurant.podjestName. Only consulted for today's date when
 * podjest.sk has nothing for it - these scrapers are restaurant-specific
 * and only worth the upkeep for cases that have actually come up.
 */
export const FALLBACK_SOURCES: Record<string, () => Promise<FallbackMenuItem[] | null>> = {
  "Hotel Metropol": fetchHotelMetropolTodayMenu,
};

export type { FallbackMenuItem };
