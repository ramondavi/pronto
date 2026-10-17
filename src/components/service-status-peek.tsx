"use client";

import { useEffect, useState } from "react";
import { AppIcon } from "@/components/app-icon";
import { formatServiceTime } from "@/lib/service-announcements";

export function ServiceStatusPeek({ title, date, now, hoursLabel, reason, message, closed, hint, detailsLabel, className = "" }: {
  title: string;
  date: { value: string; label: string };
  now: string;
  hoursLabel: string;
  reason?: string | null;
  message?: string | null;
  closed: boolean;
  hint: string;
  detailsLabel: string;
  className?: string;
}) {
  const [clock, setClock] = useState({ value: now, label: formatServiceTime(now) });
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    if (!closed) return;
    const update = () => {
      const value = new Date().toISOString();
      setClock({ value, label: formatServiceTime(value) });
    };
    update();
    const timer = window.setInterval(update, 60_000);
    document.addEventListener("visibilitychange", update);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", update); };
  }, [closed, now]);
  return <div className={`service-status-peek${closed ? " service-status-peek--closed" : ""}${expanded ? " is-expanded" : ""} ${className}`} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setExpanded(false); }}>
    <button className="service-status-peek__trigger" type="button" aria-label={`${title}. ${detailsLabel}`} aria-expanded={expanded} onFocus={() => setExpanded(true)} onClick={() => setExpanded(true)}><span className="service-status-peek__icon" aria-hidden="true"><AppIcon name={closed ? "lock" : reason || message ? "calendar" : "check"} /></span><span className="service-status-peek__copy"><strong>{title}</strong><small>{hint}</small></span></button>
    <div className="service-status-peek__panel"><strong>{title}</strong><div className="service-status-peek__time-row"><time dateTime={date.value}><AppIcon name="calendar" />{date.label}</time><time dateTime={clock.value}>{clock.label}</time></div><p className="service-status-peek__hours"><AppIcon name="clock" />{hoursLabel}</p>{!closed && <p>{hint}</p>}{reason && <strong>{reason}</strong>}{message && <p>{message}</p>}</div>
  </div>;
}
