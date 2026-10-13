export type StudentRequestProgress = {
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
  needsAction: boolean;
};

export function studentRequestProgress(status: string, nadaConstaStatus: string | null, hasHomologation: boolean, language: InterfaceLanguage = "pt"): StudentRequestProgress {
  const t = (source: string) => uiText(language, source);
  if (status === "canceled") return { title: t("Protocolo cancelado"), description: t("Consulte o motivo do cancelamento em Minhas solicitações."), actionLabel: t("Ver protocolo"), actionHref: "/painel/solicitacao", needsAction: false };
  if (status === "completed") return { title: t("Protocolo concluído"), description: t("Seu atendimento foi encerrado. Consulte os dados e o histórico do protocolo."), actionLabel: t("Ver protocolo"), actionHref: "/painel/solicitacao", needsAction: false };
  if (status === "changes_requested") return { title: t("Correções solicitadas"), description: t("A biblioteca indicou campos que você precisa corrigir para continuar a análise."), actionLabel: t("Corrigir campos pendentes"), actionHref: "/painel/solicitacao/corrigir", needsAction: true };
  if (!nadaConstaStatus || nadaConstaStatus === "rejected") return { title: t(nadaConstaStatus === "rejected" ? "Reenvie o Nada Consta" : "Envie o Nada Consta"), description: t(nadaConstaStatus === "rejected" ? "A biblioteca devolveu o documento. Consulte o motivo e envie um novo PDF." : "O Nada Consta ainda não foi enviado. Você pode enviá-lo enquanto a biblioteca analisa o trabalho."), actionLabel: t("Ir para o Nada Consta"), actionHref: "/painel/solicitacao#nada-consta-title", needsAction: true };
  if (nadaConstaStatus === "pending") return { title: t("Nada Consta em conferência"), description: t("O documento foi recebido. Aguarde a validação pela biblioteca."), actionLabel: t("Acompanhar protocolo"), actionHref: "/painel/solicitacao", needsAction: false };
  if (status === "approved" && hasHomologation) return { title: t("Ficha disponível"), description: t("A ficha foi homologada e o Nada Consta aprovado. Consulte a ficha e as orientações para o autodepósito."), actionLabel: t("Ver ficha e orientações"), actionHref: "/painel/solicitacao", needsAction: true };
  return { title: t("Em análise pela biblioteca"), description: t("O Nada Consta foi aprovado. Aguarde a análise e a homologação da ficha."), actionLabel: t("Acompanhar protocolo"), actionHref: "/painel/solicitacao", needsAction: false };
}
import type { InterfaceLanguage } from "@/lib/interface-language";
import { uiText } from "@/lib/ui-text";
