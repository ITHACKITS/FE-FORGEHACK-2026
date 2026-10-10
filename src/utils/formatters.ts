/**
 * utils/formatters.ts - Number and time formatting in the active UI language.
 */

import type { Language } from "./translations";

export function formatNumber(num?: number | null, lang: Language = "en"): string {
  if (num === null || num === undefined || isNaN(num)) return "-";
  return Number(num).toLocaleString(lang === "id" ? "id-ID" : "en-US");
}

export function formatCompactRange(min?: number, median?: number, max?: number, lang: Language = "en"): string {
  if (min === undefined || median === undefined || max === undefined) {
    return "- / - / -";
  }
  return `${formatNumber(min, lang)} / ${formatNumber(median, lang)} / ${formatNumber(max, lang)}`;
}

export function formatHour(hour: number, lang: Language = "en"): string {
  const h = String(hour).padStart(2, "0");
  return lang === "id" ? `T + ${h}:00 jam` : `T + ${h}:00 h`;
}
