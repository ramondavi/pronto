import { createClient } from "@/lib/supabase/server";
import { AppIcon } from "@/components/app-icon";
import { StaffGuideIndexContent, type StaffGuideIndexPage } from "@/components/staff-guide-index";

export default async function StaffGuideIndex() {
  const supabase = await createClient();
  const { data: pages } = await supabase.from("staff_guide_pages")
    .select("published_slug,published_section,published_title,published_summary,published_position,published_screens")
    .not("published_at", "is", null).order("published_position");
  return <main className="staff-docs__main"><div className="staff-docs__eyebrow"><AppIcon name="lock" />Acesso restrito à equipe</div><div className="staff-docs__intro"><p className="eyebrow">Documentação do Pronto!</p><h1>Guia da equipe</h1><p>Orientações para catalogadores e administradores, organizadas por tarefa.</p></div>
    {(pages ?? []).length ? <StaffGuideIndexContent pages={(pages ?? []).filter((page) => page.published_slug && page.published_section && page.published_title).map((page): StaffGuideIndexPage => ({ published_slug: page.published_slug!, published_section: page.published_section!, published_title: page.published_title!, published_summary: page.published_summary ?? "", published_screens: page.published_screens }))} /> : <div className="staff-docs__empty"><AppIcon name="book" /><h2>Guia em preparação</h2><p>Os capítulos aparecerão aqui quando forem publicados para seu perfil.</p></div>}
  </main>;
}
