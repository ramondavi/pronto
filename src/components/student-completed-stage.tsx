import type { ReactNode } from "react";
import { AppIcon } from "@/components/app-icon";

export function StudentCompletedStage({ title, completedLabel, children }: { title: string; completedLabel: string; children: ReactNode }) {
  return <details className="student-completed-stage">
    <summary><span className="student-completed-stage__check"><AppIcon name="check" /></span><span><strong>{title}</strong><small>{completedLabel}</small></span><AppIcon className="student-completed-stage__chevron" name="arrowRight" /></summary>
    <div className="student-completed-stage__content">{children}</div>
  </details>;
}
