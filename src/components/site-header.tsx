import Link from "next/link";
import { Brand } from "./brand";
import { LibrarySocialLinks } from "./library-social-links";
import { createClient } from "@/lib/supabase/server";
import { PublicBreadcrumbs } from "./breadcrumbs";
import { logout } from "@/app/auth-actions";
import { AppIcon, type AppIconName } from "./app-icon";
import { getInterfaceLanguage } from "@/lib/server-language";
import { LiteraryAvatar } from "./literary-avatar";
import { StudentAvatar } from "./student-avatar";
import { SiteHeaderGreeting } from "./site-header-greeting";
import { formatLibraryHour, formatServiceDate, isCurrentServiceAnnouncement, isLibraryClosedNow, isLibraryClosureAnnouncement, libraryClosingTime, serviceDayKey } from "@/lib/service-announcements";
import { uiText } from "@/lib/ui-text";
import { homeCopy } from "@/lib/home-copy";
import { ServiceDayRefresh } from "@/components/service-day-refresh";
import { HeaderExploreMenu } from "@/components/header-explore-menu";
import { ServiceStatusPeek } from "@/components/service-status-peek";

const copy = {
  pt: ["Meu painel", "Olá", "Visão geral", "Minha solicitação", "Autodepósito", "Minha conta", "Fila de solicitações", "Meus atendimentos", "Administração", "Navegação principal", "Como funciona", "Central de ajuda", "Sair da conta", "Entrar", "Explorar", "Vantagens"],
  en: ["My dashboard", "Hello", "Overview", "My request", "Self-deposit", "My account", "Request queue", "My cases", "Administration", "Main navigation", "How it works", "Help center", "Sign out", "Sign in", "Explore", "Benefits"],
  es: ["Mi panel", "Hola", "Resumen", "Mi solicitud", "Autodepósito", "Mi cuenta", "Solicitudes", "Mis casos", "Administración", "Navegación principal", "Cómo funciona", "Centro de ayuda", "Cerrar sesión", "Entrar", "Explorar", "Ventajas"],
  de: ["Mein Bereich", "Hallo", "Übersicht", "Meine Anfrage", "Selbsteinreichung", "Mein Konto", "Anfragen", "Meine Fälle", "Verwaltung", "Hauptnavigation", "So funktioniert es", "Hilfe", "Abmelden", "Anmelden", "Entdecken", "Vorteile"],
  fr: ["Mon espace", "Bonjour", "Vue d’ensemble", "Ma demande", "Auto-dépôt", "Mon compte", "Demandes", "Mes dossiers", "Administration", "Navigation principale", "Comment ça marche", "Centre d’aide", "Se déconnecter", "Se connecter", "Explorer", "Avantages"],
  it: ["La mia area", "Ciao", "Panoramica", "La mia richiesta", "Autodeposito", "Il mio account", "Richieste", "I miei casi", "Amministrazione", "Navigazione principale", "Come funziona", "Centro assistenza", "Esci", "Accedi", "Esplora", "Vantaggi"],
};

export async function SiteHeader({ articleTitle, showServiceStatus = true, closingTimeOverride }: { articleTitle?: string; showServiceStatus?: boolean; closingTimeOverride?: string } = {}) {
  const language = await getInterfaceLanguage();
  const t = copy[language];
  const supabase = await createClient();
  const now = new Date().toISOString();
  const [{ data: announcements }, { data: dailyHours }] = await Promise.all([
    showServiceStatus ? supabase.from("library_announcements").select("title,message,type,starts_at,ends_at").eq("active", true).neq("type", "normal").lte("starts_at", now).order("starts_at", { ascending: false }).limit(100) : Promise.resolve({ data: null }),
    showServiceStatus ? supabase.from("library_daily_hours").select("closing_time").eq("service_date", serviceDayKey(now)).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const closingTime = libraryClosingTime(closingTimeOverride ?? dailyHours?.closing_time);
  const currentAnnouncement = announcements?.find((item) => isCurrentServiceAnnouncement(item, now));
  const closureAnnouncement = announcements?.find((item) => isCurrentServiceAnnouncement(item, now) && isLibraryClosureAnnouncement(item));
  const closed = isLibraryClosedNow(now, closingTime) || Boolean(closureAnnouncement);
  const status = closed ? uiText(language, "Biblioteca fechada agora") : currentAnnouncement?.title ?? homeCopy[language].notice.normal;
  const today = { value: serviceDayKey(now), label: formatServiceDate(now, language) };
  const { data: { user } } = await supabase.auth.getUser();
  let { data: profile } = user ? await supabase.from("profiles").select("role, full_name, avatar_choice").eq("id", user.id).maybeSingle() : { data: null };
  if (user && !profile) {
    const retry = await supabase.from("profiles").select("role, full_name, avatar_choice").eq("id", user.id).maybeSingle();
    profile = retry.data;
  }
  const metadataName = typeof user?.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "";
  const firstName = (profile?.full_name || metadataName).trim().split(/\s+/)[0];
  const accessLabel = t[0];
  const accessHref = user ? "/painel" : "/entrar";
  const accountAvatar = user && profile ? profile.role === "student"
    ? <StudentAvatar name={profile.full_name || metadataName || "Estudante"} small />
    : <LiteraryAvatar id={user.id} label={profile.full_name || metadataName} choice={profile.avatar_choice} small />
    : null;
  const panelLinks: [string, string, AppIconName][] = profile?.role === "student" ? [[t[2], "/painel", "home"], [t[3], "/painel/solicitacao", "request"], [t[4], "/painel/autodeposito", "upload"], [t[5], "/painel/conta", "account"]] : [[t[2], "/painel", "home"], [t[6], "/painel/fila", "queue"], [t[7], "/painel/fila?responsavel=me", "work"], ...(profile?.role === "administrator" ? [[t[8], "/painel/admin", "hierarchy"]] as [string, string, AppIconName][] : []), [t[5], "/painel/conta", "account"]];
  return (
    <>
      <ServiceDayRefresh closingTime={closingTime} />
      <header className="site-header">
        <div className="container site-header__inner">
        <div className="shell-brand"><Brand compact /></div>
        {showServiceStatus && <ServiceStatusPeek className="site-header__service-peek" title={status} date={today} now={now} reason={closureAnnouncement?.title} message={closed ? uiText(language, "Você pode solicitar a ficha mesmo com a biblioteca fechada. O prazo é contado em dias úteis.") : currentAnnouncement?.message} closed={closed} hint={closed ? uiText(language, "Passe o mouse para saber mais") : uiText(language, "Fechamento previsto hoje às {time}", { time: formatLibraryHour(closingTime) })} hoursLabel={dailyHours ? uiText(language, "Funcionamento hoje: 8h às {time}", { time: formatLibraryHour(closingTime) }) : uiText(language, "Funcionamento: seg. a sex., 8h às 21h")} detailsLabel={uiText(language, "Detalhes do funcionamento da biblioteca")} />}
        <nav id="menu-principal" aria-label={t[9]} className="site-header__nav" tabIndex={-1}>
          <HeaderExploreMenu labels={{ trigger: t[14], how: t[10], benefits: t[15], questions: homeCopy[language].faq }} />
          <Link className="site-header__help-link" href="/ajuda" aria-label={t[11]}><AppIcon name="help" /><span>{t[11]}</span></Link>
          {user ? <><div className="site-header__account site-header__account--desktop"><Link className="site-header__access" href={accessHref} aria-label={accessLabel}><span className="site-header__access-icon"><AppIcon name="account" />{accountAvatar}</span><span className="site-header__access-label">{accessLabel}</span><SiteHeaderGreeting key={user.id} greeting={t[1]} firstName={firstName} userId={user.id} fallback={accessLabel} /></Link><div className="site-header__submenu">{panelLinks.map(([label, href, icon]) => <Link key={href} href={href}><AppIcon name={icon} /><span>{label}</span></Link>)}<form action={logout}><button className="site-header__logout" type="submit"><AppIcon name="logout" />{t[12]}</button></form></div></div><details className="site-header__account site-header__account--touch"><summary className="site-header__access" aria-label={accessLabel}><span className="site-header__access-icon"><AppIcon name="account" />{accountAvatar}</span><span>{accessLabel}</span></summary><div className="site-header__submenu">{panelLinks.map(([label, href, icon]) => <Link key={href} href={href}><AppIcon name={icon} /><span>{label}</span></Link>)}<form action={logout}><button className="site-header__logout" type="submit"><AppIcon name="logout" />{t[12]}</button></form></div></details></> : <Link className="site-header__access" href={accessHref}><AppIcon name="account" />{t[13]}</Link>}
          <LibrarySocialLinks />
        </nav>
        </div>
      </header>
      <PublicBreadcrumbs articleTitle={articleTitle} />
    </>
  );
}
