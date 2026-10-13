import { createClient } from "@/lib/supabase/server";
import { normalizeKnowledge } from "@/lib/knowledge-base";
import { getPublishedKnowledge, toKnowledgeItem } from "@/lib/knowledge-service";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const term = normalizeKnowledge(params.get("q")?.trim() ?? "");
  const requestedContext = params.get("context");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user ? await supabase.from("profiles").select("role").eq("id", user.id).single() : { data: null };
  const context = requestedContext === "administracao" && profile?.role === "administrator" ? "administracao"
    : requestedContext === "atendimento" && (profile?.role === "cataloger" || profile?.role === "administrator") ? "atendimento"
    : requestedContext === "estudante" && profile?.role === "student" ? "estudante"
    : requestedContext === "painel" && user ? "painel" : null;
  const entries = await getPublishedKnowledge(!context);
  const audience = context === "administracao" ? "administrator" : context === "atendimento" ? "cataloger" : context === "estudante" ? "student" : "panel";
  const contextual = context ? entries.filter((entry) => entry.audiences.includes(audience) || entry.audiences.includes("panel")) : entries;
  const matching = term.length >= 2
    ? contextual.filter((entry) => normalizeKnowledge(`${entry.title} ${entry.summary} ${entry.category} ${entry.body_html.replace(/<[^>]+>/g, " ")}`).includes(term))
    : contextual;
  return Response.json({ results: matching.slice(0, 8).map(toKnowledgeItem) });
}
