"use client";

import { AppIcon } from "@/components/app-icon";
import { useInterfaceLanguage } from "@/components/interface-language";
import { uiText } from "@/lib/ui-text";

export function PriorityBadge({ reason, label = "Prioritário", requestId }: { reason?: string | null; label?: string; requestId?: string }) {
  const { language } = useInterfaceLanguage();
  const t = (source: string) => uiText(language, source);
  const content = <><AppIcon name="star" /> {t(label)}</>;
  if (requestId) return <button className="priority-badge priority-badge--interactive" type="button" title={t("Editar ou retirar prioridade")} aria-haspopup="dialog" onClick={() => window.dispatchEvent(new CustomEvent("request-priority:open", { detail: { requestId } }))}>{content}</button>;
  return <span className="priority-badge" title={reason ? `${t("Prioritário")}: ${reason}` : t("Solicitação prioritária")}>{content}</span>;
}
