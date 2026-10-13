import { DashboardShell } from "@/components/dashboard-shell";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PRIVACY_NOTICE_VERSION } from "@/domain/privacy/notice";
import { PrivacyAcknowledgement } from "@/components/privacy-acknowledgement";
import type { Metadata } from "next";
import { getInterfaceLanguage } from "@/lib/server-language";
import { AuthShell } from "@/components/auth-shell";
import { AuthFeedback } from "@/components/auth-feedback";
import Link from "next/link";
import { formatServiceDate, isCurrentServiceAnnouncement, isLibraryClosureAnnouncement, isLibraryWeekend, serviceDayKey } from "@/lib/service-announcements";
import { uiText } from "@/lib/ui-text";
import { PanelInterfaceLanguageScope } from "@/components/interface-language";

export async function generateMetadata(): Promise<Metadata> {
  const titles = { pt: "Painel", en: "Dashboard", es: "Panel", de: "Dashboard", fr: "Tableau de bord", it: "Pannello" };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle() : { data: null };
  const language = profile?.role === "cataloger" || profile?.role === "administrator" ? "pt" : await getInterfaceLanguage();
  return { title: titles[language], robots: { index: false, follow: false } };
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  const { data: profile, error: profileError } = await supabase.from("profiles").select("full_name, role, status, avatar_choice").eq("id", user.id).single();
  if (profileError || !profile) {
    const language = await getInterfaceLanguage();
    const t = (source: string) => uiText(language, source);
    return <AuthShell title={t("Não foi possível carregar sua conta")} description={t("Sua sessão foi mantida. Tente abrir o painel novamente em instantes.")}><AuthFeedback error={t("Falha temporária ao consultar os dados da conta.")} /><Link href="/painel">{t("Tentar novamente")}</Link></AuthShell>;
  }
  if (profile.status !== "active") {
    await supabase.auth.signOut();
    redirect("/entrar?error=Esta%20conta%20n%C3%A3o%20est%C3%A1%20ativa.");
  }
  const { data: birthdayProfile } = profile.role === "student"
    ? await supabase.from("student_profiles").select("birth_date").eq("profile_id", user.id).maybeSingle()
    : await supabase.from("staff_profiles").select("birthday_month, birthday_day").eq("profile_id", user.id).maybeSingle();
  const staffBirthday = birthdayProfile as { birthday_month?: number | null; birthday_day?: number | null } | null;
  const birthday = profile.role === "student"
    ? (birthdayProfile as { birth_date?: string | null } | null)?.birth_date?.slice(5) ?? null
    : staffBirthday?.birthday_month && staffBirthday.birthday_day
      ? `${String(staffBirthday.birthday_month).padStart(2, "0")}-${String(staffBirthday.birthday_day).padStart(2, "0")}` : null;
  let serviceStatus;
  if (profile.role === "student") {
    const now = new Date().toISOString();
    const { data: announcements } = await supabase.from("library_announcements").select("title,message,type,starts_at,ends_at").eq("active", true).neq("type", "normal").lte("starts_at", now).order("starts_at", { ascending: false }).limit(100);
    const currentAnnouncement = announcements?.find((item) => isCurrentServiceAnnouncement(item, now));
    const closureAnnouncement = announcements?.find((item) => isCurrentServiceAnnouncement(item, now) && isLibraryClosureAnnouncement(item));
    const closed = isLibraryWeekend(now) || Boolean(closureAnnouncement);
    const language = await getInterfaceLanguage();
    serviceStatus = {
      title: closed ? uiText(language, "Biblioteca fechada agora") : currentAnnouncement ? `${uiText(language, "Prazos impactados:")} ${currentAnnouncement.title}` : uiText(language, "Atendimento normal"),
      message: closed ? uiText(language, "Você pode solicitar a ficha mesmo com a biblioteca fechada. O prazo de atendimento começa a contar no próximo dia útil.") : undefined,
      reason: closureAnnouncement?.title,
      date: { value: serviceDayKey(now), label: formatServiceDate(now, language) },
      exceptional: Boolean(currentAnnouncement) || closed,
      closed,
    };
  }
  const { data: acknowledgement } = await supabase.from("privacy_notice_acknowledgements").select("id").eq("profile_id", user.id).eq("notice_version", PRIVACY_NOTICE_VERSION).maybeSingle();
  const staff = profile.role === "cataloger" || profile.role === "administrator";
  if (!acknowledgement) {
    return <PanelInterfaceLanguageScope staff={staff}><DashboardShell fullName={profile.full_name} role={profile.role} userId={user.id} avatarChoice={profile.avatar_choice} birthday={birthday} serviceStatus={serviceStatus} showNotifications={false}><main className="dashboard-main dashboard-main--narrow" aria-hidden="true" /><PrivacyAcknowledgement /></DashboardShell></PanelInterfaceLanguageScope>;
  }
  return <PanelInterfaceLanguageScope staff={staff}><DashboardShell fullName={profile.full_name} role={profile.role} userId={user.id} avatarChoice={profile.avatar_choice} birthday={birthday} serviceStatus={serviceStatus}>{children}</DashboardShell></PanelInterfaceLanguageScope>;
}
