"use client";

import { useState } from "react";
import { AppIcon } from "@/components/app-icon";
import { useInterfaceLanguage } from "@/components/interface-language";
import { uiText } from "@/lib/ui-text";

export function ProtocolCopyButton({ protocol, showLabel = true, badge = false }: { protocol: string; showLabel?: boolean; badge?: boolean }) {
  const { language } = useInterfaceLanguage();
  const t = (source: string, values?: Record<string, string | number>) => uiText(language, source, values);
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(protocol);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2_000);
  }
  return <button className={`protocol-copy-button${badge ? " queue-item__protocol analysis-case-header__protocol coordination-page__protocol" : ""}${copied ? " is-copied" : ""}`} type="button" onClick={copy} title={t("Copiar número do protocolo")} aria-label={copied ? t("Protocolo copiado") : t("Copiar protocolo {protocol}", { protocol })}>{badge && <><AppIcon name="document" /><span className="coordination-page__protocol-label">{t("Protocolo")}</span></>}{copied ? t("Protocolo copiado") : showLabel ? t("Protocolo {protocol}", { protocol }) : protocol}</button>;
}
