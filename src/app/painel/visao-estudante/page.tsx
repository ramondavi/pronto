import Link from "next/link";
import { redirect } from "next/navigation";
import { AppIcon } from "@/components/app-icon";
import { RepositoryDepositGuide, type RepositoryCopyField } from "@/components/repository-deposit-guide";
import { StudentRequestForm } from "@/components/student-request-form";
import { StaffAnnouncementsCalendar } from "@/components/staff-announcements-calendar";
import { createClient } from "@/lib/supabase/server";
import { panelMetadata } from "@/lib/panel-metadata";

export async function generateMetadata() { return panelMetadata("/painel/visao-estudante"); }

const tabs = [
  { id: "inicio", label: "Visão geral" },
  { id: "solicitacao", label: "Solicitação" },
  { id: "autodeposito", label: "Autodepósito" },
] as const;

const exampleFields: RepositoryCopyField[] = [
  { label: "Título", value: "Exemplo de trabalho acadêmico", group: "Trabalho e datas" },
  { label: "Autor 1", kind: "person", entry: "Exemplo", remainder: "Estudante de", group: "Pessoas e instituição" },
  { label: "Ano", value: "2026", group: "Trabalho e datas" },
];

export default async function StudentPreviewPage({ searchParams }: { searchParams: Promise<{ tela?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  const { data: profile } = await supabase.from("profiles").select("role,status").eq("id", user.id).single();
  if (!profile || profile.status !== "active" || !["cataloger", "administrator"].includes(profile.role)) redirect("/painel");
  const { data: allowed } = await supabase.rpc("has_permission", { requested_code: "student.preview" });
  if (!allowed) redirect("/painel");
  const { tela } = await searchParams;
  const active = tabs.find((item) => item.id === tela)?.id ?? "inicio";
  const [{ data: programs }, { data: announcements }] = await Promise.all([
    supabase.from("academic_programs").select("id,code,name,level,work_type").eq("active", true).order("name"),
    supabase.from("library_announcements").select("id,title,message,type,starts_at,ends_at").eq("active", true).order("starts_at", { ascending: false }).limit(100),
  ]);
  return <main className="dashboard-main dashboard-main--student-preview">
    <div className="page-heading"><div><h1><AppIcon className="panel-heading-icon" name="person" />Visão de estudante</h1></div></div>
    <div className="panel student-preview__notice"><strong>Demonstração sem envio</strong><p>Explore as etapas com dados fictícios. Nenhuma solicitação, rascunho ou autodepósito é gravado.</p></div>
    <nav className="admin-tabs" aria-label="Telas de estudante">{tabs.map((item) => <Link key={item.id} href={`/painel/visao-estudante?tela=${item.id}`} className={active === item.id ? "is-active" : undefined} aria-current={active === item.id ? "page" : undefined}>{item.label}</Link>)}</nav>
    {active === "inicio" && <div className="dashboard-grid"><section className="panel"><p className="eyebrow">Sua próxima ação</p><h2>Sua solicitação</h2><p>Na visão de estudante, a pessoa acompanha aqui o andamento da ficha e as ações pendentes.</p><Link className="button button--primary" href="/painel/visao-estudante?tela=solicitacao">Explorar formulário</Link></section><section className="panel panel--institutional"><h2>Avisos e prazos</h2><p>Prazo de referência: 3 dias úteis após o envio.</p><StaffAnnouncementsCalendar announcements={announcements ?? []} /></section></div>}
    {active === "solicitacao" && <section className="student-preview__form"><StudentRequestForm userId={user.id} requesterName="Estudante de demonstração" programs={programs ?? []} preview /></section>}
    {active === "autodeposito" && <section className="panel"><h2>Guia de autodepósito</h2><p>Exemplo com dados fictícios. Iniciar a demonstração não registra uma etapa no banco.</p><RepositoryDepositGuide requestId="00000000-0000-0000-0000-000000000000" startedAt={null} fields={exampleFields} preview /></section>}
  </main>;
}
