import "server-only";
import { backupApi, backupExecutionEnabled, decodeBackupRuns, type BackupRun } from "./backup-control";
export function backupGithubHeaders():Record<string,string> {
 const token = process.env.VERCEL_ENV === "production" ? process.env.BACKUP_PANEL_GITHUB_TOKEN : undefined;
 const headers:Record<string,string>={Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28"};
 if(token)headers.Authorization=`Bearer ${token}`;
 return headers;
}
export function backupDispatchConfigured() { return backupExecutionEnabled(process.env.VERCEL_ENV, process.env.BACKUP_PANEL_DISPATCH_ENABLED, Boolean(process.env.BACKUP_PANEL_GITHUB_TOKEN)); }
export async function backupRuns(fresh=false):Promise<BackupRun[]> {
 const response = await fetch(`${backupApi}/runs?branch=master&per_page=8`,{headers:backupGithubHeaders(),signal:AbortSignal.timeout(8000),...(fresh?{cache:"no-store" as const}:{cache:"force-cache" as const,next:{revalidate:process.env.VERCEL_ENV === "production" && process.env.BACKUP_PANEL_GITHUB_TOKEN?10:60}})});
 if(!response.ok)throw new Error("provider_unavailable");
 return decodeBackupRuns(await response.json());
}
