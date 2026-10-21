"use client";

import { RepositoryEmailContact } from "@/components/repository-email-contact";
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ModalCloseButton } from "@/components/modal-close-button";
import { createClient } from "@/lib/supabase/client";
import { AppIcon, type AppIconName } from "@/components/app-icon";
import { accessReady, accessStages, emptyAccessPreparation, restoreAccessPreparation, type AccessPreparation } from "@/domain/repository-deposit/preparation";
import type { RepositoryDepositSetup } from "@/lib/repository-deposit-setup";
import { useInterfaceLanguage } from "@/components/interface-language";
import { uiText } from "@/lib/ui-text";

function AnimatedPreparationContent({ children }: { children: ReactNode }) {
  const content = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | null>(null);
  useEffect(() => {
    const element = content.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setHeight(element.getBoundingClientRect().height));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return <div className="repository-preparation__resize" style={{ height: height ?? "auto" }}><div ref={content} className="repository-preparation__resize-content">{children}</div></div>;
}

type EmailState = { emailChoice: "" | "same" | "other"; otherEmail: string };
export function RepositoryAccessPreparation({ requestId, setup, destinationKey, preview, emailTemplate, emailState, onRestoreEmail, onCorrectionChange, onBegin, beginError }: { requestId: string; setup: RepositoryDepositSetup; destinationKey: string; preview: boolean; emailTemplate: ReactNode; emailState: EmailState; onRestoreEmail: (value: EmailState) => void; onCorrectionChange: (correction: boolean) => void; onBegin: () => Promise<void>; beginError: string }) {
  const { language } = useInterfaceLanguage();
  const t = (text: string) => uiText(language, text);
  const [state, setState] = useState<AccessPreparation>({ ...emptyAccessPreparation });
  const [loaded, setLoaded] = useState(false);
  const [reminder, setReminder] = useState<{ status: string; due_at?: string } | null>(null);
  const [reminderBusy, setReminderBusy] = useState(false);
  const [reminderError, setReminderError] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedSnapshot, setSavedSnapshot] = useState("");
  const [hasConflict, setHasConflict] = useState(false);
  const [clock, setClock] = useState(() => Date.now());
  const [highlightStart, setHighlightStart] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const destinationDialog = useRef<HTMLDialogElement>(null);
  const destinationTitle = useId();
  const [pendingDecision, setPendingDecision] = useState<{ label: string; wrong: boolean; context: "access" | "release" | "final"; confirm: () => void; decline: () => void } | null>(null);
  const startButtonRef = useRef<HTMLButtonElement>(null);
  const revision = useRef(0);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const blocked = useRef(false);
  const saved = useRef("");
  const restoreEmail = useRef(onRestoreEmail);
  restoreEmail.current = onRestoreEmail;
  const snapshot = JSON.stringify({ ...state, ...emailState });
  const stages = accessStages(state);
  const ready = accessReady(state);
  const correction = state.request === "correction";
  const waitingKind = state.route === "none" && state.account === "create" && state.accountAwaitingConfirmation ? "account" : ["account", "wrong", "none"].includes(state.route) && state.requestSent && state.release === "waiting" ? state.request === "correction" ? "correction" : "release" : "";
  useEffect(() => {
    let active = true;
    setReminder(null); setReminderError("");
    if (!loaded || !waitingKind || preview) return;
    void createClient().from("repository_preparation_reminders").select("status,due_at,waiting_kind,destination").eq("request_id", requestId).maybeSingle().then(({ data, error }) => {
      if (!active) return;
      if (error) { setReminderError("Não foi possível consultar o lembrete. Tente novamente antes de sair."); return; }
      if (data?.waiting_kind === waitingKind && JSON.stringify(data.destination) === destinationKey) setReminder(data);
    });
    return () => { active = false; };
  }, [loaded, waitingKind, requestId, destinationKey, preview]);
  const waitRemaining = state.account === "create" && state.accountWaitStartedAt ? Math.max(0, 120 - Math.floor(Math.max(0, clock - state.accountWaitStartedAt) / 1000)) : 0;
  useEffect(() => {
    if (loaded && state.account === "create" && !state.accountWaitStartedAt) setState((current) => ({ ...current, accountWaitStartedAt: Date.now() }));
  }, [loaded, state.account, state.accountWaitStartedAt]);
  useEffect(() => {
    if (state.account !== "create" || !state.accountWaitStartedAt) return;
    const tick = () => setClock(Date.now()); tick();
    const interval = setInterval(tick, 500); document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(interval); document.removeEventListener("visibilitychange", tick); };
  }, [state.account, state.accountWaitStartedAt]);
  useEffect(() => { if (!highlightStart) return; const timer = setTimeout(() => setHighlightStart(false), 4200); return () => clearTimeout(timer); }, [highlightStart]);

  useEffect(() => onCorrectionChange(correction), [correction, onCorrectionChange]);
  useEffect(() => {
    let active = true;
    setLoaded(false); setError(""); blocked.current = false; setHasConflict(false);
    async function load() {
      if (preview) { if (active) setLoaded(true); return; }
      try {
        const { data, error } = await createClient().rpc("load_repository_access_preparation", { target_request_id: requestId });
        if (error) throw error;
        if (!active) return;
        if (JSON.stringify(data.destination) !== destinationKey) throw new Error("destination_changed");
        const raw = data.state && typeof data.state === "object" ? data.state : {};
        const restored = data.destination_current ? restoreAccessPreparation(raw) : { ...emptyAccessPreparation };
        const email: EmailState = { emailChoice: ["same", "other"].includes(raw.emailChoice) ? raw.emailChoice : "", otherEmail: typeof raw.otherEmail === "string" ? raw.otherEmail : "" };
        revision.current = Number(data.revision);
        saved.current = JSON.stringify({ ...restored, ...email }); setSavedSnapshot(saved.current);
        setState(restored); restoreEmail.current(email); setLoaded(true);
        if (!data.destination_current) setError("O destino do depósito deste trabalho mudou. Confira novamente a liberação para depositar; seus dados de e-mail foram preservados.");
      } catch { if (active) { blocked.current = true; setHasConflict(true); setError("Não foi possível carregar as respostas ou o destino do depósito foi atualizado. Recarregue a página para continuar com os dados atuais."); } }
    }
    void load();
    return () => { active = false; };
  }, [requestId, destinationKey, preview]);
  const persist = useCallback((value: string) => {
    const task = queue.current.then(async () => {
      if (blocked.current) throw new Error("blocked");
      if (saved.current === value) return;
      if (!preview) {
        const { data, error } = await createClient().rpc("save_repository_access_preparation", { target_request_id: requestId, preparation_state: JSON.parse(value), expected_revision: revision.current, expected_destination: JSON.parse(destinationKey) });
        if (error) { blocked.current = true; setHasConflict(true); throw error; }
        revision.current = Number(data);
      }
      saved.current = value; setSavedSnapshot(value);
    });
    queue.current = task.catch(() => undefined);
    return task;
  }, [requestId, preview, destinationKey]);
  useEffect(() => {
    if (!loaded || saved.current === snapshot) return;
    const timer = setTimeout(() => {
      setSaving(true);
      void persist(snapshot).then(() => setError("")).catch(() => setError("As respostas não foram salvas. Se outra sessão alterou este trabalho, recarregue as respostas antes de continuar.")).finally(() => setSaving(false));
    }, 350);
    return () => clearTimeout(timer);
  }, [loaded, snapshot, persist]);
  function update(next: AccessPreparation, step?: number) {
    setState(next);
    if (step !== undefined) setTimeout(() => document.getElementById(`repository-preparation-${step}`)?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest" }), 320);
  }
  function scrollToStart() {
    setHighlightStart(true);
    setTimeout(() => {
      startButtonRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
      startButtonRef.current?.focus({ preventScroll: true });
    }, 320);
  }
  function route(value: AccessPreparation["route"]) {
    if (state.route === value) { update({ ...state, expanded: value === "ready" ? [] : [value === "none" ? 1 : 2] }); if (value === "ready") scrollToStart(); return; }
    update({ ...emptyAccessPreparation, route: value, request: value === "wrong" ? "correction" : "", requestPhase: value === "wrong" ? "compose" : "choice", expanded: value === "ready" ? [] : [value === "none" ? 1 : 2] }, value === "ready" ? undefined : value === "none" ? 1 : 2);
    if (value === "ready") scrollToStart();
  }
  function account(value: AccessPreparation["account"]) {
    if (value === "confirmed" && waitRemaining > 0) return;
    const changed = state.account !== value && !(["has","confirmed"].includes(state.account) && ["has","confirmed"].includes(value));
    update({ ...state, account: value, accountAwaitingConfirmation: false, accountWaitStartedAt: value === "create" ? state.accountWaitStartedAt ?? Date.now() : state.accountWaitStartedAt, ...(changed ? { request: "" as const, requestSent: false, release: "" as const, final: "" as const, requestPhase: "choice" as const } : {}), expanded: [value === "create" ? 1 : 2] }, value === "create" ? 1 : 2);
  }
  function request(sent: boolean) {
    if (sent && state.requestSent) { update({ ...state, requestPhase: "verify", expanded: [2] }); return; }
    update({ ...state, request: correction ? "correction" : sent ? "sent" : "compose", requestSent: sent, release: "", final: "", requestPhase: sent ? "verify" : "compose", expanded: [2] });
  }
  function wrongDestination() {
    update({ ...state, route: state.route === "ready" ? "wrong" : state.route, request: "correction", requestSent: false, release: "wrong", final: "", requestPhase: "compose", expanded: [2] }, 2);
  }
  async function begin() {
    if (!loaded || !ready || starting || blocked.current) return;
    setStarting(true); setError("");
    try { await persist(snapshot); await onBegin(); }
    catch { setError("Não foi possível salvar a confirmação. Recarregue as decisões antes de iniciar o guia."); }
    finally { setStarting(false); }
  }
  async function toggleReminder(enabled: boolean) {
    if (preview || reminderBusy || !waitingKind || blocked.current) return;
    setReminderBusy(true); setReminderError("");
    try {
      await persist(snapshot);
      const { data, error } = await createClient().rpc("set_repository_preparation_reminder", { target_request_id: requestId, enabled });
      if (error) throw error;
      setReminder(data);
    } catch { setReminderError("Não foi possível alterar o lembrete. Se ele já estiver sendo enviado, não poderá ser cancelado. Tente novamente."); }
    finally { setReminderBusy(false); }
  }
  function reminderOption() {
    const checked = !!reminder && ["scheduled", "queued", "delivered"].includes(reminder.status);
    return <div className="repository-preparation__reminder"><label><input type="checkbox" checked={checked} disabled={!loaded || starting || preview || reminderBusy || hasConflict || reminder?.status === "delivered"} onChange={(event) => void toggleReminder(event.target.checked)} /><AppIcon name="bell" /><span><strong>{t("Quero ser lembrado por e-mail")}</strong><small>{t(reminderBusy ? "Atualizando lembrete…" : reminder?.status === "delivered" ? "Lembrete enviado para o e-mail da sua conta do Pronto!." : checked && reminder?.due_at ? `Você receberá um lembrete em ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "America/Bahia" }).format(new Date(reminder.due_at))}, às ${new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Bahia" }).format(new Date(reminder.due_at)).replace(":", "h")}.` : "Um único e-mail no segundo dia útil seguinte. Você pode cancelar antes do envio.")}</small></span></label>{reminderError && <p className="form-error" role="alert">{t(reminderError)}</p>}</div>;
  }
  function dismissDestination() {
    pendingDecision?.decline();
    setPendingDecision(null);
    destinationDialog.current?.close();
  }
  function requestDestinationCorrection() {
    const fromInitialStep = pendingDecision?.context === "access";
    setPendingDecision(null);
    destinationDialog.current?.close();
    if (fromInitialStep) route("wrong");
    else wrongDestination();
  }
  function confirmDestination() {
    const decision = pendingDecision;
    setPendingDecision(null);
    destinationDialog.current?.close();
    decision?.confirm();
  }
  function choice(label: string, description: string, icon: AppIconName, selected: boolean, onClick: () => void, checkDestination = false, timed = false, onDecline: () => void = () => undefined, context: "access" | "release" | "final" = "access") {
    const waiting = timed && waitRemaining > 0;
    const showReminder = !!waitingKind && icon === "clock" && selected;
    return <div className={`repository-preparation__option${showReminder ? " repository-preparation__option--waiting" : ""}`}><button className={`browser-pdf-delivery__color-option repository-preparation__choice${selected ? " is-selected" : ""}${waiting ? " is-counting" : ""}`} type="button" aria-pressed={selected} disabled={!loaded || starting || waiting} onClick={() => { if (!checkDestination) { onClick(); return; } setPendingDecision({ label, wrong: icon === "edit", context, confirm: onClick, decline: selected ? onDecline : () => undefined }); destinationDialog.current?.showModal(); }}><AppIcon name={waiting ? "clock" : icon} /><span><strong>{t(label)}</strong><small>{t(description)}</small>{waiting && <span className="repository-preparation__timer"><strong>{Math.floor(waitRemaining/60)}:{String(waitRemaining%60).padStart(2,"0")}</strong><span>{t("Pode aguardar com esta tela aberta e conferir seu e-mail. Quando a contagem terminar, informe se sua conta já foi confirmada.")}</span></span>}</span><AppIcon name="check" />{waiting && <span className="repository-preparation__progress" role="progressbar" aria-label={t("Tempo até liberar a confirmação")} aria-valuemin={0} aria-valuemax={120} aria-valuenow={120 - waitRemaining}><span style={{ width: `${(120 - waitRemaining) / 120 * 100}%` }} /></span>}</button>{showReminder && reminderOption()}</div>;
  }
  function backDecision() {
    if (state.account === "create") update({ ...state, account: "", accountAwaitingConfirmation: false });
    else update({ ...state, requestPhase: state.requestPhase === "verify" && ["compose","correction"].includes(state.request) ? "compose" : "choice" });
  }

  function waitingNotice(kind: "account" | "release" | "correction") {
    return <aside className="repository-preparation__wait-contact"><RepositoryEmailContact label={t("Contato da equipe do RI/UFBA")} /><div className="repository-preparation__wait-guidance"><AppIcon name="help" /><div><strong>{t(kind === "account" ? "Ainda não recebeu a confirmação do cadastro?" : kind === "correction" ? "Ainda aguarda a correção da liberação para depositar?" : "Ainda aguarda a liberação para depositar?")}</strong><p>{t(kind === "account" ? "Escreva para o endereço acima, informe que seu cadastro ainda não foi confirmado e peça a verificação. Informe o e-mail usado no cadastro." : "Você pode continuar outro dia. Confira seu e-mail e a liberação para depositar na conta do RI/UFBA; para acompanhar o pedido, escreva para o endereço acima informando o e-mail cadastrado e o destino de depósito solicitado.")}</p></div></div></aside>;
  }
  const verify = <>
    <button type="button" className="repository-preparation__answer" onClick={backDecision}><AppIcon name="check" /><span>{t(correction ? "Já enviei o pedido de correção" : "Já enviei o pedido de liberação para depositar")}<small>{t("Rever resposta")}</small></span><AppIcon name="edit" /></button>
    <h3>{t(correction ? "A correção da liberação para depositar já foi realizada?" : "Você já recebeu a liberação para depositar do RI/UFBA?")}</h3>
    <aside className="repository-preparation__info"><AppIcon name="message" /><p>{t("Confira a resposta por e-mail ou entre na sua conta do RI/UFBA. Conseguir iniciar um depósito no destino correto significa que você já tem liberação para depositar.")}</p></aside>
    <div className="repository-preparation__choices">
      {choice(state.release === "waiting" ? "Agora tenho liberação para depositar" : correction ? "Sim, a correção já foi realizada" : "Sim, já recebi a liberação para depositar", "Vou conferir a coleção e o tipo de documento antes de continuar.", "check", state.release === "granted", () => update({ ...state, release: "granted", final: state.release === "granted" ? state.final : "", expanded: [3] }, 3), true, false, () => update({ ...state, release: "", final: "", expanded: [2] }), "release")}
      {choice(correction ? "Ainda não recebi a correção da liberação para depositar" : "Ainda não recebi a liberação para depositar", "Posso continuar depois e optar por um lembrete por e-mail.", "clock", state.release === "waiting", () => update({ ...state, release: "waiting", final: "", expanded: [2] }))}
      {choice("Recebi a resposta, mas o destino do depósito está diferente", "Preciso conferir os dados e pedir a correção ao RI/UFBA.", "edit", state.release === "wrong", wrongDestination, true, false, () => update({ ...state, release: "", final: "" }), "release")}
    </div>
    {state.release === "waiting" && waitingNotice(correction ? "correction" : "release")}
    <p className="field-help">{t("A liberação para depositar vale por 30 dias. Se vencer, solicite a renovação por e-mail ao RI/UFBA.")}</p>
  </>;
  const accountInstructions = <>
    <button type="button" className="repository-preparation__answer" onClick={backDecision}><AppIcon name="check" /><span>{t("Informei que preciso criar ou confirmar minha conta")}<small>{t("Alterar resposta")}</small></span><AppIcon name="edit" /></button>
    <details className="repository-preparation__registration-details" open={!state.accountAwaitingConfirmation}><summary><AppIcon name="book" />{t("Orientações para criar e confirmar a conta")}<AppIcon name="chevronDown" /></summary><section className="repository-preparation__instructions">
      <div className="repository-preparation__instruction-heading"><AppIcon name="book" /><div><h3>{t("Crie e confirme sua conta no RI/UFBA")}</h3><p>{t("Siga estes três passos e mantenha esta tela aberta para continuar depois do cadastro.")}</p></div></div>
      <ol className="repository-preparation__registration-steps">
        <li><span className="repository-preparation__registration-icon"><AppIcon name="account" /></span><div><h4><span>1</span>{t("Crie sua conta")}</h4><p>{t("Abra o RI/UFBA e faça o cadastro com o e-mail que usará no repositório. Recomendamos o endereço institucional @ufba.br.")}</p><a className="repository-preparation__tutorial-link" href="https://repositorio.ufba.br/files/TUTORIAL_CADASTRO_DE_USUARIOS.PDF" target="_blank" rel="noopener noreferrer"><AppIcon name="book" /><span>{t("Dúvida sobre como fazer seu cadastro no RI/UFBA? Veja o tutorial.")}</span></a></div></li>
        <li><span className="repository-preparation__registration-icon"><AppIcon name="message" /></span><div><h4><span>2</span>{t("Confirme pelo e-mail recebido")}</h4><p>{t("Confira a caixa de entrada e a pasta de spam do e-mail cadastrado. Abra a mensagem do RI/UFBA e siga as orientações para confirmar a conta.")}</p></div></li>
        <li><span className="repository-preparation__registration-icon"><AppIcon name="check" /></span><div><h4><span>3</span>{t("Continue aqui no Pronto!")}</h4><p>{t("Quando a contagem terminar, informe abaixo se sua conta já foi confirmada. Se ainda não recebeu a confirmação, escolha essa resposta para ver como pedir ajuda e continuar outro dia.")}</p></div></li>
      </ol>
    </section></details>
    <aside className="repository-preparation__info"><AppIcon name="shield" /><p>{t("Depois de confirmar a conta, será preciso solicitar ou conferir a liberação para depositar seu trabalho. Vamos orientar esse pedido na próxima etapa.")}</p></aside>
    {waitRemaining > 0 ? choice("Aguarde para conferir a confirmação", "Pode manter esta tela aberta. Ao terminar a contagem, responda se sua conta foi confirmada para continuar.", "clock", false, () => undefined, false, true) : <>
      <h3>{t("Sua conta já foi criada e confirmada?")}</h3>
      <div className="repository-preparation__choices">
        {choice(state.accountAwaitingConfirmation ? "Minha conta agora está confirmada" : "Sim, minha conta foi criada e confirmada", "Concluí o cadastro e recebi a confirmação por e-mail.", "check", false, () => account("confirmed"))}
        {choice("Ainda não recebi a confirmação da conta", "Vou pedir a verificação ao RI/UFBA e posso continuar outro dia.", "clock", state.accountAwaitingConfirmation, () => update({ ...state, accountAwaitingConfirmation: true, expanded: [1] }))}
      </div>
      {state.accountAwaitingConfirmation && waitingNotice("account")}
    </>}
  </>;
  const titles = ["Como está sua conta e a liberação para depositar?", "Criar e confirmar a conta", "Solicitar e conferir a liberação para depositar", "Conferir antes de começar"];
  const summaries = [state.route === "ready" ? "Tenho conta confirmada e liberação para depositar no destino correto" : state.route === "none" ? "Não tenho conta confirmada nem liberação para depositar" : state.route === "wrong" ? "Tenho liberação para depositar, mas o destino do depósito está errado" : state.route === "account" ? "Tenho conta confirmada, mas não tenho liberação para depositar" : "Ainda não informei minha situação", ["has","confirmed"].includes(state.account) ? "Minha conta está criada e confirmada" : state.accountAwaitingConfirmation ? "Ainda não recebi a confirmação da minha conta" : state.account === "create" ? "Ainda preciso criar ou confirmar minha conta" : "Ainda não confirmei minha conta", state.release === "granted" ? "Já tenho liberação para depositar no destino correto" : state.release === "wrong" ? "Minha liberação para depositar está no destino de depósito errado" : state.release === "waiting" ? "Ainda estou aguardando a liberação para depositar" : state.requestSent ? "Já enviei o pedido; preciso conferir a liberação para depositar" : state.request === "compose" || state.request === "correction" ? "Ainda preciso enviar o pedido ao RI/UFBA" : "Ainda não informei se enviei o pedido", state.final === "confirmed" ? "Confirmei minha conta e a liberação para depositar no destino correto" : state.final === "waiting" ? "Ainda não consegui confirmar a liberação para depositar" : "Ainda preciso fazer a conferência final"];

  return <section className="panel repository-preparation"><header className="repository-preparation__header"><div className="admin-section__lead"><span className="admin-section__icon"><AppIcon name="upload" /></span><div><p className="eyebrow">{t("Antes de começar")}</p><h2>{t("Prepare sua conta e a liberação para depositar no RI/UFBA")}</h2><p>{t("Responda às perguntas de cada etapa. Sua resposta define o próximo passo; reabra uma etapa para conferir ou alterar o que informou.")}</p></div></div><a className="button button--primary repository-preparation__login" href="https://repositorio.ufba.br/mydspace" target="_blank" rel="noopener noreferrer"><AppIcon name="external" /><span><strong>{t("Fazer login no RI/UFBA")}</strong><small>{t("Faça login na nova aba. Depois, volte aqui e alterne entre as abas para conferir cada etapa.")}</small></span></a></header>
    {!loaded && !error && <p role="status">{t("Carregando suas respostas…")}</p>}
    <div className="repository-preparation__steps">{titles.map((title, step) => {
      const unlocked = stages[step]; const expanded = unlocked && state.expanded.includes(step);
      const skipped = step > 0 && (state.route === "ready" || (step === 1 && ["account", "wrong"].includes(state.route)));
      const skippedReason = state.route === "ready"
        ? "Etapa pulada: informei na etapa 0 que já tenho conta e liberação para depositar. Posso começar o guia."
        : "Etapa pulada: informei na etapa 0 que minha conta já está confirmada. Não preciso refazer o cadastro.";
      const blockedReason = !state.route ? "Responda à etapa 0 para definir os próximos passos."
        : step === 2 ? "Confirme sua conta na etapa 1 para continuar."
        : "Confirme a liberação para depositar na etapa 2 para continuar.";
      return <section id={`repository-preparation-${step}`} key={step} className={`browser-pdf-delivery__step${expanded ? " is-active" : ""}${skipped ? " repository-preparation__step--skipped" : ""}`}><button className="browser-pdf-delivery__step-heading" type="button" disabled={!loaded || !unlocked || starting} aria-expanded={expanded} aria-controls={`repository-preparation-body-${step}`} onClick={() => update({ ...state, expanded: expanded ? state.expanded.filter((item) => item !== step) : [...state.expanded,step] })}><span className="repository-preparation__number">{step}</span><span><strong>{t(title)}</strong><small>{t(skipped ? skippedReason : unlocked ? summaries[step] : blockedReason)}</small></span><AppIcon className={unlocked ? `repository-preparation__chevron${expanded ? " is-expanded" : ""}` : undefined} name={skipped ? "arrowRight" : unlocked ? "chevronDown" : "lock"} /></button>
      <div className={`repository-preparation__fold${expanded ? " is-open" : ""}`} aria-hidden={!expanded} inert={!expanded}><div className="repository-preparation__fold-inner"><div className={`browser-pdf-delivery__step-body${step === 1 || step === 2 ? " repository-preparation__wizard" : ""}`} id={`repository-preparation-body-${step}`}><AnimatedPreparationContent><div className="repository-preparation__screen" key={`${step}-${step === 1 ? state.account === "create" ? "instructions" : "choice" : step === 2 ? state.requestPhase : "choice"}`}>
        {step === 0 && <><div className="repository-preparation__choices">{choice("Tenho conta e liberação para depositar no destino correto", "Minha conta está confirmada e já posso iniciar o depósito no local indicado.", "check", state.route === "ready", () => route("ready"), true, false, () => update({ ...emptyAccessPreparation }))}{choice("Tenho conta, mas não tenho liberação para depositar", "Minha conta está confirmada; preciso conferir ou solicitar a liberação para depositar.", "person", state.route === "account", () => route("account"))}{choice("Ainda não tenho conta confirmada nem liberação para depositar", "Vou criar ou confirmar o cadastro e depois solicitar a liberação para depositar.", "account", state.route === "none", () => route("none"))}</div></>}
        {step === 1 && (state.account === "create" ? accountInstructions : <div className="repository-preparation__choices">{choice("Minha conta já está criada e confirmada", "Posso seguir para a liberação para depositar.", "check", ["has","confirmed"].includes(state.account), () => account("has"))}{choice("Ainda preciso criar ou confirmar minha conta", "Quero ver as orientações de cadastro.", "person", false, () => account("create"))}</div>)}
        {step === 2 && (state.requestPhase === "choice" ? <><h3>{t("Você já enviou o pedido de liberação para depositar ao RI/UFBA?")}</h3><div className="repository-preparation__choices">{choice("Já enviei o pedido de liberação para depositar", "Vou conferir se recebi liberação para depositar no destino correto.", "message", state.requestSent, () => request(true))}{choice("Ainda não enviei o pedido", "Quero preparar a mensagem ao RI/UFBA.", "edit", state.request === "compose", () => request(false))}</div></> : state.requestPhase === "compose" ? <><button type="button" className="repository-preparation__answer" onClick={() => update({ ...state, requestPhase: "choice" })}><AppIcon name="check" /><span>{t(correction ? "Preciso corrigir o destino de depósito liberado" : "Ainda preciso enviar o pedido de liberação para depositar")}<small>{t("Rever resposta")}</small></span><AppIcon name="edit" /></button>{correction && <aside className="repository-preparation__info repository-preparation__info--warning"><AppIcon name="shield" /><div><strong>{t("Peça a correção da liberação para depositar")}</strong><p>{t("Não deposite em outro destino apenas porque ele está disponível. Se o destino de depósito indicado pelo Pronto! parecer incorreto, consulte a Biblioteca antes de pedir a alteração ao RI.")}</p></div></aside>}{emailTemplate}{choice(correction ? "Já enviei o pedido de correção" : "Já enviei o pedido ao RI/UFBA", "O próximo passo é conferir se a liberação para depositar foi concedida.", "message", false, () => update({ ...state, requestSent: true, requestPhase: "verify", release: "", final: "", expanded: [2] }))}</> : verify)}
        {step === 3 && <><p>{t("Confirme que o cadastro está ativo e que o RI/UFBA permite iniciar o depósito no destino de depósito indicado.")}</p><div className="repository-preparation__choices">{choice("Confirmo a conta e a liberação para depositar neste destino", "Conferi a liberação para depositar no destino correto deste trabalho.", "check", state.final === "confirmed", () => update({ ...state, final: "confirmed", expanded: [] }), true, false, () => update({ ...state, final: "" }), "final")}{choice("Ainda aguardo ou não consegui confirmar a liberação para depositar", "Preciso voltar à conferência da liberação para depositar.", "clock", state.final === "waiting", () => update({ ...state, release: "waiting", final: "waiting", requestPhase: "verify", expanded: [2] }, 2))}{choice("Percebi que a liberação para depositar está no destino de depósito errado", "Vou solicitar ao RI/UFBA a correção da liberação para depositar.", "edit", false, wrongDestination, true, false, () => update({ ...state, release: "", final: "" }))}</div></>}
      </div></AnimatedPreparationContent></div></div></div>
      </section>;
    })}</div>
    <footer className="repository-preparation__footer"><div className="repository-preparation__notice"><AppIcon name={ready ? "check" : "help"} /><p>{t(ready ? "Liberação para depositar confirmada. Tenha em mãos o PDF final com a ficha catalográfica. O guia ajudará a preencher os dados e concluir o depósito no RI/UFBA." : "Você pode sair e voltar depois. Suas respostas ficam salvas neste trabalho. Confira o e-mail ou sua conta no RI/UFBA antes de confirmar a liberação para depositar.")}</p></div><button ref={startButtonRef} className={`button button--primary cataloging-homologation__action${highlightStart ? " repository-preparation__start--highlight" : ""}`} disabled={!loaded || !ready || starting || hasConflict} type="button" onClick={() => void begin()}><span><strong>{t(starting ? "Abrindo guia…" : "Começar o guia do autodepósito")}</strong>{!ready && <small>{t(state.release === "wrong" || correction ? "Confirme a liberação para depositar no destino correto para começar." : "Confirme a conta e a liberação para depositar no RI/UFBA para começar.")}</small>}</span><AppIcon name={ready ? "upload" : "lock"} /></button><small role="status">{t(preview ? "Demonstração: respostas não são salvas na conta." : saving || (loaded && savedSnapshot !== snapshot) ? "Salvando respostas…" : "")}</small></footer>
    <dialog ref={destinationDialog} className="pronto-modal account-confirm-dialog repository-preparation__destination-dialog" aria-labelledby={destinationTitle} onCancel={(event) => { event.preventDefault(); dismissDestination(); }}>
      <ModalCloseButton onClick={dismissDestination} />
      <div className="account-confirm-dialog__heading"><span><AppIcon name="review" /></span><h2 id={destinationTitle}>{t(pendingDecision?.wrong ? "Sua liberação para depositar precisa de correção?" : pendingDecision?.context === "final" ? "Sua liberação para depositar está correta para começar?" : pendingDecision?.context === "release" ? "Confira a liberação para depositar recebida" : "Confirme a liberação para depositar este trabalho")}</h2></div>
      <p>{t(pendingDecision?.wrong ? "Compare o destino de depósito liberado na sua conta com os dois valores esperados abaixo." : "Siga estes passos no RI/UFBA antes de confirmar a liberação para depositar.")}</p>
      <ol className="repository-preparation__verification">
        <li><span className="repository-preparation__verification-number">1</span><div><h3><AppIcon name="person" />{t("Faça login e inicie um depósito")}</h3><p>{t("Entre na sua conta do RI/UFBA. Em Meu espaço, clique no botão verde “Iniciar um novo depósito”.")}</p><a className="button button--secondary button--small button--with-icon" href="https://repositorio.ufba.br/mydspace" target="_blank" rel="noopener noreferrer"><AppIcon name="external" />{t("Fazer login no RI/UFBA")}</a></div></li>
        <li><span className="repository-preparation__verification-number">2</span><div><h3><AppIcon name="hierarchy" />{t("Confira a coleção")}</h3><p>{t("Na tela “Depósito: Escolha uma coleção”, verifique se o campo “Coleção” permite escolher este caminho completo:")}</p><strong className="repository-preparation__expected">{setup.collection}</strong></div></li>
        <li><span className="repository-preparation__verification-number">3</span><div><h3><AppIcon name="document" />{t("Confira o tipo de documento")}</h3><p>{t("Na primeira tela “Depósito: descreva este item”, verifique se o campo “Tipo de documento” permite selecionar:")}</p><strong className="repository-preparation__expected">{setup.documentType}</strong></div></li>
      </ol>
      <aside className="repository-preparation__info"><AppIcon name="help" /><p>{t(pendingDecision?.wrong ? "Se o destino liberado para depositar for diferente do esperado, confirme abaixo para preparar o pedido de correção ao RI/UFBA. Se quiser rever o que informou, volte à resposta." : "Confirme se consegue iniciar o depósito com esses dois valores. Se a liberação para depositar estiver em outro destino, escolha pedir a correção. Se ainda não conseguiu conferir, feche esta janela para voltar à pergunta.")}</p></aside>
      <div className="account-confirm-dialog__actions"><button type="button" className="button button--secondary" onClick={pendingDecision?.wrong ? dismissDestination : requestDestinationCorrection}>{t(pendingDecision?.wrong ? "Voltar e rever minha resposta" : "Não, preciso corrigir a liberação para depositar")}</button><button type="button" className="button button--primary" onClick={confirmDestination}>{t(pendingDecision?.wrong ? "Sim, preciso solicitar a correção" : "Sim, os dois valores estão corretos")}</button></div>
    </dialog>
    {(error || beginError) && <div className="auth-feedback auth-feedback--error" role="alert"><p>{t(error || beginError)}</p><button type="button" className="button button--secondary button--small" onClick={() => window.location.reload()}>{t("Recarregar respostas")}</button></div>}
  </section>;
}
