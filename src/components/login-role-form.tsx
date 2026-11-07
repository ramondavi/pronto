"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { login, loginStaff } from "@/app/auth-actions";
import { AuthFeedback } from "@/components/auth-feedback";
import { InstitutionalEmailInput } from "@/components/institutional-email-input";
import { useInterfaceLanguage } from "@/components/interface-language";
import { uiText } from "@/lib/ui-text";
import { AppIcon } from "@/components/app-icon";

type LoginRole = "student" | "staff";

function LoginSubmitButton({ submitting, onPendingChange, label, pendingLabel }: { submitting: boolean; onPendingChange: (pending: boolean) => void; label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  useEffect(() => { onPendingChange(pending); }, [pending, onPendingChange]);
  return <button className="button button--primary button--full" type="submit" disabled={submitting || pending} aria-live="polite">{submitting || pending ? pendingLabel : label}</button>;
}

export function LoginRoleForm({ initialRole, error, message, next, otpEnabled }: {
  initialRole: LoginRole;
  error?: string;
  message?: string;
  next?: string;
  otpEnabled: boolean;
}) {
  const [role, setRole] = useState<LoginRole>(initialRole);
  const [submitting, setSubmitting] = useState(false);
  const submitted = useRef(false);
  const onPendingChange = useCallback((pending: boolean) => {
    if (!pending) { submitted.current = false; setSubmitting(false); }
  }, []);
  const { language } = useInterfaceLanguage();
  const t = (source: string) => uiText(language, source);

  return <>
    <div className="login-role-switch" role="group" aria-label={t("Tipo de acesso")}>
      <button type="button" disabled={submitting} aria-pressed={role === "student"} onClick={() => setRole("student")}><AppIcon name="person" />{t("Sou estudante")}</button>
      <button type="button" disabled={submitting} aria-pressed={role === "staff"} onClick={() => setRole("staff")}><AppIcon name="work" />{t("Sou da equipe da biblioteca")}</button>
    </div>
    <p className="auth-role-description">{t(role === "student" ? "Acesse suas solicitações com senha ou código por e-mail." : "Acesse as ferramentas de atendimento e administração com sua senha.")}</p>
    {role === initialRole && <AuthFeedback error={error} message={message} />}
    <form key={role} className="form-stack" action={role === "student" ? login : loginStaff} aria-busy={submitting} onSubmit={(event) => { if (submitted.current) { event.preventDefault(); return; } submitted.current = true; setSubmitting(true); }}>
      {role === "student" && next && <input type="hidden" name="next" value={next} />}
      <label>{t("E-mail institucional")}<InstitutionalEmailInput /></label>
      <label>{t("Senha")}<input type="password" name="password" autoComplete="current-password" placeholder={t("Sua senha")} required /></label>
      <div className="auth-form__help"><Link href="/recuperar-senha">{t("Esqueci minha senha")}</Link></div>
      <LoginSubmitButton submitting={submitting} onPendingChange={onPendingChange} label={t("Entrar")} pendingLabel={t("Entrando...")} />
    </form>
    {role === "student" && <>
      {otpEnabled && <p className="auth-card__footer">{t("Prefere entrar sem senha?")} <Link href={next ? `/entrar/codigo?next=${encodeURIComponent(next)}` : "/entrar/codigo"}>{t("Receber código por e-mail")}</Link></p>}
      <p className="auth-card__footer auth-card__footer--compact">{t("Ainda não tem conta?")} <Link href="/cadastro">{t("Criar conta")}</Link></p>
    </>}
  </>;
}
