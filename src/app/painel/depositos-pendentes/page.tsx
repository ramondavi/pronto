import { redirect } from "next/navigation";

export default async function LegacyRepositoryFollowupPage({ searchParams }: { searchParams: Promise<{ programa?: string; busca?: string; pagina?: string }> }) {
  const params = await searchParams;
  const destination = new URLSearchParams({ area: "controle", aba: "deposits" });
  for (const key of ["programa", "busca", "pagina"] as const) if (params[key]) destination.set(key, params[key]!);
  redirect(`/painel/admin?${destination}`);
}
