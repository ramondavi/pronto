export type RequestProgressInput = {
  status: string;
  nadaConstaStatus?: string | null;
  hasHomologation?: boolean;
  hasRepositoryDeposit?: boolean;
  hasPublication?: boolean;
  assignedTo?: string | null;
};

export type RequestProgress = { label: string; tone: "waiting" | "active" | "ready" | "done" | "attention" };

export function describeRequestProgress(input: RequestProgressInput): RequestProgress {
  if (input.status === "completed" || input.hasPublication) return { label: "Protocolo encerrado", tone: "done" };
  if (input.status === "canceled") return { label: "Atendimento cancelado", tone: "attention" };
  if (input.status === "changes_requested") return { label: "Aguardando correção do estudante", tone: "attention" };
  if (input.status === "submitted") return { label: input.assignedTo ? "Aguardando início da análise" : "Aguardando responsável", tone: "waiting" };
  if (input.status === "in_review") return { label: "Em análise bibliotecária", tone: "active" };
  if (input.status === "approved") {
    if (input.nadaConstaStatus !== "approved") return { label: input.nadaConstaStatus === "pending" ? "Nada Consta em validação" : "Aguardando Nada Consta", tone: "waiting" };
    if (!input.hasRepositoryDeposit) return { label: "Ficha liberada — aguarda autodepósito", tone: "ready" };
    return { label: "Aguardando validação no RI/UFBA", tone: "waiting" };
  }
  return { label: "Em acompanhamento", tone: "waiting" };
}
