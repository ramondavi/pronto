/** Shared policy and parsers; no credentials, I/O or platform configuration. */
export const backupApi = "https://api.github.com/repos/ramondavi/pronto/actions/workflows/backup.yml";
export type BackupRun = { id: number; createdAt: string; status: string; conclusion: string | null; event: string };
export type DispatchOutcome = "accepted" | "rejected" | "unknown";
const runStates = new Set(["queued", "in_progress", "waiting", "requested", "pending", "completed"]);

export function decodeBackupRuns(value: unknown): BackupRun[] {
 if (!value || typeof value !== "object" || !("workflow_runs" in value) || !Array.isArray(value.workflow_runs)) throw new Error("provider_response");
 return value.workflow_runs.map((entry: unknown) => {
  if (!entry || typeof entry !== "object") throw new Error("provider_response");
  const row = entry as Record<string, unknown>;
  if (typeof row.id !== "number" || !Number.isSafeInteger(row.id) || row.id <= 0 || typeof row.created_at !== "string" || !Number.isFinite(Date.parse(row.created_at)) || typeof row.status !== "string" || !runStates.has(row.status) || typeof row.event !== "string" || row.event.length > 80) throw new Error("provider_response");
  return { id: row.id, createdAt: row.created_at, status: row.status, conclusion: typeof row.conclusion === "string" ? row.conclusion : null, event: row.event };
 });
}
export function parseBackupDispatch(text: string): string | null {
 if (text.length > 256) return null;
 try {
  const body: unknown = JSON.parse(text);
  if (!body || typeof body !== "object" || Object.keys(body).length !== 2 || !("requestId" in body) || typeof body.requestId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.requestId) || !("confirmed" in body) || body.confirmed !== true) return null;
  return body.requestId;
 } catch { return null; }
}
export function sameOriginBackupRequest(request: Request): boolean {
 return request.headers.get("origin") === new URL(request.url).origin && request.headers.get("sec-fetch-site") !== "cross-site" && request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() === "application/json";
}
export function backupExecutionEnabled(environment: string | undefined, enabled: string | undefined, tokenPresent: boolean): boolean {
 return environment === "production" && enabled === "true" && tokenPresent;
}
export function backupPollingDelay(active: boolean, failures: number): number {
 return failures > 0 ? Math.min(300000, 60000 * 2 ** Math.min(failures - 1, 3)) : active ? 15000 : 60000;
}
export async function dispatchApprovedBackup(headers: Record<string, string>, transport: typeof fetch = fetch): Promise<DispatchOutcome> {
 try {
  const response = await transport(`${backupApi}/dispatches`, {
   method: "POST", headers: { ...headers, "Content-Type": "application/json" },
   body: JSON.stringify({ ref: "master", inputs: { first_copy: false } }),
   signal: AbortSignal.timeout(12000), cache: "no-store", redirect: "error",
  });
  return response.ok ? "accepted" : response.status >= 400 && response.status < 500 ? "rejected" : "unknown";
 } catch { return "unknown"; }
}
