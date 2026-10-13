"use client";

import { useEffect, useState } from "react";
import { useInterfaceLanguage } from "@/components/interface-language";
import type { InterfaceLanguage } from "@/lib/interface-language";

const locale = (language: InterfaceLanguage) => language === "pt" ? "pt-BR" : language;

export function relativeDateTime(value: string, now: number, language: InterfaceLanguage = "pt") {
  const date = new Date(value);
  const minutes = Math.max(0, Math.floor((now - date.getTime()) / 60_000));
  const today = new Date(now);
  const dayNumber = (day: Date) => Date.UTC(day.getFullYear(), day.getMonth(), day.getDate()) / 86_400_000;
  const days = dayNumber(today) - dayNumber(date);
  const formatter = new Intl.RelativeTimeFormat(locale(language), { numeric: "auto" });
  if (days === 1) return formatter.format(-1, "day");
  if (days > 1) return formatter.format(-days, "day");
  if (minutes < 1) return formatter.format(0, "second");
  if (minutes < 60) return formatter.format(-minutes, "minute");
  const hours = Math.floor(minutes / 60);
  return formatter.format(-hours, "hour");
}

export function RelativeDateTime({ value, className, focusable = true }: { value: string; className?: string; focusable?: boolean }) {
  const { language } = useInterfaceLanguage();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const complete = new Intl.DateTimeFormat(locale(language), { dateStyle: "short", timeStyle: "medium" }).format(new Date(value));
  return <time className={`relative-datetime${className ? ` ${className}` : ""}`} dateTime={value} tabIndex={focusable ? 0 : undefined} aria-label={complete}>
    <span className="relative-datetime__relative">{now === null ? complete : relativeDateTime(value, now, language)}</span>
    <span className="relative-datetime__full" aria-hidden="true">{complete}</span>
  </time>;
}
