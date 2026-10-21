import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RepositoryDepositFollowup, type DepositFollowupData } from "@/components/repository-deposit-followup";

export async function RepositoryFollowupPage({ searchParams }: { searchParams: Promise<{ programa?: string; busca?: string; pagina?: string }> }) {
  const params = await searchParams;
  const programId = /^[0-9a-f-]{36}$/i.test(params.programa ?? "") ? params.programa! : "";
  const search = (params.busca ?? "").slice(0, 150);
  const page = Math.min(100000, Math.max(0, Math.floor(Number(params.pagina) || 0)));
  const supabase = await createClient();
  const codes = ["staff.case.view", "staff.request.close", "admin.deposits.view", "admin.deposits.send", "admin.deposits.history", "admin.deposits.publication"];
  const access = await Promise.all(codes.map((requested_code) => supabase.rpc("has_permission", { requested_code })));
  const [canViewCases, canClose, canView, canSend, canConfirmHistory, canRecordPublication] = access.map((result) => !result.error && result.data === true);
  if (!canViewCases || !canView) redirect("/painel/admin");
  const [{ data, error }, { data: programs }] = await Promise.all([
    supabase.rpc("list_repository_deposit_followup", { program_filter: programId || null, search_text: search, page_offset: page * 100 }),
    supabase.from("academic_programs").select("id,name").order("name"),
  ]);
  if (error) return <p className="auth-feedback auth-feedback--error" role="alert">Não foi possível carregar os depósitos pendentes. Tente novamente em instantes.</p>;
  return <RepositoryDepositFollowup key={`${programId}:${search}:${page}`} data={(data ?? { rows: [], total: 0, sendable: 0 }) as DepositFollowupData} programs={programs ?? []} canSend={canClose && canSend} canConfirmHistory={canClose && canConfirmHistory} canRecordPublication={canClose && canRecordPublication} programId={programId} search={search} page={page} />;
}
