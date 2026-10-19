"use client";

import { useActionState, useEffect, useState } from "react";
import { requestPasswordReset, type PasswordResetRequestState } from "@/app/auth-actions";
import { AppIcon } from "./app-icon";
import { AuthFeedback } from "./auth-feedback";
import { InstitutionalEmailInput } from "./institutional-email-input";
import { useInterfaceLanguage } from "./interface-language";
import { uiText } from "@/lib/ui-text";

const initialState: PasswordResetRequestState = { status: "idle", sentAt: 0, email: "", message: "" };
const cooldownSeconds = 90;
const storageKey = "pronto-password-recovery";

export function PasswordRecoveryForm() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, initialState);
  const [remaining, setRemaining] = useState(0);
  const [wasSent, setWasSent] = useState(false);
  const [email, setEmail] = useState("");
  const { language } = useInterfaceLanguage();

  useEffect(() => {
    const update = () => {
      try {
        const saved = JSON.parse(sessionStorage.getItem(storageKey) ?? "null") as { sentAt?: number; until?: number; email?: string } | null;
        if (state.status === "sent" && state.sentAt && saved?.sentAt !== state.sentAt) {
          const until = Date.now() + cooldownSeconds * 1000;
          sessionStorage.setItem(storageKey, JSON.stringify({ sentAt: state.sentAt, until, email: state.email }));
          setEmail(state.email);
          setWasSent(true);
          setRemaining(cooldownSeconds);
          return;
        }
        if (saved?.email) setEmail((current) => current || saved.email || "");
        setWasSent(Boolean(saved?.sentAt || state.sentAt));
        setRemaining(Math.max(0, Math.ceil(((saved?.until ?? 0) - Date.now()) / 1000)));
      } catch { setRemaining(0); }
    };
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [state.status, state.sentAt, state.email]);

  const counting = remaining > 0;
  const label = pending ? uiText(language, "Enviando…") : counting ? `${uiText(language, "Link enviado")} · ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}` : wasSent ? uiText(language, "Enviar novo link") : uiText(language, "Enviar link de recuperação");

  return <div className="auth-recovery-form">
    <form className="form-stack" action={formAction}>
      <label>{uiText(language, "E-mail institucional")}<InstitutionalEmailInput value={email} onValueChange={setEmail} /></label>
      <button className={`button button--primary button--full auth-recovery-form__button${counting ? " account-page__password-link-button--counting" : ""}`} type="submit" disabled={pending || counting} aria-live="polite"><span>{label}</span><AppIcon name={counting ? "check" : "arrowRight"} />{counting && <span className="account-page__password-link-progress" aria-hidden="true" style={{ width: `${remaining / cooldownSeconds * 100}%` }} />}</button>
    </form>
    {state.status === "error" && <AuthFeedback error={state.message} />}
    {counting && <p className="auth-field-hint" role="status">{state.status === "sent" ? uiText(language, state.message) : uiText(language, "Confira sua caixa de entrada e a pasta de spam.")}</p>}
  </div>;
}
