import type { Metadata } from "next";
import { cache } from "react";
import { AppIcon } from "@/components/app-icon";
import { Brand } from "@/components/brand";
import { ProtocolCopyButton } from "@/components/protocol-copy-button";
import { RequestTimeline, type TimelineEvent } from "@/components/request-timeline";
import { createClient } from "@/lib/supabase/server";
import { formatWorkTitle } from "@/lib/work-title";
import { getInterfaceLanguage } from "@/lib/server-language";
import { uiText } from "@/lib/ui-text";

const coordinationMetadata: Metadata = {
  description: "Acesso reservado para acompanhar uma solicitação de ficha catalográfica no Pronto!.",
  referrer: "no-referrer",
  robots: { index: false, follow: false, noarchive: true, nocache: true, noimageindex: true },
  alternates: null,
  openGraph: null,
  twitter: null,
};

const getSnapshot = cache(async (token: string) => {
  const supabase = await createClient();
  return supabase.rpc("coordination_request_snapshot", { access_token: token });
});

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const language = await getInterfaceLanguage();
  const { token } = await params;
  const { data } = await getSnapshot(token);
  const protocol = (data as { protocol?: string } | null)?.protocol;
  return { ...coordinationMetadata, description: uiText(language, coordinationMetadata.description as string), title: { absolute: protocol ? `${uiText(language, "Acompanhamento")} ${protocol} | Pronto!` : `${uiText(language, "Acompanhamento da coordenação")} | Pronto!` } };
}

const labels: Record<string, string> = {
  submitted: "Solicitação enviada",
  in_review: "Em análise",
  changes_requested: "Aguardando correções",
  approved: "Ficha homologada",
  completed: "Concluído",
  canceled: "Cancelado",
};

type Snapshot = {
  protocol: string;
  title: string;
  subtitle?: string | null;
  student_name: string;
  registration_number: string;
  program_name: string;
  status: string;
  sla_business_days: number;
  sla_due_at: string | null;
  timeline: TimelineEvent[];
};

export default async function CoordinationPage({ params }: { params: Promise<{ token: string }> }) {
  const language = await getInterfaceLanguage();
  const t = (source: string) => uiText(language, source);
  const { token } = await params;
  const { data, error } = await getSnapshot(token);

  if (error || !data) {
    return <main className="coordination-page"><div className="coordination-page__inner"><div className="coordination-page__brand"><Brand compact /></div><section className="panel coordination-page__empty"><span className="coordination-page__hero-icon"><AppIcon name="lock" /></span><p className="eyebrow">{t("Acompanhamento da coordenação")}</p><h1>{error ? t("Acompanhamento indisponível") : t("Link sem acesso")}</h1><p>{error ? t("Não foi possível consultar a solicitação agora. Tente novamente em instantes.") : t("Este link expirou ou foi substituído. Confira a mensagem mais recente enviada pela biblioteca.")}</p></section></div></main>;
  }

  const snapshot = data as Snapshot;
  const dueDate = snapshot.sla_due_at ? new Intl.DateTimeFormat(language === "pt" ? "pt-BR" : language, { dateStyle: "long", timeZone: "America/Sao_Paulo" }).format(new Date(snapshot.sla_due_at)) : null;
  return <main className="coordination-page"><div className="coordination-page__inner"><div className="coordination-page__brand"><Brand compact /></div><header className="coordination-page__hero"><div className="coordination-page__hero-copy"><span className="coordination-page__hero-icon"><AppIcon name="work" /></span><p className="eyebrow">{t("Acompanhamento da coordenação")}</p><h1><ProtocolCopyButton protocol={snapshot.protocol} showLabel={false} badge /></h1><p>{t("Acompanhe cada etapa da solicitação de ficha catalográfica, da abertura à conclusão.")}</p></div><span className={`coordination-page__status coordination-page__status--${snapshot.status}`}><AppIcon name={snapshot.status === "completed" ? "check" : snapshot.status === "canceled" ? "close" : "review"} />{t(labels[snapshot.status] ?? snapshot.status)}</span></header>{snapshot.status !== "canceled" && <aside className="coordination-page__final-email"><AppIcon name="bell" /><div><strong>{t("Aviso final por e-mail")}</strong><p>{t("Quando o protocolo for concluído, com a ficha homologada e a publicação confirmada no RI/UFBA, a coordenação receberá um e-mail com o endereço permanente do trabalho. Até lá, acompanhe o andamento nesta página.")}</p></div></aside>}<section className="panel coordination-page__details" aria-labelledby="coordination-details-heading"><div className="coordination-page__section-heading"><span className="timeline-dialog__icon"><AppIcon name="document" /></span><div><p className="eyebrow">{t("Dados da solicitação")}</p><h2 id="coordination-details-heading">{t("Informações do atendimento")}</h2></div></div><dl className="coordination-page__grid"><div><dt><AppIcon name="person" />{t("Estudante")}</dt><dd>{snapshot.student_name}</dd></div><div><dt><AppIcon name="tag" />{t("Matrícula")}</dt><dd>{snapshot.registration_number}</dd></div><div className="coordination-page__work"><dt><AppIcon name="book" />{t("Trabalho")}</dt><dd>{formatWorkTitle(snapshot.title, snapshot.subtitle)}</dd></div><div><dt><AppIcon name="home" />{t("Curso ou programa")}</dt><dd>{snapshot.program_name}</dd></div><div><dt><AppIcon name="calendar" />{t("Prazo de referência")} <span className="tooltip" tabIndex={0} aria-label={t("Sobre o prazo de referência")}>i<span role="tooltip">{t("Tempo previsto para a análise da biblioteca, contado em dias úteis conforme o curso ou programa. Não representa o prazo total até a publicação.")}</span></span></dt><dd>{snapshot.sla_business_days} {t("dias úteis")}</dd></div><div className="coordination-page__forecast"><dt><AppIcon name="review" />{t("Previsão da análise")} <span className="tooltip" tabIndex={0} aria-label={t("Sobre a previsão da análise")}>i<span role="tooltip">{t("Data estimada para concluir a análise da biblioteca, calculada com o calendário de atendimento. Pode mudar se houver correções ou suspensão do atendimento.")}</span></span></dt><dd>{dueDate ?? t("Indisponível durante a suspensão do atendimento")}</dd></div></dl></section><section className="coordination-page__history" aria-labelledby="coordination-history-heading"><div className="timeline-dialog__header"><span className="timeline-dialog__icon"><AppIcon name="calendar" /></span><div><p className="eyebrow">{t("Histórico do atendimento")}</p><h2 id="coordination-history-heading">{t("Marcos do protocolo")}</h2></div></div><p className="coordination-page__history-intro">{t("Os marcos concluídos mostram a data registrada. As próximas etapas aparecem em tom mais claro.")}</p><RequestTimeline events={snapshot.timeline ?? []} showHeading={false} highlightCurrent /></section><aside className="coordination-page__privacy"><span className="timeline-dialog__icon"><AppIcon name="shield" /></span><div><strong>{t("Informações protegidas")}</strong><p>{t("Esta página mostra somente o acompanhamento da solicitação. CPF, documentos enviados e observações internas não são disponibilizados. O acesso termina após a conclusão e a comunicação final.")}</p></div></aside></div></main>;
}
