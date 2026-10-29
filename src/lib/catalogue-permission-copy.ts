/** Presentation only: permission codes, grants and defaults remain unchanged. */
export const cataloguePermissionCopy: Record<string, { action: string; description: string }> = {
 "admin.subjects.view": { action: "Consultar assuntos e autoridades", description: "Consultar termos preferidos, variantes, fontes e usos dos assuntos na catalogação." },
 "admin.subjects.manage": { action: "Gerenciar assuntos e autoridades", description: "Cadastrar, revisar, importar e mesclar assuntos; validar e ativar termos locais no cadastro ou na própria análise; ativar, desativar e excluir cadastros sem uso, preservando o histórico." },
 "admin.cdu.view": { action: "Consultar catálogo CDU", description: "Consultar códigos, descrições, edições, hierarquia, auxiliares e relações do repertório local." },
 "admin.cdu.manage": { action: "Gerenciar catálogo CDU", description: "Cadastrar códigos, montar notações, revisar edição e hierarquia, mesclar duplicatas e validar descrições técnicas." },
};
