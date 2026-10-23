"use client";

import { useEffect, useRef } from "react";
import { restorePasswordRecovery } from "@/app/auth-actions";
import { useInterfaceLanguage } from "@/components/interface-language";
import { uiText } from "@/lib/ui-text";

const invalidLink = "/recuperar-senha?error=O%20link%20n%C3%A3o%20est%C3%A1%20mais%20v%C3%A1lido.%20Solicite%20um%20novo%20link.";

export function RecoverySession() {
  const { language } = useInterfaceLanguage();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = fragment.get("access_token");
    const refreshToken = fragment.get("refresh_token");
    const type = fragment.get("type");
    window.history.replaceState(null, "", window.location.pathname);

    if (type !== "recovery" || !accessToken || !refreshToken) {
      window.location.replace(invalidLink);
      return;
    }

    void restorePasswordRecovery(accessToken, refreshToken)
      .then((valid) => window.location.replace(valid ? "/redefinir-senha" : invalidLink))
      .catch(() => window.location.replace(invalidLink));
  }, []);

  return <p role="status">{uiText(language, "Verificando o link…")}</p>;
}
