export function cduMutationError(error: { code?: string; message?: string } | null): string {
 const message = error?.message ?? "";
 if (error?.code === "23505") return "Este código CDU já está cadastrado. Abra o registro existente para revisá-lo.";
 if (error?.code === "42501" || message.includes("permission_denied") || message.includes("active_staff_required")) return "Sua conta não tem acesso para gerenciar o catálogo CDU. Solicite a conferência da permissão à administração.";
 if (error?.code === "PGRST202") return "O cadastro CDU não está disponível nesta conexão. Atualize a página; se persistir, avise a administração.";
 if (message.includes("cdu_auxiliary_scope_required") || message.includes("cdu_scope_main_class_required")) return "Selecione uma classe da tabela principal para indicar onde o auxiliar especial pode ser usado.";
 if (message.includes("invalid_cdu_kind")) return "Selecione um tipo de código válido para organizar o registro.";
 if (message.includes("cdu_parent_table_mismatch")) return "O código superior precisa pertencer à mesma tabela deste código. Confira o tipo de código e o superior escolhido.";
 if (message.includes("cdu_parent_scope_mismatch")) return "O auxiliar e seu superior precisam ter a mesma classe de aplicação.";
 if (message.includes("cdu_hierarchy_cycle") || message.includes("cdu_not_self_parent")) return "O código não pode ser superior de si mesmo nem formar um ciclo na hierarquia.";
 if (message.includes("valid_cdu_description_required")) return "Informe um código de 1 a 80 caracteres e uma descrição de 3 a 1.000 caracteres. Confira também a edição escolhida.";
 if (message.includes("current_cdu_reference_required")) return "Um código relacionado foi alterado ou mesclado. Atualize o catálogo antes de selecionar novamente.";
 return "Não foi possível cadastrar a CDU. Os campos foram preservados. Confira a conexão e tente novamente; se persistir, avise a administração.";
}
