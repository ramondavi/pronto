"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AppIcon } from "./app-icon";
import { StaffMessages } from "./staff-messages";

type MessageNotice = { id: string; title: string; message: string; created_at: string };

export function StaffMessageCenter({ userId, onUnreadChange }: { userId: string; onUnreadChange: (count: number) => void }) {
  const [supabase] = useState(createClient);
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [ringing, setRinging] = useState(false);
  const [toast, setToast] = useState<MessageNotice | null>(null);
  const [anchor, setAnchor] = useState({ visible: true, left: 16 });
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const latestAt = useRef<string | null>(null);
  const loaded = useRef(false);

  const playSound = useCallback(async () => {
    const context = audioRef.current;
    if (!context) return;
    try { if (context.state !== "running") await context.resume(); } catch { return; }
    if (context.state !== "running") return;
    // Três notas suaves e ascendentes distinguem mensagens do aviso de duas notas.
    [392, 493.88, 587.33].forEach((frequency, index) => {
      const start = context.currentTime + index * 0.22;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.13, start + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.37);
    });
  }, []);

  const updateAnchor = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const visible = rect.top >= 0 && rect.bottom + 130 <= window.innerHeight && rect.left >= 0 && rect.right <= window.innerWidth;
    const left = Math.max(16, Math.min(rect.left, window.innerWidth - 336));
    setAnchor((current) => current.visible === visible && current.left === left ? current : { visible, left });
  }, []);

  const refresh = useCallback(async () => {
    const { data, count, error } = await supabase.from("staff_notifications")
      .select("id,title,message,created_at", { count: "exact" })
      .eq("recipient_id", userId).eq("kind", "staff_message")
      .is("read_at", null).is("archived_at", null)
      .order("created_at", { ascending: false }).limit(1);
    if (error) return;
    const nextCount = count ?? 0;
    setUnread(nextCount);
    onUnreadChange(nextCount);
    const newest = data?.[0] ?? null;
    if (loaded.current && newest && (!latestAt.current || newest.created_at > latestAt.current)) {
      void playSound();
      setRinging(true);
      if (document.visibilityState === "visible") { updateAnchor(); setToast(newest); }
    }
    if (!loaded.current && newest) setRinging(true);
    if (newest && (!latestAt.current || newest.created_at > latestAt.current)) latestAt.current = newest.created_at;
    loaded.current = true;
  }, [supabase, userId, onUnreadChange, playSound, updateAnchor]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    const channel = supabase.channel(`staff-message-notices-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "staff_notifications", filter: `recipient_id=eq.${userId}` }, () => { void refresh(); }).subscribe();
    const timer = window.setInterval(() => { void refresh(); }, 15000);
    const onFocus = () => { void refresh(); };
    window.addEventListener("focus", onFocus);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", onFocus); void supabase.removeChannel(channel); };
  }, [supabase, userId, refresh]);
  useEffect(() => {
    const unlock = () => {
      if (typeof AudioContext === "undefined") return;
      audioRef.current ??= new AudioContext();
      if (audioRef.current.state !== "running") void audioRef.current.resume().catch(() => {});
    };
    document.addEventListener("pointerdown", unlock);
    document.addEventListener("keydown", unlock);
    if (navigator.userActivation?.hasBeenActive) unlock();
    return () => { document.removeEventListener("pointerdown", unlock); document.removeEventListener("keydown", unlock); void audioRef.current?.close(); audioRef.current = null; };
  }, []);
  useEffect(() => {
    updateAnchor();
    window.addEventListener("scroll", updateAnchor, { passive: true });
    window.addEventListener("resize", updateAnchor);
    return () => { window.removeEventListener("scroll", updateAnchor); window.removeEventListener("resize", updateAnchor); };
  }, [updateAnchor]);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(null), 15000); return () => window.clearTimeout(timer); }, [toast]);
  useEffect(() => { if (open || unread === 0) setRinging(false); }, [open, unread]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!containerRef.current?.contains(event.target as Node) && !(event.target as Element).closest?.('[data-staff-mention-menu]')) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);

  return <div className="staff-notifications staff-message-center" ref={containerRef}>
    <button ref={triggerRef} type="button" className={`staff-notifications__trigger${ringing && !open ? " is-ringing" : ""}${toast && anchor.visible ? " is-emitting" : ""}`} aria-label={`Mensagens${unread ? `, ${unread} não lidas` : ""}`} aria-expanded={open} aria-controls="staff-message-center-panel" title="Mensagens" onClick={() => { setOpen((value) => !value); setRinging(false); setToast(null); }}>
      <span className="staff-notifications__symbol"><AppIcon name="message" />{unread > 0 && <span className="staff-notifications__badge" aria-hidden="true">{unread > 99 ? "99+" : unread}</span>}</span>
    </button>
    {toast && !open && <button key={toast.id} type="button" className={`staff-notifications__toast${anchor.visible ? "" : " is-detached"}`} style={anchor.visible ? undefined : { left: anchor.left }} onClick={() => { setOpen(true); setToast(null); }}><span>Nova mensagem</span><strong>{toast.title}</strong><small>{toast.message}</small></button>}
    {open && <section className="staff-notifications__panel" id="staff-message-center-panel" aria-label="Central de mensagens">
      <div className="staff-notifications__tab-panel"><StaffMessages userId={userId} onRead={() => { void refresh(); }} onNavigate={() => setOpen(false)} /></div>
    </section>}
  </div>;
}
