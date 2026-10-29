import "server-only";
export const backupApi = "https://api.github.com/repos/ramondavi/pronto/actions/workflows/backup.yml";
export type BackupRun = { id:number; createdAt:string; status:string; conclusion:string|null; event:string };
export function backupGithubHeaders():Record<string,string> {
 const token = process.env.VERCEL_ENV === "production" ? process.env.BACKUP_PANEL_GITHUB_TOKEN : undefined;
 const headers:Record<string,string>={Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28"};
 if(token)headers.Authorization=`Bearer ${token}`;
 return headers;
}
export function backupDispatchConfigured() { return process.env.VERCEL_ENV === "production" && process.env.BACKUP_PANEL_DISPATCH_ENABLED === "true" && Boolean(process.env.BACKUP_PANEL_GITHUB_TOKEN); }
export async function backupRuns(fresh=false):Promise<BackupRun[]> {
 const response = await fetch(`${backupApi}/runs?branch=master&per_page=8`,{headers:backupGithubHeaders(),signal:AbortSignal.timeout(8000),...(fresh?{cache:"no-store" as const}:{cache:"force-cache" as const,next:{revalidate:process.env.VERCEL_ENV === "production" && process.env.BACKUP_PANEL_GITHUB_TOKEN?10:60}})});
 if(!response.ok)throw new Error("provider_unavailable");
 const body:unknown=await response.json();
 if(!body || typeof body!=="object" || !("workflow_runs" in body) || !Array.isArray(body.workflow_runs))throw new Error("provider_response");
 return body.workflow_runs.flatMap((entry:unknown)=>{
  if(!entry || typeof entry!=="object")return [];
  const row=entry as Record<string,unknown>;
  if(typeof row.id!=="number" || !Number.isSafeInteger(row.id) || row.id<=0 || typeof row.created_at!=="string" || !Number.isFinite(Date.parse(row.created_at)) || typeof row.status!=="string" || typeof row.event!=="string")throw new Error("provider_response");
  return [{id:row.id,createdAt:row.created_at,status:row.status,conclusion:typeof row.conclusion==="string"?row.conclusion:null,event:row.event}];
 });
}
