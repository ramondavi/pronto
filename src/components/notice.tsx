import { AppIcon } from "@/components/app-icon";

type Announcement = { title: string; message: string; type: string };

export function Notice({ announcement, closed, date, copy = { label: "Situação do atendimento", normal: "Atendimento normal", average: "Prazo médio atual:", days: "3 dias úteis" } }: { announcement?: Announcement | null; closed?: { title: string; message: string; reason?: string } | null; date?: { value: string; label: string }; copy?: { label: string; normal: string; average: string; days: string } }) {
  const message = closed?.message ?? announcement?.message ?? `${copy.average} ${copy.days}`;
  return <aside className={`notice notice--status${closed ? " notice--status-closed" : ""}`} aria-label={copy.label} role="status"><div className="notice-status__meta"><span>{copy.label}</span>{date?.value && <time dateTime={date.value}><AppIcon name="calendar" />{date.label}</time>}</div><div className="notice-status__body"><span className="notice-status__icon" aria-hidden="true"><AppIcon name={closed ? "lock" : announcement ? "calendar" : "check"} /></span><div className="notice-status__heading"><strong>{closed?.title ?? announcement?.title ?? copy.normal}</strong>{closed?.reason && <span className="notice-status__reason">{closed.reason}</span>}</div></div>{message && <p className="notice-status__message">{message}</p>}</aside>;
}
