# Estado atual — Pronto!

Atualizado em 16/10/2026. Regras: documento-mestre.md; pendências: decisoes-pendentes.md; caminhos: mapa-projeto.md.

## Implementado

- Aplicação Next.js com Supabase: autenticação, perfis/RLS, solicitações, atendimento, catalogação, ficha, Nada Consta, PDF local, guia RI/UFBA, coordenação e administração.
- CI com testes unitários, pgTAP e E2E. Regras aprovadas estão no mestre; operação em operacao-mvp.md.

## Produção e próximo passo

- PR3 publicado em `prontobib.vercel.app`, com entrada pública verificada: permissões individuais, rascunhos, recuperação de senha, barra lateral expansível e nova página inicial.

- Código aberto em `ramondavi/pronto` sob AGPL-3.0, com marcas em `ASSETS.md`. A versão em preparação inclui nove avatares vetoriais para a equipe, além do avatar padrão. O histórico anterior permanece privado.
- Supabase Auth: Site URL, redirects, SMTP e modelos de e-mail configurados. Segredos de produção cadastrados na Vercel.
- Após revisão de impacto e autorização explícita, as 11 migrações de 13 a 15/10 foram aplicadas ao Supabase hospedado. A verificação posterior não encontrou migrações pendentes nem erros no lint remoto.
- Os dois itens do worker de e-mails estão cadastrados no Supabase Vault. A tarefa de entrega está agendada a cada cinco minutos e teve execução registrada sem erro; isso não comprova o envio de uma mensagem real.
- O ambiente já contém a conta administrativa, duas contas reais de catalogadores, cinco programas e uma ocorrência de fechamento em 26/10. Esses registros devem ser preservados.
- Em 16/10, a recuperação de senha do administrador foi validada após correção do SMTP: e-mail recebido e senha alterada. Pendente: SMTP transacional, modelos Auth, perfis, PDFs anonimizados e aceite assistido.


## Em preparação local — 20/10/2026

- Branch `feat/lembretes-ri-metadados-acesso`, baseada na master e no trabalho retrospectivo anterior. Inclui depósitos posteriores, autenticação e metadados. Publicada na prévia pelo commit `9053cbf`.
- Migração `202610210002_repository_deposit_followup.sql` aplicada somente na prévia (`cfntochwiztdcawbaedx`), após autorização explícita em 20/10/2026. A aplicação não envia lembretes; produção preservada.
- Testes e validações adiados por solicitação do usuário até pedir abertura do próximo PR. Cobrir migração/RLS, envio em lotes sem duplicação, acesso ao guia do próprio protocolo e redirecionamento autenticado antes de publicar.
- Aviso Supabase recebido em 20/10: novas tabelas precisarão de GRANT explícito a partir de 30/10. As migrações existentes já concedem os acessos diretos necessários; `coordination_magic_links`, `protocol_counters` e `request_direct_correction_baselines` são internos, acessados por funções restritas; `local_test_personas` foi removida. Não conceder CRUD geral a anon/authenticated para atender ao aviso. Toda nova tabela deve declarar RLS e permissões adequadas na própria migração.

- Ajustes de submissão na mesma branch: contraste do envio; matrícula do primeiro autor e novo pedido destacado para a secretaria; TFG com até três autores. Migração `202610210003_tfg_shared_authorship.sql` aplicada somente na prévia após autorização explícita em 20/10/2026, incluindo vínculo do ano de nascimento apenas ao coautor solicitante e bloqueio do nome da representante como autor retrospectivo.

- O Supabase confirmou a aplicação das migrações 202610210002 e 202610210003 na prévia. Vault, seeds e roles não foram alterados. Interface publicada na prévia pelo commit `9053cbf`; testes adiados até solicitação de PR. As duas migrações aplicadas passam a ser imutáveis.

- Vercel confirmou Ready para o commit `9053cbf`, deployment `JDRTseiGvQZEAroGFGWj8wLLD4gU`, na branch `codex/ajustes-administracao-remota`. Inclui correção do hover; nenhuma publicação em produção ou abertura de PR.

- Em preparação: organização móvel da fila e análise, revisão navegável dos campos, atualização do protocolo aberto após correções e conteúdos didáticos do acervo retrospectivo com programa fixo. Sem novas migrações nesta alteração. Testes adiados até solicitação de PR.
