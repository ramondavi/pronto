import { createClient } from "@/lib/supabase/server";
import { findStaffGuidePages } from "@/lib/staff-guide-search";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ results: [] }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role,status").eq("id", user.id).maybeSingle();
  if (!profile || profile.status !== "active" || !["cataloger", "administrator"].includes(profile.role)) return Response.json({ results: [] }, { status: 403 });
  const params = new URL(request.url).searchParams;
  const term = params.get("q")?.trim().slice(0, 80) ?? "";
  const context = params.get("context")?.trim().slice(0, 80) ?? "";
  if (term.length < 2 && !context) return Response.json({ results: [] }, { headers: { "Cache-Control": "private, no-store" } });
  const { data: pages, error } = await supabase.from("staff_guide_pages")
    .select("published_slug,published_section,published_title,published_summary,published_html")
    .not("published_at", "is", null);
  if (error) return Response.json({ results: [] }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
  const visible = term.length >= 2 ? findStaffGuidePages(pages ?? [], term) : pages ?? [];
  const section = context.startsWith("admin") ? "administracao" : context.startsWith("atendimento") ? "atendimento" : "comece-aqui";
  const hint = context.split(":")[1]?.replace(/[^a-z0-9-]/gi, " ") ?? "";
  const results = [...visible].sort((a, b) => {
    const score = (page: typeof a) => (page.published_section === section ? 2 : 0) + (hint && `${page.published_title} ${page.published_summary} ${page.published_html}`.toLocaleLowerCase("pt-BR").includes(hint) ? 3 : 0);
    return score(b) - score(a);
  }).slice(0, 8).map((page) => ({ slug: page.published_slug, title: page.published_title, summary: page.published_summary, section: page.published_section }));
  return Response.json({ results }, { headers: { "Cache-Control": "private, no-store" } });
}
