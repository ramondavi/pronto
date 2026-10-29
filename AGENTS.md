# Pronto! — agentes

## Contexto e economia
- Retomada: docs/estado-atual.md. Regras: docs/decisoes-pendentes.md e mestre. Correções pontuais: leia só o necessário. Não releia instruções inalteradas.
- Antes de propor/alterar regras, leia as seções pertinentes de docs/documento-mestre.md, fonte da verdade, incluindo premissas, escopo e cautelas. Nunca implemente pendências como aprovadas. Atualize o mestre para decisões novas; pergunte em português sobre ambiguidades de negócio.
- Localize referências em docs/mapa-projeto.md. Histórico e guias de configuração somente por necessidade.
- Use rg --files e rg -n em caminhos específicos; leia trechos relevantes completos e amplie se necessário. Não despeje arquivos grandes, gerados, tabelas, lockfiles ou logs.
- Agrupe leituras independentes na mesma chamada, com saída delimitada; não abra cada arquivo em uma rodada. Em snapshots use git grep no ref, sem percorrer todos os arquivos com git show. Não repita buscas/testes/capturas sem mudança, falha ou dúvida; não delegue por garantia.
- Responda em português simples e conciso: resultado, verificações e bloqueios. O usuário não programa: execute, diagnostique, corrija e revalide o trabalho autorizado; não transfira revisão de código, comandos ou testes para ele. Intervenção humana indispensável: uma instrução, botão exato, sem pedir segredos.
- Preserve fluxos e escopo. Nunca economize removendo segurança, testes, tipos, legibilidade ou evidências necessárias.

## Segurança
- Nunca leia, exiba, registre ou versione .env, .env.local, senhas, tokens, chaves ou connection strings.
- No navegador, somente chave pública/publishable Supabase; nunca service_role.
- Autorização no banco por RLS; contas blocked/inactive perdem acesso operacional.
- Migrações incorporadas são imutáveis; alterações em nova migração em supabase/migrations.
- Migração remota exige explicação do impacto e confirmação explícita.

## Git e validação
- Fluxo vigente: alterações só em uma prévia. Abrir PR, testar, validar e publicar produção apenas após sinal do responsável. Navegação e capturas exigem autorização específica.
- Use o clone GitHub com .git e confirme que `git remote get-url origin` aponta para `ramondavi/pronto`, nunca `pronto-historico-privado`, ZIP ou cópia Cloud. Antes de editar: árvore limpa, master atual e branch nova.
- Em cada PR, acrescente a CHANGELOG.md uma nota datada na seção Em preparação; a descrição deve registrar o efeito para usuários ou operação. Use nomes de branches e mensagens de commit referentes ao trabalho, sem nomes de ferramentas, inclusive em prefixos automáticos. Configure a autoria dos novos commits como Ramon Davi Santana. Revise diff/segredos antes do commit; faça commit claro e PR. Sem merge automático, force push, reescrita da master ou exclusão de branches não solicitada.
- Quando o usuário solicitar abertura de PR: execute npm run verify (test, typecheck, lint e build). Use -- --only test typecheck lint build selecionando apenas os afetados para revalidar. Leia o resumo; investigue trechos dos logs de falhas/avisos, nunca despeje todos. Antes disso, adie testes e validações a pedido do usuário. Análise somente leitura não exige rodar testes. Preserve o CI.
- Build sem configuração local: valores públicos/fictícios. Resuma saídas; diferencie falhas de código de limitações do ambiente.
- Mudança visual: quando autorizado, execute a aplicação e confira os fluxos; capturas somente com autorização específica. Testes locais seguros e correções do escopo estão autorizados; não peça confirmação técnica repetida. Banco remoto e decisões institucionais continuam exigindo confirmação.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
