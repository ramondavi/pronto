"use client";

import { useEffect, useState } from "react";
import { AppIcon } from "@/components/app-icon";

type PanelChangeNotice = { message: string; guidance?: string; kind: "success" | "error"; undo?: () => void | Promise<void>; celebration?: boolean; id: number };
const eventName = "pronto:panel-change";
const dismissEventName = "pronto:panel-change-dismiss";

export function showPanelChange(message: string, undo?: () => void | Promise<void>, options?: { celebration?: boolean; guidance?: string }) {
  window.dispatchEvent(new CustomEvent<PanelChangeNotice>(eventName, { detail: { message, kind: "success", undo, ...options, id: Date.now() + Math.random() } }));
}

export function showPanelChangeError(message: string, guidance = "Confira os dados e tente novamente. Se continuar, atualize a página.") {
  const connectionGuidance = typeof navigator !== "undefined" && !navigator.onLine ? "Sem conexão. Reconecte-se e tente novamente." : guidance;
  window.dispatchEvent(new CustomEvent<PanelChangeNotice>(eventName, { detail: { message, guidance: connectionGuidance, kind: "error", id: Date.now() + Math.random() } }));
}

export function dismissPanelChange() {
  window.dispatchEvent(new Event(dismissEventName));
}

export function PanelChangeToast() {
  const [notice, setNotice] = useState<PanelChangeNotice | null>(null);
  const [undoing, setUndoing] = useState(false);

  useEffect(() => {
    const receive = (event: Event) => { setUndoing(false); setNotice((event as CustomEvent<PanelChangeNotice>).detail); };
    const dismiss = () => setNotice(null);
    window.addEventListener(eventName, receive);
    window.addEventListener(dismissEventName, dismiss);
    return () => { window.removeEventListener(eventName, receive); window.removeEventListener(dismissEventName, dismiss); };
  }, []);
  useEffect(() => {
    if (!notice || undoing) return;
    const timer = window.setTimeout(() => setNotice(null), notice.kind === "error" ? 9000 : 6000);
    return () => window.clearTimeout(timer);
  }, [notice, undoing]);

  async function undo() {
    if (!notice?.undo) return;
    setUndoing(true);
    try {
      await notice.undo();
      setNotice(null);
    } catch {
      setNotice({ message: "Não foi possível desfazer", guidance: "Confira a conexão e tente novamente.", kind: "error", undo: notice.undo, id: Date.now() });
    } finally {
      setUndoing(false);
    }
  }

  if (!notice) return null;
  return <div className={`panel-change-toast${notice.kind === "error" ? " panel-change-toast--error" : ""}${notice.celebration ? " panel-change-toast--celebration" : ""}`} role={notice.kind === "error" ? "alert" : "status"}>{notice.celebration ? <span className="panel-change-toast__pixels" aria-hidden="true">{Array.from({ length: 9 }, (_, index) => <i key={index} />)}</span> : <AppIcon name={notice.kind === "error" ? "close" : "check"} />}<span><strong>{notice.message}</strong>{notice.guidance && <small>{notice.guidance}</small>}</span>{notice.undo && <button type="button" disabled={undoing} onClick={() => void undo()}>{undoing ? "Desfazendo…" : "Desfazer"}</button>}</div>;
}
