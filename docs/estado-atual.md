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

- Publicado na prévia (`2652f20`): organização móvel da fila e análise, revisão navegável dos campos, atualização do protocolo aberto após correções e conteúdos didáticos do acervo retrospectivo com programa fixo. Sem novas migrações nesta alteração. Testes adiados até solicitação de PR.

- Publicação dos ajustes da fila/acervo confirmada pela Vercel como Ready: `FPnwaxk7hb9QXCvyJuDKH8jgdwpZ`, commit `2652f20`, branch de publicação `codex/ajustes-administracao-remota`. Sem testes funcionais nesta etapa, conforme combinado.

- Em preparação: padronização visual do acervo retrospectivo e de Depósitos pendentes na estrutura completa de Administração. Migração 202610210004 aplicada somente na prévia em 21/10/2026, pela autorização continuada do usuário. Adiciona quatro permissões delegáveis, preservando as exigências anteriores de consulta de protocolo e finalização. O Supabase confirmou a aplicação; não houve envio de lembretes. Migração agora imutável.

- Em preparação: fluxo aprovado de acesso ao RI, etapas 0–3, decisões por trabalho, revisão de respostas e correção de destino. Migração 202610210005 aplicada somente na prévia em 21/10/2026, com confirmação do Supabase, pela autorização continuada do usuário. Cria armazenamento próprio protegido, controle de revisão e confirmação antes do início; não envia mensagens e passa a ser imutável. Testes escritos, sem execução até solicitação de PR.

- 21/10: lembrete opcional de preparo do RI no segundo dia útil, pelo calendário da Biblioteca, com cancelamento e retorno ao trabalho. Migração `202610210006_repository_preparation_reminders.sql` aplicada somente na prévia (`cfntochwiztdcawbaedx`), incluindo histórico de migração e tarefa a cada cinco minutos. Nenhum e-mail disparado manualmente; adesão inicia desmarcada. Testes, fluxo de entrega real e validação visual continuam adiados até a solicitação do PR.

- 21/10: revisão da espera do RI: cadastro libera pergunta após 120 segundos; resposta “Ainda não recebi” habilita lembrete e contato com repositorio@ufba.br. Liberação/correção sem temporizador, com pergunta explícita e opção de atualizar para acesso agora liberado. Modais com duas verificações numeradas e retorno redundante removido. Migração `202610210007_explicit_repository_wait.sql` aplicada somente na prévia (`cfntochwiztdcawbaedx`); testes continuam adiados até o PR.

- 21/10: disponibilidade do guia passa a valer também para retrospectivos, com menu/CTA/relato de URL ocultos quando desativado e acesso direto redirecionado ao protocolo. QR e compartilhamento da ficha preservados por confirmação do usuário. Guia recebe declaração auditada de envio ao RI, sem validar publicação nem alterar regras de Handle. Autoria da responsabilidade lista até três nomes diretos, na ordem da folha de rosto; acima disso, primeiro e ... [et al.], inclusive na edição da prévia e no PDF. Migração `202610210008_repository_availability_submission.sql` aplicada somente na prévia (`cfntochwiztdcawbaedx`). Proposta do item 3 registrada em decisoes-pendentes; testes e revisão visual adiados até pedido de PR.

- 21/10/2026: acesso destacado ao RI contextualizado pela etapa 0 do Antes de começar; inicialmente oculto, cadastro/login no cabeçalho com destaque ou login como Passo 1 ao lado do guia como Passo 2. Sem migração. Testes e validação visual permanecem adiados até solicitação de PR.

- 21/10/2026: ações finais do preparo do RI compactadas; pulso do guia começa no clique de login. Catálogo de traduções das novas telas e modais em src/lib/repository-ui-text.ts, integrado a uiText; datas dos lembretes localizadas e prévia de correção traduzida, cópia em português preservada. Sem migração. Testes adiados até solicitação de PR.

- 21/10/2026: ações finais do caminho direto ao guia substituídas por um botão com duas fases locais: abrir login do RI em nova aba e depois iniciar guia. Ambas pulsantes; alterar respostas volta ao Passo 1. Sem migração; testes adiados até o PR.

- 21/10/2026: orientação final do preparo do RI alinhada à esquerda do botão, com quebra de linha na própria coluna e alinhamento vertical central. Sem migração; testes adiados até o PR.

- 21/10/2026: Passo 1 exige declaração de login concluído por checkbox na mesma superfície visual da ação; abrir o RI apenas habilita a confirmação. Passo 2 surge ao marcar. Ícones à esquerda com 26 px. Traduções incluídas; sem migração e testes adiados até o PR.

- 21/10/2026: removidos login, checkbox e numeração de passos do rodapé; ação final inicia diretamente o guia após a conferência do modal. Preservados login no modal, pulso, ícone à esquerda e traduções. Sem migração; testes adiados até o PR.

- 21/10/2026: conteúdo do guia dá continuidade ao Antes de começar: roteiro combina seleção do destino, valores como referência sem repetir liberação/conferência, orientações de preenchimento e conclusão mais diretas. Cabeçalho e painel final distinguem envio registrado e apontam acompanhamento em Meu espaço; traduções atualizadas. Sem migração; testes adiados até o PR.

- 21/10/2026: removido botão do RI no cabeçalho; roteiro com oito etapas verticais e conectores. Página consulta preparação salva para inicializar guia já iniciado sem regressar automaticamente; chave inclui destino para reiniciar corretamente se ele mudar. Atualização periódica da disponibilidade preservada. Traduções atualizadas; sem migração. Testes e validação visual adiados até PR.

- 21/10/2026: dados de preenchimento posicionados na etapa 3 e confirmação de envio na etapa 8, dentro do roteiro conectado. Orientações gerais junto aos dados antes do upload. Sem migração; sem capturas a pedido do usuário; testes adiados até PR.

- 21/10/2026: coleção na etapa 1 e tipo de documento na etapa 2; excluído grupo de destino da etapa 3. Valores com botões de cópia protegidos contra seleção/cópia/corte/arraste; dia/ano como texto em vez de input e contato do RI protegido também. Sem migração ou capturas; testes adiados até PR.

- 22/10/2026: retomada inclui coleção/tipo nas etapas 1/2 e cópia apenas por botões (16a5beb). Avisos de PDF/A e licença movidos para etapas 4 e 6; link discreto para tutorial oficial de conversão e traduções incluídos. Publicar conjunto na prévia; sem migração/capturas, testes adiados até PR.
