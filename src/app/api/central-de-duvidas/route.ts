import { createClient } from "@/lib/supabase/server";
import { normalizeKnowledge } from "@/lib/knowledge-base";
import { getPublishedKnowledge, toKnowledgeItem } from "@/lib/knowledge-service";
import { getInterfaceLanguage } from "@/lib/server-language";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const term = normalizeKnowledge(params.get("q")?.trim() ?? "");
  const requestedContext = params.get("context");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user ? await supabase.from("profiles").select("role,status").eq("id", user.id).single() : { data: null };
  const active = profile?.status === "active";
  const context = requestedContext === "administracao" && active && profile?.role === "administrator" ? "administracao"
    : requestedContext === "atendimento" && active && (profile?.role === "cataloger" || profile?.role === "administrator") ? "atendimento"
    : requestedContext === "equipe" && active && (profile?.role === "cataloger" || profile?.role === "administrator") ? "equipe"
    : requestedContext === "estudante" && active && profile?.role === "student" ? "estudante"
    : requestedContext === "painel" && active ? "painel" : null;
  const entries = await getPublishedKnowledge(!context);
  const audience = context === "administracao" ? "administrator" : context === "atendimento" ? "cataloger" : context === "estudante" ? "student" : "panel";
  const contextual = context === "equipe"
    ? entries.filter((entry) => entry.kind === "answer" && !entry.audiences.includes("public") && (entry.audiences.includes("cataloger") || profile?.role === "administrator" && entry.audiences.includes("administrator")))
    : context ? entries.filter((entry) => entry.audiences.includes(audience) || entry.audiences.includes("panel")) : entries;
  const requestedId = params.get("id");
  const matching = term.length >= 2
    ? contextual.filter((entry) => normalizeKnowledge(`${entry.title} ${entry.summary} ${entry.category} ${entry.body_html.replace(/<[^>]+>/g, " ")}`).includes(term))
    : requestedId && context === "equipe" ? contextual.filter((entry) => entry.id === requestedId) : contextual;
  const language = await getInterfaceLanguage();
  const staffReferences = context === "equipe" || context === "administracao" || context === "atendimento";
  return Response.json({ results: matching.slice(0, context === "equipe" ? 20 : 8).map((entry) => toKnowledgeItem(entry, language, staffReferences)) });
}
