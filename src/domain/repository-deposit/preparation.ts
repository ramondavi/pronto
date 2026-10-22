export type AccessPreparation = {
  route: "" | "ready" | "account" | "none" | "wrong";
  account: "" | "has" | "create" | "confirmed";
  request: "" | "sent" | "compose" | "correction";
  requestSent: boolean;
  release: "" | "granted" | "waiting" | "wrong";
  final: "" | "confirmed" | "waiting";
  requestPhase: "choice" | "compose" | "verify";
  expanded: number[];
  accountWaitStartedAt: number | null;
  accountAwaitingConfirmation: boolean;
};
export const emptyAccessPreparation: AccessPreparation = { route: "", account: "", request: "", requestSent: false, release: "", final: "", requestPhase: "choice", expanded: [0], accountWaitStartedAt: null, accountAwaitingConfirmation: false };
export function accessStages(state: AccessPreparation) {
  const accountReady = state.route === "account" || state.route === "wrong" || (state.route === "none" && ["has", "confirmed"].includes(state.account));
  return [true, state.route === "none", accountReady, accountReady && state.requestSent && state.release === "granted"];
}
export function accessReady(state: AccessPreparation) {
  return state.route === "ready" || (accessStages(state)[3] && state.final === "confirmed");
}
export function restoreAccessPreparation(value: unknown): AccessPreparation {
  if (!value || typeof value !== "object") return { ...emptyAccessPreparation };
  const input = value as Record<string, unknown>;
  const pick = <T extends string>(key: string, values: readonly T[], fallback: T): T => values.includes(input[key] as T) ? input[key] as T : fallback;
  return { accountAwaitingConfirmation: input.accountAwaitingConfirmation === true, accountWaitStartedAt: typeof input.accountWaitStartedAt === "number" && Number.isFinite(input.accountWaitStartedAt) && input.accountWaitStartedAt > 0 ? input.accountWaitStartedAt : null, route: pick("route", ["", "ready", "account", "none", "wrong"], ""), account: pick("account", ["", "has", "create", "confirmed"], ""), request: pick("request", ["", "sent", "compose", "correction"], ""), requestSent: input.requestSent === true, release: pick("release", ["", "granted", "waiting", "wrong"], ""), final: pick("final", ["", "confirmed", "waiting"], ""), requestPhase: pick("requestPhase", ["choice", "compose", "verify"], "choice"), expanded: Array.isArray(input.expanded) ? input.expanded.filter((step): step is number => Number.isInteger(step) && Number(step) >= 0 && Number(step) <= 3) : [0] };
}
