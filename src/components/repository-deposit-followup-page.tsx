import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RepositoryDepositFollowup, type DepositFollowupData } from "@/components/repository-deposit-followup";
import { AppIcon } from "@/components/app-icon";



export async function RepositoryFollowupPage({ searchParams }: { searchParams: Promise<{ programa?: string; busca?: string; pagina?: string }> }) {
  const params = await searchParams;
  const programId = /^[0-9a-f-]{36}$/i.test(params.programa ?? "") ? params.programa! : "";
  const search = (params.busca ?? "").slice(0, 150);
  const page = Math.min(100000, Math.max(0, Math.floor(Number(params.pagina) || 0)));
  const supabase = await createClient();
  const { data: allowed } = await supabase.rpc("has_permission", { requested_code: "staff.case.view" });
  if (!allowed) redirect("/painel");
  const [{ data, error }, { data: programs }, { data: canManage }] = await Promise.all([
    supabase.rpc("list_repository_deposit_followup", { program_filter: programId || null, search_text: search, page_offset: page * 100 }),
    supabase.from("academic_programs").select("id,name").order("name"),
    supabase.rpc("has_permission", { requested_code: "staff.request.close" }),
  ]);
  return <main className="dashboard-main dashboard-main--narrow deposit-followup-page"><div className="page-heading"><div><Link className="admin-index__back" href="/painel/admin?area=controle"><AppIcon name="arrowRight" />Voltar a Controle</Link><p className="eyebrow">Administração · Controle</p><h1><AppIcon className="panel-heading-icon" name="upload" /><span className="panel-heading-text"><span className="panel-heading-text__inner">Depósitos pendentes</span></span></h1></div></div>{error ? <section className="panel"><p role="alert">Não foi possível carregar a relação. A funcionalidade depende da aplicação da migração de acompanhamento do RI.</p></section> : <RepositoryDepositFollowup key={`${programId}:${search}:${page}`} data={(data ?? { rows: [], total: 0, sendable: 0 }) as DepositFollowupData} programs={programs ?? []} canManage={canManage === true} programId={programId} search={search} page={page} />}</main>;
}
