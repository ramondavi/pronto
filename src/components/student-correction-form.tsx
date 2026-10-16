"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppIcon } from "@/components/app-icon";
import { createClient } from "@/lib/supabase/client";
import { isPublicWorkUrlCandidate } from "@/domain/student-requests/public-work-url";
import { showPanelChange, showPanelChangeError } from "@/components/panel-change-toast";
import { splitGuidance } from "@/domain/issues/split-guidance";
import { useInterfaceLanguage } from "@/components/interface-language";
import { uiText } from "@/lib/ui-text";

type PendingField = { fieldKey: string; fieldLabel: string; justification: string; kind: string; value: string | string[] };
type Program = { id: string; name: string; level: string };
const levelLabels: Record<string, string> = { undergraduate: "Graduação", specialization: "Especialização", master: "Mestrado", doctorate: "Doutorado" };
const initialText = (field: PendingField) => Array.isArray(field.value) ? field.value.join("\n") : field.value ?? "";
const currentValueLabel = (field: PendingField, programs: Program[]) => field.kind === "program" ? programs.find((program) => program.id === field.value)?.name ?? initialText(field) : initialText(field);
const normalizedValue = (field: PendingField, value: string) => field.kind === "list" ? value.split("\n").map((item) => item.trim()).filter(Boolean) : value.trim();
const hasChanged = (field: PendingField, value: string) => JSON.stringify(normalizedValue(field, value)) !== JSON.stringify(normalizedValue(field, initialText(field)));

export function StudentCorrectionForm({ requestId, fields, programs, preview = false, previewSuccessHref }: { requestId: string; fields: PendingField[]; programs: Program[]; preview?: boolean; previewSuccessHref?: string }) {
  const { language } = useInterfaceLanguage();
  const t = (source: string, values?: Record<string, string | number>) => uiText(language, source, values);
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(fields.map((field) => [field.fieldKey, initialText(field)])));
  const [linkAccessConfirmed, setLinkAccessConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const fieldReady = (field: PendingField) => hasChanged(field, values[field.fieldKey] ?? "") || (field.fieldKey === "public_work_url" && linkAccessConfirmed);
  const readyCount = fields.filter(fieldReady).length;
  const allReady = fields.length > 0 && readyCount === fields.length;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!allReady || submitting) return;
    setSubmitting(true); setError(undefined);
    const workLink = values.public_work_url;
    if (typeof workLink === "string" && !isPublicWorkUrlCandidate(workLink)) {
      setError(t("Informe o link HTTPS direto para o arquivo ou pasta compartilhada, não apenas o endereço do serviço."));
      setSubmitting(false);
      return;
    }
    const corrections = fields.map((field) => ({ fieldKey: field.fieldKey, value: normalizedValue(field, values[field.fieldKey] ?? ""), accessConfirmed: field.fieldKey === "public_work_url" && linkAccessConfirmed }));
    if (preview) {
      showPanelChange(t(fields.length === 1 ? "Correção pronta para reenviar na demonstração" : "Correções prontas para reenviar na demonstração"));
      if (previewSuccessHref) router.push(previewSuccessHref);
      setSubmitting(false);
      return;
    }
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("submit_request_corrections", { target_request_id: requestId, corrections });
    if (rpcError) { const message = t(fields.length === 1 ? "Não foi possível reenviar a correção. Confira o campo solicitado e tente novamente." : "Não foi possível reenviar as correções. Confira os campos solicitados e tente novamente."); setError(message); showPanelChangeError(t(fields.length === 1 ? "Correção não enviada" : "Correções não enviadas"), message); setSubmitting(false); return; }
    showPanelChange(t(fields.length === 1 ? "Correção enviada à biblioteca" : "Correções enviadas à biblioteca"));
    router.push("/painel/solicitacao?corrigida=1"); router.refresh();
  }

  return <form className="correction-form" onSubmit={submit}>
    <section className="correction-form__intro panel"><div className="correction-form__intro-icon"><AppIcon name="edit" /></div><div><p className="eyebrow">{t("Ação necessária")}</p><h2>{fields.length === 1 ? t("Corrija o campo solicitado") : t("Corrija os {count} campos solicitados", { count: fields.length })}</h2><p>{t("Leia a orientação da biblioteca, atualize cada informação e confira antes de reenviar. Os demais dados permanecem protegidos.")}</p></div><span className="correction-form__count">{t("{ready} de {total} {unit}", { ready: readyCount, total: fields.length, unit: t(fields.length === 1 ? "campo pronto" : "campos prontos") })}</span></section>
    {error && <div className="auth-feedback auth-feedback--error" role="alert">{error}</div>}
    <div className="correction-form__fields">{fields.map((field, index) => {
      const value = values[field.fieldKey] ?? "";
      const changed = hasChanged(field, value);
      const ready = fieldReady(field);
      const sameLink = field.fieldKey === "public_work_url" && !changed;
      const guidance = splitGuidance(field.justification);
      return <section className={`correction-field${ready ? " correction-field--ready" : ""}`} key={field.fieldKey}>
        <div className="correction-field__heading"><div><span>{fields.length === 1 ? t("Campo solicitado") : t("Campo {index} de {total}", { index: index + 1, total: fields.length })}</span><h2>{t(field.fieldLabel)}</h2></div><span className={`correction-field__state${ready ? " is-ready" : ""}`}><AppIcon name={ready ? "check" : "edit"} />{t(ready ? "Pronto para reenviar" : "Aguardando correção")}</span></div>
        <div className="correction-field__guidance"><AppIcon name="message" /><div><strong>{t("Orientação da biblioteca")}</strong>{guidance.standard && <p>{t(guidance.standard)}</p>}{guidance.observation && <div className="correction-field__observation"><strong>{t("Observação complementar")}</strong><p>{t(guidance.observation)}</p></div>}</div></div>
        <div className="correction-field__current"><strong>{t("Valor atual")} <small>{t("somente leitura")}</small></strong><p>{currentValueLabel(field, programs) || t("Não informado")}</p></div>
        <CorrectionInput field={field} value={value} programs={programs} onChange={(next) => { setValues((current) => ({ ...current, [field.fieldKey]: next })); setError(undefined); if (field.fieldKey === "public_work_url") setLinkAccessConfirmed(false); }} />
        {sameLink && <label className="correction-field__access-confirmation"><input type="checkbox" checked={linkAccessConfirmed} onChange={(event) => setLinkAccessConfirmed(event.target.checked)} /><span>{t("Corrigi o acesso ao arquivo e confirmei que a biblioteca já pode abri-lo, mesmo sem mudar o endereço.")}</span></label>}
        {!ready && !sameLink && <p className="correction-field__hint">{t("Altere este valor conforme a orientação da biblioteca para liberar o reenvio.")}</p>}
      </section>;
    })}</div>
    <div className="correction-form__submit"><div><strong>{t(fields.length === 1 ? "Reenviar correção" : "Reenviar correções")}</strong><p>{allReady ? t("Todos os campos solicitados estão prontos para a biblioteca conferir.") : fields.length === 1 ? t("Corrija o campo solicitado para liberar o reenvio.") : t("Faltam {count} {unit} para liberar o reenvio.", { count: fields.length - readyCount, unit: t(fields.length - readyCount === 1 ? "campo" : "campos") })}</p></div><button className="button button--primary button--with-icon" type="submit" disabled={submitting || !allReady}><AppIcon name="upload" /><span>{t(submitting ? "Enviando…" : fields.length === 1 ? "Reenviar correção" : "Reenviar correções")}{!allReady && <small>{t("Conclua")} {t(fields.length === 1 ? "o campo solicitado" : "todos os campos solicitados")}.</small>}</span></button></div>
  </form>;
}

function CorrectionInput({ field, value, programs, onChange }: { field: PendingField; value: string; programs: Program[]; onChange: (value: string) => void }) {
  const { language } = useInterfaceLanguage();
  const t = (source: string) => uiText(language, source);
  if (field.kind === "program") return <label className="correction-field__input">{t("Valor corrigido")}<select required value={value} onChange={(event) => onChange(event.target.value)}><option value="">{t("Selecione")}</option>{programs.map((program) => <option value={program.id} key={program.id}>{t(levelLabels[program.level])} · {program.name}</option>)}</select></label>;
  if (field.kind === "list") return <label className="correction-field__input">{t("Valor corrigido")} <small>{t("Um item por linha")}</small><textarea required={field.fieldKey === "keywords_pt"} rows={4} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
  if (field.kind === "textarea") return <label className="correction-field__input">{t("Valor corrigido")}<textarea required={field.fieldKey === "title"} rows={4} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
  return <label className="correction-field__input">{t("Valor corrigido")}<input required={["title", "author", "advisor", "registration_number", "public_work_url"].includes(field.fieldKey)} type={field.kind === "url" ? "url" : "text"} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}
