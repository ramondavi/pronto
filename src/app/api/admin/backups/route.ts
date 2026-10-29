import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
export async function GET() {
 const supabase = await createClient();
 const { data: { user } } = await supabase.auth.getUser();
 if (!user) return Response.json({error:"Entre novamente para consultar as execuções."},{status:401,headers});
 const { data: profile, error } = await supabase.from("profiles").select("role,status").eq("id",user.id).single();
 if (error || profile?.role !== "administrator" || profile.status !== "active") return Response.json({error:"Consulta exclusiva de administradores ativos."},{status:403,headers});
 try {
  const response = await fetch("https://api.github.com/repos/ramondavi/pronto/actions/workflows/backup.yml/runs?branch=master&per_page=8",{cache:"no-store",headers:{Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28"},signal:AbortSignal.timeout(8000)});
  if (!response.ok) throw new Error("provider_unavailable");
  const body:unknown = await response.json();
  if (!body || typeof body !== "object" || !("workflow_runs" in body) || !Array.isArray(body.workflow_runs)) throw new Error("provider_response");
  const runs = body.workflow_runs.flatMap((entry:unknown) => {
   if (!entry || typeof entry !== "object") return [];
   const row = entry as Record<string,unknown>;
   if (typeof row.id !== "number" || !Number.isSafeInteger(row.id) || (row.id as number) <= 0 || typeof row.created_at !== "string" || !Number.isFinite(Date.parse(row.created_at)) || typeof row.status !== "string" || typeof row.event !== "string") return [];
   return [{id:row.id as number,createdAt:row.created_at,status:row.status,conclusion:typeof row.conclusion === "string" ? row.conclusion : null,event:row.event}];
  });
  return Response.json({runs,checkedAt:new Date().toISOString()},{headers});
 } catch { return Response.json({error:"Não foi possível consultar o GitHub agora. A consulta pública pode estar indisponível ou limitada. Consulte as execuções no serviço; isso não confirma falha do backup."},{status:503,headers}); }
}
