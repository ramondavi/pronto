"use client";

import { useActionState, useEffect, useState } from "react";
import { requestAuthenticatedPasswordChange, type PasswordLinkState } from "@/app/auth-actions";
import { AppIcon } from "@/components/app-icon";

type Labels = { send: string; sending: string; resend: string; sent: string; spam: string; error: string };
const initialState: PasswordLinkState = { status: "idle", sentAt: 0 };
const cooldownSeconds = 90;
const previewPasswordChange = async (_previousState: PasswordLinkState): Promise<PasswordLinkState> => ({ status: "sent", sentAt: Date.now() });

export function AccountPasswordLinkForm({ userId, email, labels, preview = false }: { userId: string; email: string; labels: Labels; preview?: boolean }) {
  const [state, formAction, pending] = useActionState(preview ? previewPasswordChange : requestAuthenticatedPasswordChange, initialState);
  const [remaining, setRemaining] = useState(0);
  const [wasSent, setWasSent] = useState(false);

  useEffect(() => {
    const key = `pronto-password-link:${userId}`;
    const update = () => {
      try {
        const saved = JSON.parse(sessionStorage.getItem(key) ?? "null") as { sentAt?: string; until?: number } | null;
        const sentAt = state.sentAt ? String(state.sentAt) : "";
        setWasSent(Boolean(sentAt || saved?.sentAt));
        if (sentAt && saved?.sentAt !== sentAt) {
          const until = Date.now() + cooldownSeconds * 1000;
          sessionStorage.setItem(key, JSON.stringify({ sentAt, until }));
          setRemaining(cooldownSeconds);
          return;
        }
        setRemaining(Math.max(0, Math.ceil(((saved?.until ?? 0) - Date.now()) / 1000)));
      } catch { setRemaining(0); }
    };
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [userId, state.sentAt]);

  const disabled = pending || remaining > 0;
  const label = pending ? labels.sending : remaining > 0 ? `${labels.sent} · ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}` : wasSent ? labels.resend : labels.send;
  return <div className="account-page__password-link">
    <form action={formAction}>
      <button className={`button button--secondary${remaining > 0 ? " account-page__password-link-button--counting" : ""}`} type="submit" disabled={disabled} aria-live="polite"><span>{label}</span><AppIcon name={remaining > 0 ? "check" : "arrowRight"} />{remaining > 0 && <span className="account-page__password-link-progress" aria-hidden="true" style={{ width: `${remaining / cooldownSeconds * 100}%` }} />}</button>
    </form>
    {remaining > 0 && <p className="account-page__password-link-hint">{labels.spam} <strong>{email}</strong>.</p>}
    {state.status === "error" && <p className="form-error" role="alert">{labels.error}</p>}
  </div>;
}
