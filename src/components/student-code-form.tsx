"use client";

import { useActionState } from "react";
import { requestStudentCode, verifyStudentCode, type StudentCodeRequestState, type StudentCodeVerifyState } from "@/app/auth-actions";
import { InstitutionalEmailInput } from "./institutional-email-input";

const initialRequest: StudentCodeRequestState = { status: "idle", email: "", message: "" };
const initialVerify: StudentCodeVerifyState = { error: "" };

export function StudentCodeForm() {
  const [request, sendCode, sending] = useActionState(requestStudentCode, initialRequest);
  const [verification, confirmCode, confirming] = useActionState(verifyStudentCode, initialVerify);

  if (request.status === "sent") return <>
    <p className="auth-feedback" role="status">{request.message}</p>
    <form className="form-stack" action={confirmCode}>
      <input type="hidden" name="email" value={request.email} />
      <label>Código de seis dígitos<input name="code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required autoFocus placeholder="000000" /></label>
      {verification.error && <p className="auth-feedback auth-feedback--error" role="alert">{verification.error}</p>}
      <button className="button button--primary button--full" type="submit" disabled={confirming}>{confirming ? "Conferindo…" : "Confirmar código"}</button>
    </form>
    <form className="form-stack" action={sendCode}>
      <input type="hidden" name="email" value={request.email} />
      <button className="button button--secondary button--full" type="submit" disabled={sending}>{sending ? "Enviando…" : "Enviar outro código"}</button>
    </form>
  </>;

  return <form className="form-stack" action={sendCode}>
    <label>E-mail institucional<InstitutionalEmailInput /></label>
    {request.message && <p className="auth-feedback auth-feedback--error" role="alert">{request.message}</p>}
    <button className="button button--primary button--full" type="submit" disabled={sending}>{sending ? "Enviando…" : "Enviar código"}</button>
  </form>;
}
