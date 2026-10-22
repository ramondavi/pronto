"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import { AppIcon, type AppIconName } from "@/components/app-icon";
import { DeclarationCancellationControl } from "@/components/declaration-cancellation-control";
import { SharedFileIntegrityControl } from "@/components/shared-file-integrity-control";
import { AnalysisKeyboardHint } from "@/components/analysis-keyboard-hint";
import { AnalysisFieldHelp } from "@/components/analysis-field-help";

const steps = [
  { id: "metadata", label: "Metadados", icon: "document" },
  { id: "cataloging", label: "Catalogação", icon: "book" },
  { id: "review", label: "Revisão da ficha", icon: "review" },
  { id: "documentation", label: "Finalização e liberação", icon: "shield" },
] as const;
const sectionLinks = {
  cataloging: [
    { id: "cataloging-people", label: "Pessoas" },
    { id: "cataloging-terms", label: "Assuntos" },
    { id: "cataloging-classification", label: "Classificação" },
    { id: "cataloging-details", label: "Descrição" },
  ],
  review: [
    { id: "request-analysis-citation-end", label: "Referência" },
    { id: "request-analysis-pending-end", label: "Conferência" },
    { id: "request-cataloging-preview-end", label: "Prévia da ficha" },
    { id: "request-analysis-review-action", label: "Homologação" },
  ],
} as const;

function AnalysisSectionIndex({ section, active, onActivate, showDeclarations, metadataAdjustmentsPending, cduDescriptionPending }: { section: "metadata" | "cataloging" | "review" | "documentation"; active: string; onActivate: (step: typeof steps[number]["id"]) => void; showDeclarations: boolean; metadataAdjustmentsPending: boolean; cduDescriptionPending: boolean }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const updateVisibility = () => {
      const steps = document.getElementById("request-analysis-steps");
      setVisible(Boolean(steps && steps.getBoundingClientRect().bottom < 0));
    };
    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    window.addEventListener("resize", updateVisibility);
    return () => { window.removeEventListener("scroll", updateVisibility); window.removeEventListener("resize", updateVisibility); };
  }, []);
  const links = section === "cataloging" || section === "review" ? sectionLinks[section] : [];
  return <nav className={`analysis-section-index${visible && !showDeclarations ? " analysis-section-index--visible" : ""}`} aria-label="Índice da análise" aria-hidden={!visible || showDeclarations} inert={!visible || showDeclarations}>
    <div className="analysis-section-index__stages"><strong>Etapas</strong><div>{steps.map((step, index) => <button type="button" key={step.id} className={active === step.id ? "is-active" : ""} aria-current={active === step.id ? "step" : undefined} disabled={showDeclarations || (metadataAdjustmentsPending && index > 0) || (cduDescriptionPending && index > 1)} onClick={() => { onActivate(step.id); window.requestAnimationFrame(() => document.querySelector<HTMLElement>(`.request-analysis-section[data-step="${step.id}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" })); }}>{step.label}</button>)}</div></div>
    {links.length > 0 && <div className="analysis-section-index__sections"><strong>Nesta etapa</strong><div>{links.map((link) => <button type="button" key={link.id} onClick={() => document.getElementById(link.id)?.scrollIntoView({ behavior: "smooth", block: "start" })}>{link.label}</button>)}</div></div>}
  </nav>;
}

export function RequestAnalysisSections({ submissionReview, metadata, cataloging, documentation, finalAction, requestId, declarationRequestId, preliminaryRequired = false, canceled = false, declarationsReviewed = false, initialLinkVerified = false, metadataComplete = false, catalogingComplete = false, citationComplete = false, nadaConstaComplete = false, nadaConstaStatus = null, documentationComplete = false, publicWorkUrl = "", waitingForStudent = false, hasStudentMessage = false, sharedFileRequestId }: { submissionReview?: ReactNode; metadata: ReactNode; cataloging: ReactNode; documentation: ReactNode; finalAction?: ReactNode; requestId: string; declarationRequestId?: string; preliminaryRequired?: boolean; canceled?: boolean; declarationsReviewed?: boolean; initialLinkVerified?: boolean; metadataComplete?: boolean; catalogingComplete?: boolean; citationComplete?: boolean; nadaConstaComplete?: boolean; nadaConstaStatus?: string | null; documentationComplete?: boolean; publicWorkUrl?: string; waitingForStudent?: boolean; hasStudentMessage?: boolean; sharedFileRequestId?: string }) {
  const helpRootRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const requestedStep = useSearchParams().get("etapa");
  const initialRequestedStep = useRef(requestedStep);
  const revisitRequested = useSearchParams().get("rever") === "1";
  const [confirmedLocally, setConfirmedLocally] = useState(false);
  const preliminaryComplete = canceled || metadataComplete || confirmedLocally || (declarationsReviewed && initialLinkVerified);
  const [showDeclarations, setShowDeclarations] = useState(preliminaryRequired && (!preliminaryComplete || (revisitRequested && Boolean(declarationRequestId))));
  const [replyPending, setReplyPending] = useState(false);
  const [metadataAdjustmentsPending, setMetadataAdjustmentsPending] = useState(false);
  const [cduDescriptionPending, setCduDescriptionPending] = useState(false);
  const [citationReady, setCitationReady] = useState(citationComplete);
  const [keyboardHintTarget, setKeyboardHintTarget] = useState<HTMLElement | null>(null);
  const [active, setActive] = useState<"metadata" | "cataloging" | "review" | "documentation">(
    requestedStep === "cataloging" || requestedStep === "review" || requestedStep === "documentation" || requestedStep === "metadata" ? requestedStep : !metadataComplete ? "metadata" : !catalogingComplete ? "cataloging" : "documentation",
  );
  const activeStep = steps.findIndex((step) => step.id === active);
  const isMetadata = active === "metadata";
  const completed = [metadataComplete, catalogingComplete, catalogingComplete, documentationComplete];
  const finalChecks = [{ label: "Referência validada", done: citationReady, target: "request-analysis-citation-end" }, { label: "Ficha homologada", done: catalogingComplete, target: "request-analysis-review-action" }, { label: "Nada Consta aprovado", done: nadaConstaComplete, target: "request-analysis-nada-consta" }];
  const finalChecksReady = finalChecks.filter((check) => check.done).length;
  const precheckDescription = waitingForStudent ? "Aguardando correção do link pelo estudante." : showDeclarations ? preliminaryComplete ? "Revisão das declarações aberta." : "Conclua esta conferência para iniciar a análise." : preliminaryComplete ? "" : "Conferência pendente.";
  function activateStep(step: typeof active) {
    setActive(step);
    const url = new URL(window.location.href);
    url.searchParams.set("etapa", step);
    window.history.replaceState(window.history.state, "", url);
  }
  function navigateFromFooter(step: typeof active) {
    activateStep(step);
    window.requestAnimationFrame(() => document.getElementById("request-analysis-steps")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }
  function openPendingCheck(targetId: string) {
    activateStep(targetId === "request-analysis-nada-consta" ? "documentation" : "review");
    window.setTimeout(() => {
      const target = document.getElementById(targetId);
      if (!target) return;
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      target.classList.add("analysis-check-arrival");
      window.setTimeout(() => target.classList.remove("analysis-check-arrival"), 4_000);
    }, 120);
  }
  useEffect(() => setCitationReady(citationComplete), [citationComplete]);
  useEffect(() => setKeyboardHintTarget(document.getElementById("analysis-keyboard-hint-slot")), []);
  useEffect(() => { const onCitationStatus = (event: Event) => setCitationReady(Boolean((event as CustomEvent<{ ready: boolean }>).detail?.ready)); window.addEventListener("request-analysis:citation-status", onCitationStatus); return () => window.removeEventListener("request-analysis:citation-status", onCitationStatus); }, []);
  useEffect(() => { if (preliminaryRequired && !preliminaryComplete) setShowDeclarations(true); }, [preliminaryRequired, preliminaryComplete]);
  useEffect(() => { if (revisitRequested && declarationRequestId) setShowDeclarations(true); }, [revisitRequested, declarationRequestId]);
  useEffect(() => { const onRevisit = () => { if (declarationRequestId) setShowDeclarations(true); }; window.addEventListener("request-analysis:revisit", onRevisit); return () => window.removeEventListener("request-analysis:revisit", onRevisit); }, [declarationRequestId]);
  useEffect(() => { const onReply = (event: Event) => setReplyPending(Boolean((event as CustomEvent<{ pending: boolean }>).detail?.pending)); window.addEventListener("request-analysis:reply-pending", onReply); return () => window.removeEventListener("request-analysis:reply-pending", onReply); }, []);
  useEffect(() => { const onPending = (event: Event) => setMetadataAdjustmentsPending(Boolean((event as CustomEvent<{ pending: boolean }>).detail?.pending)); window.addEventListener("request-analysis:pending-adjustments", onPending); return () => window.removeEventListener("request-analysis:pending-adjustments", onPending); }, []);
  useEffect(() => { const onPending = (event: Event) => setCduDescriptionPending(Boolean((event as CustomEvent<{ pending: boolean }>).detail?.pending)); window.addEventListener("request-analysis:cdu-description-pending", onPending); return () => window.removeEventListener("request-analysis:cdu-description-pending", onPending); }, []);
  useEffect(() => { const onUpload = (event: Event) => { if ((event as CustomEvent<{ requestId?: string }>).detail?.requestId === requestId) router.refresh(); }; window.addEventListener("staff:nada-consta-uploaded", onUpload); return () => window.removeEventListener("staff:nada-consta-uploaded", onUpload); }, [router, requestId]);
  useEffect(() => {
    if (requestedStep && steps.some((step) => step.id === requestedStep)) {
      setActive(requestedStep as typeof active);
    }
  }, [requestedStep]);
  useEffect(() => {
    if (showDeclarations || !initialRequestedStep.current || !steps.some((step) => step.id === initialRequestedStep.current)) return;
    initialRequestedStep.current = null;
    const frame = window.requestAnimationFrame(() => document.getElementById("request-analysis-steps")?.scrollIntoView({ behavior: "auto", block: "start" }));
    return () => window.cancelAnimationFrame(frame);
  }, [showDeclarations]);
  useEffect(() => {
    const navigateToField = (event: Event) => {
      if (showDeclarations) return;
      const detail = (event as CustomEvent<{ tab?: typeof active; fieldId?: string }>).detail;
      if (!detail || !steps.some((step) => step.id === detail.tab) || (metadataAdjustmentsPending && detail.tab !== "metadata")) return;
      activateStep(detail.tab!);
      if (detail.fieldId) window.setTimeout(() => {
        const target = document.getElementById(detail.fieldId!);
        if (!target) return;
        target.focus({ preventScroll: true });
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        target.classList.remove("analysis-field-target");
        target.classList.add("analysis-pending-arrival");
        window.requestAnimationFrame(() => target.classList.add("analysis-field-target"));
        window.setTimeout(() => target.classList.remove("analysis-field-target"), 1_500);
      }, 120);
    };
    window.addEventListener("request-analysis:navigate", navigateToField);
    return () => window.removeEventListener("request-analysis:navigate", navigateToField);
  }, [showDeclarations, metadataAdjustmentsPending]);
  return <div ref={helpRootRef} className="request-analysis-sections" data-active-section={active} data-declaration-preview={showDeclarations}>
    <aside className={`analysis-precheck${showDeclarations ? " is-active" : ""}`} aria-label="Etapa preliminar">
      <span className="analysis-precheck__icon"><AppIcon name={preliminaryComplete ? "check" : "review"} /></span>
      <div><span className="analysis-precheck__eyebrow">Antes da análise</span><strong>Conferência inicial</strong>{precheckDescription && <small>{precheckDescription}</small>}</div>
      <span className="analysis-precheck__status">{canceled ? "Concluída" : waitingForStudent ? "Aguardando estudante" : showDeclarations ? preliminaryComplete ? "Em revisão" : "Em conferência" : preliminaryComplete ? "Concluída" : "Pendente"}</span>
    </aside>
    <nav id="request-analysis-steps" className="analysis-stepper analysis-stepper--guided" aria-label="Etapas da análise do atendimento">
      <span className="analysis-stepper__heading">Análise do atendimento</span>
      {steps.map((step, index) => <button
        key={step.id}
        type="button"
        aria-current={!showDeclarations && active === step.id ? "step" : undefined}
        className={`${!showDeclarations && active === step.id ? "is-active" : ""} ${completed[index] ? "is-complete" : ""}`}
        disabled={showDeclarations || (metadataAdjustmentsPending && index > 0) || (cduDescriptionPending && index > 1)}
        onKeyDown={(event) => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
          const buttons = Array.from(event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? []);
          const current = buttons.indexOf(event.currentTarget);
          const target = event.key === "Home" ? buttons[0] : event.key === "End" ? buttons.at(-1) : buttons[current + (event.key === "ArrowRight" ? 1 : -1)];
          if (target) { event.preventDefault(); target.focus(); target.click(); }
        }}
        onClick={() => activateStep(step.id)}
      >
        <span className="analysis-stepper__number">{completed[index] ? <AppIcon name="check" /> : String(index + 1).padStart(2, "0")}</span>
        <span><AppIcon name={step.icon as AppIconName} /><strong>{step.label}</strong><small>{completed[index] ? "Concluída" : canceled ? "Não concluída" : !showDeclarations && active === step.id ? "Em andamento" : "A seguir"}</small></span>
      </button>)}
    </nav>
    <AnalysisSectionIndex section={active} active={active} onActivate={activateStep} showDeclarations={showDeclarations} metadataAdjustmentsPending={metadataAdjustmentsPending} cduDescriptionPending={cduDescriptionPending} />
    {nadaConstaStatus === "pending" && !canceled && <aside className="analysis-document-alert" role="status"><AppIcon name="document" /><div><strong>Nada Consta recebido</strong><p>O documento já pode ser conferido, mesmo enquanto a ficha é preparada.</p></div>{!showDeclarations && !metadataAdjustmentsPending && !cduDescriptionPending ? <button className="button button--secondary button--small" type="button" onClick={() => openPendingCheck("request-analysis-nada-consta")}>Conferir agora <AppIcon name="arrowRight" /></button> : <span>Conclua as pendências da etapa atual para acessar a conferência.</span>}</aside>}
    {showDeclarations && (declarationRequestId ? <DeclarationCancellationControl requestId={declarationRequestId} publicWorkUrl={publicWorkUrl} initiallyReviewed={declarationsReviewed} initiallyLinkVerified={initialLinkVerified} waitingForStudent={waitingForStudent} replyPending={replyPending} onContinue={() => { setConfirmedLocally(true); activateStep("metadata"); setShowDeclarations(false); }} onBack={declarationsReviewed && initialLinkVerified ? () => setShowDeclarations(false) : undefined} /> : <section className="panel declaration-review"><h2>Conferência inicial pendente</h2><p>O bibliotecário responsável precisa conferir as declarações e o acesso ao trabalho antes de iniciar a análise.</p></section>)}
    <section className="preanalysis-message" hidden={!showDeclarations || !hasStudentMessage}><div id="preanalysis-student-message" /></section>
    <section className="request-analysis-section" data-step="metadata">{metadata}</section>
    <section className="request-analysis-section" data-step="cataloging">{sharedFileRequestId && <SharedFileIntegrityControl requestId={sharedFileRequestId} publicWorkUrl={publicWorkUrl} />}{cataloging}</section>
    <section className="request-analysis-section" data-step="review">
      {sharedFileRequestId && <SharedFileIntegrityControl requestId={sharedFileRequestId} publicWorkUrl={publicWorkUrl} />}
      <div className="analysis-stage-heading"><h2>Revisão da ficha</h2><p>Confira a referência e a ficha. Depois, registre a homologação.</p></div>
      {submissionReview}
      <div id="request-analysis-citation-end" />
      <div id="request-analysis-pending-end" />
      <div id="request-cataloging-preview-end" />
    </section>
    <section className="request-analysis-section" data-step="documentation">
      {sharedFileRequestId && <SharedFileIntegrityControl requestId={sharedFileRequestId} publicWorkUrl={publicWorkUrl} />}
      <div className="analysis-stage-heading"><h2>Finalização e liberação</h2><p>Confira o Nada Consta e conclua os requisitos para liberar a ficha ao estudante.</p></div>
      <div className="finalization-progress" aria-label="Verificações para liberação"><div className="finalization-progress__heading"><strong>{finalChecksReady} de 3 verificações concluídas</strong><span>{finalChecksReady === 3 ? "Pronto para as próximas ações" : `${3 - finalChecksReady} ${3 - finalChecksReady === 1 ? "pendência" : "pendências"}`}</span></div><div className="finalization-progress__checks">{finalChecks.map((check) => check.done ? <span className="is-done" key={check.label}><AppIcon name="check" />{check.label}</span> : <button type="button" key={check.label} onClick={() => openPendingCheck(check.target)} title={`Ir para ${check.label.toLocaleLowerCase("pt-BR")}`}><AppIcon name="arrowRight" />{check.label}</button>)}</div></div>
      {documentation}{finalAction}
    </section>
    {!showDeclarations && <nav className="request-analysis-sections__toolbar" aria-label="Navegação entre etapas da análise">
      <div className="request-analysis-sections__position"><span>Etapa {activeStep + 1} de {steps.length}</span></div>
      <div className="request-analysis-sections__navigation">
        {!isMetadata && <button className="request-analysis-sections__previous" type="button" onClick={() => navigateFromFooter(steps[activeStep - 1].id)}><AppIcon name="arrowRight" />Anterior: {steps[activeStep - 1].label}</button>}
        {activeStep < steps.length - 1 && <button type="button" disabled={(isMetadata && metadataAdjustmentsPending) || (cduDescriptionPending && activeStep >= 1)} onClick={() => isMetadata ? window.dispatchEvent(new Event("request-analysis:advance-metadata")) : navigateFromFooter(steps[activeStep + 1].id)}>
          <span>Continuar: {steps[activeStep + 1].label}{isMetadata && metadataAdjustmentsPending && <small>Envie o pedido de ajustes para continuar.</small>}{cduDescriptionPending && activeStep >= 1 && <small>Cadastre a descrição da CDU para continuar.</small>}</span><AppIcon name="arrowRight" />
        </button>}
      </div>
    </nav>}
    {!showDeclarations && keyboardHintTarget && createPortal(<AnalysisKeyboardHint step={active} />, keyboardHintTarget)}
    <AnalysisFieldHelp rootRef={helpRootRef} />
  </div>;
}
