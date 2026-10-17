"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { BrandPixels } from "@/components/brand-pixels";
import { logout } from "@/app/auth-actions";
import { DashboardBreadcrumbProvider, DashboardBreadcrumbs } from "./breadcrumbs";
import { AppIcon, type AppIconName } from "./app-icon";
import { BackendHelpWidget } from "./backend-help-widget";
import { ModalCloseButton } from "./modal-close-button";
import { useInterfaceLanguage } from "./interface-language";
import { StaffCommunications } from "./staff-communications";
import { ServiceDayRefresh } from "./service-day-refresh";
import { LiteraryAvatar } from "./literary-avatar";
import { StudentAvatar } from "./student-avatar";
import { authorWikipediaUrl, quoteForDay } from "@/lib/daily-literary-quotes";
import { uiText } from "@/lib/ui-text";
import { PanelChangeToast } from "@/components/panel-change-toast";
import { ServiceStatusPeek } from "@/components/service-status-peek";
import { StaffGlobalSearch } from "@/components/staff-global-search";
import { formatLibraryHour } from "@/lib/service-announcements";
import { createClient } from "@/lib/supabase/client";
import { adminSections, adminTabHref, canOpenAdminTab, resolveAdminLocation, type AdminArea } from "@/lib/admin-navigation";
import { studentPreviewScenarios } from "@/lib/student-preview-fixtures";

const shellCopy = {
  pt: { student: "Estudante", cataloger: "Catalogador", administrator: "Administrador", overview: "Visão geral", queue: "Fila de solicitações", work: "Meus atendimentos", admin: "Administração", operation: "Operação", content: "Conteúdo", control: "Controle", account: "Minha conta", request: "Minhas solicitações", deposit: "Autodepósito", public: "Abrir site público", greeting: "Olá", logout: "Sair da conta", library: "Área da biblioteca", studentArea: "Área do estudante", adminSections: "Subseções administrativas" },
  en: { student: "Student", cataloger: "Cataloger", administrator: "Administrator", overview: "Overview", queue: "Request queue", work: "My cases", admin: "Administration", operation: "Operations", content: "Content", control: "Control", account: "My account", request: "My requests", deposit: "Self-deposit", public: "Open public site", greeting: "Hello", logout: "Sign out", library: "Library area", studentArea: "Student area", adminSections: "Administration sections" },
  es: { student: "Estudiante", cataloger: "Catalogador", administrator: "Administrador", overview: "Resumen", queue: "Cola de solicitudes", work: "Mis casos", admin: "Administración", operation: "Operación", content: "Contenido", control: "Control", account: "Mi cuenta", request: "Mis solicitudes", deposit: "Autodepósito", public: "Abrir sitio público", greeting: "Hola", logout: "Cerrar sesión", library: "Área de biblioteca", studentArea: "Área de estudiantes", adminSections: "Secciones administrativas" },
  de: { student: "Studierende", cataloger: "Katalogisierer", administrator: "Administrator", overview: "Übersicht", queue: "Anfragen", work: "Meine Fälle", admin: "Verwaltung", operation: "Betrieb", content: "Inhalt", control: "Kontrolle", account: "Mein Konto", request: "Meine Anfragen", deposit: "Selbsteinreichung", public: "Öffentliche Seite öffnen", greeting: "Hallo", logout: "Abmelden", library: "Bibliotheksbereich", studentArea: "Studierendenbereich", adminSections: "Verwaltungsbereiche" },
  fr: { student: "Étudiant", cataloger: "Catalogueur", administrator: "Administrateur", overview: "Vue d’ensemble", queue: "Demandes", work: "Mes dossiers", admin: "Administration", operation: "Opérations", content: "Contenu", control: "Contrôle", account: "Mon compte", request: "Mes demandes", deposit: "Auto-dépôt", public: "Ouvrir le site public", greeting: "Bonjour", logout: "Se déconnecter", library: "Espace bibliothèque", studentArea: "Espace étudiant", adminSections: "Rubriques administratives" },
  it: { student: "Studente", cataloger: "Catalogatore", administrator: "Amministratore", overview: "Panoramica", queue: "Richieste", work: "I miei casi", admin: "Amministrazione", operation: "Operazioni", content: "Contenuto", control: "Controllo", account: "Il mio account", request: "Le mie richieste", deposit: "Autodeposito", public: "Apri sito pubblico", greeting: "Ciao", logout: "Esci", library: "Area biblioteca", studentArea: "Area studenti", adminSections: "Sezioni amministrative" },
};
const mobileMenuCopy = { pt: ["Abrir menu do painel", "Fechar menu do painel"], en: ["Open dashboard menu", "Close dashboard menu"], es: ["Abrir menú del panel", "Cerrar menú del panel"], de: ["Dashboardmenü öffnen", "Dashboardmenü schließen"], fr: ["Ouvrir le menu du tableau de bord", "Fermer le menu du tableau de bord"], it: ["Apri menu del pannello", "Chiudi menu del pannello"] } as const;
const logoutDialogCopy = {
  pt: { title: "Sair do painel?", description: "Sua sessão será encerrada.", stay: "Continuar no painel", exit: "Sair da conta" },
  en: { title: "Sign out?", description: "Your session will end.", stay: "Stay in dashboard", exit: "Sign out" },
  es: { title: "¿Cerrar sesión?", description: "Tu sesión se cerrará.", stay: "Seguir en el panel", exit: "Cerrar sesión" },
  de: { title: "Abmelden?", description: "Ihre Sitzung wird beendet.", stay: "Im Dashboard bleiben", exit: "Abmelden" },
  fr: { title: "Se déconnecter ?", description: "Votre session sera terminée.", stay: "Rester sur le tableau de bord", exit: "Se déconnecter" },
  it: { title: "Uscire?", description: "La sessione verrà terminata.", stay: "Resta nel pannello", exit: "Esci dall’account" },
};

const navIcons: Record<string, AppIconName> = { overview: "home", queue: "queue", work: "work", admin: "hierarchy", account: "account", request: "request", deposit: "upload", panelCollapse: "panelCollapse", panelExpand: "panelExpand" };
function SidebarIcon({ name }: { name: keyof typeof navIcons }) { return <AppIcon className="dashboard-nav__icon" name={navIcons[name]} />; }

function brasiliaDate(now: Date) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}
function localGreetingDate(now: Date) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

const dailyGreetings = {
  pt: { short: ["Olá", "Oi"], periods: ["Bom dia", "Boa tarde", "Boa noite"] },
  en: { short: ["Hello", "Hi"], periods: ["Good morning", "Good afternoon", "Good evening"] },
  es: { short: ["Hola", "Buenas"], periods: ["Buenos días", "Buenas tardes", "Buenas noches"] },
  de: { short: ["Hallo", "Hi"], periods: ["Guten Morgen", "Guten Tag", "Guten Abend"] },
  fr: { short: ["Bonjour", "Salut"], periods: ["Bonjour", "Bon après-midi", "Bonsoir"] },
  it: { short: ["Ciao", "Salve"], periods: ["Buongiorno", "Buon pomeriggio", "Buonasera"] },
} as const;

function dailyGreeting(language: keyof typeof dailyGreetings, userId: string, day: string, hour: number) {
  const dayIndex = Math.floor(Date.parse(`${day}T00:00:00Z`) / 86_400_000);
  const userOffset = [...userId].reduce((sum, character) => sum + character.charCodeAt(0), 0);
  const variant = (dayIndex + userOffset) % 3;
  if (variant === 0) return dailyGreetings[language].short[0];
  if (variant === 1) return dailyGreetings[language].short[1];
  return dailyGreetings[language].periods[hour < 12 ? 0 : hour < 18 ? 1 : 2];
}

const commemorativeDates: Record<string, string> = {
  "01-24": "Dia Internacional da Educação",
  "03-12": "Dia do(a) Bibliotecário(a)",
  "04-02": "Dia Internacional do Livro Infantil",
  "04-08": "Criação da Universidade da Bahia",
  "04-09": "Dia Nacional da Biblioteca",
  "04-18": "Dia Nacional do Livro Infantil",
  "04-23": "Dia Mundial do Livro",
  "05-21": "Dia Mundial da Diversidade Cultural",
  "07-02": "Dia da Independência do Brasil na Bahia e aniversário da UFBA",
  "07-08": "Dia Nacional da Ciência",
  "09-08": "Dia Internacional da Alfabetização",
  "10-15": "Dia do(a) Professor(a)",
  "10-29": "Dia Nacional do Livro",
  "11-05": "Dia Nacional da Cultura",
  "12-15": "Dia do(a) Arquiteto(a) e Urbanista",
};

export function DashboardShell({ children, fullName, role, userId, avatarChoice, birthday, serviceStatus, canChangeHours = false, canViewOverview = true, canViewQueue = true, canViewCalendar = true, canManageCalendar = false, canPreviewStudent = false, adminPermissions = [], showNotifications = true }: { children: React.ReactNode; fullName: string; role: string; userId: string; avatarChoice?: number | null; birthday?: string | null; serviceStatus?: { title: string; message?: string; reason?: string; date: { value: string; label: string }; exceptional: boolean; closed: boolean; closingTime: string; specialHours: boolean; now: string }; canChangeHours?: boolean; canViewOverview?: boolean; canViewQueue?: boolean; canViewCalendar?: boolean; canManageCalendar?: boolean; canPreviewStudent?: boolean; adminPermissions?: string[]; showNotifications?: boolean }) {
  const isStaff = role === "cataloger" || role === "administrator";
  const [previewAllowed, setPreviewAllowed] = useState(canPreviewStudent);
  const pathname = usePathname();
  const previewMode = isStaff && pathname.startsWith("/painel/visao-estudante");
  useEffect(() => { setPreviewAllowed(canPreviewStudent); }, [canPreviewStudent]);
  useEffect(() => {
    if (!isStaff) return;
    let active = true;
    const refreshPreviewPermission = async () => {
      const { data, error } = await createClient().rpc("has_permission", { requested_code: "student.preview" });
      if (active && !error) setPreviewAllowed(Boolean(data));
    };
    window.addEventListener("pronto:staff-permissions-updated", refreshPreviewPermission);
    window.addEventListener("focus", refreshPreviewPermission);
    return () => { active = false; window.removeEventListener("pronto:staff-permissions-updated", refreshPreviewPermission); window.removeEventListener("focus", refreshPreviewPermission); };
  }, [isStaff]);
  const router = useRouter();
  const { language } = useInterfaceLanguage();
  const t = shellCopy[language];
  const translate = (value: string, values?: Record<string, string | number>) => uiText(language, value, values);
  const [openMenuLabel, closeMenuLabel] = mobileMenuCopy[language];
  const searchParams = useSearchParams();
  const previewHref = (screen: string) => `/painel/visao-estudante${screen ? `?tela=${screen}` : ""}${searchParams.get("estado") ? `${screen ? "&" : "?"}estado=${searchParams.get("estado")}` : ""}`;
  const previewScenario = studentPreviewScenarios.find((item) => item.id === searchParams.get("estado")) ?? studentPreviewScenarios[0];
  const adminAreaParam = searchParams.get("area");
  const adminLocation = resolveAdminLocation(adminAreaParam ?? undefined, searchParams.get("aba") ?? undefined);
  const [expanded, setExpanded] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const railRef = useRef<HTMLElement>(null);
  const previewDockRef = useRef<HTMLDivElement>(null);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [dailyQuote, setDailyQuote] = useState(() => quoteForDay(new Date()));
  const [birthdayVisible, setBirthdayVisible] = useState(false);
  const [birthdayClosing, setBirthdayClosing] = useState(false);
  const [today, setToday] = useState(() => brasiliaDate(new Date()));
  const [greetingClock, setGreetingClock] = useState<{ day: string; hour: number } | null>(null);
  const [newQueueCount, setNewQueueCount] = useState(0);
  const previewBadges = process.env.NODE_ENV === "development" && searchParams.get("ver-contadores") === "1";
  const visibleQueueCount = previewBadges ? 4 : newQueueCount;
  const specialDateKey = today.slice(5);
  const specialDate = commemorativeDates[specialDateKey];
  const logoutDialogRef = useRef<HTMLDialogElement>(null);
  const birthdayCloseTimer = useRef<number | null>(null);
  const logoutFormRef = useRef<HTMLFormElement>(null);
  const [adminMenuOpen, setAdminMenuOpen] = useState(() => pathname.startsWith("/painel/admin"));
  const [openAdminGroups, setOpenAdminGroups] = useState<Set<AdminArea>>(() => new Set(pathname === "/painel/admin" && adminAreaParam ? [adminLocation.area] : []));
  const closeBirthday = useCallback(() => {
    setBirthdayClosing(true);
    if (birthdayCloseTimer.current !== null) window.clearTimeout(birthdayCloseTimer.current);
    birthdayCloseTimer.current = window.setTimeout(() => { setBirthdayVisible(false); setBirthdayClosing(false); birthdayCloseTimer.current = null; }, 650);
  }, []);
  useEffect(() => { if (pathname.startsWith("/painel/admin")) setAdminMenuOpen(true); if (pathname === "/painel/admin" && adminAreaParam) setOpenAdminGroups((open) => new Set([...open, adminLocation.area])); setMobileMenuOpen(false); }, [pathname, adminAreaParam, adminLocation.area]);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rail = railRef.current;
        if (!rail) return;
        const shell = rail.parentElement;
        const shellBounds = shell?.getBoundingClientRect();
        const headerAnchor = shell?.querySelector(".staff-communications, .dashboard-header__actions");
        const anchorBounds = headerAnchor?.getBoundingClientRect();
        const logoBounds = rail.querySelector(".dashboard-nav__logo-link")?.getBoundingClientRect();
        const logoCenterWithinRail = logoBounds ? logoBounds.top - rail.getBoundingClientRect().top + logoBounds.height / 2 : 38;
        const fixedTop = Math.max(0, anchorBounds ? anchorBounds.top + anchorBounds.height / 2 - logoCenterWithinRail : shellBounds?.top ?? 0);
        const governmentBarBottom = document.getElementById("barra-brasil")?.getBoundingClientRect().bottom ?? shellBounds?.top ?? 0;
        const backgroundTop = Math.min(0, Math.max(0, governmentBarBottom) - fixedTop);
        const visibleHeight = window.innerHeight - fixedTop;
        const progress = Math.min(1, window.scrollY / Math.max(240, window.innerHeight * .45));
        rail.style.setProperty("--rail-fixed-top", `${fixedTop}px`);
        rail.style.setProperty("--rail-bg-top", `${backgroundTop}px`);
        rail.style.setProperty("--rail-bg-height", `${Math.max(0, Math.min(visibleHeight, (shellBounds?.bottom ?? window.innerHeight) - fixedTop) - backgroundTop)}px`);
        rail.style.setProperty("--rail-preview-bottom", `${Math.max(16, window.innerHeight - (shellBounds?.bottom ?? window.innerHeight) + 16)}px`);
        rail.style.setProperty("--rail-nav-top", `${visibleHeight * .5 * (1 - progress) + 160 * progress}px`);
        rail.style.setProperty("--rail-nav-shift", `${-50 * (1 - progress)}%`);
      });
    };
    update();
    const resizeObserver = new ResizeObserver(update);
    const shell = railRef.current?.parentElement;
    const governmentBar = document.getElementById("barra-brasil");
    if (shell) resizeObserver.observe(shell);
    if (governmentBar) resizeObserver.observe(governmentBar);
    const header = shell?.querySelector(".dashboard-header");
    if (header) resizeObserver.observe(header);
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => { cancelAnimationFrame(frame); resizeObserver.disconnect(); window.removeEventListener("scroll", update); window.removeEventListener("resize", update); };
  }, []);
  useEffect(() => {
    const refreshQuote = () => { const now = new Date(); setDailyQuote(quoteForDay(now)); setToday(brasiliaDate(now)); setGreetingClock({ day: localGreetingDate(now), hour: now.getHours() }); };
    refreshQuote();
    const interval = window.setInterval(refreshQuote, 60_000);
    document.addEventListener("visibilitychange", refreshQuote);
    return () => { window.clearInterval(interval); document.removeEventListener("visibilitychange", refreshQuote); };
  }, []);
  useEffect(() => {
    if (!birthday || birthday !== today.slice(5)) return;
    const key = `pronto-birthday:${userId}:${today}`;
    try { if (window.localStorage.getItem(key)) return; window.localStorage.setItem(key, "seen"); } catch { /* Sem armazenamento, a saudação ainda pode aparecer. */ }
    const show = window.setTimeout(() => setBirthdayVisible(true), 250);
    const hide = window.setTimeout(() => closeBirthday(), 8500);
    return () => { window.clearTimeout(show); window.clearTimeout(hide); };
  }, [birthday, today, userId, closeBirthday]);
  useEffect(() => () => { if (birthdayCloseTimer.current !== null) window.clearTimeout(birthdayCloseTimer.current); }, []);
  useEffect(() => {
    if (!isStaff || !canViewQueue || !showNotifications) return;
    const supabase = createClient();
    let active = true;
    const refreshQueueCount = async () => {
      const { count, error } = await supabase.from("cataloging_requests").select("id", { count: "exact", head: true }).eq("status", "submitted").is("assigned_to", null);
      if (active && !error) setNewQueueCount(count ?? 0);
    };
    void refreshQueueCount();
    const channel = supabase.channel(`dashboard-queue-count-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "cataloging_requests" }, () => { void refreshQueueCount(); })
      .subscribe();
    const interval = window.setInterval(() => { void refreshQueueCount(); }, 15_000);
    window.addEventListener("focus", refreshQueueCount);
    return () => { active = false; window.clearInterval(interval); window.removeEventListener("focus", refreshQueueCount); void supabase.removeChannel(channel); };
  }, [isStaff, canViewQueue, showNotifications, userId]);
  useEffect(() => {
    const dialog = logoutDialogRef.current;
    if (logoutDialogOpen && dialog && !dialog.open) dialog.showModal();
    if (!logoutDialogOpen && dialog?.open) dialog.close();
  }, [logoutDialogOpen]);
  useEffect(() => {
    const dock = previewDockRef.current;
    if (!previewMode || !dock) return;
    const updateClearance = () => {
      document.documentElement.style.setProperty("--student-preview-dock-clearance", `${Math.ceil(window.innerHeight - dock.getBoundingClientRect().top + 12)}px`);
    };
    const observer = new ResizeObserver(updateClearance);
    observer.observe(dock);
    updateClearance();
    window.addEventListener("resize", updateClearance);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateClearance);
      document.documentElement.style.removeProperty("--student-preview-dock-clearance");
    };
  }, [previewMode]);
  const adminMenuVisible = adminMenuOpen;
  const activeClass = (href: string) => {
    const [targetPath, targetQuery] = href.split("?");
    if (targetPath === "/painel/fila" && pathname.startsWith("/painel/atendimento/")) return targetQuery ? undefined : "is-active";
    if (pathname !== targetPath && !(targetPath !== "/painel" && pathname.startsWith(`${targetPath}/`))) return undefined;
    if (!targetQuery) return "is-active";
    const query = new URLSearchParams(targetQuery);
    return [...query.entries()].every(([key, value]) => searchParams.get(key) === value) ? "is-active" : undefined;
  };
  const firstName = fullName.trim().split(/\s+/)[0] || fullName;
  const greeting = greetingClock ? dailyGreeting(language, userId, greetingClock.day, greetingClock.hour) : "";
  return (
    <div className="dashboard-shell dashboard-shell--compact" data-staff-panel={isStaff && !previewMode ? "true" : undefined}>
      {(!isStaff || previewMode) && <ServiceDayRefresh closingTime={serviceStatus?.closingTime} />}
      <aside ref={railRef} className={`dashboard-nav${expanded ? "" : " dashboard-nav--compact"}`} onMouseEnter={() => { if (window.matchMedia("(min-width: 1101px) and (hover: hover) and (pointer: fine) and (any-pointer: fine)").matches) setExpanded(true); }} onMouseLeave={() => { if (window.matchMedia("(min-width: 1101px) and (hover: hover) and (pointer: fine) and (any-pointer: fine)").matches) setExpanded(false); }} onFocusCapture={() => { if (window.matchMedia("(min-width: 1101px) and (hover: hover) and (pointer: fine) and (any-pointer: fine)").matches) setExpanded(true); }} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setExpanded(false); }}>
        <div className="dashboard-nav__top">
          <Link href="/" className="dashboard-nav__logo-link" aria-label="Pronto!" title="Pronto!"><span className="dashboard-nav__favicon"><span className="dashboard-nav__symbol" role="img" aria-label="Pronto!" title="Pronto!"><BrandPixels symbol /></span></span><span className="dashboard-nav__brand-logo"><Image className="brand__image brand__image--light" src="/logo-pronto-v9-light.png" alt="Pronto!" width={1570} height={368} priority /><Image className="brand__image brand__image--dark" src="/logo-pronto-v9-dark.png" alt="Pronto!" width={1570} height={368} priority /><BrandPixels /></span></Link>
          <button className="dashboard-nav__mobile-toggle" type="button" aria-label={mobileMenuOpen ? closeMenuLabel : openMenuLabel} aria-expanded={mobileMenuOpen} aria-controls="menu-painel" onClick={() => setMobileMenuOpen((open) => !open)}><span /><span /><span /></button>
        </div>
        {isStaff && !previewMode ? <nav className={`dashboard-nav__menu${mobileMenuOpen ? " is-open" : ""}`} id="menu-painel" aria-label={t.library}>
          {canViewOverview && <Link onClick={() => setMobileMenuOpen(false)} className={activeClass("/painel")} href="/painel" aria-label={t.overview} title={t.overview}><SidebarIcon name="overview" /><span className="dashboard-nav__label">{t.overview}</span></Link>}
          {canViewQueue && <Link onClick={() => setMobileMenuOpen(false)} className={activeClass("/painel/fila")} href="/painel/fila" aria-label={`${t.queue}${visibleQueueCount ? `, ${visibleQueueCount} ${visibleQueueCount === 1 ? "atendimento novo" : "atendimentos novos"}` : ""}`} title={t.queue}><span className="dashboard-nav__queue-symbol"><SidebarIcon name="queue" />{visibleQueueCount > 0 && <span className="dashboard-nav__queue-badge" aria-hidden="true">{visibleQueueCount > 99 ? "99+" : visibleQueueCount}</span>}</span><span className="dashboard-nav__label">{t.queue}</span></Link>}
          {canViewCalendar && role !== "administrator" && !adminPermissions.some((code) => code.startsWith("admin.")) && (canManageCalendar
            ? <Link onClick={() => setMobileMenuOpen(false)} className={activeClass("/painel/admin?area=operacao&aba=library")} href="/painel/admin?area=operacao&aba=library" aria-label="Calendário e mural" title="Calendário e mural"><AppIcon className="dashboard-nav__icon" name="calendar" /><span className="dashboard-nav__label">Calendário e mural</span></Link>
            : <Link onClick={() => setMobileMenuOpen(false)} className={activeClass("/painel/calendario")} href="/painel/calendario" aria-label="Calendário da biblioteca" title="Calendário da biblioteca"><AppIcon className="dashboard-nav__icon" name="calendar" /><span className="dashboard-nav__label">Calendário da biblioteca</span></Link>)}
          {canChangeHours && (role !== "administrator" || !canViewCalendar) && <Link onClick={() => setMobileMenuOpen(false)} className={activeClass("/painel/horarios")} href="/painel/horarios" aria-label="Horários da biblioteca" title="Horários da biblioteca"><AppIcon className="dashboard-nav__icon" name="clock" /><span className="dashboard-nav__label">Horários da biblioteca</span></Link>}
          {(adminSections.some((section) => section.tabs.some((tab) => canOpenAdminTab(tab.id, adminPermissions))) || adminPermissions.some((code) => code.startsWith("admin.feedback."))) && <div className="dashboard-nav__admin">
            <button className={`dashboard-nav__admin-trigger${pathname.startsWith("/painel/admin") ? " is-active" : ""}`} type="button" onClick={() => { setOpenAdminGroups(new Set()); setAdminMenuOpen((open) => !open); }} aria-expanded={adminMenuVisible} aria-controls="submenu-administracao" aria-label="Abrir ou fechar subseções de Administração" title={t.admin}><SidebarIcon name="admin" /><span className="dashboard-nav__label">{t.admin}</span></button>
            <div className={`dashboard-nav__admin-menu${adminMenuVisible ? " is-visible" : ""}`} id="submenu-administracao" aria-label={t.adminSections} inert={!adminMenuVisible}>
              <div className="dashboard-nav__admin-menu-inner">
              {adminSections.filter((section) => section.tabs.some((tab) => canOpenAdminTab(tab.id, adminPermissions))).map((section) => <div className="dashboard-nav__admin-group" key={section.area}>
                <button type="button" className={`dashboard-nav__admin-group-trigger${pathname === "/painel/admin" && adminAreaParam === section.area ? " is-current" : ""}`} aria-expanded={openAdminGroups.has(section.area)} aria-controls={`submenu-admin-${section.area}`} onClick={() => setOpenAdminGroups((open) => { const next = new Set(open); if (next.has(section.area)) next.delete(section.area); else next.add(section.area); return next; })}>
                  <AppIcon name={section.icon} />
                  <span>{section.area === "operacao" ? t.operation : section.area === "conteudo" ? t.content : t.control}</span>
                  <span className="dashboard-nav__admin-chevron" aria-hidden="true" />
                </button>
                <div className={`dashboard-nav__admin-submenu${openAdminGroups.has(section.area) ? " is-visible" : ""}`} id={`submenu-admin-${section.area}`} inert={!openAdminGroups.has(section.area)}>
                  <div className="dashboard-nav__admin-submenu-inner">
                  {section.tabs.filter((tab) => canOpenAdminTab(tab.id, adminPermissions)).map((tab) => <Link key={tab.id} href={adminTabHref(section.area, tab.id)} className={pathname === "/painel/admin" && adminAreaParam === section.area && searchParams.get("aba") === tab.id ? "is-active" : undefined} aria-current={pathname === "/painel/admin" && adminAreaParam === section.area && searchParams.get("aba") === tab.id ? "page" : undefined} onClick={() => setMobileMenuOpen(false)}><AppIcon name={tab.icon} />{tab.label}</Link>)}
                  </div>
                </div>
              </div>)}
              {adminPermissions.some((code) => code.startsWith("admin.feedback.")) && <Link onClick={() => setMobileMenuOpen(false)} className={activeClass("/painel/admin/avaliacoes")} href="/painel/admin/avaliacoes"><AppIcon name="review" />Avaliações</Link>}
              </div>
            </div>
          </div>}
          <Link onClick={() => setMobileMenuOpen(false)} className={activeClass("/painel/conta")} href="/painel/conta" aria-label={t.account} title={t.account}><SidebarIcon name="account" /><span className="dashboard-nav__label">{t.account}</span></Link>
          {previewAllowed && <button className="dashboard-nav__preview-mobile" type="button" role="switch" aria-checked="false" onClick={() => { setMobileMenuOpen(false); router.push("/painel/visao-estudante"); }}><span className="dashboard-preview-switch__track"><span /></span><span>Ver como estudante</span></button>}
        </nav> : <nav className={`dashboard-nav__menu${mobileMenuOpen ? " is-open" : ""}`} id="menu-painel" aria-label={t.studentArea}>
          <Link onClick={() => setMobileMenuOpen(false)} className={previewMode ? searchParams.get("tela") === null || searchParams.get("tela") === "inicio" ? "is-active" : undefined : activeClass("/painel")} href={previewMode ? previewHref("") : "/painel"} aria-label={t.overview} title={t.overview}><SidebarIcon name="overview" /><span className="dashboard-nav__label">{t.overview}</span></Link>
          <Link onClick={() => setMobileMenuOpen(false)} className={previewMode ? ["solicitacoes", "solicitacao", "correcao"].includes(searchParams.get("tela") ?? "") ? "is-active" : undefined : activeClass("/painel/solicitacao")} href={previewMode ? previewHref("solicitacoes") : "/painel/solicitacao"} aria-label={t.request} title={t.request}><SidebarIcon name="request" /><span className="dashboard-nav__label">{t.request}</span></Link>
          <Link onClick={() => setMobileMenuOpen(false)} className={previewMode ? searchParams.get("tela") === "autodeposito" ? "is-active" : undefined : activeClass("/painel/autodeposito")} href={previewMode ? previewHref("autodeposito") : "/painel/autodeposito"} aria-label={t.deposit} title={t.deposit}><SidebarIcon name="deposit" /><span className="dashboard-nav__label">{t.deposit}</span></Link>
          <Link onClick={() => setMobileMenuOpen(false)} className={previewMode ? searchParams.get("tela") === "conta" ? "is-active" : undefined : activeClass("/painel/conta")} href={previewMode ? previewHref("conta") : "/painel/conta"} aria-label={t.account} title={t.account}><SidebarIcon name="account" /><span className="dashboard-nav__label">{t.account}</span></Link>
        </nav>}
        {isStaff && !previewMode && previewAllowed && <button className="dashboard-nav__preview-switch" type="button" role="switch" aria-checked="false" aria-label="Ver como estudante" title="Ver como estudante" onClick={() => router.push("/painel/visao-estudante")}><AppIcon className="dashboard-nav__preview-icon" name="eye" /><span className="dashboard-preview-switch__track"><span /></span><span className="dashboard-nav__preview-label">Ver como estudante</span></button>}
      </aside>
      <div className="dashboard-content">
        <header className={`dashboard-header${isStaff && !previewMode ? " dashboard-header--staff" : ""}`}>
          <div className="dashboard-header__inner">
          {isStaff && !previewMode && showNotifications && <StaffCommunications userId={userId} previewBadges={previewBadges} />}
          {isStaff && !previewMode && pathname !== "/painel" && pathname !== "/painel/" && <div className="dashboard-header__search"><StaffGlobalSearch /></div>}
          {(!isStaff || previewMode) && pathname !== "/painel" && pathname !== "/painel/" && (previewMode ? searchParams.get("tela") !== null && searchParams.get("tela") !== "inicio" : true) && serviceStatus && <ServiceStatusPeek className="dashboard-header__service-peek" title={serviceStatus.title} date={serviceStatus.date} now={serviceStatus.now} reason={serviceStatus.reason} message={serviceStatus.message} closed={serviceStatus.closed} hint={serviceStatus.closed ? translate("Passe o mouse para saber mais") : translate("Fechamento previsto hoje às {time}", { time: formatLibraryHour(serviceStatus.closingTime) })} hoursLabel={serviceStatus.specialHours ? translate("Funcionamento hoje: 8h às {time}", { time: formatLibraryHour(serviceStatus.closingTime) }) : translate("Funcionamento: seg. a sex., 8h às 21h")} detailsLabel={translate("Detalhes do funcionamento da biblioteca")} />}
          <div className="dashboard-header__actions">
            {previewMode ? <div className="user-identity"><StudentAvatar name="Estudante" small /><span className="user-identity__copy"><Link className="user-greeting" href={previewHref("conta")}>{t.greeting}, Estudante</Link><span className="user-chip">{t.student}</span></span></div> : <>
            <div className="user-identity">{isStaff ? <span className="dashboard-birthday-avatar" title={birthday === today.slice(5) ? "Feliz aniversário!" : undefined}><LiteraryAvatar id={userId} label={fullName} choice={avatarChoice} small />{birthday === today.slice(5) && <span className="dashboard-birthday-avatar__hat" aria-hidden="true"><i /></span>}</span> : <StudentAvatar name={firstName} small />}<span className="user-identity__copy"><Link className="user-greeting" href="/painel/conta" title={t.account} style={{ visibility: greetingClock ? "visible" : "hidden" }}>{greeting ? `${greeting}, ${firstName}` : `${t.greeting}, ${firstName}`}</Link><span className="user-chip" title={fullName}>{t[role as keyof typeof t] ?? role}</span></span></div>
            <form id="dashboard-logout-form" ref={logoutFormRef} action={logout}><button className="logout-icon" type="button" onClick={() => { if (window.matchMedia("(max-width: 1100px), (pointer: coarse), (any-pointer: coarse)").matches) setLogoutDialogOpen(true); else logoutFormRef.current?.requestSubmit(); }} aria-label={t.logout} title={t.logout}><AppIcon name="logout" /></button></form>
            </>}
          </div>
          </div>
          {birthdayVisible && !previewMode && <div className={`dashboard-birthday${birthdayClosing ? " is-closing" : ""}`} role="status"><span className="dashboard-birthday__confetti" aria-hidden="true">{Array.from({ length: 12 }, (_, index) => <i key={index} />)}</span><span className="dashboard-birthday__cake" aria-hidden="true">🎂</span><span className="dashboard-birthday__message"><strong>{translate("Feliz aniversário, {name}!", { name: firstName })}</strong> {translate("Que seu dia tenha boas histórias.")}</span><button type="button" aria-label={translate("Fechar saudação de aniversário")} onClick={closeBirthday}>×</button></div>}
        </header>
        <DashboardBreadcrumbProvider><DashboardBreadcrumbs />{children}</DashboardBreadcrumbProvider>
        <PanelChangeToast />
        <div className="dashboard-bottom-row"><div id="analysis-keyboard-hint-slot" /><figure className={`dashboard-daily-quote${specialDate ? " dashboard-daily-quote--special" : ""}`}>
          {specialDate && <span className="dashboard-daily-quote__occasion"><AppIcon name="calendar" />{translate("Hoje")}, {specialDateKey.slice(3)}/{specialDateKey.slice(0, 2)} · {translate(specialDate)}</span>}
          <blockquote><span>“{dailyQuote.text}”</span></blockquote>
          <figcaption><a href={authorWikipediaUrl(dailyQuote.author)} target="_blank" rel="noopener noreferrer" title={translate("Ver {author} na Wikipédia em português", { author: dailyQuote.author })}>{dailyQuote.author}<span className="sr-only"> ({translate("abre em nova aba")})</span></a> {translate("em")} <cite>{dailyQuote.work}</cite> ({dailyQuote.year}) <a className="dashboard-daily-quote__source" href={dailyQuote.source} target="_blank" rel="noopener noreferrer" aria-label={translate("Abrir fonte da citação em nova aba: {work}", { work: dailyQuote.work })} title={translate("Fonte da citação")}><AppIcon name="external" /></a></figcaption>
        </figure></div>
        <BackendHelpWidget role={previewMode ? "student" : role} />
        {previewMode && <div ref={previewDockRef} className="student-preview__dock" aria-label="Controles da equipe na demonstração">
          <button className="dashboard-preview-switch" type="button" role="switch" aria-checked="true" aria-label={`Voltar à visão de ${role === "administrator" ? "administrador" : "catalogador"}`} onClick={() => router.push("/painel")}><span className="dashboard-preview-switch__track"><span /></span><span>Voltar à visão de {role === "administrator" ? "administrador" : "catalogador"}</span></button>
          <details className="student-preview__notice"><summary><AppIcon name="eye" /><span>Demonstração</span><small>{previewScenario.label}</small><AppIcon className="student-preview__notice-chevron" name="arrowRight" /></summary><div className="student-preview__notice-body"><p>Dados fictícios. As ações são simuladas e não alteram contas, protocolos ou arquivos.</p><div className="student-preview__scenarios" aria-label="Etapas para demonstração">{studentPreviewScenarios.map((item) => <Link key={item.id} href={`/painel/visao-estudante?tela=${searchParams.get("tela") ?? "inicio"}&estado=${item.id}`} aria-current={previewScenario.id === item.id ? "true" : undefined}>{item.label}</Link>)}</div></div></details>
          <span className="student-preview__staff-identity"><span className="dashboard-birthday-avatar"><LiteraryAvatar id={userId} label={fullName} choice={avatarChoice} small /></span><span><strong>{firstName}</strong><small>{role === "administrator" ? t.administrator : t.cataloger}</small></span></span>
          <form id="dashboard-logout-form" ref={logoutFormRef} action={logout}><button className="logout-icon" type="button" onClick={() => { if (window.matchMedia("(max-width: 1100px), (pointer: coarse), (any-pointer: coarse)").matches) setLogoutDialogOpen(true); else logoutFormRef.current?.requestSubmit(); }} aria-label={t.logout} title={t.logout}><AppIcon name="logout" /></button></form>
        </div>}
      </div>
      <dialog ref={logoutDialogRef} className="dashboard-logout-dialog pronto-modal" aria-labelledby="dashboard-logout-title" aria-describedby="dashboard-logout-description" onCancel={() => setLogoutDialogOpen(false)} onClick={(event) => { if (event.target === event.currentTarget) setLogoutDialogOpen(false); }}>
        <div className="dashboard-logout-dialog__content">
          <ModalCloseButton onClick={() => setLogoutDialogOpen(false)} />
          <p className="eyebrow">{t.logout}</p>
          <h2 id="dashboard-logout-title">{logoutDialogCopy[language].title}</h2>
          <p id="dashboard-logout-description">{logoutDialogCopy[language].description}</p>
          <div className="dashboard-logout-dialog__actions">
            <button className="button button--secondary" type="button" autoFocus onClick={() => setLogoutDialogOpen(false)}>{logoutDialogCopy[language].stay}</button>
            <button className="button button--danger" type="submit" form="dashboard-logout-form">{logoutDialogCopy[language].exit}</button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
