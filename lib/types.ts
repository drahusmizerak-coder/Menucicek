export interface MenuItemDto {
  id: string;
  category: string;
  name: string;
  price: string | null;
  allergens: number[];
  checked: boolean;
}

export type DisplayStatus = "today" | "upcoming" | "stale" | "hidden" | "none";

export interface DisplayMenuDto {
  status: DisplayStatus;
  date: string | null;
  dailyMenuId: string | null;
  isNew: boolean;
  scrapedAt: string | null;
  items: MenuItemDto[];
}

export interface RestaurantTodayDto {
  id: string;
  name: string;
  address: string | null;
  websiteUrl: string | null;
  menu: DisplayMenuDto;
}

export interface RestaurantWeekDayDto {
  date: string;
  dailyMenuId: string | null;
  isNew: boolean;
  items: MenuItemDto[];
}

export interface RestaurantWeekDto {
  restaurant: { id: string; name: string; address: string | null; websiteUrl: string | null };
  days: RestaurantWeekDayDto[];
}
