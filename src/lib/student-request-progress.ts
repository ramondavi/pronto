export type StudentRequestProgress = {
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
  needsAction: boolean;
};

export function studentHelpAllowedForProgram(article: { slug: string | null; category: string; title: string } | null | undefined, repositoryDepositEnabled: boolean): boolean {
  if (!article?.slug) return false;
  if (repositoryDepositEnabled) return true;
  return article.category.toLocaleLowerCase("pt-BR") !== "autodepósito"
    && !/(autodep[oó]sito|self.deposit|reposit[oó]rio|repository|ri[/-]ufba)/i.test(`${article.slug} ${article.title}`);
}

export function studentOverviewHelpSlug(status: string | null, nadaConstaStatus: string | null, hasHomologation: boolean, repositoryDepositEnabled: boolean): string | null {
  if (!status) return "preparar-solicitacao";
  if (status === "changes_requested") return "corrigir-solicitacao";
  if (status === "completed" || status === "canceled") return null;
  if (!nadaConstaStatus || nadaConstaStatus === "rejected") return "emitir-nada-consta";
  if (status === "approved" && hasHomologation && repositoryDepositEnabled) return "concluir-autodeposito";
  return null;
}

export function studentRequestProgress(status: string, nadaConstaStatus: string | null, hasHomologation: boolean, language: InterfaceLanguage = "pt", repositoryDepositEnabled = true): StudentRequestProgress {
  const t = (source: string) => uiText(language, source);
  if (status === "canceled") return { title: t("Protocolo cancelado"), description: t("Consulte o motivo do cancelamento em Minhas solicitações."), actionLabel: t("Ver protocolo"), actionHref: "/painel/solicitacao", needsAction: false };
  if (status === "completed") return { title: t("Protocolo concluído"), description: t("Seu atendimento foi encerrado. Consulte os dados e o histórico do protocolo."), actionLabel: t("Ver protocolo"), actionHref: "/painel/solicitacao", needsAction: false };
  if (status === "changes_requested") return { title: t("Correções solicitadas"), description: t("A biblioteca indicou campos que você precisa corrigir para continuar a análise."), actionLabel: t("Corrigir campos pendentes"), actionHref: "/painel/solicitacao/corrigir", needsAction: true };
  if (!nadaConstaStatus || nadaConstaStatus === "rejected") return { title: t(nadaConstaStatus === "rejected" ? "Reenvie o Nada Consta" : "Envie o Nada Consta"), description: t(nadaConstaStatus === "rejected" ? "A biblioteca devolveu o documento. Consulte o motivo e envie um novo PDF." : "O Nada Consta ainda não foi enviado. Você pode enviá-lo enquanto a biblioteca analisa o trabalho."), actionLabel: t("Ir para o Nada Consta"), actionHref: "/painel/solicitacao#nada-consta-title", needsAction: true };
  if (nadaConstaStatus === "pending") return { title: t("Nada Consta em conferência"), description: t("O documento foi recebido. Aguarde a validação pela biblioteca."), actionLabel: t("Acompanhar protocolo"), actionHref: "/painel/solicitacao", needsAction: false };
  if (status === "approved" && hasHomologation) return { title: t("Ficha disponível"), description: t(repositoryDepositEnabled ? "A ficha foi homologada e o Nada Consta aprovado. Consulte a ficha e as orientações para o autodepósito." : "A ficha foi homologada e o Nada Consta aprovado. Consulte e baixe sua ficha."), actionLabel: t(repositoryDepositEnabled ? "Ver ficha e orientações" : "Ver e baixar ficha"), actionHref: "/painel/solicitacao", needsAction: true };
  return { title: t("Em análise pela biblioteca"), description: t("O Nada Consta foi aprovado. Aguarde a análise e a homologação da ficha."), actionLabel: t("Acompanhar protocolo"), actionHref: "/painel/solicitacao", needsAction: false };
}
import type { InterfaceLanguage } from "@/lib/interface-language";
import { uiText } from "@/lib/ui-text";
