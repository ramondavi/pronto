"use client";

import Link from "next/link";
import { useState } from "react";
import { login, loginStaff } from "@/app/auth-actions";
import { AuthFeedback } from "@/components/auth-feedback";
import { InstitutionalEmailInput } from "@/components/institutional-email-input";
import { useInterfaceLanguage } from "@/components/interface-language";
import { uiText } from "@/lib/ui-text";

type LoginRole = "student" | "staff";

export function LoginRoleForm({ initialRole, error, message, next, otpEnabled }: {
  initialRole: LoginRole;
  error?: string;
  message?: string;
  next?: string;
  otpEnabled: boolean;
}) {
  const [role, setRole] = useState<LoginRole>(initialRole);
  const { language } = useInterfaceLanguage();
  const t = (source: string) => uiText(language, source);

  return <>
    <div className="login-role-switch" role="group" aria-label="Tipo de acesso">
      <button type="button" aria-pressed={role === "student"} onClick={() => setRole("student")}>Sou estudante</button>
      <button type="button" aria-pressed={role === "staff"} onClick={() => setRole("staff")}>Sou da equipe da biblioteca</button>
    </div>
    {role === initialRole && <AuthFeedback error={error} message={message} />}
    <form key={role} className="form-stack" action={role === "student" ? login : loginStaff}>
      {role === "student" && next === "/painel/solicitacao/corrigir" && <input type="hidden" name="next" value={next} />}
      <label>{t("E-mail institucional")}<InstitutionalEmailInput /></label>
      <label>{t("Senha")}<input type="password" name="password" autoComplete="current-password" placeholder={t("Sua senha")} required /></label>
      <div className="form-row form-row--between">
        {role === "student" ? <label className="check"><input type="checkbox" /> <span>{t("Lembrar de mim")}</span></label> : <span />}
        <Link href="/recuperar-senha">{t("Esqueci minha senha")}</Link>
      </div>
      <button className="button button--primary button--full" type="submit">{t("Entrar")}</button>
    </form>
    {role === "student" && <>
      {otpEnabled && <p className="auth-card__footer">Prefere entrar sem senha? <Link href="/entrar/codigo">Receber código por e-mail</Link></p>}
      <p className="auth-card__footer">{t("Ainda não tem conta?")} <Link href="/cadastro">{t("Criar conta")}</Link></p>
    </>}
  </>;
}
