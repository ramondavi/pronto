"use client";

import { AppIcon } from "@/components/app-icon";
import { RequestPriorityControl } from "@/components/request-priority-control";
import { RequestTimelineDialog, type TimelineEvent } from "@/components/request-timeline";

export function RequestActionsMenu({ requestId, events, canManagePriority, priorityReasonCode, priorityReasonDetail }: {
  requestId: string;
  events: TimelineEvent[];
  canManagePriority: boolean;
  priorityReasonCode: string | null;
  priorityReasonDetail: string | null;
}) {
  return <details className="request-actions-menu" onKeyDown={(event) => { if (event.key === "Escape") { event.currentTarget.open = false; event.currentTarget.querySelector("summary")?.focus(); } }}>
    <summary><AppIcon name="settings" />Ações</summary>
    <div className="request-actions-menu__panel">
      <RequestTimelineDialog events={events} />
      {canManagePriority && <RequestPriorityControl requestId={requestId} initialReasonCode={priorityReasonCode} initialReasonDetail={priorityReasonDetail} compact />}
    </div>
  </details>;
}
