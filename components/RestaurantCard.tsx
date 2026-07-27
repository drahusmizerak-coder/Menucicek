"use client";

import Link from "next/link";
import { RestaurantTodayDto } from "@/lib/types";
import { formatSkDate } from "@/lib/format";
import MenuItemRow from "./MenuItemRow";

export default function RestaurantCard({
  restaurant,
  onToggle,
}: {
  restaurant: RestaurantTodayDto;
  onToggle: (id: string, checked: boolean) => void;
}) {
  const { menu } = restaurant;
  const anyChecked = menu.items.some((i) => i.checked);

  return (
    <Link
      href={`/restaurant/${restaurant.id}`}
      className={`block overflow-hidden rounded-xl border shadow-sm transition-shadow hover:shadow-md ${
        anyChecked ? "border-green-400 bg-green-50" : "border-neutral-200 bg-white"
      }`}
    >
      <div
        className={`flex items-center justify-between gap-2 border-b px-4 py-2 ${
          anyChecked ? "border-green-200 bg-green-100/70" : "border-neutral-200 bg-neutral-50"
        }`}
      >
        <h2 className="text-lg font-semibold text-neutral-900">{restaurant.name}</h2>
        <div className="flex items-center gap-2 shrink-0">
          {menu.isNew && (
            <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
              NEW
            </span>
          )}
          {menu.status === "stale" && (
            <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-medium text-amber-800">
              neaktuálne
            </span>
          )}
          {menu.status === "upcoming" && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
              {menu.date && formatSkDate(menu.date)}
            </span>
          )}
        </div>
      </div>

      <div className="px-4 py-2">
        {menu.status === "none" && (
          <p className="text-sm text-neutral-400 italic">Zatiaľ nemáme menu tejto reštaurácie.</p>
        )}
        {(menu.status === "today" || menu.status === "upcoming" || menu.status === "stale") && (
          <div className="flex flex-col">
            {menu.items.map((item) => (
              <MenuItemRow key={item.id} item={item} onToggle={onToggle} />
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
