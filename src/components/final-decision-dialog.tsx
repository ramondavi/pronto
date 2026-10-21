"use client";
import { ModalCloseButton } from "./modal-close-button";
import { AppIcon } from "./app-icon";
import { useInterfaceLanguage } from "./interface-language";
import { uiText } from "@/lib/ui-text";

export function FinalDecisionDialog({ title, description, confirmLabel, confirmDanger = false, busy = false, onCancel, onConfirm }: { title: string; description: string; confirmLabel: string; confirmDanger?: boolean; busy?: boolean; onCancel: () => void; onConfirm: () => void }) {
  const { language } = useInterfaceLanguage();
  const t = (source: string) => uiText(language, source);
  return <div className="final-decision-dialog pronto-modal-overlay" role="alertdialog" aria-modal="true" aria-labelledby="final-decision-dialog-title" aria-describedby="final-decision-dialog-description"><div className={`final-decision-dialog__card pronto-modal-surface${confirmDanger ? " final-decision-dialog__card--danger" : ""}`}><ModalCloseButton onClick={onCancel} disabled={busy} label={t("Fechar janela")} /><div className="final-decision-dialog__heading"><span className="timeline-dialog__icon"><AppIcon name={confirmDanger ? "close" : "check"} /></span><div><p className="eyebrow">{t("Confirmação necessária")}</p><h2 id="final-decision-dialog-title">{title}</h2></div></div><p id="final-decision-dialog-description">{description}</p><div className="final-decision-dialog__actions"><button className="button button--secondary" type="button" disabled={busy} onClick={onCancel}>{t("Continuar revisando")}</button><button className={`button button--with-icon ${confirmDanger ? "button--danger" : "button--primary"}`} type="button" disabled={busy} onClick={onConfirm}><AppIcon name={confirmDanger ? "close" : "check"} />{busy ? t("Confirmando…") : confirmLabel}</button></div></div></div>;
}
