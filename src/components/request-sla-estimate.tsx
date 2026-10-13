"use client";

import { useEffect, useState } from "react";
import { useInterfaceLanguage } from "@/components/interface-language";
import { uiText } from "@/lib/ui-text";

type Closure = { type: string; starts_at: string; ends_at: string | null };
const dayKey = (date: Date) => date.toISOString().slice(0, 10);

function isBusinessDay(date: Date, closures: Closure[]) {
  const weekday = date.getUTCDay();
  const day = dayKey(date);
  return weekday !== 0 && weekday !== 6 && !closures.some((item) => {
    const start = item.starts_at.slice(0, 10);
    const end = item.ends_at?.slice(0, 10) ?? (["holiday", "optional_day"].includes(item.type) ? start : null);
    return day >= start && (end === null || day <= end);
  });
}

function dueDate(submittedAt: string, businessDays: number, closures: Closure[]) {
  const date = new Date(submittedAt);
  if (Number.isNaN(date.getTime())) return null;
  let remaining = Math.max(1, businessDays);
  for (let scanned = 0; scanned < 366 && remaining > 0; scanned++) {
    date.setUTCDate(date.getUTCDate() + 1);
    if (isBusinessDay(date, closures)) remaining--;
  }
  return remaining === 0 ? date : null;
}

function remainingBusinessDays(now: Date, due: Date, closures: Closure[]) {
  if (now >= due) return 0;
  const cursor = new Date(now);
  let remaining = 0;
  while (cursor < due) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    if (cursor <= due && isBusinessDay(cursor, closures)) remaining++;
  }
  return remaining;
}

export function RequestSlaEstimate({ submittedAt, businessDays, closures, status }: { submittedAt: string; businessDays: number | null; closures: Closure[] | null; status: string }) {
  const { language } = useInterfaceLanguage();
  const t = (source: string, values?: Record<string, string | number>) => uiText(language, source, values);
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  if (status === "completed") return <strong>{t("Protocolo concluído")}</strong>;
  if (status === "canceled") return <strong>{t("Protocolo cancelado")}</strong>;
  if (status === "approved") return <strong>{t("Análise da biblioteca concluída")}</strong>;
  if (businessDays === null || closures === null) return <strong>{t("Previsão temporariamente indisponível")}</strong>;
  const due = dueDate(submittedAt, businessDays, closures);
  if (!due) return <strong>{t("Previsão indisponível: há uma suspensão sem data de término")}</strong>;
  const date = new Intl.DateTimeFormat(language === "pt" ? "pt-BR" : language, { dateStyle: "short", timeZone: "UTC" }).format(due);
  if (now === null) return <strong>{t("Até {date} · {days} dias úteis a partir do envio", { date, days: businessDays })}</strong>;
  const remaining = remainingBusinessDays(new Date(now), due, closures);
  if (now >= due.getTime()) return <strong>{t("Prazo de referência ultrapassado · previsão inicial: {date}", { date })}</strong>;
  return <strong>{remaining === 0 ? t("Menos de 1 dia útil") : t(remaining === 1 ? "{days} dia útil restante" : "{days} dias úteis restantes", { days: remaining })} · {t("previsão: {date}", { date })}</strong>;
}
