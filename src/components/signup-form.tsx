"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { signup, type SignupState } from "@/app/auth-actions";
import { type SignupField } from "@/domain/auth/account";
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
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const errorFor = (field: SignupField) => clearedErrors.has(field) ? undefined : state.errors[field];
  const clearError = (field: SignupField) => setClearedErrors((current) => new Set(current).add(field));

  useEffect(() => {
    if (Object.keys(state.errors).length > 0) formRef.current?.querySelector<HTMLInputElement>("[aria-invalid='true']")?.focus();
  }, [state]);

  return <>
    <AuthFeedback error={state.formError ?? undefined} />
    <form ref={formRef} className="form-stack" action={formAction} noValidate onSubmit={() => setClearedErrors(new Set())}>
      <label>{t("Nome completo")}<input name="name" autoComplete="name" value={name} onChange={(event) => { setName(event.target.value); clearError("name"); }} required aria-invalid={Boolean(errorFor("name"))} aria-describedby={errorFor("name") ? "signup-name-error" : undefined} />{errorFor("name") && <span id="signup-name-error" className="signup-field-error" role="alert">{t(errorFor("name")!)}</span>}</label>
      <label>CPF<input name="cpf" inputMode="numeric" autoComplete="off" placeholder="000.000.000-00" maxLength={14} value={cpf} onChange={(event) => { setCpf(formatCpfInput(event.target.value)); clearError("cpf"); }} required aria-invalid={Boolean(errorFor("cpf"))} aria-describedby={errorFor("cpf") ? "signup-cpf-error" : undefined} />{errorFor("cpf") && <span id="signup-cpf-error" className="signup-field-error" role="alert">{t(errorFor("cpf")!)}</span>}</label>
      <div className="signup-birth-field">
        <div className="field-label-with-tooltip">
          <label htmlFor="signup-birth-date">{t("Data de nascimento")}</label>
          <button className="tooltip" type="button" aria-label={t("Informações sobre o uso da data de nascimento")} aria-describedby="signup-birth-help">i<span id="signup-birth-help" role="tooltip">{t("A data completa fica salva na sua conta. O ano poderá ser utilizado na ficha catalográfica caso você autorize quando solicitá-la.")}</span></button>
        </div>
        <input id="signup-birth-date" type="date" name="birthDate" autoComplete="bday" min="1900-01-01" max={new Date().toISOString().slice(0, 10)} value={birthDate} onChange={(event) => { setBirthDate(event.target.value); clearError("birthDate"); }} required aria-invalid={Boolean(errorFor("birthDate"))} aria-describedby={errorFor("birthDate") ? "signup-birth-date-error" : undefined} />
        {errorFor("birthDate") && <span id="signup-birth-date-error" className="signup-field-error" role="alert">{t(errorFor("birthDate")!)}</span>}
      </div>
      <label>{t("E-mail institucional")}<InstitutionalEmailInput value={email} onValueChange={(nextValue) => { setEmail(nextValue); clearError("email"); }} aria-invalid={Boolean(errorFor("email"))} aria-describedby={errorFor("email") ? "signup-email-error" : undefined} />{errorFor("email") && <span id="signup-email-error" className="signup-field-error" role="alert">{t(errorFor("email")!)}</span>}</label>
      <PasswordRequirements errors={{ password: errorFor("password"), passwordConfirmation: errorFor("passwordConfirmation") }} onFieldChange={clearError} />
      <div><label className="check"><input type="checkbox" name="privacyAccepted" checked={privacyAccepted} onChange={(event) => { setPrivacyAccepted(event.target.checked); clearError("privacyAccepted"); }} required aria-invalid={Boolean(errorFor("privacyAccepted"))} aria-describedby={errorFor("privacyAccepted") ? "signup-privacy-error" : undefined} /> <span>{t("Li e estou ciente da")} <Link href="/politica-de-privacidade" target="_blank">{t("Política de Privacidade")} v{PRIVACY_NOTICE_VERSION}</Link>.</span></label>{errorFor("privacyAccepted") && <span id="signup-privacy-error" className="signup-field-error" role="alert">{t(errorFor("privacyAccepted")!)}</span>}</div>
      <button className="button button--primary button--full" type="submit" disabled={pending}>{t("Criar conta")}</button>
    </form>
  </>;
}
