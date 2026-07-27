const TZ = "Europe/Bratislava";

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export interface BratislavaParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekdayIdx: number; // 0=Sun .. 6=Sat
  dateStr: string; // YYYY-MM-DD
}

export function getBratislavaParts(date: Date = new Date()): BratislavaParts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(date).map((p) => [p.type, p.value])
  );
  const year = Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);
  // hour12:false formats midnight as "24", normalize to 0
  const hour = Number(parts.hour) % 24;
  const minute = Number(parts.minute);
  const weekdayIdx = WEEKDAY_INDEX[parts.weekday];
  const pad = (n: number) => String(n).padStart(2, "0");
  return { year, month, day, hour, minute, weekdayIdx, dateStr: `${year}-${pad(month)}-${pad(day)}` };
}

function toUtcNoon(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day, 12));
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Returns the Monday..Friday dates (YYYY-MM-DD) of the current Bratislava week. */
export function getCurrentWeekDates(now: Date = new Date()): string[] {
  const p = getBratislavaParts(now);
  const isoIdx = p.weekdayIdx === 0 ? 7 : p.weekdayIdx; // Mon=1..Sun=7
  const base = toUtcNoon(p.year, p.month, p.day);
  const monday = new Date(base);
  monday.setUTCDate(base.getUTCDate() - (isoIdx - 1));
  return [0, 1, 2, 3, 4].map((i) => {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    return fmtDate(d);
  });
}

/** Today's date (YYYY-MM-DD) in Bratislava time. */
export function getTodayDateStr(now: Date = new Date()): string {
  return getBratislavaParts(now).dateStr;
}

/** True after 15:00 Bratislava time - today's menu should stop being shown (spec 6.4). */
export function isPastCutoff(now: Date = new Date()): boolean {
  return getBratislavaParts(now).hour >= 15;
}

/**
 * True if `now` falls into one of the scheduled check slots from spec section 4:
 * - Sunday: evening only (19/20/21)
 * - Mon-Thu: morning (8/9/10/11) + evening (19/20/21)
 * - Friday: morning only, up to 10:00 (no 11:00, no evening)
 * - Saturday: never
 */
export function isScheduledCheckTime(now: Date = new Date()): boolean {
  const { weekdayIdx, hour } = getBratislavaParts(now);
  const morning = [8, 9, 10, 11];
  const evening = [19, 20, 21];
  if (weekdayIdx === 0) return evening.includes(hour);
  if (weekdayIdx >= 1 && weekdayIdx <= 4) return morning.includes(hour) || evening.includes(hour);
  if (weekdayIdx === 5) return [8, 9, 10].includes(hour);
  return false; // Saturday
}
