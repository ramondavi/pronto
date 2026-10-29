import { createClient } from "@/lib/supabase/server";
import { backupManualPackage as asset } from "@/lib/backup-manual-package";
export const runtime="nodejs";
const headers={"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer"};
export async function GET(request:Request){
 const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();
 if(!user)return Response.json({error:"Entre novamente para acessar o pacote."},{status:401,headers});
 const {data:profile,error}=await supabase.from("profiles").select("role,status").eq("id",user.id).single();
 if(error || profile?.role!=="administrator" || profile.status!=="active")return Response.json({error:"Pacote exclusivo de administradores ativos."},{status:403,headers});
 const info=new URL(request.url).searchParams.get("info")==="1";
 const metadata={label:asset.label,bytes:asset.bytes,sha256:asset.sha256};
 if(process.env.VERCEL_ENV!=="production")return Response.json({available:false,reason:"Download disponível após publicação em produção",...metadata},{status:info?200:403,headers});
 const {data:files,error:listError}=await supabase.storage.from(asset.bucket).list(asset.prefix,{limit:10,search:asset.name});
 const exists=!listError && files?.some(file=>file.name===asset.name && Number(file.metadata?.size)===asset.bytes);
 if(!exists)return Response.json({available:false,reason:"Aguarde a disponibilização do pacote aprovado",...metadata},{status:info?200:503,headers});
 if(info)return Response.json({available:true,reason:"",...metadata},{headers});
 const {data,error:signError}=await supabase.storage.from(asset.bucket).createSignedUrl(`${asset.prefix}/${asset.name}`,60,{download:asset.name});
 if(signError || !data?.signedUrl)return Response.json({error:"Não foi possível preparar o download. Tente novamente."},{status:503,headers});
 return new Response(null,{status:303,headers:{...headers,Location:data.signedUrl}});
}
