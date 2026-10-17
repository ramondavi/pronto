"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { requestStudentCode, verifyStudentCode, type StudentCodeRequestState, type StudentCodeVerifyState } from "@/app/auth-actions";
import { InstitutionalEmailInput } from "./institutional-email-input";
import { AppIcon } from "./app-icon";

const initialRequest: StudentCodeRequestState = { status: "idle", email: "", message: "", sentAt: 0, error: "" };
const initialVerify: StudentCodeVerifyState = { error: "" };
const cooldownSeconds = 90;
const storageKey = "pronto-student-code";

export function StudentCodeForm() {
  const [request, sendCode, sending] = useActionState(requestStudentCode, initialRequest);
  const [verification, confirmCode, confirming] = useActionState(verifyStudentCode, initialVerify);
  const [remaining, setRemaining] = useState(0);
  const [savedEmail, setSavedEmail] = useState("");

  useEffect(() => {
    const update = () => {
      try {
        const saved = JSON.parse(sessionStorage.getItem(storageKey) ?? "null") as { sentAt?: number; until?: number; email?: string } | null;
        if (request.status === "sent" && request.sentAt && saved?.sentAt !== request.sentAt) {
          const until = Date.now() + cooldownSeconds * 1000;
          sessionStorage.setItem(storageKey, JSON.stringify({ sentAt: request.sentAt, until, email: request.email }));
          setSavedEmail(request.email);
          setRemaining(cooldownSeconds);
          return;
        }
        setSavedEmail(saved?.email ?? "");
        setRemaining(Math.max(0, Math.ceil(((saved?.until ?? 0) - Date.now()) / 1000)));
      } catch { setRemaining(0); }
    };
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [request.status, request.sentAt, request.email]);

  const activeEmail = request.status === "sent" ? request.email : savedEmail;
  const counting = remaining > 0;
  const sendLabel = sending ? "Enviando…" : counting ? `Código enviado · ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}` : "Enviar novo código";

  if (activeEmail) return <div className="auth-flow">
    <p className="auth-feedback" role="status"><AppIcon name="check" />{request.status === "sent" ? request.message : "Digite o código enviado ao seu e-mail institucional."}</p>
    <form className="form-stack auth-form" action={confirmCode}>
      <input type="hidden" name="email" value={activeEmail} />
      <label>Código recebido por e-mail<input className="auth-code-input" name="code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,8}" maxLength={8} required autoFocus placeholder="Digite o código" /></label>
      {verification.error && <p className="auth-feedback auth-feedback--error" role="alert">{verification.error}</p>}
      <button className="button button--primary button--full" type="submit" disabled={confirming}>{confirming ? "Conferindo…" : "Confirmar código"}</button>
    </form>
    <form className="auth-resend" action={sendCode}>
      <input type="hidden" name="email" value={activeEmail} />
      <p>Não recebeu o e-mail?</p>
      <button className={`button button--secondary button--full auth-code-resend__button${counting ? " account-page__password-link-button--counting" : ""}`} type="submit" disabled={sending || counting} aria-live="polite"><span>{sendLabel}</span><AppIcon name={counting ? "check" : "arrowRight"} />{counting && <span className="account-page__password-link-progress" aria-hidden="true" style={{ width: `${remaining / cooldownSeconds * 100}%` }} />}</button>
      {request.error && <p className="auth-feedback auth-feedback--error" role="alert">{request.error}</p>}
    </form>
    <div className="auth-flow__links">
      <button className="auth-flow__back" type="button" onClick={() => { sessionStorage.removeItem(storageKey); window.location.assign("/entrar/codigo"); }}><AppIcon name="undo" />Usar outro e-mail</button>
      <Link className="auth-flow__back" href="/entrar"><AppIcon name="undo" />Voltar ao login com senha</Link>
    </div>
  </div>;

  return <div className="auth-flow">
    <form className="form-stack auth-form" action={sendCode}>
      <label>E-mail institucional<InstitutionalEmailInput /></label>
      <p className="auth-field-hint">Use o e-mail da sua conta estudantil cadastrada.</p>
      {request.error && <p className="auth-feedback auth-feedback--error" role="alert">{request.error}</p>}
      <button className="button button--primary button--full" type="submit" disabled={sending}>{sending ? "Enviando…" : "Enviar código"}</button>
    </form>
    <Link className="auth-flow__back" href="/entrar"><AppIcon name="undo" />Voltar ao login com senha</Link>
  </div>;
}
