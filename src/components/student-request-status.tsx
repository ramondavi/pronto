import Link from "next/link";
import { AppIcon, type AppIconName } from "@/components/app-icon";
import type { ReactNode } from "react";

type Props = {
  label: string;
  eyebrow: string;
  title: string;
  description: string;
  icon: AppIconName;
  needsAction: boolean;
  submitted?: boolean;
  action?: { href: string; label: string };
  help?: { slug: string; title: string } | null;
  children?: ReactNode;
};

export function StudentRequestStatus({ label, eyebrow, title, description, icon, needsAction, submitted = false, action, help, children }: Props) {
  return <section className={`student-progress-panel${needsAction ? " student-progress-panel--action" : ""}${submitted ? " student-progress-panel--submitted" : ""}`} aria-label={label} aria-live="polite">
    <span className="student-progress-panel__icon" aria-hidden="true"><AppIcon name={icon} /></span>
    <div className="student-progress-panel__body">
      <div className="student-progress-panel__content"><p className="eyebrow">{eyebrow}</p><h2>{title}</h2><p>{description}</p>{children}</div>
      {(action || help) && <div className="student-progress-panel__footer">{action && <Link className={`button ${needsAction ? "button--primary" : "button--secondary"} button--small button--with-icon`} href={action.href}><AppIcon name="arrowRight" />{action.label}</Link>}{help && <Link className="student-progress-panel__help" href={`/ajuda/artigos/${help.slug}`} target="_blank" rel="noopener noreferrer"><AppIcon name="external" />{help.title}</Link>}</div>}
    </div>
  </section>;
}
