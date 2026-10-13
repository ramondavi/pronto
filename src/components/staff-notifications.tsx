"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AppIcon } from "./app-icon";
import { relativeDateTime } from "./relative-date-time";
import { hasPriority } from "@/lib/request-priority";
import { showPanelChange } from "@/components/panel-change-toast";

type NoticeRequest = { protocol: string; priority: { request_id: string } | { request_id: string }[] | null };
type Notice = { id: string; kind: string; request_id: string | null; title: string; message: string; href: string; read_at: string | null; archived_at: string | null; created_at: string; request?: NoticeRequest | NoticeRequest[] | null };
function noticeRequest(notice: Notice) { return Array.isArray(notice.request) ? notice.request[0] : notice.request; }
function noticeMessage(notice: Notice) {
  const request = noticeRequest(notice);
  const protocol = request?.protocol;
  if (!protocol) return notice.message;
  const index = notice.message.indexOf(protocol);
  const protocolMark = <span className="staff-notifications__protocol">{protocol}{hasPriority(request?.priority) && <span className="staff-notifications__priority" role="img" aria-label="Protocolo prioritário"><AppIcon name="star" /></span>}</span>;
  return index < 0 ? <>{notice.message} · {protocolMark}</> : <>{notice.message.slice(0, index)}{protocolMark}{notice.message.slice(index + protocol.length)}</>;
}
type Filter = "unread" | "all" | "archived";
const PAGE_SIZE = 20;
const fullNoticeDate = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "medium" });

function noticeDestination(notice: Notice) {
  const requestId = notice.request_id;
  if (requestId && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(requestId)) {
    if (notice.kind === "new_request") return `/painel/fila?solicitacao=${requestId}`;
    if (notice.kind === "reassigned" || notice.kind === "corrections_resubmitted") return `/painel/atendimento/${requestId}?etapa=metadata`;
    if (notice.kind === "nada_consta_uploaded" || notice.kind === "request_released") return `/painel/atendimento/${requestId}?etapa=documentation`;
  }
  return notice.href;
}

export function StaffNotifications({ userId, onUnreadChange }: { userId: string; onUnreadChange: (count: number) => void }) {
  const router = useRouter();
  const [supabase] = useState(createClient);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("unread");
  const [items, setItems] = useState<Notice[]>([]);
  const [unread, setUnread] = useState(0);
  const [total, setTotal] = useState(0);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ringing, setRinging] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [toastNotice, setToastNotice] = useState<Notice | null>(null);
  const [toastAnchor, setToastAnchor] = useState({ visible: true, left: 16 });
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const requestId = useRef(0);
  const audioRef = useRef<AudioContext | null>(null);
  const latestUnreadAt = useRef<string | null>(null);
  const hasLoaded = useRef(false);
  const acknowledgementPending = useRef(false);

  const playSound = useCallback(async () => {
    const context = audioRef.current;
    if (!context) return;
    if (context.state !== "running") {
      try { await context.resume(); } catch { return; }
    }
    if (context.state !== "running") return;
    const tone = (frequency: number, delay: number, duration: number) => {
      const start = context.currentTime + delay;
      const oscillator = context.createOscillator();
      const volume = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, start);
      volume.gain.setValueAtTime(0.0001, start);
      volume.gain.exponentialRampToValueAtTime(0.2, start + 0.03);
      volume.gain.setValueAtTime(0.2, start + duration * 0.45);
      volume.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      oscillator.connect(volume).connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.02);
    };
    tone(523.25, 0, 0.55);
    tone(783.99, 0.38, 0.72);
  }, []);

  const unlockAudio = useCallback(async () => {
    if (typeof AudioContext === "undefined") return false;
    audioRef.current ??= new AudioContext();
    try {
      if (audioRef.current.state !== "running") await audioRef.current.resume();
      return audioRef.current.state === "running";
    } catch { return false; }
  }, []);

  const updateToastAnchor = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const visible = rect.top >= 0 && rect.bottom + 130 <= window.innerHeight && rect.left >= 0 && rect.right <= window.innerWidth;
    const left = Math.max(16, Math.min(rect.left, window.innerWidth - 336));
    setToastAnchor((current) => current.visible === visible && current.left === left ? current : { visible, left });
  }, []);

  const signalNewNotice = useCallback((notice: Notice) => {
    void playSound();
    setRinging(true);
    if (document.visibilityState === "visible") {
      updateToastAnchor();
      setToastNotice(notice);
    }
  }, [playSound, updateToastAnchor]);

  const refresh = useCallback(async (selected: Filter, limit: number) => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    const base = supabase.from("staff_notifications").select("id,kind,request_id,title,message,href,read_at,archived_at,created_at,request:cataloging_requests!staff_notifications_request_id_fkey(protocol,priority:request_priorities(request_id))", { count: "exact" }).eq("recipient_id", userId);
    const operational = base.neq("kind", "staff_message");
    const list = selected === "unread" ? operational.is("read_at", null).is("archived_at", null) : selected === "archived" ? operational.not("archived_at", "is", null) : operational.is("archived_at", null);
    const [notices, count] = await Promise.all([
      list.order("created_at", { ascending: false }).range(0, limit - 1),
      supabase.from("staff_notifications").select("id,kind,request_id,title,message,href,read_at,archived_at,created_at,request:cataloging_requests!staff_notifications_request_id_fkey(protocol,priority:request_priorities(request_id))", { count: "exact" }).eq("recipient_id", userId).neq("kind", "staff_message").is("read_at", null).is("archived_at", null).order("created_at", { ascending: false }).limit(1),
    ]);
    if (currentRequest !== requestId.current) return;
    setLoading(false);
    if (notices.error || count.error) { setError("Não foi possível carregar os avisos. Tente novamente."); return; }
    setError("");
    setItems(notices.data ?? []);
    setTotal(notices.count ?? 0);
    setUnread(count.count ?? 0);
    onUnreadChange(count.count ?? 0);
    const newest = count.data?.[0] ?? null;
    const newestAt = newest?.created_at ?? null;
    if (newest && newestAt && hasLoaded.current && (!latestUnreadAt.current || newestAt > latestUnreadAt.current)) {
      signalNewNotice(newest);
    }
    if (!hasLoaded.current && newestAt) setRinging(true);
    if (newestAt && (!latestUnreadAt.current || newestAt > latestUnreadAt.current)) latestUnreadAt.current = newestAt;
    hasLoaded.current = true;
  }, [supabase, userId, signalNewNotice, onUnreadChange]);

  useEffect(() => { void refresh(filter, visible); }, [filter, visible, refresh]);
  useEffect(() => {
    if (!open || loading || error || total <= visible || !listRef.current || !endRef.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { observer.disconnect(); setVisible((value) => value + PAGE_SIZE); }
    }, { root: listRef.current, rootMargin: "0px 0px 60px 0px" });
    observer.observe(endRef.current);
    return () => observer.disconnect();
  }, [open, filter, loading, error, total, visible, items.length]);
  useEffect(() => {
    updateToastAnchor();
    window.addEventListener("scroll", updateToastAnchor, { passive: true });
    window.addEventListener("resize", updateToastAnchor);
    return () => { window.removeEventListener("scroll", updateToastAnchor); window.removeEventListener("resize", updateToastAnchor); };
  }, [updateToastAnchor]);
  useEffect(() => {
    const onPointerDown = () => { void unlockAudio(); };
    const onKeyDown = () => { void unlockAudio(); };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    if (navigator.userActivation?.hasBeenActive) void unlockAudio();
    return () => { document.removeEventListener("pointerdown", onPointerDown); document.removeEventListener("keydown", onKeyDown); void audioRef.current?.close(); audioRef.current = null; };
  }, [unlockAudio]);
  useEffect(() => {
    const channel = supabase.channel(`staff-notifications-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "staff_notifications", filter: `recipient_id=eq.${userId}` }, (payload) => { void refresh(filter, visible); if (payload.eventType === "INSERT" && payload.new.kind === "nada_consta_uploaded") window.dispatchEvent(new CustomEvent("staff:nada-consta-uploaded", { detail: { requestId: payload.new.request_id } })); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [supabase, userId, filter, visible, refresh]);
  useEffect(() => {
    const timer = window.setInterval(() => { void refresh(filter, visible); }, 15000);
    const onFocus = () => { void refresh(filter, visible); };
    window.addEventListener("focus", onFocus);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", onFocus); };
  }, [filter, visible, refresh]);
  useEffect(() => {
    if (!open || unread === 0 || acknowledgementPending.current) return;
    acknowledgementPending.current = true;
    void (async () => {
      const { error: updateError } = await supabase.rpc("mark_all_staff_notifications_read");
      if (updateError) setError("Não foi possível atualizar os avisos.");
      else setUnread(0);
      acknowledgementPending.current = false;
      if (!updateError) await refresh(filter, visible);
    })();
  }, [open, unread, supabase, filter, visible, refresh]);
  const hasUnread = unread > 0;
  useEffect(() => { if (open || !hasUnread) setRinging(false); }, [open, hasUnread]);
  useEffect(() => {
    if (!open) return;
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, [open]);
  useEffect(() => {
    if (!toastNotice) return;
    const timer = window.setTimeout(() => setToastNotice(null), 15000);
    return () => window.clearTimeout(timer);
  }, [toastNotice]);
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => { if (!containerRef.current?.contains(event.target as Node) && !(event.target as Element).closest?.('[data-staff-mention-menu]')) setOpen(false); };
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("pointerdown", onPointerDown); document.removeEventListener("keydown", onKeyDown); };
  }, [open]);

  async function closeNotice(id: string) {
    const { error: updateError } = await supabase.rpc("set_staff_notification_state", { target_notification_id: id, mark_read: true, archive_notification: true });
    if (updateError) { setError("Não foi possível fechar o aviso."); return false; }
    showPanelChange("Aviso arquivado");
    await refresh(filter, visible);
    return true;
  }

  async function clearAll() {
    const { error: updateError } = await supabase.rpc("clear_all_staff_notifications");
    if (updateError) { setError("Não foi possível limpar os avisos."); return; }
    showPanelChange("Avisos removidos");
    await refresh(filter, visible);
  }

  async function openNotice(notice: Notice) {
    const destination = noticeDestination(notice);
    if (!destination.startsWith("/painel/") || destination.startsWith("//")) return;
    if (!notice.archived_at && !(await closeNotice(notice.id))) return;
    setOpen(false);
    router.push(destination);
  }

  function selectFilter(next: Filter) { setItems([]); setTotal(0); setFilter(next); setVisible(PAGE_SIZE); }

  return <div className="staff-notifications" ref={containerRef}>
    <button ref={triggerRef} className={`staff-notifications__trigger${ringing && !open ? " is-ringing" : ""}${toastNotice && toastAnchor.visible ? " is-emitting" : ""}`} type="button" aria-label={`Notificações${unread ? `, ${unread} não lidas` : ""}`} aria-expanded={open} aria-controls="staff-notifications-panel" onClick={() => { if (!open) selectFilter("all"); setNow(Date.now()); setOpen((value) => !value); setRinging(false); setToastNotice(null); }} title="Notificações">
      <span className="staff-notifications__symbol"><AppIcon name="bell" />{unread > 0 && <span className="staff-notifications__badge" aria-hidden="true">{unread > 99 ? "99+" : unread}</span>}</span>
    </button>
    {toastNotice && !open && <button key={toastNotice.id} className={`staff-notifications__toast${toastAnchor.visible ? "" : " is-detached"}`} style={toastAnchor.visible ? undefined : { left: toastAnchor.left }} type="button" onClick={() => { setToastNotice(null); void openNotice(toastNotice); }}><span>Nova notificação</span><strong>{toastNotice.title}</strong><small>{noticeMessage(toastNotice)}</small></button>}
    {open && <section className="staff-notifications__panel" id="staff-notifications-panel" aria-label="Central de notificações">
      <div className="staff-notifications__toolbar">
        <div className="staff-notifications__tabs" role="tablist" aria-label="Categorias de notificações" onKeyDown={(event) => {
          const tabs = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
          const current = tabs.findIndex((tab) => tab === document.activeElement);
          const next = event.key === "ArrowRight" ? (current + 1) % tabs.length : event.key === "ArrowLeft" ? (current - 1 + tabs.length) % tabs.length : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : -1;
          if (next < 0) return;
          event.preventDefault();
          tabs[next].focus();
          selectFilter(tabs[next].dataset.filter as Filter);
        }}>
          {([ ["unread", "Não lidas"], ["all", "Ativas"], ["archived", "Arquivadas"] ] as const).map(([value, label]) => <button key={value} id={`staff-notifications-tab-${value}`} data-filter={value} type="button" role="tab" className={filter === value ? "is-active" : ""} aria-selected={filter === value} aria-controls="staff-notifications-content" tabIndex={filter === value ? 0 : -1} onClick={() => selectFilter(value)}>{label}</button>)}
        </div>
      </div>
      <div id="staff-notifications-content" className="staff-notifications__tab-panel" role="tabpanel" aria-labelledby={`staff-notifications-tab-${filter}`} tabIndex={0}>
        {error && <p className="staff-notifications__error" role="alert">{error}</p>}
        <div className="staff-notifications__list" ref={listRef} aria-live="polite">
          {!loading && items.length === 0 && !error && <p className="staff-notifications__empty">{filter === "unread" ? "Ufa! Nenhuma notificação nova." : filter === "all" ? "Tudo limpo por aqui." : "Nenhuma notificação arquivada."}</p>}
          {items.map((notice) => <article key={notice.id} className={`staff-notifications__item${notice.read_at ? "" : " is-unread"}`}>
            {!notice.archived_at && <button className="staff-notifications__dismiss" type="button" aria-label={`Fechar aviso: ${notice.title}`} title="Fechar aviso" onClick={() => void closeNotice(notice.id)}><AppIcon name="close" /></button>}
            <button className="staff-notifications__item-link" type="button" onClick={() => void openNotice(notice)}><strong>{notice.title}</strong><span>{noticeMessage(notice)}</span><time dateTime={notice.created_at}><span className="staff-notifications__time-relative">{relativeDateTime(notice.created_at, now)}</span><span className="staff-notifications__time-full" aria-hidden="true">{fullNoticeDate.format(new Date(notice.created_at))}</span></time></button>
          </article>)}
          {total > visible && <div ref={endRef} className="staff-notifications__loading" role="status" aria-live="polite">{loading ? "Carregando notificações anteriores…" : ""}</div>}
        </div>
        {filter !== "archived" && total > 0 && <button className="staff-notifications__clear-all" type="button" onClick={() => void clearAll()}><AppIcon name="archive" /> Limpar tudo</button>}
      </div>
    </section>}
  </div>;
}
