"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface TrackedRestaurant {
  id: string;
  name: string;
  podjestName: string;
  active: boolean;
}

export default function AddRestaurantPage() {
  const [available, setAvailable] = useState<string[] | null>(null);
  const [tracked, setTracked] = useState<TrackedRestaurant[] | null>(null);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const [error, setError] = useState(false);

  function refresh() {
    fetch("/api/restaurants/available")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setAvailable(data);
        setError(false);
      })
      .catch(() => setError(true));
    fetch("/api/restaurants")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setTracked(data);
        setError(false);
      })
      .catch(() => setError(true));
  }

  useEffect(refresh, []);

  async function addRestaurant(podjestName: string) {
    setBusy(podjestName);
    await fetch("/api/restaurants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ podjestName }),
    });
    setBusy(null);
    refresh();
  }

  async function toggleActive(r: TrackedRestaurant) {
    setBusy(r.id);
    await fetch(`/api/restaurants/${r.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !r.active }),
    });
    setBusy(null);
    refresh();
  }

  const filteredAvailable = available?.filter((n) =>
    n.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <main className="flex flex-1 flex-col items-center bg-neutral-50 px-4 py-8">
      <div className="w-full max-w-2xl">
        <Link href="/" className="text-sm text-green-700 hover:underline">
          ← Späť na hlavnú obrazovku
        </Link>

        <h1 className="mt-4 mb-6 text-2xl font-bold text-neutral-900">Spravovať reštaurácie</h1>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-center text-sm text-red-700">
            Nepodarilo sa načítať zoznam reštaurácií.{" "}
            <button onClick={refresh} className="font-medium underline">
              Skúsiť znova
            </button>
          </div>
        )}

        <section className="mb-8">
          <h2 className="mb-2 font-semibold text-neutral-800">Sledované reštaurácie</h2>
          <div className="flex flex-col gap-2">
            {tracked?.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-4 py-2"
              >
                <span className={r.active ? "text-neutral-900" : "text-neutral-400 line-through"}>
                  {r.name}
                </span>
                <button
                  onClick={() => toggleActive(r)}
                  disabled={busy === r.id}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    r.active
                      ? "bg-red-100 text-red-700 hover:bg-red-200"
                      : "bg-green-100 text-green-700 hover:bg-green-200"
                  }`}
                >
                  {r.active ? "Deaktivovať" : "Aktivovať"}
                </button>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-2 font-semibold text-neutral-800">
            Pridať reštauráciu (zdroj: podjest.sk)
          </h2>
          <input
            type="text"
            placeholder="Hľadať podľa názvu..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="mb-3 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
          <div className="flex flex-col gap-2">
            {filteredAvailable?.length === 0 && (
              <p className="text-sm text-neutral-400">Žiadne ďalšie reštaurácie nenájdené.</p>
            )}
            {filteredAvailable?.map((name) => (
              <div
                key={name}
                className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-4 py-2"
              >
                <span className="text-neutral-900">{name}</span>
                <button
                  onClick={() => addRestaurant(name)}
                  disabled={busy === name}
                  className="rounded-full bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700"
                >
                  Pridať
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
