import { AppIcon } from "@/components/app-icon";

export function ServiceStatusBanner({ title, date, reason, message, closingLabel, closed, className = "" }: {
  title: string;
  date: { value: string; label: string };
  reason?: string | null;
  message?: string | null;
  closingLabel?: string;
  closed: boolean;
  className?: string;
}) {
  return <div className={`service-status-banner${closed ? " service-status-banner--closed" : ""} ${className}`} role="status">
    <span className="service-status-banner__icon" aria-hidden="true"><AppIcon name={closed ? "lock" : reason || message ? "calendar" : "check"} /></span>
    <div className="service-status-banner__main"><strong>{title}</strong>{!closed && closingLabel && <small className="service-status-banner__closing">{closingLabel}</small>}{reason && <span>{reason}</span>}</div>
    {message && <p>{message}</p>}
    <time dateTime={date.value}><AppIcon name="calendar" aria-hidden="true" />{date.label}</time>
  </div>;
}
