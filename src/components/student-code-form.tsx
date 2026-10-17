"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestStudentCode, verifyStudentCode, type StudentCodeRequestState, type StudentCodeVerifyState } from "@/app/auth-actions";
import { InstitutionalEmailInput } from "./institutional-email-input";
import { AppIcon } from "./app-icon";

const initialRequest: StudentCodeRequestState = { status: "idle", email: "", message: "" };
const initialVerify: StudentCodeVerifyState = { error: "" };

export function StudentCodeForm() {
  const [request, sendCode, sending] = useActionState(requestStudentCode, initialRequest);
  const [verification, confirmCode, confirming] = useActionState(verifyStudentCode, initialVerify);

  if (request.status === "sent") return <div className="auth-flow">
    <p className="auth-feedback" role="status"><AppIcon name="check" />{request.message}</p>
    <form className="form-stack auth-form" action={confirmCode}>
      <input type="hidden" name="email" value={request.email} />
      <label>Código recebido por e-mail<input className="auth-code-input" name="code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,8}" maxLength={8} required autoFocus placeholder="Digite o código" /></label>
      {verification.error && <p className="auth-feedback auth-feedback--error" role="alert">{verification.error}</p>}
      <button className="button button--primary button--full" type="submit" disabled={confirming}>{confirming ? "Conferindo…" : "Confirmar código"}</button>
    </form>
    <form className="auth-resend" action={sendCode}>
      <input type="hidden" name="email" value={request.email} />
      <p>Não recebeu o e-mail?</p>
      <button className="button button--secondary button--full" type="submit" disabled={sending}>{sending ? "Enviando…" : "Enviar novo código"}</button>
    </form>
    <Link className="auth-flow__back" href="/entrar"><AppIcon name="undo" />Voltar ao login com senha</Link>
  </div>;

  return <div className="auth-flow">
    <form className="form-stack auth-form" action={sendCode}>
      <label>E-mail institucional<InstitutionalEmailInput /></label>
      <p className="auth-field-hint">Use o e-mail da sua conta estudantil cadastrada.</p>
      {request.message && <p className="auth-feedback auth-feedback--error" role="alert">{request.message}</p>}
      <button className="button button--primary button--full" type="submit" disabled={sending}>{sending ? "Enviando…" : "Enviar código"}</button>
    </form>
    <Link className="auth-flow__back" href="/entrar"><AppIcon name="undo" />Voltar ao login com senha</Link>
  </div>;
}
