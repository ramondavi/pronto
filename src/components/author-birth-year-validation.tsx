"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AppIcon } from "@/components/app-icon";

export function AuthorBirthYearValidation({ requestId, year, validated, editable, onValidated }: { requestId: string; year?: number | null; validated?: boolean; editable: boolean; onValidated: (validated: boolean) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!year) return null;
  async function validate() {
    setBusy(true); setError("");
    const { error: rpcError } = await createClient().rpc("validate_author_birth_year", { target_request_id: requestId, validated_birth_year: year });
    if (rpcError) setError("Não foi possível registrar a validação. Confira o Pergamum e tente novamente.");
    else onValidated(true);
    setBusy(false);
  }
  async function undoValidation() {
    setBusy(true); setError("");
    const { error: rpcError } = await createClient().rpc("revoke_author_birth_year_validation", { target_request_id: requestId });
    if (rpcError) setError("Não foi possível desfazer a validação. Tente novamente.");
    else onValidated(false);
    setBusy(false);
  }
  return <section className="author-birth-year-validation"><span className="author-birth-year-validation__icon"><AppIcon name="calendar" /></span><div><p className="eyebrow">Dado do autor para a ficha</p><h3>Ano de nascimento: {year}</h3><p>{validated ? "Conferência registrada no Pergamum" : "Conferência pendente no Pergamum"}</p><small>Consulte o Pergamum separadamente. Depois, registre aqui que o ano foi conferido.</small>{error && <p className="form-error" role="alert">{error}</p>}</div>{editable && (validated ? <button className="text-action author-birth-year-validation__undo" type="button" disabled={busy} onClick={undoValidation}>{busy ? "Desfazendo…" : "↶ Retirar confirmação"}</button> : <button className="button button--secondary button--small" type="button" disabled={busy} onClick={validate}>{busy ? "Registrando…" : "Confirmar conferência"}</button>)}</section>;
}
