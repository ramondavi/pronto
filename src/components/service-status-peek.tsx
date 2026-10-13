import { AppIcon } from "@/components/app-icon";

export function ServiceStatusPeek({ title, date, reason, message, closed, hint, detailsLabel, className = "" }: {
  title: string;
  date: { value: string; label: string };
  reason?: string | null;
  message?: string | null;
  closed: boolean;
  hint: string;
  detailsLabel: string;
  className?: string;
}) {
  return <div className={`service-status-peek${closed ? " service-status-peek--closed" : ""} ${className}`}>
    <div className="service-status-peek__trigger" role="group" tabIndex={0} aria-label={`${title}. ${detailsLabel}`}><span className="service-status-peek__icon" aria-hidden="true"><AppIcon name={closed ? "lock" : reason || message ? "calendar" : "check"} /></span><span className="service-status-peek__copy"><strong>{title}</strong><small>{hint}</small></span></div>
    <div className="service-status-peek__panel"><time dateTime={date.value}><AppIcon name="calendar" />{date.label}</time>{reason && <strong>{reason}</strong>}{message && <p>{message}</p>}</div>
  </div>;
}
