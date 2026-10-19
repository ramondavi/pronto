"use client";

import { useState } from "react";
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

export function RepositoryDepositGuide({ requestId, startedAt, fields, setup, requesterName, requesterEmail, preview = false }: { requestId: string; startedAt: string | null; fields: RepositoryCopyField[]; setup: RepositoryDepositSetup; requesterName: string; requesterEmail: string; preview?: boolean }) {
  const { language } = useInterfaceLanguage();
  const t = (value: string) => uiText(language, value);
  const fieldLabel = (label: string) => {
    const numbered = /^(Autor|Orientador|Coorientador|Membro da banca|Palavra-chave em português|Palavra-chave em inglês) (\d+)$/.exec(label);
    return numbered ? `${t(numbered[1])} ${numbered[2]}` : t(label);
  };
  const [started, setStarted] = useState(startedAt);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState("");
  const [error, setError] = useState("");
  const [emailChoice, setEmailChoice] = useState<"" | "same" | "other">("");
  const [otherEmail, setOtherEmail] = useState("");
  const [copyFormat, setCopyFormat] = useState<"formatted" | "plain">("formatted");
  const repositoryEmail = emailChoice === "same" ? requesterEmail : emailChoice === "other" ? otherEmail.trim() : "";
  const emailReady = emailChoice !== "" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(repositoryEmail);
  const accessSubject = repositoryAccessSubject(requesterName, language);
  const accessEmail = repositoryAccessEmail(requesterName, repositoryEmail, setup, language);
  const accessItems = repositoryAccessItems(requesterName, repositoryEmail, setup, language);
  const accessText = repositoryAccessText(language);
  const portugueseSubject = repositoryAccessSubject(requesterName);
  const portugueseEmail = repositoryAccessEmail(requesterName, repositoryEmail, setup);

  async function copyAccessMessage() {
    if (!emailReady) return;
    try {
      if (copyFormat === "formatted" && typeof ClipboardItem !== "undefined") {
        const html = repositoryAccessEmailHtml(requesterName, repositoryEmail, setup);
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
    if (preview) { setStarted(new Date().toISOString()); return; }
    setBusy(true);
    setError("");
    const { data, error: rpcError } = await createClient().rpc("start_repository_deposit", { target_request_id: requestId });
    if (rpcError) setError(t("Não foi possível registrar o início. Atualize a página e tente novamente."));
    else setStarted(String(data));
    setBusy(false);
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

  if (!started) return <section className="panel repository-guide__welcome" aria-labelledby="repository-welcome-title">
    <span className="repository-guide__welcome-icon"><AppIcon name="upload" /></span>
    <div><p className="eyebrow">{t("Próxima etapa")}</p><h2 id="repository-welcome-title">{t("Faça o autodepósito no RI/UFBA")}</h2><p>{t("Antes de depositar, prepare seu acesso ao repositório. Siga as etapas abaixo na ordem indicada.")}</p></div>
    <div className="repository-guide__access-heading"><span>{t("Antes de começar")}</span><h3>{t("Prepare seu acesso em 3 etapas")}</h3></div>
    <ol className="repository-guide__access-steps" aria-label={t("Como obter acesso para depositar no RI")}>
      <li><span className="repository-guide__access-number">1</span><AppIcon name="person" /><div><strong>{t("Crie sua conta")}</strong><p>{t("Se ainda não tiver conta, cadastre-se no")} <a href="https://repositorio.ufba.br/" target="_blank" rel="noopener noreferrer">RI/UFBA</a> {t("com o e-mail que pretende usar no repositório. Recomendamos usar seu e-mail institucional @ufba.br. Se precisar, consulte o")} <a href="https://repositorio.ufba.br/files/TUTORIAL_CADASTRO_DE_USUARIOS.PDF" target="_blank" rel="noopener noreferrer">{t("tutorial de cadastro")}</a>.</p></div></li>
      <li className="repository-guide__access-step--email"><span className="repository-guide__access-number">2</span><AppIcon name="message" /><div><strong>{t("Solicite a liberação")}</strong><p>{t("Confira o modelo abaixo e envie a solicitação para")} <a href="mailto:repositorio@ufba.br">repositorio@ufba.br</a>. {t("Use o e-mail cadastrado no RI/UFBA; a equipe confirmará a coleção e o tipo de documento liberados.")}</p>
        <div className="repository-guide__access-template">
          <div className="repository-guide__access-template-heading"><span className="repository-guide__access-template-icon"><AppIcon name="message" /></span><div><span className="eyebrow">{t("Pedido de acesso")}</span><h3>{t("Prepare o e-mail ao RI/UFBA")}</h3></div></div>
          <fieldset className="repository-guide__email-choice"><legend>{t("Qual e-mail você cadastrou no RI/UFBA?")}</legend>
            <div className={`repository-guide__email-option${emailChoice === "same" ? " is-selected" : ""}`}><label htmlFor={`repository-email-same-${requestId}`}><input id={`repository-email-same-${requestId}`} type="radio" name="repository-email-choice" checked={emailChoice === "same"} onChange={() => setEmailChoice("same")} /><AppIcon className="repository-guide__email-option-icon" name="person" /><span><strong>{t("O mesmo e-mail do Pronto!")}</strong><small>{requesterEmail}</small></span><AppIcon className="repository-guide__email-option-check" name="check" /></label><span className="repository-guide__email-option-space" aria-hidden="true" /></div>
            <div className={`repository-guide__email-option${emailChoice === "other" ? " is-selected" : ""}`}><label htmlFor={`repository-email-other-${requestId}`}><input id={`repository-email-other-${requestId}`} type="radio" name="repository-email-choice" checked={emailChoice === "other"} onChange={() => setEmailChoice("other")} /><AppIcon className="repository-guide__email-option-icon" name="message" /><span><strong>{t("Outro e-mail")}</strong><small>{t("Informe o endereço usado no cadastro do RI/UFBA.")}</small></span><AppIcon className="repository-guide__email-option-check" name="check" /></label><input className="repository-guide__other-email-input" type="email" autoComplete="email" placeholder={t("Digite o e-mail usado no RI/UFBA")} aria-label={t("E-mail cadastrado no RI/UFBA")} value={otherEmail} onChange={(event) => setOtherEmail(event.target.value)} aria-invalid={otherEmail.length > 0 && !emailReady} disabled={emailChoice !== "other"} /></div>
          </fieldset>
          {language !== "pt" && <p className="repository-guide__copy-language-note"><AppIcon name="message" />{t("O assunto e a mensagem aparecem no idioma selecionado para sua conferência. Ao copiar, o texto será em português para a equipe do RI/UFBA.")}</p>}
          <div className="repository-guide__access-subject"><div><span>{t("Assunto")}</span><strong>{accessSubject}</strong></div><button className="button button--secondary button--small button--with-icon" type="button" onClick={() => void copy("assunto do pedido", portugueseSubject)}><AppIcon name={copied === "assunto do pedido" ? "check" : "copy"} />{copied === "assunto do pedido" ? t("Copiado") : t("Copiar assunto")}</button></div>
          <div className="repository-guide__access-message"><div className="repository-guide__access-message-heading"><span>{t("Mensagem")}</span><div className="repository-guide__copy-format" role="group" aria-label={t("Formato da cópia da mensagem")}><button type="button" className={copyFormat === "formatted" ? "is-selected" : ""} aria-pressed={copyFormat === "formatted"} onClick={() => setCopyFormat("formatted")}>{t("Formatada")}</button><button type="button" className={copyFormat === "plain" ? "is-selected" : ""} aria-pressed={copyFormat === "plain"} onClick={() => setCopyFormat("plain")}>{t("Sem formatação")}</button></div></div>{copyFormat === "plain" ? <pre className="repository-guide__message-plain" aria-label={t("Prévia sem formatação da mensagem")}>{accessEmail}</pre> : <div className="repository-guide__message-preview" aria-label={t("Prévia da mensagem")}><p>{accessText.greeting}</p><p>{accessText.request}</p><ul>{accessItems.map((item) => <li key={item}>{item}</li>)}</ul><p>{accessText.thanks}</p><p>{accessText.closing}<br />{requesterName}</p></div>}</div>
          <button className="button button--primary button--with-icon repository-guide__copy-message" type="button" disabled={!emailReady} onClick={() => void copyAccessMessage()}><AppIcon name={copied === "pedido de acesso" ? "check" : emailReady ? "copy" : "lock"} />{t(!emailReady ? emailChoice === "other" ? "Informe o e-mail do RI para copiar" : "Confirme o e-mail do RI para copiar" : copied === "pedido de acesso" ? "Mensagem copiada" : "Copiar mensagem")}</button>
        </div>
      </div></li>
      <li><span className="repository-guide__access-number">3</span><AppIcon name="calendar" /><div><strong>{t("Aguarde a confirmação do RI")}</strong><p>{t("Só inicie o depósito após a equipe liberar seu acesso. A liberação vale por")} <strong>{t("30 dias")}</strong>; {t("se vencer, solicite outra por e-mail.")}</p></div></li>
    </ol>
    <div className="repository-guide__welcome-action"><div><strong>{t("Recebeu a liberação?")}</strong><small>{t("Tenha em mãos o PDF final com a ficha. O guia ajudará você a preencher o depósito.")}</small></div><button className="button button--primary button--with-icon" type="button" disabled={busy} onClick={() => void begin()}><AppIcon name="arrowRight" />{t(busy ? "Registrando início…" : "Começar guia de depósito")}</button></div>
    {error && <p className="form-error" role="alert">{error}</p>}
  </section>;

  return <div className="repository-guide">
    <section className="panel repository-guide__hero" aria-labelledby="repository-guide-title"><div className="repository-guide__hero-copy"><p className="eyebrow"><AppIcon name="check" />{t("Início registrado em")} {new Intl.DateTimeFormat(language, { dateStyle: "short", timeStyle: "short" }).format(new Date(started))}</p><h2 id="repository-guide-title">{t("Deposite seu trabalho no RI/UFBA")}</h2><p>{t("Abra o RI em outra aba. Use o roteiro e os dados desta página enquanto preenche o depósito.")}</p></div><a className="button button--primary button--with-icon" href="https://repositorio.ufba.br/submit" target="_blank" rel="noopener noreferrer"><AppIcon name="external" />{t("Abrir RI/UFBA")}</a></section>

    <section className="repository-guide__section" aria-labelledby="repository-steps-title"><div className="repository-guide__section-heading"><span className="repository-guide__section-icon"><AppIcon name="hierarchy" /></span><div><p className="eyebrow">{t("Roteiro")}</p><h2 id="repository-steps-title">{t("O que fazer no RI")}</h2><p>{t("Siga a ordem apresentada pelo repositório.")}</p></div></div><ol className="repository-guide__steps">{steps.map((step, index) => <li className="panel repository-guide__step" key={step.title}><span className="repository-guide__step-number">{String(index + 1).padStart(2, "0")}</span><AppIcon name={step.icon} /><div><h3>{t(step.title)}</h3><p>{t(step.description)}</p></div></li>)}</ol></section>

    <section className="repository-guide__section" aria-labelledby="repository-data-title"><div className="repository-guide__section-heading"><span className="repository-guide__section-icon"><AppIcon name="copy" /></span><div><p className="eyebrow">{t("Durante a descrição")}</p><h2 id="repository-data-title">{t("Dados para copiar e conferir")}</h2><p>{t("Os campos seguem a forma de preenchimento do RI. Copie os valores disponíveis; os demais exigem conferência ou decisão diretamente no repositório.")}</p></div></div><div className="repository-guide__groups">{groups.map((group) => { const items = fields.filter((field) => (field.group ?? "Dados do trabalho") === group.title); return items.length ? <section className="panel repository-guide__group" key={group.title}><h3><AppIcon name={group.icon} />{t(group.title)}</h3><div>{items.map((field) => <article className={`repository-guide__field${field.kind ? ` repository-guide__field--${field.kind}` : ""}`} key={field.label}><div><span>{fieldLabel(field.label)}</span>{field.kind === "selection" && field.value ? <select className="repository-guide__selection" value={field.value} disabled aria-label={uiText(language, "{field}: selecione {value} no RI", { field: fieldLabel(field.label), value: field.value })}><option value={field.value}>{field.value}</option></select> : field.kind === "date" && field.value ? <div className="repository-guide__date-parts"><div><span>{t("Mês")}</span><select value={field.value.slice(5, 7)} disabled aria-label={`${fieldLabel(field.label)}: ${t("Mês")}`}>{months.map((month, index) => <option key={month} value={String(index + 1).padStart(2, "0")}>{new Intl.DateTimeFormat(language, { month: "long" }).format(new Date(2020, index, 1))}</option>)}</select></div><div><span>{t("Dia")}</span><input readOnly value={field.value.slice(8, 10)} aria-label={`${fieldLabel(field.label)}: ${t("Dia")}`} /><button type="button" onClick={() => void copy(`${field.label}: dia`, field.value!.slice(8, 10))} aria-label={uiText(language, "Copiar dia de {field}", { field: fieldLabel(field.label) })}><AppIcon name={copied === `${field.label}: dia` ? "check" : "copy"} /></button></div><div><span>{t("Ano")}</span><input readOnly value={field.value.slice(0, 4)} aria-label={`${fieldLabel(field.label)}: ${t("Ano")}`} /><button type="button" onClick={() => void copy(`${field.label}: ano`, field.value!.slice(0, 4))} aria-label={uiText(language, "Copiar ano de {field}", { field: fieldLabel(field.label) })}><AppIcon name={copied === `${field.label}: ano` ? "check" : "copy"} /></button></div></div> : field.kind === "person" && field.entry && field.remainder ? <div className="repository-guide__person-parts"><div><span>{t("Entrada")}</span><strong>{field.entry}</strong><button type="button" onClick={() => void copy(`${field.label}: entrada`, field.entry!)} aria-label={uiText(language, "Copiar entrada de {field}", { field: fieldLabel(field.label) })}><AppIcon name={copied === `${field.label}: entrada` ? "check" : "copy"} /></button></div><div><span>{t("Restante do nome")}</span><strong>{field.remainder}</strong><button type="button" onClick={() => void copy(`${field.label}: restante do nome`, field.remainder!)} aria-label={uiText(language, "Copiar restante do nome de {field}", { field: fieldLabel(field.label) })}><AppIcon name={copied === `${field.label}: restante do nome` ? "check" : "copy"} /></button></div></div> : field.value ? field.label === "Citação" ? <p className="repository-citation">{field.value.split(/(\*\*[^*]+\*\*)/g).map((part, index) => part.startsWith("**") && part.endsWith("**") ? <strong key={index}>{part.slice(2, -2)}</strong> : part)}</p> : <strong>{field.value}</strong> : <em>{t(field.note ?? "Confira diretamente no RI/UFBA.")}</em>}{field.note && field.value && <em>{t(field.note)}</em>}</div>{field.value && !field.kind && field.copyable !== false && <button className="button button--secondary button--small button--with-icon" type="button" onClick={() => void copy(field.label, field.value!)}><AppIcon name={copied === field.label ? "check" : "copy"} />{copied === field.label ? t("Copiado") : t("Copiar")}</button>}</article>)}</div></section> : null; })}</div>{error && <p className="form-error" role="alert">{error}</p>}</section>

    <aside className="repository-guide__reminders"><div><AppIcon name="shield" /><p><strong>{t("Decisões no RI.")}</strong> {t("Acesso, embargo e licenças são escolhidos por você diretamente no repositório.")}</p></div><div><AppIcon name="document" /><p><strong>PDF/A.</strong> {t("Confira a exigência do RI e siga o tutorial oficial de conversão quando necessário. O Pronto! não converte nem certifica o arquivo.")}</p></div></aside>
  </div>;
}
