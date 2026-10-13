"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { showPanelChange, showPanelChangeError } from "@/components/panel-change-toast";
import { AppIcon } from "@/components/app-icon";
import { useInterfaceLanguage } from "@/components/interface-language";
import { uiText } from "@/lib/ui-text";

export function StaffBirthdaySetting({ month, day }: { month: number | null; day: number | null }) {
  const { language } = useInterfaceLanguage();
  const t = (source: string) => uiText(language, source);
  const months = Array.from({ length: 12 }, (_, index) => new Intl.DateTimeFormat(language === "pt" ? "pt-BR" : language, { month: "long" }).format(new Date(2000, index, 1)));
  const router = useRouter();
  const [selectedMonth, setSelectedMonth] = useState(month?.toString() ?? "");
  const [selectedDay, setSelectedDay] = useState(day?.toString() ?? "");
  const [savedMonth, setSavedMonth] = useState(month?.toString() ?? "");
  const [savedDay, setSavedDay] = useState(day?.toString() ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const daysInMonth = selectedMonth ? new Date(2000, Number(selectedMonth), 0).getDate() : 31;

  async function save(nextMonth: number | null, nextDay: number | null) {
    setBusy(true); setError("");
    const { error: saveError } = await createClient().rpc("set_staff_birthday", { target_month: nextMonth, target_day: nextDay });
    setBusy(false);
    if (saveError) { setError(t("Não foi possível salvar a data. Confira o dia e o mês e tente novamente.")); showPanelChangeError(t("Aniversário não salvo"), t("Confira a data e tente novamente.")); return; }
    setSelectedMonth(nextMonth?.toString() ?? ""); setSelectedDay(nextDay?.toString() ?? "");
    setSavedMonth(nextMonth?.toString() ?? ""); setSavedDay(nextDay?.toString() ?? "");
    setEditing(false);
    showPanelChange(t(nextMonth ? "Aniversário salvo" : "Aniversário removido"), async () => {
      const { error: undoError } = await createClient().rpc("set_staff_birthday", { target_month: month, target_day: day });
      if (undoError) throw undoError;
      setSelectedMonth(month?.toString() ?? ""); setSelectedDay(day?.toString() ?? "");
      setSavedMonth(month?.toString() ?? ""); setSavedDay(day?.toString() ?? ""); router.refresh();
    });
    router.refresh();
  }

  const saved = Boolean(savedDay && savedMonth);
  const savedLabel = saved ? new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long" }).format(new Date(2000, Number(savedMonth) - 1, Number(savedDay))) : t("Não informado");
  function cancel() { setSelectedMonth(savedMonth); setSelectedDay(savedDay); setEditing(false); setError(""); }

  return <div className={`account-page__birthday-fact${editing ? " is-editing" : ""}`}>
    <AppIcon name="calendar" />
    <dt>{t("Aniversário")} <small>{t("Opcional")}</small></dt>
    <dd>{editing ? <div className="account-page__birthday-inline">
      <label><span className="sr-only">{t("Dia")}</span><select aria-label={t("Dia")} value={selectedDay} disabled={busy} onChange={(event) => setSelectedDay(event.target.value)}><option value="">{t("Dia")}</option>{Array.from({ length: daysInMonth }, (_, index) => <option key={index + 1} value={index + 1}>{String(index + 1).padStart(2, "0")}</option>)}</select></label>
      <span aria-hidden="true">/</span>
      <label><span className="sr-only">{t("Mês")}</span><select aria-label={t("Mês")} value={selectedMonth} disabled={busy} onChange={(event) => { const nextMonth = event.target.value; setSelectedMonth(nextMonth); if (nextMonth && Number(selectedDay) > new Date(2000, Number(nextMonth), 0).getDate()) setSelectedDay(""); }}><option value="">{t("Mês")}</option>{months.map((name, index) => <option key={index + 1} value={index + 1}>{name}</option>)}</select></label>
      <button className="account-page__birthday-confirm" type="button" disabled={busy || !selectedDay || !selectedMonth} onClick={() => void save(Number(selectedMonth), Number(selectedDay))} aria-label={t("Salvar data")} title={t("Salvar data")}><AppIcon name="check" /></button>
      <button className="account-page__birthday-cancel" type="button" disabled={busy} onClick={cancel} aria-label={t("Cancelar")} title={t("Cancelar")}><AppIcon name="close" /></button>
      {saved && <button className="account-page__birthday-remove" type="button" disabled={busy} onClick={() => void save(null, null)}>{t("Remover data")}</button>}
    </div> : <button type="button" className="account-page__birthday-value" onClick={() => setEditing(true)} aria-label={`${savedLabel}. ${t(saved ? "Alterar data" : "Informar data")}`} title={t(saved ? "Alterar data" : "Informar data")}>{savedLabel}<AppIcon name="edit" /></button>}</dd>
    {error && <p className="form-error account-page__birthday-error" role="alert">{error}</p>}
  </div>;
}
