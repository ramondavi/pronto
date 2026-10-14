"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { acknowledgePrivacyNotice, type PrivacyAcknowledgementState } from "@/app/auth-actions";
import { PRIVACY_NOTICE_VERSION } from "@/domain/privacy/notice";
import { PrivacyNoticeContent } from "./privacy-notice-content";
import { AppIcon } from "./app-icon";
import { useInterfaceLanguage } from "./interface-language";
import { uiText } from "@/lib/ui-text";

const initialState: PrivacyAcknowledgementState = {};

export function PrivacyAcknowledgement() {
  const { language } = useInterfaceLanguage();
  const t = (source: string) => uiText(language, source);
  const [state, action, pending] = useActionState(acknowledgePrivacyNotice, initialState);
  const [readToEnd, setReadToEnd] = useState(false);
  const [scrollEdges, setScrollEdges] = useState({ top: true, bottom: false });
  const dialogRef = useRef<HTMLDialogElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    const policy = textRef.current;
    if (!policy) return;
    const checkEnd = () => {
      const atBottom = policy.scrollTop + policy.clientHeight >= policy.scrollHeight - 2;
      setScrollEdges({ top: policy.scrollTop <= 2, bottom: atBottom });
    };
    const observer = new ResizeObserver(checkEnd);
    observer.observe(policy);
    if (policy.firstElementChild) observer.observe(policy.firstElementChild);
    checkEnd();
    return () => { observer.disconnect(); if (dialog?.open) dialog.close(); };
  }, []);

  useEffect(() => {
    if (state.success) window.location.replace(window.location.pathname + window.location.search);
  }, [state.success]);

  return <dialog ref={dialogRef} className="privacy-dialog pronto-modal" aria-labelledby="privacy-dialog-title" aria-describedby="privacy-dialog-description" onCancel={(event) => event.preventDefault()}>
    <div className="privacy-dialog__header"><span className="privacy-dialog__icon" aria-hidden="true"><AppIcon name="shield" /></span><div><p className="eyebrow">{t("Antes de continuar · versão")} {PRIVACY_NOTICE_VERSION}</p><h1 id="privacy-dialog-title">{t("Política de privacidade")}</h1><p id="privacy-dialog-description">{t("Leia o texto até o final para liberar o registro de ciência e acessar o painel.")}</p></div></div>
    <div className="privacy-dialog__scroll" data-at-top={scrollEdges.top} data-at-bottom={scrollEdges.bottom}><div ref={textRef} className="privacy-dialog__text" tabIndex={0} onScroll={(event) => { const policy = event.currentTarget; const atBottom = policy.scrollTop + policy.clientHeight >= policy.scrollHeight - 2; setScrollEdges({ top: policy.scrollTop <= 2, bottom: atBottom }); if (policy.scrollTop > 8 && atBottom) setReadToEnd(true); }} aria-label={t("Texto integral da política de privacidade")}><PrivacyNoticeContent compact /></div></div>
    <div className="privacy-dialog__footer"><form action={action}><button className="button button--primary privacy-dialog__submit" type="submit" disabled={!readToEnd || pending}><AppIcon name={readToEnd ? "check" : "lock"} /><span>{pending ? t("Registrando...") : t("Li e estou ciente")}{!readToEnd && <small>{t("Role o texto até o final para continuar.")}</small>}</span></button></form>{state.error && <p className="auth-feedback auth-feedback--error" role="alert">{t(state.error)}</p>}</div>
  </dialog>;
}
