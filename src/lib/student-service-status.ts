import { createClient } from "@/lib/supabase/server";
import { getInterfaceLanguage } from "@/lib/server-language";
import { formatServiceDate, isCurrentServiceAnnouncement, isLibraryClosedNow, isLibraryClosureAnnouncement, libraryClosingTime, serviceDayKey } from "@/lib/service-announcements";
import { uiText } from "@/lib/ui-text";

export async function studentServiceStatus(supabase: Awaited<ReturnType<typeof createClient>>) {
  const now = new Date().toISOString();
  const [{ data: announcements }, { data: dailyHours }, language] = await Promise.all([
    supabase.from("library_announcements").select("title,message,type,starts_at,ends_at").eq("active", true).neq("type", "normal").lte("starts_at", now).order("starts_at", { ascending: false }).limit(100),
    supabase.from("library_daily_hours").select("closing_time").eq("service_date", serviceDayKey(now)).maybeSingle(),
    getInterfaceLanguage(),
  ]);
  const closingTime = libraryClosingTime(dailyHours?.closing_time);
  const currentAnnouncement = announcements?.find((item) => isCurrentServiceAnnouncement(item, now));
  const closureAnnouncement = announcements?.find((item) => isCurrentServiceAnnouncement(item, now) && isLibraryClosureAnnouncement(item));
  const closed = isLibraryClosedNow(now, closingTime) || Boolean(closureAnnouncement);
  return {
    title: closed ? uiText(language, "Biblioteca fechada agora") : currentAnnouncement ? `${uiText(language, "Prazos impactados:")} ${currentAnnouncement.title}` : uiText(language, "Atendimento normal agora"),
    message: closed ? uiText(language, "Você pode solicitar a ficha mesmo com a biblioteca fechada. O prazo é contado em dias úteis.") : currentAnnouncement?.message ?? undefined,
    reason: closureAnnouncement?.title,
    date: { value: serviceDayKey(now), label: formatServiceDate(now, language) },
    exceptional: Boolean(currentAnnouncement) || closed,
    closed,
    closingTime,
    specialHours: Boolean(dailyHours),
    now,
  };
}
