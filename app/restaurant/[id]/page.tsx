"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { RestaurantWeekDto } from "@/lib/types";
import { formatSkDate } from "@/lib/format";
import MenuItemRow from "@/components/MenuItemRow";

export default function RestaurantDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [data, setData] = useState<RestaurantWeekDto | null>(null);
  const [error, setError] = useState(false);

  function load() {
    fetch(`/api/restaurants/${id}/week`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setData)
      .catch(() => setError(true));
    fetch(`/api/restaurants/${id}/seen`, { method: "POST" }).catch(() => {});
  }

  function retry() {
    setError(false);
    setData(null);
    load();
  }

  useEffect(load, [id]);

  function handleToggle(itemId: string, checked: boolean) {
    if (!data) return;
    setData({
      ...data,
      days: data.days.map((day) => ({
        ...day,
        items: day.items.map((i) => (i.id === itemId ? { ...i, checked } : i)),
      })),
    });
    fetch(`/api/menu-items/${itemId}/toggle`, { method: "POST" }).catch(() => {});
  }

  return (
    <main className="flex flex-1 flex-col items-center bg-neutral-50 px-4 py-8">
      <div className="w-full max-w-2xl">
        <Link href="/" className="text-sm text-green-700 hover:underline">
          ← Späť na hlavnú obrazovku
        </Link>

        {error && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-center text-sm text-red-700">
            Nepodarilo sa načítať menu.{" "}
            <button onClick={retry} className="font-medium underline">
              Skúsiť znova
            </button>
          </div>
        )}

        {!error && data === null && <p className="mt-6 text-center text-neutral-400">Načítavam...</p>}

        {!error && data !== null && (
          <>
            <header className="mt-4 mb-6">
              <h1 className="text-2xl font-bold text-neutral-900">{data.restaurant.name}</h1>
              {data.restaurant.address && (
                <p className="text-sm text-neutral-500">{data.restaurant.address}</p>
              )}
              {data.restaurant.websiteUrl && (
                <a
                  href={data.restaurant.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-green-700 hover:underline"
                >
                  {data.restaurant.websiteUrl}
                </a>
              )}
            </header>

            <div className="flex flex-col gap-4">
              {data.days.map((day) => (
                <div
                  key={day.date}
                  className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-neutral-200 bg-neutral-50 px-4 py-2">
                    <h2 className="font-semibold capitalize text-neutral-800">
                      {formatSkDate(day.date)}
                    </h2>
                    {day.isNew && (
                      <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                        NEW
                      </span>
                    )}
                  </div>
                  <div className="px-4 py-2">
                    {day.items.length === 0 ? (
                      <p className="text-sm text-neutral-400 italic">Menu nie je k dispozícii.</p>
                    ) : (
                      <div className="flex flex-col">
                        {day.items.map((item) => (
                          <MenuItemRow key={item.id} item={item} onToggle={handleToggle} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
