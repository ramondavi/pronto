import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasRetrospectiveAccess } from "@/lib/retrospective-access";
import { RetrospectiveOverview } from "@/components/retrospective-overview";

export const metadata = { title: "Acervo retrospectivo da RAU+E | Pronto!" };

export default async function RetrospectivePage() {
  if (!await hasRetrospectiveAccess()) redirect("/painel");
  const supabase = await createClient();
  const { data: requests, error } = await supabase.from("cataloging_requests").select("id,protocol,title,status").eq("retrospective", true).order("submitted_at", { ascending: false });
  if (error) throw new Error("Não foi possível carregar os pedidos retrospectivos.");
  return <RetrospectiveOverview requests={requests ?? []} />;
}
