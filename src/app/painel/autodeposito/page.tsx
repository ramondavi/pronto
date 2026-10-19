import { panelMetadata } from "@/lib/panel-metadata";
export async function generateMetadata() { return panelMetadata("/painel/autodeposito"); }
import { AppIcon } from "@/components/app-icon";
import { StudentFeedbackInvite } from "@/components/student-feedback-invite";
import { redirect } from "next/navigation";
import { RepositoryDepositGuide, type RepositoryCopyField } from "@/components/repository-deposit-guide";
import type { CatalogingCardSnapshot } from "@/domain/cataloging-card/types";
import { createClient } from "@/lib/supabase/server";
import { formatWorkTitle } from "@/lib/work-title";
import { getInterfaceLanguage } from "@/lib/server-language";
import { uiText } from "@/lib/ui-text";
import { repositoryDepositSetup } from "@/lib/repository-deposit-setup";


const first = <T,>(value: T | T[] | null | undefined): T | null => Array.isArray(value) ? value[0] ?? null : value ?? null;

export default async function RepositoryDepositPage() {
  const language = await getInterfaceLanguage();
  const t = (value: string) => uiText(language, value);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user ? await supabase.from("profiles").select("role,full_name").eq("id", user.id).single() : { data: null };
  if (!user || profile?.role !== "student") redirect("/painel");
  const { data: request } = await supabase.from("cataloging_requests").select(`id,status,title,subtitle,equivalent_title,people:request_people(role,transcribed_name,authorized_name,position),enrollment:academic_enrollments!cataloging_requests_academic_enrollment_id_fkey(program:academic_programs!academic_enrollments_academic_program_id_fkey(id,code,name,level,repository_deposit_enabled,repository_collection_label,repository_document_type_label,repository_academic_degree_label,repository_institution_label,repository_institution_acronym,repository_unit_label,repository_program_label,repository_country_label,repository_default_language_label))`).order("submitted_at", { ascending: false }).limit(1).maybeSingle();
  if (!request) return <main className="dashboard-main dashboard-main--narrow"><div className="page-heading"><div><h1><AppIcon className="panel-heading-icon" name="upload" /><span className="panel-heading-text"><span className="panel-heading-text__inner">{t("Autodepósito")}</span></span></h1></div></div><StudentFeedbackInvite /><section className="panel repository-guide__state"><span><AppIcon name="document" /></span><div><h2>{t("Guia ainda indisponível")}</h2><p>{t("Faça uma solicitação de ficha para acompanhar as próximas etapas aqui.")}</p></div></section></main>;
  const enrollment = first(request.enrollment); const program = first(enrollment?.program);
  const [{ data: nada }, { data: homologation }, { data: progress }, { data: citation }, { data: workDates }] = await Promise.all([
    supabase.from("nada_consta_documents").select("status").eq("request_id", request.id).eq("status", "approved").maybeSingle(),
    supabase.from("cataloging_card_homologations").select("snapshot").eq("request_id", request.id).maybeSingle(),
    supabase.from("repository_deposit_progress").select("started_at").eq("request_id", request.id).maybeSingle(),
    supabase.rpc("get_validated_request_citation", { target_request_id: request.id }),
    supabase.from("request_card_details").select("deposit_date,defense_date").eq("request_id", request.id).maybeSingle(),
  ]);
  const available = request.status === "approved" && nada?.status === "approved" && Boolean(homologation?.snapshot);
  if (!program?.repository_deposit_enabled) return <main className="dashboard-main dashboard-main--narrow"><div className="page-heading"><div><h1><AppIcon className="panel-heading-icon" name="upload" /><span className="panel-heading-text"><span className="panel-heading-text__inner">{t("Autodepósito")}</span></span></h1></div></div><StudentFeedbackInvite /><section className="panel repository-guide__state"><span><AppIcon name="lock" /></span><div><h2>{t("Guia desativado para este curso")}</h2><p>{uiText(language, "O guia de autodepósito não está habilitado para {program}. Para TFG de graduação, ele permanece inicialmente desativado por cautela normativa.", { program: program?.name ?? t("seu curso ou programa") })}</p></div></section></main>;
  if (!available) return <main className="dashboard-main dashboard-main--narrow"><div className="page-heading"><div><h1><AppIcon className="panel-heading-icon" name="upload" /><span className="panel-heading-text"><span className="panel-heading-text__inner">{t("Autodepósito")}</span></span></h1></div></div><StudentFeedbackInvite /><section className="panel repository-guide__state"><span><AppIcon name="review" /></span><div><h2>{t("Aguarde a liberação da ficha")}</h2><p>{t("O guia ficará disponível após a homologação da ficha e a aprovação do Nada Consta.")}</p></div></section></main>;
  const setup = repositoryDepositSetup(program.code, { collection: program.repository_collection_label ?? "", documentType: program.repository_document_type_label ?? "" });
  const snapshot = homologation!.snapshot as unknown as CatalogingCardSnapshot;
  const people = [...snapshot.people].sort((a,b) => (a.position ?? 0)-(b.position ?? 0));
  const personField = (label: string, person: (typeof people)[number]): RepositoryCopyField => {
    const name = person.authorizedName?.trim() ?? "";
    const comma = name.indexOf(",");
    return comma > 0 && name.slice(comma + 1).trim() ? { label, kind: "person", entry: name.slice(0, comma).trim(), remainder: name.slice(comma + 1).trim(), group: "Pessoas e instituição" } : { label, value: person.transcribedName, copyable: false, note: "Confira no trabalho como separar a entrada do restante do nome antes de preencher os dois campos do RI.", group: "Pessoas e instituição" };
  };
  const keywordFields = (language: "pt" | "en") => snapshot.subjects.map((subject) => language === "pt" ? subject.labelPt.trim() : subject.labelEn?.trim() ?? "").filter(Boolean).sort(new Intl.Collator(language === "pt" ? "pt-BR" : "en", { sensitivity: "base" }).compare).map((term, index): RepositoryCopyField => ({ label: `${language === "pt" ? "Palavra-chave em português" : "Palavra-chave em inglês"} ${index + 1}`, value: term, note: index === 0 ? "Assunto controlado da ficha homologada. Cole um termo por campo, nesta ordem." : undefined, group: "Assuntos e referência" }));
  const authors = people.filter((item) => item.role === "author");
  const advisors = people.filter((item) => item.role === "advisor");
  const coadvisors = people.filter((item) => item.role === "coadvisor");
  const board = people.filter((item) => ["advisor", "coadvisor", "committee_member"].includes(item.role));
  const fields: RepositoryCopyField[] = [
    { label: "Coleção prevista", value: setup.collection, note: "A equipe do RI libera o acesso à coleção adequada; confira a que aparece na sua conta.", copyable: false, group: "Configuração do depósito" }, { label: "Tipo de documento previsto", value: setup.documentType, note: "Confira o tipo disponibilizado pelo RI para este depósito.", copyable: false, group: "Configuração do depósito" },
    { label: "Grau acadêmico", value: program.repository_academic_degree_label, group: "Trabalho e datas" }, { label: "Título e subtítulo", value: formatWorkTitle(snapshot.request.title, snapshot.request.subtitle), group: "Trabalho e datas" }, { label: "Título equivalente", value: snapshot.request.equivalentTitle, group: "Trabalho e datas" },
    { label: "Data de depósito do trabalho", value: workDates?.deposit_date, kind: "date", note: "Se o protocolo antigo não tiver dia e mês, confira a data no arquivo final.", group: "Trabalho e datas" },
    { label: snapshot.request.workNature === "Dissertação" || snapshot.request.workNature === "Tese" ? "Data de defesa do trabalho" : "Data de apresentação do trabalho", value: workDates?.defense_date, kind: "date", note: "Use a data indicada na folha ou ata de aprovação.", group: "Trabalho e datas" },
    { label: "Tipo de acesso e embargo", note: "Escolha o acesso diretamente no RI. Se houver embargo, informe a data de liberação e a justificativa exigidas.", group: "Trabalho e datas" },
    ...authors.map((person, index) => personField(authors.length === 1 ? "Autor" : `Autor ${index + 1}`, person)),
    ...advisors.map((person, index) => personField(advisors.length === 1 ? "Orientador" : `Orientador ${index + 1}`, person)),
    ...coadvisors.map((person, index) => personField(coadvisors.length === 1 ? "Coorientador" : `Coorientador ${index + 1}`, person)),
    ...board.map((person, index) => personField(`Membro da banca ${index + 1}`, person)),
    { label: "Outros membros da banca", note: "Confira na folha ou ata de aprovação se há integrantes além dos registrados acima. O RI pode exigir três nomes na dissertação e cinco na tese.", group: "Pessoas e instituição" },
    { label: "Currículo Lattes e ORCID", note: "Informe os links dos autores e orientadores quando solicitados pelo RI; confira os endereços nos perfis oficiais.", group: "Pessoas e instituição" },
    { label: "Nome da instituição", value: program.repository_institution_label, group: "Pessoas e instituição" }, { label: "Sigla da instituição", value: program.repository_institution_acronym, group: "Pessoas e instituição" },
    { label: "Faculdade, instituto ou departamento", value: "Faculdade de Arquitetura", kind: "selection", note: "Selecione no menu do RI após a sigla da instituição.", group: "Pessoas e instituição" },
    { label: program.level === "undergraduate" ? "Nome do curso" : "Nome do programa de pós-graduação", value: program.repository_program_label || program.name, group: "Pessoas e instituição" },
    { label: "País", value: "Brasil", kind: "selection", note: "Selecione no menu do RI.", group: "Pessoas e instituição" }, { label: "Idioma", value: "Português", kind: "selection", note: "Selecione no menu do RI, logo após o país.", group: "Pessoas e instituição" },
    ...keywordFields("pt"), ...keywordFields("en"),
    ...(!snapshot.subjects.some((subject) => subject.labelEn?.trim()) ? [{ label: "Palavras-chave em inglês", note: "A ficha homologada não contém equivalentes controlados em inglês. Confira esse preenchimento com a biblioteca; não use automaticamente as palavras-chave enviadas na solicitação.", group: "Assuntos e referência" as const }] : []),
    { label: "Resumo", note: "Copie o resumo em português do arquivo final do trabalho.", group: "Assuntos e referência" },
    { label: "Abstract", note: "Copie o resumo em inglês do arquivo final. Para dissertação e tese, o RI exige esse campo.", group: "Assuntos e referência" },
    { label: "Referências do trabalho", note: "Preencha a lista de referências conforme aparece no trabalho e revise a formatação no RI.", group: "Assuntos e referência" },
    { label: "DOI", note: "Informe somente se o trabalho tiver identificador digital persistente.", group: "Assuntos e referência" },
    { label: "Citação", value: citation, note: "A referência depende da validação bibliotecária.", group: "Assuntos e referência" },
    { label: "Áreas de conhecimento CNPq", note: "Escolha na taxonomia ‘Categorias de assuntos’ do RI; os assuntos da ficha não substituem essa classificação.", group: "Conferir no RI" },
    { label: "Agência de fomento", note: "Informe a agência quando houver financiamento do trabalho.", group: "Conferir no RI" },
    { label: "Relação com outros documentos", note: "Preencha quando o trabalho tiver vínculo com outro documento ou publicação.", group: "Conferir no RI" },
    { label: "Arquivo, formato e descrição", note: "Envie a versão final com a ficha, confira o formato exigido pelo RI e marque o arquivo principal.", group: "Conferir no RI" },
  ];
  return <main className="dashboard-main dashboard-main--form"><div className="page-heading request-heading"><div><h1><AppIcon className="panel-heading-icon" name="upload" /><span className="panel-heading-text"><span className="panel-heading-text__inner">{t("Autodepósito")}</span></span></h1></div><span className="request-status">{snapshot.request.protocol}</span></div><StudentFeedbackInvite /><RepositoryDepositGuide requestId={request.id} startedAt={progress?.started_at ?? null} fields={fields} setup={setup} requesterName={profile.full_name ?? ""} requesterEmail={user.email ?? ""} /></main>;
}
