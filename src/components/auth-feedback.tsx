"use client";

import { AppIcon } from "./app-icon";
import { useInterfaceLanguage } from "./interface-language";
import { uiText } from "@/lib/ui-text";

export function AuthFeedback({ error, message }: { error?: string; message?: string }) {
  const { language } = useInterfaceLanguage();
  if (!error && !message) return null;
  return <p className={`auth-feedback auth-feedback--${error ? "error" : "success"}`} role={error ? "alert" : "status"}><AppIcon name={error ? "close" : "check"} aria-hidden="true" /><span>{uiText(language, error ?? message ?? "")}</span></p>;
}
