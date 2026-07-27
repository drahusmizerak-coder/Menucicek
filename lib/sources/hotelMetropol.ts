import { extractText, getDocumentProxy } from "unpdf";
import { getTodayDateStr } from "@/lib/schedule";

// hotelmetropol.sk blocks bare/bot-looking requests (returns a custom 466
// "Access Forbidden" page) - a realistic browser header set is enough to
// pass, no headless browser needed.
const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "sk-SK,sk;q=0.9,en;q=0.8",
  Referer: "https://hotelmetropol.sk/gastronomia/",
};

const GASTRONOMIA_URL = "https://hotelmetropol.sk/gastronomia/";

export interface FallbackMenuItem {
  dish: string;
  price?: string;
  allergens?: number[];
  category?: "polievka" | "hlavne";
}

function extractPdfLinks(html: string): string[] {
  const matches = html.matchAll(/href="(https:\/\/hotelmetropol\.sk\/wp-content\/uploads\/[^"]+\.pdf)"/g);
  return [...new Set([...matches].map((m) => m[1]))];
}

/** dd. mm. yyyy formatted like the PDF's own date line, e.g. "27. 07. 2026". */
function todayAsPdfDate(): string {
  const [y, m, d] = getTodayDateStr().split("-");
  return `${Number(d)}. ${m}. ${y}`;
}

const SIZE_LINE = /^\d+(?:[.,]\d+)?\s*(g|l)(?:,\s*\d+\s*(g|l))?$/i;
// Decorative PDF artifacts only - NOT plain allergen-number lines like "1,3,7,9".
const DECORATIVE_LINE = /^m+\d*$/i;
const MULTI_EURO_LINE = /€.*€/;
const FOOTER_LINES = new Set(["PONUKA DŇA", "I DAILY OFFER"]);

function groupIntoItems(lines: string[]): { size: string; text: string }[] {
  const items: { size: string; text: string }[] = [];
  let current: { size: string; text: string } | null = null;
  for (const line of lines) {
    if (SIZE_LINE.test(line)) {
      if (current) items.push(current);
      current = { size: line, text: "" };
    } else if (current) {
      current.text += (current.text ? " " : "") + line;
    }
  }
  if (current) items.push(current);
  return items;
}

function toMenuItem(
  raw: { size: string; text: string },
  price: string | undefined,
  category: "polievka" | "hlavne"
): FallbackMenuItem | null {
  const text = raw.text.trim();
  if (!text) return null;
  const m = text.match(/^(.*?)\s*((?:\d+,)*\d+)\s*$/);
  const dish = (m ? m[1] : text).trim();
  const allergens = m ? m[2].split(",").map(Number) : [];
  const isDessert = /dezert/i.test(dish);
  return { dish, price: isDessert ? "v cene" : price, allergens, category };
}

/**
 * Best-effort parse of the hotel's daily "Ponuka dňa" PDF. The PDF's text
 * layer comes out of extraction in a scrambled column order (mains, then
 * the "Polievka"/"Hlavné jedlo" headers, then soups) - this mirrors that
 * exact observed layout rather than a generic table parser, so it's
 * expected to need adjusting if the hotel changes their PDF template.
 */
function parseMenuText(text: string): FallbackMenuItem[] | null {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => !FOOTER_LINES.has(l))
    .filter((l) => !DECORATIVE_LINE.test(l))
    .filter((l) => !MULTI_EURO_LINE.test(l))
    .filter((l) => !/^--.*--$/.test(l))
    .filter((l) => !/^\d{1,2}\.\s*\d{2}\.\s*\d{4}/.test(l)) // date(+price) line
    .filter((l) => !/^[A-ZÁ-Ž]+\/\s*[A-Z]+$/.test(l)); // "PONDELOK/ MONDAY"

  const headerIdx = lines.indexOf("Polievka");
  if (headerIdx === -1) return null;

  const priceMatch = text.match(/(\d+,\d{2})\s*€/);
  const price = priceMatch ? `${priceMatch[1]} €` : undefined;

  const mainLines = lines.slice(0, headerIdx);
  const soupLines = lines.slice(headerIdx + 2); // skip "Polievka", "Hlavné jedlo"

  const mains = groupIntoItems(mainLines)
    .map((raw) => toMenuItem(raw, price, "hlavne"))
    .filter((i): i is FallbackMenuItem => i !== null);
  const soups = groupIntoItems(soupLines)
    .map((raw) => toMenuItem(raw, "v cene", "polievka"))
    .filter((i): i is FallbackMenuItem => i !== null);

  const items = [...soups, ...mains];
  return items.length > 0 ? items : null;
}

/** Fetches and parses today's menu from hotelmetropol.sk. Returns null on any failure. */
export async function fetchHotelMetropolTodayMenu(): Promise<FallbackMenuItem[] | null> {
  try {
    const pageRes = await fetch(GASTRONOMIA_URL, { headers: BROWSER_HEADERS });
    if (!pageRes.ok) return null;
    const html = await pageRes.text();
    const pdfLinks = extractPdfLinks(html);
    const todayMarker = todayAsPdfDate();

    for (const link of pdfLinks) {
      const pdfRes = await fetch(link, { headers: BROWSER_HEADERS });
      if (!pdfRes.ok) continue;
      const buf = new Uint8Array(await pdfRes.arrayBuffer());
      const pdf = await getDocumentProxy(buf);
      const { text } = await extractText(pdf, { mergePages: true });
      if (!text.includes(todayMarker)) continue; // not today's PDF - skip
      const items = parseMenuText(text);
      if (items) return items;
    }
    return null;
  } catch (err) {
    console.error("hotelMetropol fallback failed:", err);
    return null;
  }
}
