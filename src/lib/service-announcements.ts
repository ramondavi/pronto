import type { InterfaceLanguage } from "@/lib/interface-language";

type ServiceAnnouncement = {
  type: string;
  title?: string;
  message?: string;
  starts_at: string;
  ends_at: string | null;
};

const oneDayTypes = new Set(["holiday", "optional_day"]);
const closureTypes = new Set(["holiday", "optional_day", "recess", "strike"]);

export function isLibraryClosureAnnouncement(announcement: ServiceAnnouncement) {
  return closureTypes.has(announcement.type) || announcement.type === "other" && /biblioteca (sem funcionamento|fechada)/i.test(`${announcement.title ?? ""} ${announcement.message ?? ""}`);
}

export function isLibraryWeekend(now: string) {
  const weekday = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "America/Sao_Paulo" }).format(new Date(now));
  return weekday === "Sat" || weekday === "Sun";
}

function brazilianCalendarDay(value: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function serviceDayKey(value: string | Date) {
  return brazilianCalendarDay(typeof value === "string" ? value : value.toISOString());
}

export function formatServiceDate(value: string, language: InterfaceLanguage) {
  return new Intl.DateTimeFormat(language === "pt" ? "pt-BR" : language, { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo" }).format(new Date(value));
}

export function isCurrentServiceAnnouncement(
  announcement: ServiceAnnouncement,
  now: string,
) {
  if (oneDayTypes.has(announcement.type)) {
    const today = brazilianCalendarDay(now);
    return brazilianCalendarDay(announcement.starts_at) <= today && today <= brazilianCalendarDay(announcement.ends_at ?? announcement.starts_at);
  }
  return !announcement.ends_at || new Date(announcement.ends_at) >= new Date(now);
}
