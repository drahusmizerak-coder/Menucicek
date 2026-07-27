const SK_WEEKDAYS = ["nedeľa", "pondelok", "utorok", "streda", "štvrtok", "piatok", "sobota"];

export function formatSkDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12));
  const weekday = SK_WEEKDAYS[date.getUTCDay()];
  return `${weekday} ${d}. ${m}.`;
}
