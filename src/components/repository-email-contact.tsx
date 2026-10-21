"use client";

import { useState } from "react";
import { AppIcon } from "@/components/app-icon";
import { useInterfaceLanguage } from "@/components/interface-language";
import { uiText } from "@/lib/ui-text";

export function RepositoryEmailContact({ label }: { label: string }) {
  const { language } = useInterfaceLanguage();
  const [status, setStatus] = useState<"" | "copied" | "error">("");
  const t = (text: string) => uiText(language, text);
  async function copyEmail() {
    setStatus("");
    try { await navigator.clipboard.writeText("repositorio@ufba.br"); setStatus("copied"); }
    catch { setStatus("error"); }
  }
  return <div className="repository-email-contact"><span>{label}</span><div className="repository-email-contact__row"><a href="mailto:repositorio@ufba.br"><AppIcon name="message" /><strong>repositorio@ufba.br</strong></a><button type="button" className="button button--secondary button--small repository-email-contact__copy" onClick={() => void copyEmail()} aria-label={t(status === "copied" ? "E-mail do RI copiado" : "Copiar e-mail do RI")} title={t(status === "copied" ? "Copiado" : "Copiar e-mail")}><AppIcon name={status === "copied" ? "check" : "copy"} /></button></div><span className={status === "error" ? "form-error" : "sr-only"} role="status">{t(status === "copied" ? "E-mail copiado." : status === "error" ? "Não foi possível copiar. Tente novamente." : "")}</span></div>;
}
