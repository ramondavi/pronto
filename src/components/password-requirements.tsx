"use client";

import { useId, useState } from "react";
import { passwordRequirements } from "@/domain/auth/password";
import { AppIcon } from "./app-icon";
import { useInterfaceLanguage } from "./interface-language";
import { uiText } from "@/lib/ui-text";

export function PasswordRequirements({ confirmationLabel = "Confirmar senha", passwordLabel = "Senha", errors, onFieldChange }: { confirmationLabel?: string; passwordLabel?: string; errors?: { password?: string; passwordConfirmation?: string }; onFieldChange?: (field: "password" | "passwordConfirmation") => void }) {
  const { language } = useInterfaceLanguage();
  const t = (source: string) => uiText(language, source);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const id = useId();
  const requirements = passwordRequirements(password);
  const matches = confirmation.length > 0 && password === confirmation;

  return <div className="password-fields">
    <div className="form-row">
      <div className="password-field"><label htmlFor={`${id}-password`}>{t(passwordLabel)}</label><div className="password-input-wrap"><input id={`${id}-password`} type={showPassword ? "text" : "password"} name="password" minLength={8} autoComplete="new-password" value={password} onChange={(event) => { setPassword(event.target.value); onFieldChange?.("password"); }} required aria-invalid={Boolean(errors?.password)} aria-describedby={`password-requirements${errors?.password ? ` ${id}-password-error` : ""}`} /><button type="button" aria-label={t(showPassword ? "Ocultar senha" : "Mostrar senha")} aria-pressed={showPassword} onClick={() => setShowPassword((value) => !value)}><AppIcon name={showPassword ? "eyeOff" : "eye"} /></button></div>{errors?.password && <span id={`${id}-password-error`} className="signup-field-error" role="alert">{t(errors.password)}</span>}</div>
      <div className="password-field"><label htmlFor={`${id}-confirmation`}>{t(confirmationLabel)}</label><div className="password-input-wrap"><input id={`${id}-confirmation`} type={showConfirmation ? "text" : "password"} name="passwordConfirmation" minLength={8} autoComplete="new-password" value={confirmation} onChange={(event) => { setConfirmation(event.target.value); onFieldChange?.("passwordConfirmation"); }} required aria-invalid={Boolean(errors?.passwordConfirmation)} aria-describedby={`password-requirements${errors?.passwordConfirmation ? ` ${id}-confirmation-error` : ""}`} /><button type="button" aria-label={t(showConfirmation ? "Ocultar confirmação de senha" : "Mostrar confirmação de senha")} aria-pressed={showConfirmation} onClick={() => setShowConfirmation((value) => !value)}><AppIcon name={showConfirmation ? "eyeOff" : "eye"} /></button></div>{errors?.passwordConfirmation && <span id={`${id}-confirmation-error`} className="signup-field-error" role="alert">{t(errors.passwordConfirmation)}</span>}</div>
    </div>
    <div className="password-requirements" id="password-requirements" aria-label={t("Requisitos da senha")}><strong>{t("Confira sua senha")}</strong><p className={requirements.minLength ? "is-met" : ""}><span aria-hidden="true">{requirements.minLength ? "✓" : "○"}</span> {t("Pelo menos 8 caracteres")}</p><p className={requirements.uppercase ? "is-met" : ""}><span aria-hidden="true">{requirements.uppercase ? "✓" : "○"}</span> {t("Pelo menos uma letra maiúscula")}</p><p className={requirements.number ? "is-met" : ""}><span aria-hidden="true">{requirements.number ? "✓" : "○"}</span> {t("Pelo menos um número")}</p><p className={requirements.special ? "is-met" : ""}><span aria-hidden="true">{requirements.special ? "✓" : "○"}</span> {t("Pelo menos um caractere especial (ex.: !, @, #)")}</p><p className={matches ? "is-met" : ""}><span aria-hidden="true">{matches ? "✓" : "○"}</span> {t("As senhas coincidem")}</p></div>
  </div>;
}
