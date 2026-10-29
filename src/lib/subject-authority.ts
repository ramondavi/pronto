export type SubjectCatalogueMatch = { id: string; preferred_label_pt: string; preferred_label_en: string | null; source_code?: string | null; matched_variant?: string | null };
export function canOfferAuthorityImport(value: string, matches: SubjectCatalogueMatch[], searchState: "pending" | "ready" | "error" | "idle") {
 return searchState === "ready" && value.trim().length >= 2 && matches.length === 0;
}
export function authorityImportError(code: string): string {
 if (/authority_label_conflict/.test(code)) return "Já existe um assunto com esse texto. Confira o cadastro e confirme o vínculo antes de importar.";
 if (/authority_version_conflict/.test(code)) return "Este identificador já tem outra versão guardada. A importação foi interrompida para preservar o cadastro existente.";
 if (/active_merge_target_required/.test(code)) return "O assunto está desativado ou mesclado. Confira o destino na Administração.";
 if (/controlled_term_english_conflict/.test(code)) return "O equivalente em inglês difere do cadastro existente. Confira as fontes antes de continuar.";
 if (/request_locked|permission|active_staff/.test(code)) return "Você não pode importar neste atendimento agora. Confira a situação e o responsável.";
 return "Não foi possível confirmar a importação. Confira a conexão e tente novamente. Se o problema persistir, avise a administração.";
}
export const normalizeSubjectLabel = (value: string) => value.replace(/[\p{Cc}<>]/gu, "").replace(/\s+/gu, " ").replace(/^[ .;,:]+|[ .;,:]+$/g, "");

// Publicação depende da migração 202610280002; o banco mantém as guardas de acesso.
export const manualSubjectStorageEnabled = true;
