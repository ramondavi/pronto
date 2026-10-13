import type { AppIconName } from "@/components/app-icon";

export const requestStatusIcons: Record<string, AppIconName> = {
  submitted: "inbox",
  in_review: "review",
  changes_requested: "edit",
  approved: "shield",
  completed: "check",
  canceled: "close",
};

export function requestStatusKey(status: string, done: boolean) {
  return done ? "completed" : status in requestStatusIcons ? status : "submitted";
}
