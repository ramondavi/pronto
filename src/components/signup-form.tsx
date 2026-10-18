"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { signup, type SignupState } from "@/app/auth-actions";
import { isUfbaEmail, type SignupField } from "@/domain/auth/account";
import { PRIVACY_NOTICE_VERSION } from "@/domain/privacy/notice";
import { formatCpfInput } from "@/domain/students/cpf";
import { AuthFeedback } from "./auth-feedback";
import { PasswordRequirements } from "./password-requirements";
import { InstitutionalEmailInput } from "./institutional-email-input";
import { useInterfaceLanguage } from "@/components/interface-language";
import { uiText } from "@/lib/ui-text";

export function SignupForm() {
  const { language } = useInterfaceLanguage();
  const t = (source: string) => uiText(language, source);
  const [state, formAction, pending] = useActionState(signup, { errors: {}, formError: null } satisfies SignupState);
  const formRef = useRef<HTMLFormElement>(null);
  const [clearedErrors, setClearedErrors] = useState<Set<SignupField>>(new Set());
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [email, setEmail] = useState("");
  const [emailBlurred, setEmailBlurred] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const errorFor = (field: SignupField) => clearedErrors.has(field) ? undefined : state.errors[field];
  const clearError = (field: SignupField) => setClearedErrors((current) => new Set(current).add(field));
  const emailParts = email.trim().split("@");
  const typedDomain = emailParts[1];
  const invalidTypedDomain = emailParts.length > 2 || /\s/.test(email) || (typedDomain !== undefined && typedDomain.length > 0 && !"ufba.br".startsWith(typedDomain.toLowerCase()));
  const emailError = !isUfbaEmail(email) && (emailBlurred || invalidTypedDomain) ? "Use seu endereço institucional @ufba.br." : errorFor("email");

  useEffect(() => {
    if (Object.keys(state.errors).length > 0) formRef.current?.querySelector<HTMLInputElement>("[aria-invalid='true']")?.focus();
  }, [state]);

  return <>
    <AuthFeedback error={state.formError ?? undefined} />
    <form ref={formRef} className="form-stack auth-form" action={formAction} noValidate onSubmit={(event) => { if (!isUfbaEmail(email)) { event.preventDefault(); setEmailBlurred(true); formRef.current?.querySelector<HTMLInputElement>('input[name="email"]')?.focus(); return; } setClearedErrors(new Set()); }}>
      <h2 className="auth-form__section-title">Seus dados</h2>
      <label>{t("Nome completo")}<input name="name" autoComplete="name" value={name} onChange={(event) => { setName(event.target.value); clearError("name"); }} required aria-invalid={Boolean(errorFor("name"))} aria-describedby={errorFor("name") ? "signup-name-error" : undefined} />{errorFor("name") && <span id="signup-name-error" className="signup-field-error" role="alert">{t(errorFor("name")!)}</span>}</label>
      <div className="auth-form__pair"><label>CPF<input name="cpf" inputMode="numeric" autoComplete="off" placeholder="000.000.000-00" maxLength={14} value={cpf} onChange={(event) => { setCpf(formatCpfInput(event.target.value)); clearError("cpf"); }} required aria-invalid={Boolean(errorFor("cpf"))} aria-describedby={errorFor("cpf") ? "signup-cpf-error" : undefined} />{errorFor("cpf") && <span id="signup-cpf-error" className="signup-field-error" role="alert">{t(errorFor("cpf")!)}</span>}</label>
      <div className="signup-birth-field">
        <div className="field-label-with-tooltip">
          <label htmlFor="signup-birth-date">{t("Data de nascimento")}</label>
          <button className="tooltip" type="button" aria-label={t("Informações sobre o uso da data de nascimento")} aria-describedby="signup-birth-help">i<span id="signup-birth-help" role="tooltip">{t("A data completa fica salva na sua conta. O ano poderá ser utilizado na ficha catalográfica caso você autorize quando solicitá-la.")}</span></button>
        </div>
        <input id="signup-birth-date" type="date" name="birthDate" autoComplete="bday" min="1900-01-01" max={new Date().toISOString().slice(0, 10)} value={birthDate} onChange={(event) => { setBirthDate(event.target.value); clearError("birthDate"); }} required aria-invalid={Boolean(errorFor("birthDate"))} aria-describedby={errorFor("birthDate") ? "signup-birth-date-error" : undefined} />
        {errorFor("birthDate") && <span id="signup-birth-date-error" className="signup-field-error" role="alert">{t(errorFor("birthDate")!)}</span>}
      </div></div>
      <h2 className="auth-form__section-title">Acesso à conta</h2>
      <label>{t("E-mail institucional")}<InstitutionalEmailInput value={email} completeDomain={false} onBlur={() => setEmailBlurred(true)} onValueChange={(nextValue) => { setEmail(nextValue); clearError("email"); }} aria-invalid={Boolean(emailError)} aria-describedby={emailError ? "signup-email-error" : undefined} />{emailError && <span id="signup-email-error" className="signup-field-error" role="alert">{t(emailError)}</span>}</label>
      <PasswordRequirements errors={{ password: errorFor("password"), passwordConfirmation: errorFor("passwordConfirmation") }} onFieldChange={clearError} />
      <div><label className="check"><input type="checkbox" name="privacyAccepted" checked={privacyAccepted} onChange={(event) => { setPrivacyAccepted(event.target.checked); clearError("privacyAccepted"); }} required aria-invalid={Boolean(errorFor("privacyAccepted"))} aria-describedby={errorFor("privacyAccepted") ? "signup-privacy-error" : undefined} /> <span>{t("Li e estou ciente da")} <Link href="/politica-de-privacidade" target="_blank">{t("Política de Privacidade")} v{PRIVACY_NOTICE_VERSION}</Link>.</span></label>{errorFor("privacyAccepted") && <span id="signup-privacy-error" className="signup-field-error" role="alert">{t(errorFor("privacyAccepted")!)}</span>}</div>
      <button className="button button--primary button--full" type="submit" disabled={pending}>{t("Criar conta")}</button>
    </form>
  </>;
}
