import { createClient } from "@/lib/supabase/server";
import { backupApi, backupDispatchConfigured, backupGithubHeaders, backupRuns } from "@/lib/backup-panel";

export const runtime="nodejs";
const headers={"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"};
const reply=(body:Record<string,unknown>,status=200)=>Response.json(body,{status,headers});
async function administrator(){
 const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();
 if(!user)return null;
 const {data:profile,error}=await supabase.from("profiles").select("role,status").eq("id",user.id).single();
 return !error && profile?.role==="administrator" && profile.status==="active"?supabase:null;
}
export async function GET(){
 const supabase=await administrator();if(!supabase)return reply({error:"Consulta exclusiva de administradores ativos."},403);
 const {data:state,error:stateError}=await supabase.rpc("backup_panel_dispatch_state");
 const allowed=!stateError && state?.allowed===true;
 const blockedUntil=typeof state?.blocked_until==="string"?state.blocked_until:null;
 const configured=backupDispatchConfigured();
 const dispatch={ready:configured && allowed && !blockedUntil,blockedUntil,reason:stateError?"Aguarde a preparação do banco":!allowed?"Sem permissão para executar backup":!configured?(process.env.VERCEL_ENV !== "production"?"Acionamento disponível somente na produção":"Aguarde a configuração segura do executor"):blockedUntil?"Aguarde a liberação do pedido anterior":""};
 try{return reply({runs:await backupRuns(),checkedAt:new Date().toISOString(),dispatch});}
 catch{return reply({error:"Não foi possível consultar o GitHub agora. Consulte as execuções no serviço; isso não confirma falha do backup.",dispatch},503);}
}
export async function POST(request:Request){
 // Same-origin JSON only: never accept a cross-site form, arbitrary workflow or ref.
 if(request.headers.get("origin")!==new URL(request.url).origin || request.headers.get("sec-fetch-site")==="cross-site" || request.headers.get("content-type")?.split(";")[0]!=="application/json")return reply({error:"Origem do pedido não permitida."},403);
 const supabase=await administrator();if(!supabase)return reply({error:"Acesso exclusivo de administradores ativos."},403);
 if(!backupDispatchConfigured())return reply({error:"O acionamento pelo painel ainda não está configurado."},503);
 const {data:allowed,error:permissionError}=await supabase.rpc("has_permission",{requested_code:"admin.backups.execute"});
 if(permissionError || allowed!==true)return reply({error:"Sua conta não tem permissão para executar backups."},403);
 let id:string;
 try{const text=await request.text();if(text.length>256)throw new Error("invalid");const body:unknown=JSON.parse(text);if(!body || typeof body!=="object" || !("requestId" in body) || typeof body.requestId!=="string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.requestId) || !("confirmed" in body) || body.confirmed!==true)throw new Error("invalid");id=body.requestId;}catch{return reply({error:"Confirme o pedido antes de executar o backup."},400);}
 try{const runs=await backupRuns(true);if(runs.some(run=>run.status!=="completed"))return reply({error:"Já há uma execução em preparação ou andamento. Aguarde o término."},409);}catch{return reply({error:"Não foi possível conferir as execuções. Nenhum novo pedido foi enviado pelo painel."},503);}
 const {data:reservation,error:reserveError}=await supabase.rpc("reserve_backup_panel_request",{request_id:id});
 if(reserveError || !reservation)return reply({error:"O pedido não foi reservado. Pode haver outro acionamento recente ou mudança de permissão. Atualize as execuções antes de tentar novamente."},409);
 if(reservation.created!==true)return reply({error:"Este pedido já foi registrado. Confira as execuções; ele não será reenviado.",uncertain:true},409);
 let reported:"accepted"|"rejected"|"unknown"="unknown";
 try{
  const response=await fetch(`${backupApi}/dispatches`,{method:"POST",headers:{...backupGithubHeaders(),"Content-Type":"application/json"},body:JSON.stringify({ref:"master",inputs:{first_copy:false}}),signal:AbortSignal.timeout(12000),cache:"no-store",redirect:"error"});
  reported=response.ok?"accepted":response.status>=400 && response.status<500?"rejected":"unknown";
 }catch{reported="unknown";}
 const {data:recorded,error:recordError}=await supabase.rpc("finish_backup_panel_request",{request_id:id,reported_status:reported});
 if(recordError || recorded!==true)return reply({error:"O pedido foi registrado, mas não foi possível concluir o registro da resposta. Não repita: confira as execuções no GitHub.",uncertain:true},503);
 if(reported==="rejected")return reply({error:"O GitHub recusou o acionamento. Confira a autorização do executor. Nenhum reenvio automático será feito."},502);
 if(reported==="unknown")return reply({error:"Não foi possível confirmar a resposta do GitHub. O pedido pode ter sido aceito; não repita antes de conferir as execuções.",uncertain:true},503);
 return reply({accepted:true,message:"Pedido aceito pelo GitHub. A execução pode levar alguns instantes para aparecer. Isso ainda não confirma uma cópia concluída."},202);
}
