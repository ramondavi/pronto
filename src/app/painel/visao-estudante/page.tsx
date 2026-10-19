import { redirect } from "next/navigation";
import { StudentPreviewScreens } from "@/components/student-preview-screens";
import { createClient } from "@/lib/supabase/server";
import { panelMetadata } from "@/lib/panel-metadata";
import { studentPreviewScenarios } from "@/lib/student-preview-fixtures";
import { studentServiceStatus } from "@/lib/student-service-status";
import { getPublishedKnowledge } from "@/lib/knowledge-service";

export async function generateMetadata() { return panelMetadata("/painel/visao-estudante"); }

const screens = ["inicio", "solicitacoes", "solicitacao", "correcao", "autodeposito", "avaliacao", "conta"] as const;

export default async function StudentPreviewPage({ searchParams }: { searchParams: Promise<{ tela?: string; estado?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  const { data: profile } = await supabase.from("profiles").select("role,status").eq("id", user.id).single();
  if (!profile || profile.status !== "active" || !["cataloger", "administrator"].includes(profile.role)) redirect("/painel");
  const { data: allowed } = await supabase.rpc("has_permission", { requested_code: "student.preview" });
  if (!allowed) redirect("/painel");
  const { tela, estado } = await searchParams;
  const active = screens.find((item) => item === tela) ?? "inicio";
  const scenario = studentPreviewScenarios.find((item) => item.id === estado) ?? studentPreviewScenarios[0];
  const [{ data: programs }, { data: announcements }, serviceStatus, helpArticles] = await Promise.all([
    supabase.from("academic_programs").select("id,code,name,level,work_type").eq("active", true).order("name"),
    supabase.from("library_announcements").select("id,title,message,type,starts_at,ends_at").eq("active", true).order("starts_at", { ascending: false }).limit(100),
    studentServiceStatus(supabase),
    ["inicio", "solicitacoes"].includes(active) ? getPublishedKnowledge().then((entries) => entries.filter((entry) => entry.kind === "article" && entry.slug).map((entry) => ({ slug: entry.slug!, title: entry.title }))) : Promise.resolve([]),
  ]);
  return <StudentPreviewScreens active={active} scenario={scenario} programs={programs ?? []} announcements={announcements ?? []} serviceStatus={serviceStatus} userId={user.id} helpArticles={helpArticles} />;
}
