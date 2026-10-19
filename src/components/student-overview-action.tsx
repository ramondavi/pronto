import type { ReactNode } from "react";
import { AppIcon, type AppIconName } from "@/components/app-icon";

type Props = {
  title: string;
  description: string;
  icon: AppIconName;
  label: string;
  stateLabel: string;
  needsAction: boolean;
  draft?: boolean;
  action: ReactNode;
  children?: ReactNode;
  note?: ReactNode;
  help?: ReactNode;
};

export function StudentOverviewAction({ title, description, icon, label, stateLabel, needsAction, draft = false, action, children, note, help }: Props) {
  return <section className={`next-action__focus${needsAction ? " next-action__focus--required" : ""}${draft ? " next-action__focus--draft" : ""}`} aria-label={label}>
    <div className="next-action__focus-main">
      <span className="next-action__focus-icon" aria-hidden="true"><AppIcon name={icon} /></span>
      <div className="next-action__focus-copy">
        <p className="eyebrow next-action__eyebrow">{label}</p>
        <h2>{title}</h2>
        <p className="next-action__focus-description" role="status">{description}</p>
      </div>
    </div>
    {children && <div className="next-action__focus-details">{children}</div>}
    <div className="next-action__focus-footer">
      <span className="next-action__focus-state"><AppIcon name={needsAction ? "arrowRight" : "clock"} />{stateLabel}</span>
      <div className="next-action__focus-action">{action}</div>
    </div>
    {note && <div className="next-action__focus-note"><AppIcon name="document" />{note}</div>}
    {help && <div className="next-action__focus-help">{help}</div>}
  </section>;
}
