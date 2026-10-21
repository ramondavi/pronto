"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { AppIcon, type AppIconName } from "@/components/app-icon";
import { accessReady, accessStages, emptyAccessPreparation, restoreAccessPreparation, type AccessPreparation } from "@/domain/repository-deposit/preparation";
import type { RepositoryDepositSetup } from "@/lib/repository-deposit-setup";
import { useInterfaceLanguage } from "@/components/interface-language";
import { uiText } from "@/lib/ui-text";

type EmailState = { emailChoice: "" | "same" | "other"; otherEmail: string };
export function RepositoryAccessPreparation({ requestId, setup, destinationKey, preview, emailTemplate, emailState, onRestoreEmail, onCorrectionChange, onBegin, beginError }: { requestId: string; setup: RepositoryDepositSetup; destinationKey: string; preview: boolean; emailTemplate: ReactNode; emailState: EmailState; onRestoreEmail: (value: EmailState) => void; onCorrectionChange: (correction: boolean) => void; onBegin: () => Promise<void>; beginError: string }) {
  const { language } = useInterfaceLanguage();
  const t = (text: string) => uiText(language, text);
  const [state, setState] = useState<AccessPreparation>({ ...emptyAccessPreparation });
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSnapshot, setSavedSnapshot] = useState("");
  const [hasConflict, setHasConflict] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
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
        if (!data.destination_current) setError("O destino deste trabalho mudou. Confira novamente a liberação; seus dados de e-mail foram preservados.");
      } catch { if (active) { blocked.current = true; setHasConflict(true); setError("Não foi possível carregar as decisões ou o destino foi atualizado. Recarregue a página para continuar com os dados atuais."); } }
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
      void persist(snapshot).then(() => setError("")).catch(() => setError("As decisões não foram salvas. Se outra sessão alterou este trabalho, recarregue as decisões antes de continuar.")).finally(() => setSaving(false));
    }, 350);
    return () => clearTimeout(timer);
  }, [loaded, snapshot, persist]);
  function update(next: AccessPreparation, step?: number) {
    setState(next);
    if (step !== undefined) requestAnimationFrame(() => document.getElementById(`repository-preparation-${step}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
  }
  function route(value: AccessPreparation["route"]) {
    if (state.route === value) { update({ ...state, expanded: [value === "none" ? 1 : value === "ready" ? 0 : 2] }); return; }
    update({ ...emptyAccessPreparation, route: value, request: value === "wrong" ? "correction" : "", requestPhase: value === "wrong" ? "compose" : "choice", expanded: [value === "none" ? 1 : value === "ready" ? 0 : 2] }, value === "none" ? 1 : value === "ready" ? 0 : 2);
  }
  function account(value: AccessPreparation["account"]) {
    const changed = state.account !== value && !(["has","confirmed"].includes(state.account) && ["has","confirmed"].includes(value));
    update({ ...state, account: value, ...(changed ? { request: "" as const, requestSent: false, release: "" as const, final: "" as const, requestPhase: "choice" as const } : {}), expanded: [value === "create" ? 1 : 2] }, value === "create" ? 1 : 2);
  }
  function request(sent: boolean) {
    if (sent && state.requestSent) { update({ ...state, requestPhase: "verify", expanded: [2] }); return; }
    update({ ...state, request: sent ? "sent" : "compose", requestSent: sent, release: "", final: "", requestPhase: sent ? "verify" : "compose", expanded: [2] });
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
  const parts = setup.collection.split(" > ");
  const destination = <div className="repository-preparation__destination"><strong><AppIcon name="book" />{t("Destino deste trabalho no RI/UFBA")}</strong><dl><div><dt>{t("Comunidade")}</dt><dd>{parts[0]}</dd></div>{parts.length > 2 && <div><dt>{t("Subcomunidade")}</dt><dd>{parts.slice(1,-1).join(" > ")}</dd></div>}<div><dt>{t("Coleção")}</dt><dd>{parts.at(-1)}</dd></div><div><dt>{t("Tipo de documento")}</dt><dd>{setup.documentType}</dd></div></dl></div>;
  function choice(label: string, description: string, icon: AppIconName, selected: boolean, onClick: () => void) {
    return <button className={`browser-pdf-delivery__color-option repository-preparation__choice${selected ? " is-selected" : ""}`} type="button" aria-pressed={selected} disabled={!loaded || starting} onClick={onClick}><AppIcon name={icon} /><span><strong>{t(label)}</strong><small>{t(description)}</small></span><AppIcon name="check" /></button>;
  }
  const verify = <><h3>{t("A liberação já foi concedida para este destino?")}</h3>{destination}<p>{t("Confira a resposta por e-mail ou entre na sua conta do RI/UFBA. Conseguir iniciar um depósito no destino indicado significa que o acesso já foi liberado.")}</p><p className="field-help">{t("A liberação vale por 30 dias. Se vencer, solicite a renovação por e-mail ao RI/UFBA.")}</p><div className="repository-preparation__choices">{choice("Já fui liberado para o destino correto", "Conferi o e-mail ou o acesso na minha conta do RI/UFBA.", "check", state.release === "granted", () => update({ ...state, release: "granted", final: state.release === "granted" ? state.final : "", expanded: [2,3] }, 3))}{choice("Ainda estou aguardando a liberação", "Vou voltar depois para conferir o acesso.", "clock", state.release === "waiting", () => update({ ...state, release: "waiting", final: "", expanded: [2] }))}{choice("A liberação está em outro destino", "Preciso pedir a correção do acesso ao RI/UFBA.", "edit", state.release === "wrong", wrongDestination)}</div><button type="button" className="text-action" disabled={starting} onClick={() => update({ ...state, requestPhase: "choice" })}><AppIcon name="undo" />{t("Voltar à decisão anterior")}</button></>;
  const titles = ["Como está seu acesso?", "Criar e confirmar a conta", "Solicitar e conferir a liberação", "Conferir antes de começar"];
  const summaries = [state.route === "ready" ? "Conta e destino confirmados" : state.route === "none" ? "Cadastro necessário" : state.route === "wrong" ? "Corrigir destino da liberação" : state.route === "account" ? "Conta confirmada; conferir liberação" : "Escolha sua situação", ["has","confirmed"].includes(state.account) ? "Conta criada e confirmada" : state.account === "create" ? "Criar e confirmar conta" : "Cadastro pendente", state.release === "granted" ? "Liberação conferida no destino correto" : state.release === "wrong" ? "Aguardando correção do destino" : state.requestSent ? "Pedido enviado; conferir liberação" : "Pedido de acesso pendente", state.final === "confirmed" ? "Tudo pronto para depositar" : "Confirmação final pendente"];
  return <section className="panel repository-preparation"><div className="admin-section__lead"><span className="admin-section__icon"><AppIcon name="upload" /></span><div><p className="eyebrow">{t("Antes de começar")}</p><h2>{t("Prepare seu acesso ao RI/UFBA")}</h2><p>{t("As etapas se abrem conforme suas respostas. Você pode voltar e revisar as decisões.")}</p></div></div>
    {!loaded && !error && <p role="status">{t("Carregando suas decisões…")}</p>}
    <div className="repository-preparation__steps">{titles.map((title, step) => {
      const unlocked = stages[step]; const expanded = unlocked && state.expanded.includes(step);
      return <section id={`repository-preparation-${step}`} key={step} className={`browser-pdf-delivery__step${expanded ? " is-active" : ""}`}><button className="browser-pdf-delivery__step-heading" type="button" disabled={!loaded || !unlocked || starting} aria-expanded={expanded} aria-controls={`repository-preparation-body-${step}`} onClick={() => update({ ...state, expanded: expanded ? state.expanded.filter((item) => item !== step) : [...state.expanded,step] })}><span className="repository-preparation__number">{step}</span><span><strong>{t(title)}</strong><small>{t(unlocked ? summaries[step] : "Conclua a etapa anterior para liberar")}</small></span><AppIcon name={unlocked ? expanded ? "undo" : "review" : "lock"} /></button>
      {expanded && <div className="browser-pdf-delivery__step-body" id={`repository-preparation-body-${step}`}>
        {step === 0 && <>{destination}<div className="repository-preparation__choices">{choice("Tenho conta e liberação para este destino", "Minha conta está confirmada e já posso iniciar o depósito no local indicado.", "check", state.route === "ready", () => route("ready"))}{choice("Tenho conta, mas não tenho liberação", "Minha conta está confirmada; preciso conferir ou solicitar o acesso.", "person", state.route === "account", () => route("account"))}{choice("Ainda não tenho conta confirmada nem liberação", "Vou criar ou confirmar o cadastro e depois solicitar o acesso.", "account", state.route === "none", () => route("none"))}{choice("Tenho liberação, mas para outro destino", "O local disponível na minha conta difere do indicado para este trabalho.", "edit", state.route === "wrong", () => route("wrong"))}</div></>}
        {step === 1 && (state.account === "create" ? <><h3>{t("Crie e confirme sua conta no RI/UFBA")}</h3><p>{t("Cadastre-se com o e-mail que usará no repositório e conclua a confirmação recebida por e-mail. Recomendamos o endereço institucional @ufba.br.")}</p><div className="retrospective-actions"><a className="button button--secondary button--with-icon" href="https://repositorio.ufba.br/" target="_blank" rel="noopener noreferrer"><AppIcon name="external" />{t("Abrir RI/UFBA")}</a><a className="button button--secondary button--with-icon" href="https://repositorio.ufba.br/files/TUTORIAL_CADASTRO_DE_USUARIOS.PDF" target="_blank" rel="noopener noreferrer"><AppIcon name="book" />{t("Tutorial de cadastro")}</a></div><p>{t("O cadastro costuma levar poucos minutos. Depois, volte ao Pronto!. Criar a conta não libera o depósito: ainda será necessário obter acesso ao destino deste trabalho.")}</p>{choice("Minha conta está criada e confirmada", "Concluí o cadastro e a confirmação por e-mail.", "check", false, () => account("confirmed"))}<button className="text-action" type="button" disabled={starting} onClick={() => update({ ...state, account: "" })}><AppIcon name="undo" />{t("Voltar à decisão anterior")}</button></> : <div className="repository-preparation__choices">{choice("Minha conta já está criada e confirmada", "Posso seguir para a liberação do depósito.", "check", ["has","confirmed"].includes(state.account), () => account("has"))}{choice("Ainda preciso criar ou confirmar minha conta", "Quero ver as orientações de cadastro.", "person", false, () => account("create"))}</div>)}
        {step === 2 && (state.requestPhase === "choice" ? <><h3>{t("Você já enviou o pedido de liberação ao RI/UFBA?")}</h3>{destination}<div className="repository-preparation__choices">{choice("Já enviei o pedido de liberação", "Vou conferir se o acesso foi concedido no destino correto.", "message", state.requestSent, () => request(true))}{choice("Ainda não enviei o pedido", "Quero preparar a mensagem ao RI/UFBA.", "edit", state.request === "compose", () => request(false))}</div></> : state.requestPhase === "compose" ? <>{correction && <div className="auth-feedback"><strong>{t("Peça a correção da liberação")}</strong><p>{t("Não deposite em outro destino apenas porque ele está disponível. Se o destino indicado pelo Pronto! parecer incorreto, consulte a Biblioteca antes de pedir a alteração ao RI.")}</p></div>}{destination}{emailTemplate}{choice(correction ? "Já enviei o pedido de correção" : "Já enviei o pedido ao RI/UFBA", "O próximo passo é conferir se a liberação foi concedida.", "message", false, () => update({ ...state, requestSent: true, requestPhase: "verify", release: state.release === "wrong" ? "wrong" : "", final: "", expanded: [2] }))}<button className="text-action" type="button" disabled={starting} onClick={() => update({ ...state, requestPhase: "choice" })}><AppIcon name="undo" />{t("Voltar à decisão anterior")}</button></> : verify)}
        {step === 3 && <>{destination}<p>{t("Confirme que o cadastro está ativo e que o RI/UFBA permite iniciar o depósito no destino indicado.")}</p><div className="repository-preparation__choices">{choice("Confirmo a conta e a liberação neste destino", "Conferi o acesso adequado para este trabalho.", "check", state.final === "confirmed", () => update({ ...state, final: "confirmed" }))}{choice("Ainda aguardo ou não consegui confirmar a liberação", "Preciso voltar à conferência do acesso.", "clock", state.final === "waiting", () => update({ ...state, release: "waiting", final: "waiting", requestPhase: "verify", expanded: [2] }, 2))}{choice("Percebi que a liberação está no destino errado", "Vou solicitar a correção do acesso ao RI/UFBA.", "edit", false, wrongDestination)}</div></>}
      </div>}
      </section>;
    })}</div>
    <footer className="repository-preparation__footer"><p>{t(ready ? "Acesso confirmado. Tenha em mãos o PDF final com a ficha catalográfica. O guia ajudará a preencher os dados e concluir o depósito no RI/UFBA." : "Você pode sair e voltar depois. Suas decisões ficam salvas neste trabalho. Confira o e-mail ou sua conta no RI/UFBA antes de confirmar a liberação.")}</p><button className="button button--primary cataloging-homologation__action" disabled={!loaded || !ready || starting || hasConflict} type="button" onClick={() => void begin()}><span><strong>{t(starting ? "Abrindo guia…" : "Começar o guia do autodepósito")}</strong>{!ready && <small>{t(state.release === "wrong" || correction ? "Confirme a liberação no destino correto para começar." : "Confirme a conta e a liberação no RI/UFBA para começar.")}</small>}</span><AppIcon name={ready ? "upload" : "lock"} /></button><small role="status">{t(preview ? "Demonstração: decisões não são salvas na conta." : saving || (loaded && savedSnapshot !== snapshot) ? "Salvando decisões…" : loaded && !error ? "Decisões salvas na sua conta." : "")}</small></footer>
    {(error || beginError) && <div className="auth-feedback auth-feedback--error" role="alert"><p>{t(error || beginError)}</p><button type="button" className="button button--secondary button--small" onClick={() => window.location.reload()}>{t("Recarregar decisões")}</button></div>}
  </section>;
}
