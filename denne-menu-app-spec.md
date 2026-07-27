# Denné Menu SNV – špecifikácia aplikácie

## 1. Cieľ aplikácie

Webová/mobilná aplikácia, ktorá automaticky sťahuje denné menu zo 6 reštaurácií v Spišskej Novej Vsi a zobrazuje ich na jednej obrazovke, aby sme nemuseli obchádzať weby/Facebook jednotlivých reštaurácií pri výbere obeda. Aplikácia beží na pozadí podľa harmonogramu, ukladá históriu menu, označuje nové menu ako "NEW" a umožňuje označiť si vybrané jedlo/polievku checkboxami.

## 2. Sledované reštaurácie a zdroje dát

Prieskumom boli nájdené tieto reálne zdroje – Claude Code by mal pri implementácii overiť ich aktuálnosť a HTML štruktúru priamo (stránky sa môžu meniť):

| # | Reštaurácia | Adresa | Možné zdroje denného menu |
|---|---|---|---|
| 1 | Dufo Bistro | Zimná 189/54, SNV | Vlastný web `https://dufobistro.sk/` (sekcia "Týždenné menu"), agregátor `https://podjest.sk/` (sekcia "Dufo bistro"), Facebook `facebook.com/dufobistro` (menu often ako obrázok/príspevok) |
| 2 | Burger a Pivo | Zimná 89, SNV (spoločný vchod s Moe Sushi) | Vlastný web `https://burgerapivo.sk/denne-menu/`, `https://burgerapivo.sk/menu/`, agregátor `podjest.sk` (uvedené pod názvom "MOE Sushi / Burger a Pivo"), `menudna.sk/spisska-nova-ves/burger-a-pivo` |
| 3 | Grill Bar | Zimná 73, SNV | Vlastný web `https://grillbar.sk/` (sekcia "DENNÉ MENU"), agregátor `podjest.sk` (ako "Grillbar") |
| 4 | Passion Café | SNV | Agregátor `podjest.sk` (ako "Passion cafe") – zatiaľ jediný potvrdený štruktúrovaný zdroj, treba dohľadať aj vlastný web/FB |
| 5 | Joe's CookHouse | Štefánikova 3, Smižany | Vlastný web `https://joescookhouse.sk/menu/`, `https://restauracie.sme.sk/restauracia/joes-cookhouse_14620-smizany_2188/denne-menu`, donáškový portál `https://www.bistro.sk/en/menu/joes-cookhouse` (štruktúrované denné menu s cenami) |
| 6 | Duffart (Dufart) | Letná 43A, SNV | Vlastný web `https://www.dufart.sk/`, agregátor `podjest.sk` (ako "Reštaurácia Dufart") |

**Dôležité zistenie:** Portál **`podjest.sk`** agreguje aktuálne denné menu pre cca 26 reštaurácií v Spišskej Novej Vsi vrátane minimálne 5 z našich 6 reštaurácií (Dufo bistro, Burger a Pivo/MOE Sushi, Grillbar, Passion cafe, Reštaurácia Dufart) v jednotnom, čistom textovom formáte (názov jedla, cena, alergény, deň v týždni). Toto by mal byť **primárny zdroj dát**, keďže eliminuje potrebu parsovania obrázkov/PDF pre väčšinu reštaurácií. Vlastné weby reštaurácií a `restauracie.sme.sk` slúžia ako sekundárny/záložný zdroj a na doplnenie Joe's CookHouse (Smižany, ktoré na podjest.sk zrejme nie je).

Pred písaním scraperov Claude Code **musí najprv fyzicky otvoriť/stiahnuť** každý z týchto URL (napr. cez fetch/curl) a overiť skutočnú HTML štruktúru, pretože sa mohla zmeniť od tohto prieskumu.

## 3. Spôsob extrakcie dát – stratégia podľa typu zdroja

1. **Textové/HTML stránky** (podjest.sk, restauracie.sme.sk, dufobistro.sk, grillbar.sk, joescookhouse.sk, bistro.sk) – parsovať priamo HTML (napr. cheerio/BeautifulSoup), vyťahovať názov jedla, cenu, alergény, deň.
2. **Menu ako obrázok** (typicky Facebook príspevky, prípadne časť webu) – stiahnuť obrázok a poslať ho cez Claude Vision API (multimodálny model) s promptom typu "Prepíš toto menu do štruktúrovaného JSON formátu: deň, polievka, jedlá, ceny, alergény". Toto je najspoľahlivejšia metóda pre obrázkové menu, presnejšia než klasický OCR.
3. **Menu ako PDF** – najprv skúsiť extrahovať text z PDF (napr. pdfplumber/pdf-parse); ak PDF neobsahuje textovú vrstvu (je to sken), previesť stránky na obrázky a použiť rovnaký Vision-based prístup ako v bode 2.
4. **Fallback/manuálna kontrola** – ak sa menu nepodarí automaticky rozpoznať (zdroj sa nezmenil, formát sa nezhoduje, chyba parsovania), aplikácia by mala:
   - zachovať posledné úspešne načítané menu a označiť ho ako "neaktuálne" (napr. sivou farbou/ikonou s dátumom poslednej aktualizácie),
   - zalogovať chybu, aby bolo možné scraper doladiť.
5. Pre každú reštauráciu odporúčam nakonfigurovateľný **zoznam zdrojov v poradí priority** (napr. najprv podjest.sk, ak zlyhá → vlastný web, ak zlyhá → Facebook obrázok), aby bola aplikácia odolná voči výpadku jedného zdroja.

## 4. Harmonogram kontrol (scheduler / cron)

- **Ranné kontroly:** 8:00, 9:00, 10:00, 11:00 (denne, pondelok až piatok)
- **Večerné kontroly:** 19:00, 20:00, 21:00
- **Prevádzkový cyklus týždňa:**
  - Kontroly bežia od **nedele večer** (19:00/20:00/21:00 – prvý večerný check v týždni) cez celý pracovný týždeň.
  - Posledná kontrola v týždni je **piatok ráno o 10:00** (t.j. piatkový check o 11:00 sa už nerobí).
  - Po piatku 10:00 sa kontroly pozastavia až do **nedele večer** (19:00), kedy sa cyklus opakuje (typicky pre menu pripravované na pondelok).
- Implementovať ako cron joby (napr. `node-cron`, alebo serverless scheduled functions/Vercel Cron), s presnou logikou dní a časov podľa vyššie uvedeného pravidla – odporúčam to zapísať ako explicitné cron výrazy s podmienkou na deň v týždni, nie len ako "každý deň v tomto čase".
- Každý beh scheduleru: pre každú reštauráciu stiahne aktuálne dáta, porovná s naposledy uloženým menu (hash/diff obsahu) → ak sa líši, uloží novú verziu a označí ju ako **NEW** (viditeľné do najbližšieho ďalšieho úspešného checku alebo napr. 12 hodín od zistenia zmeny – zvoliť a spresniť v konfigurácii).

## 5. Dátový model (návrh)

```
Restaurant
- id, name, address, website_url, logo_url, source_config (JSON – zoznam zdrojov a ich priorita/typ),
- active (bool – pre možnosť pridávať/vypínať reštaurácie cez UI, viď bod 6.5)

DailyMenu (bez histórie – vždy sa len prepisuje aktuálny záznam pre danú reštauráciu a deň)
- id, restaurant_id, date (deň, na ktorý menu platí), scraped_at (kedy bolo zistené),
- is_new (bool), first_seen_at (kedy niekto menu prvýkrát otvoril – ruší "NEW"),
- raw_source_type (html/image/pdf), source_url

MenuItem
- id, daily_menu_id, category (polievka / hlavné jedlo / šalát / detské menu / dezert...),
- name, description, weight_grams, price, allergens (list)

Selection (zdieľaný výber, bez väzby na konkrétneho používateľa)
- id, menu_item_id, date, selected_at, checked (bool)
```

Keďže história menu nie je potrebná, staré `DailyMenu` záznamy (staršie ako napr. aktuálny týždeň) je možné pravidelne mazať alebo jednoducho prepisovať pri každom novom checku pre danú reštauráciu a deň – netreba budovať archív.

## 6. Obrazovky a funkcie aplikácie

### 6.1 Hlavná obrazovka
- Pod sebou zoznam všetkých 6 reštaurácií s ich **aktuálnym denným menu** (dnešný alebo najbližší nasledujúci deň, ak dnešné ešte nie je k dispozícii).
- Pri každej reštaurácii: názov, polievka, hlavné jedlá s cenami, prípadne alergény.
- Ak sa objavilo nové menu od poslednej návštevy používateľa (alebo od posledného checku), zobraziť viditeľný **štítok "NEW"**.
- Kliknutím na menu danej reštaurácie → prechod na detail (bod 6.2).
- Pri každom jedle a pri polievke **checkbox** na označenie výberu (viď 6.3) priamo na hlavnej obrazovke, nie len v detaile.

### 6.2 Detail reštaurácie – týždenné menu
- Po kliknutí na menu reštaurácie sa zobrazí **celé menu na aktuálny týždeň** (pondelok–piatok), rozdelené podľa dní.
- Aj tu možnosť checkbox výberu jedla/polievky pre konkrétny deň.

### 6.3 Výber jedla (multi-checkbox)
- Ku každému dennému menu je možné:
  - zaškrtnúť konkrétnu **polievku** (spravidla 1 z 1–2 možností),
  - zaškrtnúť konkrétne **hlavné jedlo** (1 z viacerých ponúkaných v rámci denného menu danej reštaurácie).
- Po zaškrtnutí sa vizuálne zvýrazní (highlight) celý riadok/karta daného menu, aby bolo jasné, že z tejto reštaurácie si dnes objednávame.
- Malo by byť možné mať viacero zaškrtnutí súčasne naprieč rôznymi reštauráciami (napr. ak si objednáva viac ľudí naraz z rôznych podnikov) – teda ide o výber na úrovni "čo je dnes vybrané", nie o exkluzívny prepínač.
- **Nezobrazuje sa**, kto konkrétne dané jedlo zaškrtol – výber je len zdieľaný, spoločný pre všetkých používateľov appky, bez priradenia k menu/osobe.

### 6.4 Automatické miznutie po 15:00
- Po **15:00** sa denné menu z hlavnej obrazovky (a z checkboxov výberu) **odstráni** – obrazovka pre daný deň ostane prázdna až do ďalšieho úspešného scheduled checku (najbližší večerný check o 19:00, prípadne až nasledujúci deň podľa harmonogramu v bode 4).
- Implementačne stačí na frontende (alebo v API) pridať podmienku: ak `aktuálny_čas > 15:00`, nezobrazovať/nevracať dnešné menu, kým nepríde nové z ďalšieho checku. Netreba mazať dáta, len ich prestať zobrazovať.

### 6.5 Pridanie ďalšej reštaurácie
- Na hlavnej obrazovke tlačidlo **"Pridať reštauráciu"**.
- Formulár na zadanie: názov reštaurácie, adresa (voliteľné), URL zdroja/zdrojov denného menu (jeden alebo viac odkazov – web, Facebook, PDF...), typ zdroja (HTML / obrázok / PDF – alebo appka sa o to pokúsi rozpoznať automaticky).
- Po uložení sa nová reštaurácia pridá do zoznamu sledovaných (`Restaurant.active = true`) a od ďalšieho scheduled checku sa automaticky zaraďuje do sťahovania podľa harmonogramu v bode 4 – netreba meniť kód, len pridať záznam do DB.
- Mala by existovať aj možnosť reštauráciu **deaktivovať/odstrániť** zo sledovania (napr. `active = false`), aby zoznam neopuchol reštauráciami, ktoré už nesledujeme.

## 7. Push notifikácie

- Keď scheduled check zistí, že sa objavilo **nové menu** (zmena oproti naposledy uloženému obsahu pre danú reštauráciu a deň), appka pošle **push notifikáciu** všetkým prihláseným zariadeniam typu: *"Nové denné menu: [názov reštaurácie]"*.
- Keďže appka je PWA, push notifikácie riešiť cez **Web Push API** (service worker + napr. `web-push` knižnica na backende, VAPID kľúče) – funguje v prehliadači aj po pridaní appky na plochu mobilu, netreba natívnu mobilnú appku ani tretiu stranu (napr. Firebase), hoci Firebase Cloud Messaging je tiež platná alternatíva, ak by bolo jednoduchšie ho integrovať.
- Používateľ musí notifikácie v appke explicitne povoliť (browser permission prompt) – ošetriť stav "notifikácie zakázané" v UI (napr. jemné upozornenie/tlačidlo na povolenie).
- Notifikácie posielať len za nové/zmenené menu zistené pri scheduled checkoch (nie pri manuálnom refreshi používateľom), aby sa predišlo spamu.

## 8. Odporúčaný technologický stack (návrh, uprav podľa preferencií)

- **Frontend:** Next.js (React) alebo jednoduchšie Vite + React, s Tailwind CSS pre rýchly vývoj UI. Appka musí byť **PWA** (manifest.json, ikony, service worker), aby sa dala pridať na plochu mobilu.
- **Backend/API:** Next.js API routes alebo samostatný Node.js/Express server.
- **Databáza:** PostgreSQL (napr. Neon, keďže sa už používa pri iných projektoch) alebo SQLite pre jednoduchý lokálny štart.
- **Scheduler:** `node-cron` pri vlastnom serveri, alebo Vercel Cron Jobs / GitHub Actions scheduled workflow, ak beží na serverless infraštruktúre.
- **Scraping:** `cheerio` (HTML), `pdf-parse`/`pdfplumber` (PDF text), Claude API (vision) pre obrázkové/skenované menu.
- **Notifikácie (voliteľné, do budúcna):** push notifikácia alebo e-mail, keď sa objaví nové menu.

## 9. Rozhodnutia (upresnenie zadania)

1. **Používatelia:** Aplikácia je **viacužívateľská** – viacero ľudí (tím/rodina) zdieľa rovnaké dáta a výbery. **Bez prihlasovania a bez priraďovania mena k výberu** – výber jedla (checkbox) je čisto zdieľaný stav, spoločný pre všetkých ("toto je dnes vybrané"), appka nesleduje ani nezobrazuje, kto konkrétne dané jedlo zaškrtol.
2. **Platforma:** **Web appka + PWA** – appka beží v prehliadači, ale musí mať `manifest.json`, ikony a service worker, aby sa dala pridať na plochu mobilu a fungovala ako natívna appka (offline fallback aspoň na zobrazenie posledného načítaného menu je bonus, nie nutnosť pre MVP). Service worker zároveň slúži na prijímanie push notifikácií (bod 7).
3. **Hosting:** Nie je pevne daný – Claude Code má navrhnúť najvhodnejšiu voľbu podľa zvoleného stacku. Odporúčanie: ak appka beží na Next.js, **Vercel** je najjednoduchšia voľba pre frontend + API routes, no keďže je potrebný **spoľahlivý scheduler bežiaci presne v daných hodinách** (viď bod 4 vyššie – 7 checkov denne), treba overiť, či Vercel Cron Jobs (alebo GitHub Actions scheduled workflow volajúci API endpoint) postačuje. Ak nie, zvážiť malý VPS / Railway / Render s vlastným `node-cron` procesom bežiacim nepretržite. Toto rozhodnutie má Claude Code spraviť na začiatku a zdôvodniť.
4. **Viditeľnosť štítku "NEW":** Štítok zostáva viditeľný **kým dané menu niekto prvýkrát neotvorí** (klikne naň / zobrazí detail). Keďže ide o zdieľanú appku pre viac ľudí, ide o **globálny "seen" príznak** na úrovni `DailyMenu` (pole `first_seen_at`, ktoré sa nastaví pri prvom otvorení ktorýmkoľvek používateľom) – stačí, že si to niekto všimol, štítok potom zmizne pre všetkých.
5. **História menu:** **Nepotrebná.** Appka uchováva len aktuálne/dnešné menu pre každú reštauráciu, staré záznamy sa pri novom checku jednoducho prepíšu (žiadny archív, žiadne špeciálne UI na históriu).
6. **Miznutie po 15:00:** Po 15:00 sa dnešné menu prestáva zobrazovať (bod 6.4) – obrazovka je prázdna až do najbližšieho úspešného checku.
7. **Pridávanie reštaurácií:** Cez tlačidlo v UI (bod 6.5), bez zásahu do kódu.
8. **Push notifikácie:** Áno, pri zistení nového/zmeneného menu pri scheduled checku (bod 7).

## 10. Zhrnutie prvého kroku pre Claude Code

1. Over aktuálnu HTML/obsahovú štruktúru všetkých uvedených URL (bod 2) priamym stiahnutím.
2. Navrhni a implementuj scraper modul pre každú reštauráciu podľa stratégie v bode 3, s prioritným zdrojom `podjest.sk` tam, kde je dostupný.
3. Postav dátový model (bod 5) a scheduler presne podľa harmonogramu (bod 4).
4. Postav frontend podľa obrazoviek v bode 6 vrátane tlačidla "Pridať reštauráciu" (6.5) a logiky miznutia menu po 15:00 (6.4).
5. Nastav Web Push notifikácie (bod 7) naviazané na scheduled check, ktorý zistí nové menu.
6. Priebežne testuj najmä hraničné prípady: reštaurácia bez menu v daný deň, výpadok zdroja, zmena formátu stránky, správanie po 15:00, doručenie push notifikácie na mobil po pridaní appky na plochu.
