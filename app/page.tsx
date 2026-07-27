"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RestaurantTodayDto } from "@/lib/types";
import RestaurantCard from "@/components/RestaurantCard";

export default function Home() {
  const [restaurants, setRestaurants] = useState<RestaurantTodayDto[] | null>(null);
  const [error, setError] = useState(false);

  function load() {
    fetch("/api/menus/today")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setRestaurants)
      .catch(() => setError(true));
  }

  function retry() {
    setError(false);
    setRestaurants(null);
    load();
  }

  useEffect(load, []);

  function handleToggle(itemId: string, checked: boolean) {
    if (!restaurants) return;
    setRestaurants(
      restaurants.map((r) => ({
        ...r,
        menu: {
          ...r.menu,
          items: r.menu.items.map((i) => (i.id === itemId ? { ...i, checked } : i)),
        },
      }))
    );
    fetch(`/api/menu-items/${itemId}/toggle`, { method: "POST" }).catch(() => {});
  }

  return (
    <main className="flex flex-1 flex-col items-center bg-neutral-50 px-4 py-8">
      <div className="w-full max-w-2xl">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-neutral-900">🍽️ Menučíček</h1>
          <Link
            href="/restaurant/add"
            className="rounded-full bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            + Pridať reštauráciu
          </Link>
        </header>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center text-sm text-red-700">
            Nepodarilo sa načítať menu.{" "}
            <button onClick={retry} className="font-medium underline">
              Skúsiť znova
            </button>
          </div>
        )}

        {!error && restaurants === null && (
          <p className="text-center text-neutral-400">Načítavam menu...</p>
        )}

        {!error && restaurants !== null && restaurants.length === 0 && (
          <p className="text-center text-neutral-400">Zatiaľ nesledujeme žiadnu reštauráciu.</p>
        )}

        <div className="flex flex-col gap-4">
          {restaurants?.map((r) => (
            <RestaurantCard key={r.id} restaurant={r} onToggle={handleToggle} />
          ))}
        </div>
      </div>
    </main>
  );
}
