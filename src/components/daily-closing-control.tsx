"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { libraryClosingTime, serviceDayKey } from "@/lib/service-announcements";

type DailyHours = { service_date: string; closing_time: string };

export function DailyClosingControl({ initialHours, selectedDate, onSaved }: {
  initialHours: DailyHours[];
  selectedDate?: string;
  onSaved?: (hours: DailyHours[]) => void;
}) {
  const [hours, setHours] = useState(initialHours);
  const [date, setDate] = useState(selectedDate || serviceDayKey(new Date()));
  const [closing, setClosing] = useState(() => libraryClosingTime(initialHours.find((item) => item.service_date === (selectedDate || serviceDayKey(new Date())))?.closing_time));
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const router = useRouter();

  async function save(reset: boolean) {
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
    if (!date || weekday === 0 || weekday === 6 || (!reset && (closing <= "08:00" || closing > "23:59"))) {
      setFeedback("Escolha um dia de segunda a sexta e um fechamento posterior às 8h, até 23h59.");
      return;
    }
    setBusy(true);
    setFeedback("");
    const supabase = createClient();
    const expected = reset ? null : closing;
    const { error } = await supabase.rpc("admin_set_daily_closing", { target_date: date, target_closing_time: expected });
    const { data, error: readError } = !error
      ? await supabase.from("library_daily_hours").select("service_date,closing_time").eq("service_date", date).maybeSingle()
      : { data: null, error: null };
    if (error || readError || (expected === null ? data !== null : !data || libraryClosingTime(data.closing_time) !== expected)) {
      setFeedback("Não foi possível confirmar o horário no banco.");
    } else {
      const next = [...hours.filter((item) => item.service_date !== date), ...(data ? [data] : [])];
      setHours(next);
      onSaved?.(next);
      if (reset) setClosing("21:00");
      setFeedback(reset ? "Horário padrão restaurado e confirmado." : "Fechamento salvo e confirmado.");
      router.refresh();
    }
    setBusy(false);
  }

  return <div className="daily-closing-editor">
    <div><p className="eyebrow">Horário do dia</p><h3>Fechamento previsto</h3><p>O padrão é segunda a sexta, das 8h às 21h. O ajuste vale somente para a data escolhida e não altera o prazo dos atendimentos.</p></div>
    <div className="daily-closing-editor__controls">
      <label>Data<input type="date" value={date} onChange={(event) => { const value = event.target.value; setDate(value); setClosing(libraryClosingTime(hours.find((item) => item.service_date === value)?.closing_time)); }} /></label>
      <label>Fechamento<input type="time" min="08:01" max="23:59" value={closing} onChange={(event) => setClosing(event.target.value)} /></label>
      <button type="button" className="button button--primary button--small" disabled={busy} onClick={() => void save(false)}>Salvar horário</button>
      {hours.some((item) => item.service_date === date) && <button type="button" className="button button--secondary button--small" disabled={busy} onClick={() => void save(true)}>Restaurar 21h</button>}
    </div>
    {feedback && <p className="auth-feedback" role="status">{feedback}</p>}
  </div>;
}
