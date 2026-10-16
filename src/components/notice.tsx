"use client";

import { useEffect, useState } from "react";
import { AppIcon } from "@/components/app-icon";
import { formatServiceTime } from "@/lib/service-announcements";

type Announcement = { title: string; message: string; type: string };

export function Notice({ announcement, closed, date, now, hoursLabel, clockLabel, closingLabel, copy = { label: "Situação do atendimento", normal: "Atendimento normal agora", average: "Prazo médio atual:", days: "3 dias úteis" } }: { announcement?: Announcement | null; closed?: { title: string; message: string; reason?: string } | null; date?: { value: string; label: string }; now: string; hoursLabel: string; clockLabel: string; closingLabel: string; copy?: { label: string; normal: string; average: string; days: string } }) {
  const [clock, setClock] = useState({ value: now, label: formatServiceTime(now) });
  useEffect(() => {
    const update = () => { const value = new Date().toISOString(); setClock({ value, label: formatServiceTime(value) }); };
    update();
    const timer = window.setInterval(update, 60_000);
    document.addEventListener("visibilitychange", update);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", update); };
  }, []);
  const message = closed?.message ?? announcement?.message ?? `${copy.average} ${copy.days}`;
  return <aside className={`notice notice--status${closed ? " notice--status-closed" : ""}`} aria-label={copy.label} role="status"><div className="notice-status__meta"><div className="notice-status__times">{date?.value && <time dateTime={date.value}><AppIcon name="calendar" />{date.label}</time>}<time dateTime={clock.value} aria-label={`${clockLabel}: ${clock.label}`}><AppIcon name="clock" />{clock.label}</time></div><p className="notice-status__hours"><AppIcon name="clock" />{hoursLabel}</p></div><div className="notice-status__body"><span className="notice-status__icon" aria-hidden="true"><AppIcon name={closed ? "lock" : announcement ? "calendar" : "check"} /></span><div className="notice-status__heading"><strong>{closed?.title ?? announcement?.title ?? copy.normal}</strong>{!closed && !announcement && <small className="notice-status__closing">{closingLabel}</small>}{closed?.reason && <span className="notice-status__reason">{closed.reason}</span>}</div></div>{message && <p className="notice-status__message">{message}</p>}</aside>;
}
