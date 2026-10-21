"use client";

import { RepositoryEmailContact } from "@/components/repository-email-contact";
import { useEffect, useRef, useState } from "react";
import { RepositoryAccessPreparation } from "@/components/repository-access-preparation";
import { createClient } from "@/lib/supabase/client";
import { AppIcon, type AppIconName } from "@/components/app-icon";
import { useInterfaceLanguage } from "@/components/interface-language";
import { uiText } from "@/lib/ui-text";
import { repositoryAccessEmail, repositoryAccessEmailHtml, repositoryAccessItems, repositoryAccessSubject, repositoryAccessText, type RepositoryDepositSetup } from "@/lib/repository-deposit-setup";

type RepositoryFieldGroup = "Configuração do depósito" | "Trabalho e datas" | "Pessoas e instituição" | "Assuntos e referência" | "Conferir no RI" | "Dados do trabalho";
export type RepositoryCopyField = { label: string; value?: string | null; note?: string; group?: RepositoryFieldGroup; kind?: "date" | "person" | "selection"; entry?: string; remainder?: string; copyable?: boolean };

const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const groups: { title: RepositoryFieldGroup; icon: AppIconName }[] = [
  { title: "Configuração do depósito", icon: "book" },
  { title: "Trabalho e datas", icon: "document" },
  { title: "Pessoas e instituição", icon: "person" },
  { title: "Assuntos e referência", icon: "tag" },
  { title: "Conferir no RI", icon: "review" },
  { title: "Dados do trabalho", icon: "document" },
];

const steps: { title: string; description: string; icon: AppIconName }[] = [
  { title: "Coleção", description: "Após a liberação pela equipe do RI, inicie o depósito na coleção habilitada para sua conta.", icon: "book" },
  { title: "Tipo de documento", description: "Confira o tipo de documento disponibilizado para o seu depósito.", icon: "document" },
  { title: "Descrição", description: "Use os dados para copiar abaixo e confira cada campo. Complete diretamente no RI resumo, área CNPq, acesso e demais informações solicitadas.", icon: "edit" },
  { title: "Arquivo", description: "Envie ao RI o PDF final com a ficha. Confira arquivo primário, formato e acesso.", icon: "upload" },
  { title: "Verificação", description: "Revise os dados e o arquivo carregado. Corrija no RI o que for necessário.", icon: "review" },
  { title: "Licença", description: "Escolha no RI a licença adequada ao seu depósito.", icon: "shield" },
  { title: "Distribuição", description: "Leia e decida sobre a licença de distribuição exibida pelo RI.", icon: "document" },
  { title: "Conclusão", description: "Acompanhe o andamento pelo e-mail e pelo “Meu espaço” no RI.", icon: "check" },
];

export function RepositoryDepositGuide({ requestId, startedAt, fields, setup, requesterName, requesterEmail, destinationKey, preview = false }: { requestId: string; startedAt: string | null; fields: RepositoryCopyField[]; setup: RepositoryDepositSetup; requesterName: string; requesterEmail: string; destinationKey?: string; preview?: boolean }) {
  const { language } = useInterfaceLanguage();
  const t = (value: string) => uiText(language, value);
  const fieldLabel = (label: string) => {
    const numbered = /^(Autor|Orientador|Coorientador|Membro da banca|Palavra-chave em português|Palavra-chave em inglês) (\d+)$/.exec(label);
    return numbered ? `${t(numbered[1])} ${numbered[2]}` : t(label);
  };
  const [started, setStarted] = useState(startedAt);
  const [reviewingPreparation, setReviewingPreparation] = useState(true);
  const [correctingAccess, setCorrectingAccess] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState("");
  const [error, setError] = useState("");
  const [emailChoice, setEmailChoice] = useState<"" | "same" | "other">("");
  const [otherEmail, setOtherEmail] = useState("");
  const [otherEmailDraft, setOtherEmailDraft] = useState("");
  const [editingOtherEmail, setEditingOtherEmail] = useState(false);
  const [confirmingOtherEmail, setConfirmingOtherEmail] = useState(false);
  const otherEmailInputRef = useRef<HTMLInputElement>(null);
  const confirmationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [copyFormat, setCopyFormat] = useState<"formatted" | "plain">("formatted");
  const repositoryEmail = emailChoice === "same" ? requesterEmail : emailChoice === "other" ? otherEmail.trim() : "";
  const emailReady = emailChoice !== "" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(repositoryEmail);
  const correctionRequest = "Solicito a correção da minha liberação para depositar no destino indicado abaixo. O acesso disponível na minha conta está em outro destino.";
  const accessSubject = correctingAccess ? `Correção de liberação para depósito no RI/UFBA - ${requesterName}` : repositoryAccessSubject(requesterName, language);
  const accessEmail = repositoryAccessEmail(requesterName, repositoryEmail, setup, language).replace(repositoryAccessText(language).request, correctingAccess ? correctionRequest : repositoryAccessText(language).request);
  const accessItems = repositoryAccessItems(requesterName, repositoryEmail, setup, language);
  const accessText = { ...repositoryAccessText(language), ...(correctingAccess ? { request: correctionRequest } : {}) };
  const portugueseSubject = correctingAccess ? `Correção de liberação para depósito no RI/UFBA - ${requesterName}` : repositoryAccessSubject(requesterName);
  const portugueseEmail = repositoryAccessEmail(requesterName, repositoryEmail, setup).replace(repositoryAccessText().request, correctingAccess ? correctionRequest : repositoryAccessText().request);

  useEffect(() => {
    if (editingOtherEmail) otherEmailInputRef.current?.focus();
  }, [editingOtherEmail]);

  useEffect(() => () => {
    if (confirmationTimer.current) clearTimeout(confirmationTimer.current);
  }, []);

  function openOtherEmailEditor() {
    if (confirmationTimer.current) clearTimeout(confirmationTimer.current);
    setConfirmingOtherEmail(false);
    setOtherEmailDraft(otherEmail);
    setEditingOtherEmail(true);
  }

  function confirmOtherEmail() {
    const normalized = otherEmailDraft.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return;
    setOtherEmail(normalized);
    setOtherEmailDraft(normalized);
    setEditingOtherEmail(false);
    setConfirmingOtherEmail(true);
    confirmationTimer.current = setTimeout(() => {
      setConfirmingOtherEmail(false);
      confirmationTimer.current = null;
    }, 1400);
  }

  async function copyAccessMessage() {
    if (!emailReady) return;
    try {
      if (copyFormat === "formatted" && typeof ClipboardItem !== "undefined") {
        const html = repositoryAccessEmailHtml(requesterName, repositoryEmail, setup).replace(repositoryAccessText().request, correctingAccess ? correctionRequest : repositoryAccessText().request);
        await navigator.clipboard.write([new ClipboardItem({
          "text/plain": new Blob([portugueseEmail], { type: "text/plain" }),
          "text/html": new Blob([html], { type: "text/html" }),
        })]);
      } else await navigator.clipboard.writeText(portugueseEmail);
      setError("");
      setCopied("pedido de acesso");
      window.setTimeout(() => setCopied(""), 1600);
    } catch { setError(t("Não foi possível copiar. Selecione o texto e copie manualmente.")); }
  }

  async function begin() {
    if (preview) { setStarted(new Date().toISOString()); return true; }
    setBusy(true);
    setError("");
    const { data, error: rpcError } = await createClient().rpc("start_repository_deposit", { target_request_id: requestId });
    if (rpcError) setError(t("Não foi possível registrar o início. Atualize a página e tente novamente."));
    else setStarted(String(data));
    setBusy(false);
    return !rpcError;
  }

  async function copy(label: string, value: string) {
    const plain = value.replace(/\*\*/g, "");
    try {
      if (label === "Citação" && typeof ClipboardItem !== "undefined") {
        const escaped = (part: string) => part.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const html = value.split(/(\*\*[^*]+\*\*)/g).map((part) => part.startsWith("**") && part.endsWith("**") ? `<strong>${escaped(part.slice(2, -2))}</strong>` : escaped(part)).join("");
        try { await navigator.clipboard.write([new ClipboardItem({ "text/plain": new Blob([plain], { type: "text/plain" }), "text/html": new Blob([html], { type: "text/html" }) })]); }
        catch { await navigator.clipboard.writeText(plain); }
      } else await navigator.clipboard.writeText(plain);
      setError("");
      setCopied(label);
      window.setTimeout(() => setCopied(""), 1600);
    } catch { setError(t("Não foi possível copiar. Selecione o texto e copie manualmente.")); }
  }

  const emailTemplate = <div className="repository-guide__access-template">
          <div className="repository-guide__access-template-heading"><span className="repository-guide__access-template-icon"><AppIcon name="message" /></span><div><span className="eyebrow">{t(correctingAccess ? "Correção de acesso" : "Pedido de acesso")}</span><h3>{t("Prepare o e-mail ao RI/UFBA")}</h3></div></div>
          <RepositoryEmailContact label={t("Envie sua mensagem para")} />
          <fieldset className="repository-guide__email-choice"><legend>{t("Qual e-mail você cadastrou no RI/UFBA?")}</legend>
            <div className={`repository-guide__email-option${emailChoice === "same" ? " is-selected" : ""}`}><label htmlFor={`repository-email-same-${requestId}`}><input id={`repository-email-same-${requestId}`} type="radio" name="repository-email-choice" checked={emailChoice === "same"} onChange={() => { setEmailChoice("same"); setEditingOtherEmail(false); setConfirmingOtherEmail(false); }} /><AppIcon className="repository-guide__email-option-icon" name="person" /><span><strong>{t("O mesmo e-mail do Pronto!")}</strong><small>{requesterEmail}</small></span><AppIcon className="repository-guide__email-option-check" name="check" /></label></div>
            <div className={`repository-guide__email-option repository-guide__email-option--other${emailChoice === "other" ? " is-selected" : ""}${editingOtherEmail ? " is-editing" : ""}${confirmingOtherEmail ? " is-confirming" : ""}`}><label htmlFor={`repository-email-other-${requestId}`} onClick={(event) => { if (emailChoice === "other") { event.preventDefault(); if (!editingOtherEmail) openOtherEmailEditor(); } }}><input id={`repository-email-other-${requestId}`} type="radio" name="repository-email-choice" checked={emailChoice === "other"} onChange={() => { setEmailChoice("other"); openOtherEmailEditor(); }} /><AppIcon className="repository-guide__email-option-icon" name="message" /><span className="repository-guide__other-email-copy"><strong>{t("Outro e-mail")}</strong><small>{otherEmail || t("Informe o endereço usado no cadastro do RI/UFBA.")}</small></span><AppIcon className="repository-guide__email-option-check" name="check" /></label><input ref={otherEmailInputRef} className="repository-guide__other-email-input" type="email" autoComplete="email" placeholder={t("Digite o e-mail usado no RI/UFBA")} aria-label={t("E-mail cadastrado no RI/UFBA")} value={otherEmailDraft} onChange={(event) => setOtherEmailDraft(event.target.value)} onBlur={confirmOtherEmail} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); event.currentTarget.blur(); } }} aria-invalid={otherEmailDraft.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(otherEmailDraft.trim())} tabIndex={editingOtherEmail ? 0 : -1} /><span className="repository-guide__other-email-feedback" role="status"><AppIcon name="check" />{t("E-mail aplicado à mensagem")}</span></div>
          </fieldset>
          {language !== "pt" && <p className="repository-guide__copy-language-note"><AppIcon name="message" />{t("O assunto e a mensagem aparecem no idioma selecionado para sua conferência. Ao copiar, o texto será em português para a equipe do RI/UFBA.")}</p>}
          <div className="repository-guide__access-subject"><div className="repository-guide__copy-only" onCopy={(event) => event.preventDefault()} onCut={(event) => event.preventDefault()} onDragStart={(event) => event.preventDefault()}><span>{t("Assunto")}</span><strong>{accessSubject}</strong></div><button className="button button--secondary button--small button--with-icon" type="button" onClick={() => void copy("assunto do pedido", portugueseSubject)}><AppIcon name={copied === "assunto do pedido" ? "check" : "copy"} />{copied === "assunto do pedido" ? t("Copiado") : t("Copiar assunto")}</button></div>
          <div className="repository-guide__access-message repository-guide__copy-only" onCopy={(event) => event.preventDefault()} onCut={(event) => event.preventDefault()} onDragStart={(event) => event.preventDefault()}><div className="repository-guide__access-message-heading"><span>{t("Mensagem")}</span><div className="repository-guide__copy-format" role="group" aria-label={t("Formato da cópia da mensagem")}><button type="button" className={copyFormat === "formatted" ? "is-selected" : ""} aria-pressed={copyFormat === "formatted"} onClick={() => setCopyFormat("formatted")}>{t("Formatada")}</button><button type="button" className={copyFormat === "plain" ? "is-selected" : ""} aria-pressed={copyFormat === "plain"} onClick={() => setCopyFormat("plain")}>{t("Sem formatação")}</button></div></div>{copyFormat === "plain" ? <pre className="repository-guide__message-plain" aria-label={t("Prévia sem formatação da mensagem")}>{accessEmail}</pre> : <div className="repository-guide__message-preview" aria-label={t("Prévia da mensagem")}><p>{accessText.greeting}</p><p>{accessText.request}</p><ul>{accessItems.map((item) => <li key={item}>{item}</li>)}</ul><p>{accessText.thanks}</p><p>{accessText.closing}<br />{requesterName}</p></div>}</div>
          <button className="button button--primary button--with-icon repository-guide__copy-message" type="button" disabled={!emailReady} onClick={() => void copyAccessMessage()}><AppIcon name={copied === "pedido de acesso" ? "check" : emailReady ? "copy" : "lock"} />{t(!emailReady ? "Informe o e-mail cadastrado no RI para copiar" : copied === "pedido de acesso" ? "Mensagem copiada" : "Copiar mensagem")}</button>
        </div>;

  if (!started || reviewingPreparation) return <RepositoryAccessPreparation requestId={requestId} setup={setup} destinationKey={destinationKey ?? JSON.stringify(["preview",setup.collection,setup.documentType])} preview={preview} emailTemplate={emailTemplate} emailState={{ emailChoice, otherEmail }} onRestoreEmail={(value) => { setEmailChoice(value.emailChoice); setOtherEmail(value.otherEmail); setOtherEmailDraft(value.otherEmail); }} onCorrectionChange={setCorrectingAccess} onBegin={async () => { if (await begin()) setReviewingPreparation(false); }} beginError={error} />;

  return <div className="repository-guide"><button className="button button--secondary button--with-icon" type="button" disabled={busy} onClick={() => setReviewingPreparation(true)}><AppIcon name="undo" />{t("Rever preparação do acesso")}</button>
    <section className="panel repository-guide__hero" aria-labelledby="repository-guide-title"><div className="repository-guide__hero-copy"><p className="eyebrow"><AppIcon name="check" />{t("Início registrado em")} {new Intl.DateTimeFormat(language, { dateStyle: "short", timeStyle: "short" }).format(new Date(started))}</p><h2 id="repository-guide-title">{t("Deposite seu trabalho no RI/UFBA")}</h2><p>{t("Abra o RI em outra aba. Use o roteiro e os dados desta página enquanto preenche o depósito.")}</p></div><a className="button button--primary button--with-icon" href="https://repositorio.ufba.br/submit" target="_blank" rel="noopener noreferrer"><AppIcon name="external" />{t("Abrir RI/UFBA")}</a></section>

    <section className="repository-guide__section" aria-labelledby="repository-steps-title"><div className="repository-guide__section-heading"><span className="repository-guide__section-icon"><AppIcon name="hierarchy" /></span><div><p className="eyebrow">{t("Roteiro")}</p><h2 id="repository-steps-title">{t("O que fazer no RI")}</h2><p>{t("Siga a ordem apresentada pelo repositório.")}</p></div></div><ol className="repository-guide__steps">{steps.map((step, index) => <li className="panel repository-guide__step" key={step.title}><span className="repository-guide__step-number">{String(index + 1).padStart(2, "0")}</span><AppIcon name={step.icon} /><div><h3>{t(step.title)}</h3><p>{t(step.description)}</p></div></li>)}</ol></section>

    <section className="repository-guide__section" aria-labelledby="repository-data-title"><div className="repository-guide__section-heading"><span className="repository-guide__section-icon"><AppIcon name="copy" /></span><div><p className="eyebrow">{t("Durante a descrição")}</p><h2 id="repository-data-title">{t("Dados para copiar e conferir")}</h2><p>{t("Os campos seguem a forma de preenchimento do RI. Copie os valores disponíveis; os demais exigem conferência ou decisão diretamente no repositório.")}</p></div></div><div className="repository-guide__groups">{groups.map((group) => { const items = fields.filter((field) => (field.group ?? "Dados do trabalho") === group.title); return items.length ? <section className="panel repository-guide__group" key={group.title}><h3><AppIcon name={group.icon} />{t(group.title)}</h3><div>{items.map((field) => <article className={`repository-guide__field${field.kind ? ` repository-guide__field--${field.kind}` : ""}`} key={field.label}><div><span>{fieldLabel(field.label)}</span>{field.kind === "selection" && field.value ? <select className="repository-guide__selection" value={field.value} disabled aria-label={uiText(language, "{field}: selecione {value} no RI", { field: fieldLabel(field.label), value: field.value })}><option value={field.value}>{field.value}</option></select> : field.kind === "date" && field.value ? <div className="repository-guide__date-parts"><div><span>{t("Mês")}</span><select value={field.value.slice(5, 7)} disabled aria-label={`${fieldLabel(field.label)}: ${t("Mês")}`}>{months.map((month, index) => <option key={month} value={String(index + 1).padStart(2, "0")}>{new Intl.DateTimeFormat(language, { month: "long" }).format(new Date(2020, index, 1))}</option>)}</select></div><div><span>{t("Dia")}</span><input readOnly value={field.value.slice(8, 10)} aria-label={`${fieldLabel(field.label)}: ${t("Dia")}`} /><button type="button" onClick={() => void copy(`${field.label}: dia`, field.value!.slice(8, 10))} aria-label={uiText(language, "Copiar dia de {field}", { field: fieldLabel(field.label) })}><AppIcon name={copied === `${field.label}: dia` ? "check" : "copy"} /></button></div><div><span>{t("Ano")}</span><input readOnly value={field.value.slice(0, 4)} aria-label={`${fieldLabel(field.label)}: ${t("Ano")}`} /><button type="button" onClick={() => void copy(`${field.label}: ano`, field.value!.slice(0, 4))} aria-label={uiText(language, "Copiar ano de {field}", { field: fieldLabel(field.label) })}><AppIcon name={copied === `${field.label}: ano` ? "check" : "copy"} /></button></div></div> : field.kind === "person" && field.entry && field.remainder ? <div className="repository-guide__person-parts"><div><span>{t("Entrada")}</span><strong>{field.entry}</strong><button type="button" onClick={() => void copy(`${field.label}: entrada`, field.entry!)} aria-label={uiText(language, "Copiar entrada de {field}", { field: fieldLabel(field.label) })}><AppIcon name={copied === `${field.label}: entrada` ? "check" : "copy"} /></button></div><div><span>{t("Restante do nome")}</span><strong>{field.remainder}</strong><button type="button" onClick={() => void copy(`${field.label}: restante do nome`, field.remainder!)} aria-label={uiText(language, "Copiar restante do nome de {field}", { field: fieldLabel(field.label) })}><AppIcon name={copied === `${field.label}: restante do nome` ? "check" : "copy"} /></button></div></div> : field.value ? field.label === "Citação" ? <p className="repository-citation">{field.value.split(/(\*\*[^*]+\*\*)/g).map((part, index) => part.startsWith("**") && part.endsWith("**") ? <strong key={index}>{part.slice(2, -2)}</strong> : part)}</p> : <strong>{field.value}</strong> : <em>{t(field.note ?? "Confira diretamente no RI/UFBA.")}</em>}{field.note && field.value && <em>{t(field.note)}</em>}</div>{field.value && !field.kind && field.copyable !== false && <button className="button button--secondary button--small button--with-icon" type="button" onClick={() => void copy(field.label, field.value!)}><AppIcon name={copied === field.label ? "check" : "copy"} />{copied === field.label ? t("Copiado") : t("Copiar")}</button>}</article>)}</div></section> : null; })}</div>{error && <p className="form-error" role="alert">{error}</p>}</section>

    <aside className="repository-guide__reminders"><div><AppIcon name="shield" /><p><strong>{t("Decisões no RI.")}</strong> {t("Acesso, embargo e licenças são escolhidos por você diretamente no repositório.")}</p></div><div><AppIcon name="document" /><p><strong>PDF/A.</strong> {t("Confira a exigência do RI e siga o tutorial oficial de conversão quando necessário. O Pronto! não converte nem certifica o arquivo.")}</p></div></aside>
  </div>;
}
