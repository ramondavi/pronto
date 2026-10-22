# Matriz de validação do MVP

Use esta matriz para registrar evidência, sem dados pessoais reais. “Automatizado” indica cobertura versionada; “assistido” exige execução e aceite humano.

| Área | Evidência automatizada | Validação assistida necessária |
| --- | --- | --- |
| Três perfis | `tests/e2e/authenticated-profiles.spec.ts` e pgTAP de RLS | Salvar sessões locais em `.auth/` e executar o roteiro sem versioná-las |
| Fluxo do estudante | Testes de solicitação, pendência, ficha, Nada Consta, RI e encerramento | Um estudante percorre cadastro até encerramento com dados sintéticos |
| Ticket locking | `staff_queue.test.sql` cobre disputa, edição, devolução e reatribuição | Dois profissionais tentam assumir simultaneamente o mesmo protocolo |
| Segurança e permissões | `authorization_rls.test.sql` e demais pgTAP | Conferir RLS e grants no ambiente implantado |
| LGPD | Retenção/expurgo e visibilidade da coordenação cobertos no banco | Encarregado valida aviso, canal e base institucional |
| Acessibilidade | axe em páginas públicas, teclado e skip link | Leitor de tela, zoom 200% e linguagem com usuários |
| Celular/desktop/rede lenta | Projetos Playwright e latência simulada | Testar aparelho Android real e computador institucional simples |
| Temas | Projetos claro/escuro e persistência automatizada | Inspeção visual das telas autenticadas |
| PDFs | Testes unitários preservam páginas e geometria | Usar ao menos 5 trabalhos finais anonimizados, incluindo PDF grande e páginas rotacionadas |
| Expurgo | `nada_consta.test.sql` | Expurgar objeto descartável e confirmar ausência no Storage |
| E-mails | Testes da outbox, idempotência e destinatários | Revisar conteúdo final e SMTP com responsáveis institucionais |

## Sessões autenticadas locais

Crie manualmente, pelo navegador do Playwright, uma sessão para cada conta sintética já existente e salve os estados como `.auth/student.json`, `.auth/cataloger.json` e `.auth/administrator.json`. A pasta é ignorada pelo Git e deve ser apagada após a rodada. Nunca coloque senha em comando, arquivo de teste, captura ou relatório.

Depois execute `npm run test:e2e:auth`. Um teste ignorado significa que a respectiva sessão não foi fornecida e não conta como validação concluída.

Rodada local de 23/08/2026: 9/9 cenários autenticados aprovados (três perfis em desktop claro, desktop escuro e celular). As três sessões temporárias foram removidas imediatamente após a execução.

## Evidência de implantação inicial

- Supabase remoto: migrações `202608230000` a `202608230010` aplicadas em 23/08/2026; histórico alinhado e lint remoto sem erros.
- Vercel Preview: implantação do merge `6a9de49` concluída com sucesso e protegida por SSO da Vercel.
- Smoke test assistido: página inicial, login remoto e painel do Administrador confirmados pelo responsável.
- Ainda pendentes: smoke remoto de Estudante e Catalogador, PDFs institucionais anonimizados, validação com participantes e promoção para Production.

## Evidência de mesclagem sintética

Rodada de 23/08/2026: o mesmo código de mesclagem usado no navegador inseriu a ficha A4 como página 2 de um PDF sintético de 12 páginas. O documento cobriu A4, Letter, Legal, páginas paisagem e uma página com rotação de 90 graus. A validação confirmou 13 páginas finais, preservação exata da geometria e rotação das 12 páginas originais, ausência de formulário incorporado e renderização legível das páginas representativas. A validação com exemplos institucionais reais continua pendente, conforme a decisão existente sobre o layout provisório.

## Roteiro assistido

Para cada participante, registre apenas perfil, data, dispositivo, tarefa, resultado, dificuldade observada e severidade. Não registre CPF, senha, arquivo acadêmico, link mágico ou conteúdo de comentários internos.

Tarefas do estudante: criar conta; abrir solicitação; compreender o prazo; corrigir somente os campos devolvidos; baixar ficha; anexar Nada Consta descartável; iniciar o guia do RI; localizar o encerramento.

Tarefas do Catalogador: filtrar e assumir ticket; observar bloqueio concorrente; devolver pendência; salvar catalogação; homologar; validar Nada Consta; registrar publicação.

Tarefas do Administrador: bloquear conta; alterar perfil; reatribuir ticket; configurar programa/SLA; publicar mural; consultar estatísticas/logs; executar expurgo descartável.

Critério de saída: nenhuma falha crítica ou alta aberta, nenhum vazamento entre perfis, todas as tarefas essenciais concluídas e aceite institucional das pendências de lançamento.


## Consolidação para lançamento — 22/10/2026

- Autorização do responsável: consolidar alterações, validar, abrir PR, aplicar migrações e atualizar produção. Os testes antes adiados passam a ser executados nesta entrega.
- `npm run verify`: 133 testes aprovados, typecheck aprovado, lint aprovado (13 avisos não bloqueantes existentes) e build de produção aprovado. Relatório local: `tmp/verification/run-1BuFu2/summary.json`.
- Banco local isolado em portas 563xx: todas as migrações reaplicadas; lint sem erros; 261 testes pgTAP aprovados em 13 arquivos. Relatório local: `tmp/db-validation-tests-2.log`.
- Testes antigos do depósito foram adaptados à confirmação prévia obrigatória do destino e ao acesso à própria ficha após conclusão sem guia; isolamento entre estudantes continua coberto. Testes dos e-mails verificam URL alternativa por botão, sanitização de resposta, rodapé, botão público em E16/E17 e ausência de acesso interno para coordenação.
- Recuperação de senha preserva o layout responsivo já ajustado no clone principal, incorporado por leitura sem modificar o arquivo de trabalho original. Rodapé e URL foram padronizados.
- Quatro migrações de e-mail aplicadas na prévia pelo CLI, após simulação; produção tem 13 migrações pendentes na simulação, de 202610210000 a 202610220003. Nenhum seed ou role é aplicado no remoto.
- Capturas e gravações omitidas por solicitação expressa do responsável; a verificação de interface usa navegação e testes sem essas gravações.
- A aprovação de publicação consolida os ajustes de e-mail solicitados. O catálogo é referência editorial, não um canal de envio. Não houve envio manual de e-mails nem convite à secretaria. Entrega SMTP real e aceite humano assistido não devem ser declarados comprovados apenas pelos testes automatizados.


### Evidência remota e navegador

- Prévia publicada pela Vercel no commit eb52a1d; domínio habitual preservado. Navegação pública e bloqueio de painel sem sessão conferidos no navegador.
- Produção: 13 migrações aplicadas em ordem pelo CLI; lint remoto aprovado e simulação posterior com `upToDate=true`, sem migrations/seeds/roles pendentes. Quatro modelos Auth salvos pelo painel, preservando os demais ajustes e as credenciais SMTP.
- 39 cenários públicos locais: 36 passaram na rodada de três navegadores; três atingiram 30s no ambiente Windows e passaram na repetição isolada com timeout de 60s (28,8s no teste mais demorado). Nenhuma asserção foi removida. A varredura Axe da Ajuda usa o mesmo orçamento de teste lento da página inicial; a navegação aguarda a interface pronta. Logs: tmp/e2e-public.log e tmp/e2e-public-retry.log.
- PR consolidado: https://github.com/ramondavi/pronto/pull/10. CI externo também executa a suíte de aplicação, navegador e banco. Publicação do frontend segue integração na master após aprovação desse CI, por autorização do responsável.
- Sem sessão autenticada disponível para teste manual dos painéis nesta rodada; não houve solicitação de senha nem envio de código/convite para obter acesso. Cobertura automatizada de regras e autorização não substitui o aceite assistido nem comprova entrega real de SMTP.


- Conferência autenticada em 22/10: sessão ativa redireciona /entrar para /painel sem campos de senha; Depósitos pendentes abre em Administração → Controle; demonstração inicia apenas etapa 0 e o modal de destino incorreto encaminha ao pedido de correção. Encontrado e corrigido rótulo indevido de Nada Consta na fila retrospectiva, com teste de regressão. Verificação completa posterior: 134 testes, tipos, lint e build aprovados (tmp/verification/run-n6G3Ky/summary.json). CI do commit 789d626 também aprovado, incluindo navegador e banco.
