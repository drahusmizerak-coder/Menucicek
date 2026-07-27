# Menučíček

Denné menu 6 reštaurácií v Spišskej Novej Vsi na jednej obrazovke. Dátový zdroj:
verejné API [podjest.sk](https://podjest.sk) (viď [denne-menu-app-spec.md](denne-menu-app-spec.md)
a plán implementácie).

## Lokálny vývoj

1. Nastav `DATABASE_URL` (PostgreSQL) a `CRON_SECRET` v `.env` (viď `.env.example`).
2. `npm install`
3. `npx prisma db push` – vytvorí tabuľky
4. `npx prisma db seed` – nasadí 6 sledovaných reštaurácií
5. `npm run dev` – beží na http://localhost:3000
6. Ručne spusti prvý scrape: `curl -X POST "http://localhost:3000/api/cron/check-menus?force=true" -H "Authorization: Bearer $CRON_SECRET"`

`?force=true` obchádza kontrolu časového okna (spec bod 4) – užitočné pri vývoji, v produkcii ho nepoužívaj.

## Nasadenie (Vercel + GitHub Actions)

1. Nasaď repozitár na Vercel, nastav env premenné `DATABASE_URL` (napr. Neon) a `CRON_SECRET`.
2. V GitHub repo nastav secrets `APP_URL` (URL produkčnej appky) a `CRON_SECRET` (rovnaká hodnota ako vo Vercel).
3. `.github/workflows/menu-check.yml` beží každú hodinu; samotný endpoint `/api/cron/check-menus`
   rozhoduje (podľa Europe/Bratislava času), či ide o skutočný scheduled check zo spec bodu 4 –
   toto zaobchádza s DST bez potreby meniť cron výraz cez rok.

## Architektúra

- `lib/podjest.ts` – fetch a normalizácia dát z podjest.sk API
- `lib/schedule.ts` – Bratislava časová logika (scheduled check okná, 15:00 cutoff)
- `lib/menuDisplay.ts` – rozhoduje, čo sa má zobraziť na hlavnej obrazovke (dnes/najbližší deň/neaktuálne)
- `app/api/cron/check-menus` – scheduled scraping endpoint
- `app/page.tsx`, `app/restaurant/[id]`, `app/restaurant/add` – frontend

**v1 rozsah:** dátový zdroj je len podjest.sk (žiadny vlastný scraper/Vision API fallback),
push notifikácie sú odložené na v2. Pridávanie reštaurácie (`/restaurant/add`) funguje výberom
z aktuálneho zoznamu na podjest.sk, nie voľným zadaním URL.
