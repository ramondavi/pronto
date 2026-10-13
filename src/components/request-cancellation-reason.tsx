import { AppIcon } from "@/components/app-icon";

export function RequestCancellationReason({ reason, compact = false }: { reason: string | null; compact?: boolean }) {
  const reasons = reason?.split("; ").map((item) => item.trim()).filter(Boolean) ?? [];

  return <aside className={`request-cancellation-reason${compact ? " request-cancellation-reason--compact" : ""}`} aria-label="Motivo do cancelamento">
    <AppIcon name="close" />
    <div>
      <strong>Motivo do cancelamento</strong>
      {reasons.length > 0 ? <><p>{reasons.length === 1 ? "Declaração não cumprida:" : "Declarações não cumpridas:"}</p><ul>{reasons.map((item) => <li key={item}>{item}</li>)}</ul></> : <p>O motivo não foi registrado neste protocolo.</p>}
    </div>
  </aside>;
}
