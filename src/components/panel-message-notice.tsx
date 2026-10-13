"use client";

import { useEffect } from "react";
import { showPanelChange, showPanelChangeError } from "@/components/panel-change-toast";
import { useInterfaceLanguage } from "@/components/interface-language";
import { uiText } from "@/lib/ui-text";

export function PanelMessageNotice({ message, error }: { message?: string; error?: string }) {
  const { language } = useInterfaceLanguage();
  const t = (source: string) => uiText(language, source);
  useEffect(() => { if (message) showPanelChange(uiText(language, message)); }, [message, language]);
  useEffect(() => { if (error) showPanelChangeError(uiText(language, "Alteração não salva"), uiText(language, "Confira os dados e tente novamente. Se continuar, atualize a página.")); }, [error, language]);
  return error ? <p className="auth-feedback auth-feedback--error" role="alert">{t(error)}</p> : null;
}
