# Cadastro e mesclagem de assuntos e CDU

Preparado em 27/10/2026. Regras: documento-mestre.md, seções 9.1–9.2.

## Utilização

- Assuntos: Administração → Conteúdo → Assuntos → Cadastrar assunto. Escolher primeiro a fonte; português obrigatório, inglês opcional quando confirmado na fonte.
- Mesclagem: abrir Mesclar no registro duplicado, escolher o cadastro a manter e conferir o impacto antes de Confirmar mesclagem. O destino mantém seus campos; o duplicado passa ao filtro Mesclados.
- Não há desfazer automático. Atendimentos abertos vinculados à origem ou ao destino bloqueiam a confirmação. A operação exige a permissão de gestão do respectivo catálogo e gera auditoria.

## Preservação

A operação não troca os vínculos dos protocolos nem reescreve os textos, metadados, tokens de validação ou snapshots das fichas homologadas. Conserva a origem no catálogo com redirecionamento ao destino e impede novos usos do duplicado. Consultas e sugestões aproveitam o histórico reunido, sem duplicar a pontuação de uma mesma ficha. Fontes dos assuntos são reunidas; campos técnicos da CDU de destino são mantidos. A escolha de CDU continua manual.

## Ativação

Migração nova: `202610260001_catalogue_creation_and_merges.sql`. Acrescenta metadados de redirecionamento, funções de cadastro/conferência/mesclagem e proteções de escrita. Não elimina registros históricos. Não altera autenticação, backup nem armazenamento de PDFs.

A aplicação remota exige confirmação explícita do responsável, primeiro no banco de prévia. Aplicada somente à prévia em 27/10/2026 após autorização e CI aprovado; funções confirmadas. Produção não foi alterada. A interface mantém consultas compatíveis com o banco anterior enquanto a migração está pendente; as operações novas dependem da migração.

## Verificação local

Ambiente Supabase dedicado, somente dados fictícios e portas locais. Suíte de banco: 14 arquivos, 284 verificações aprovadas; 23 verificações próprias de cadastro/mesclagem. Cobertura de autorização, duplicidade, confirmação desatualizada, atendimento aberto, redirecionamento sucessivo, auditoria e preservação integral da ficha e seus vínculos. Testes da aplicação: 138 aprovados. Tipos, lint (sem erros; 13 avisos já existentes) e build padrão aprovados. Fluxos visuais conferidos em 1366 px e 390 px: criação, confirmação, mesclagens, consulta dos históricos, bloqueio de edição da origem, ícone e teclado (Espaço, Escape e retorno de foco). Captura consolidada: gestao-catalogos-validacao.png, mantida como evidência local fora do repositório. O build inicial foi impedido pelo vínculo das dependências entre pastas; a validação padrão passou após disponibilizar as mesmas dependências localmente, sem mudança de configuração da aplicação.

Ampliação de edições e estrutura CDU: cdu-repertorio-local.md.
