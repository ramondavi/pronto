import { createClient } from "@/lib/supabase/server";
import { createFeedbackAggregateCsv, createFeedbackAggregatePdf, createFeedbackCsv, createFeedbackPdf, type FeedbackExportResponse } from "@/lib/feedback-export";
import { userHasPermission } from "@/lib/staff-permissions";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Entre novamente para exportar a pesquisa." }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role,status").eq("id", user.id).single();
  if (!profile || profile.status !== "active" || !await userHasPermission(supabase, "admin.feedback.export", profile.role)) return Response.json({ error: "Acesso restrito à exportação da pesquisa." }, { status: 403 });

  const format = new URL(request.url).searchParams.get("formato");
  if (format !== "csv" && format !== "pdf") return Response.json({ error: "Formato de exportação inválido." }, { status: 400 });

  const [{ data: stats, error: statsError }, { data: responseRows, error: responsesError }] = await Promise.all([
    supabase.rpc("feedback_campaign_stats"),
    supabase.from("feedback_responses").select("answers"),
  ]);
  if (statsError || responsesError || !stats || !responseRows) return Response.json({ error: "Não foi possível consultar as respostas da pesquisa." }, { status: 503 });
  const counts = stats as { invited?: number; responded?: number; report_ready_at?: string; responses_purged_at?: string | null; aggregate_report?: Record<string, Record<string, number>> | null };
  if (!counts.report_ready_at || Date.now() < new Date(counts.report_ready_at).getTime() || (counts.responded ?? 0) < 5) {
    return Response.json({ error: "A exportação será liberada após o encerramento dos convites e do prazo de resposta, desde que haja ao menos cinco respostas." }, { status: 403 });
  }
  if (counts.responses_purged_at && counts.aggregate_report) {
    const headers = {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="pronto-avaliacao-agregada.${format}"`,
      "X-Content-Type-Options": "nosniff",
    };
    try {
      if (format === "csv") return new Response(createFeedbackAggregateCsv(counts.aggregate_report, counts.invited ?? 0, counts.responded ?? 0), { headers: { ...headers, "Content-Type": "text/csv; charset=utf-8" } });
      const bytes = await createFeedbackAggregatePdf(counts.aggregate_report, counts.invited ?? 0, counts.responded ?? 0);
      return new Response(Uint8Array.from(bytes).buffer, { headers: { ...headers, "Content-Type": "application/pdf" } });
    } catch {
      return Response.json({ error: "Não foi possível preparar o arquivo. Tente novamente." }, { status: 500, headers: { "Cache-Control": "private, no-store" } });
    }
  }
  if (counts.responses_purged_at || responseRows.length !== counts.responded) {
    return Response.json({ error: "As respostas individuais já foram eliminadas. Consulte os resultados agregados no painel." }, { status: 410 });
  }

  const responses = responseRows as FeedbackExportResponse[];
  const headers = {
    "Cache-Control": "private, no-store",
    "Content-Disposition": `attachment; filename="pronto-avaliacao-resultados.${format}"`,
    "X-Content-Type-Options": "nosniff",
  };
  try {
    if (format === "csv") return new Response(createFeedbackCsv(responses), { headers: { ...headers, "Content-Type": "text/csv; charset=utf-8" } });
    const bytes = await createFeedbackPdf(responses, counts.invited ?? 0);
    return new Response(Uint8Array.from(bytes).buffer, { headers: { ...headers, "Content-Type": "application/pdf" } });
  } catch {
    return Response.json({ error: "Não foi possível preparar o arquivo. Tente novamente." }, { status: 500, headers: { "Cache-Control": "private, no-store" } });
  }
}
