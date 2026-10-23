# Operação do MVP

Este runbook descreve a operação inicial do Pronto! sem registrar credenciais. Decisões institucionais ainda abertas continuam em `docs/decisoes-pendentes.md`.

Responsável operacional: Ramon Davi Santana. Incidentes de privacidade seguem o canal institucional da UFBA indicado abaixo.

## Verificação diária

1. Acesse a página inicial e confirme o aviso vigente da biblioteca.
2. Entre como Administrador e confira contas bloqueadas/inativas, fila de expurgo e logs recentes.
3. Entre como Catalogador e verifique a fila, os prazos e tickets atribuídos.
4. Confirme o canal de envio de e-mails do ambiente. O remetente de produção será `bibarq@ufba.br`, e o envio pela hospedagem ainda precisa ser testado.
5. Não copie CPF, Nada Consta, links mágicos ou conteúdo de trabalho para chamados, planilhas ou mensagens externas.

## Incidentes

- **Login indisponível:** verifique o estado do Auth no painel do Supabase e a URL pública configurada na Vercel. Não compartilhe chaves.
- **Usuário sem acesso:** confirme `status` e `role`. Contas `blocked` e `inactive` devem permanecer sem autorização.
- **Ticket disputado:** não edite diretamente o banco. Use reatribuição administrativa e consulte o log.
- **E-mail pendente:** preserve a linha na outbox e registre o erro técnico sem o corpo da mensagem. Não marque como entregue manualmente.
- **PDF inválido:** peça ao estudante para repetir a geração no próprio navegador com o mesmo trabalho homologado. O arquivo não deve ser enviado ao servidor do Pronto!.
- **Expurgo parcial:** se o Storage foi removido e a confirmação falhou, interrompa novas tentativas e faça conciliação pelo identificador do documento no painel, sem restaurar o arquivo.

## Retenção e LGPD

- O Nada Consta fica em bucket privado e tem expurgo programado 60 dias após o encerramento.
- O expurgo remove o objeto e preserva metadados mínimos e log de auditoria.
- CPF é dado cadastral restrito; coordenações recebem somente a visão de acompanhamento sem CPF, documento ou comentário interno.
- Solicitações relativas a dados pessoais usam `privacidade@ufba.br`, conforme o Aviso de Privacidade oficial da UFBA, que as encaminha à Ouvidoria. Atendimento bibliotecário usa `bibarq@ufba.br`. A Política de Privacidade v1.1 foi aprovada pelo responsável pelo projeto em 12/10/2026.

## Liberação e retorno

Antes de liberar uma versão, execute `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run test:e2e:public`, `npx supabase db lint --local --level error` e `npx supabase test db --local`. Registre commit, data e responsável na evidência de lançamento.

Se houver falha crítica após a publicação, reverta a implantação da Vercel para o artefato anterior. Migrações são imutáveis: correções de banco devem ser feitas por nova migração, nunca por reversão destrutiva.

## Implantação inicial

1. Crie os ambientes Preview e Production na Vercel, preservando o framework Next.js.
2. Cadastre somente a URL do Supabase e a chave pública/publishable como variáveis do navegador. Cadastre segredos apenas nos cofres dos provedores e nunca em variáveis `NEXT_PUBLIC_*`.
3. No Supabase hospedado, ajuste Site URL e Redirect URLs para os domínios efetivos.
4. Revise o impacto e obtenha confirmação explícita antes de aplicar as migrações remotas pendentes.
5. Execute as migrações em ordem, valide RLS, Storage privado, funções e pgTAP; então provisione a primeira conta administrativa pelo procedimento controlado.
6. Faça smoke test dos três perfis e só depois promova a implantação.

### Envio de e-mails em produção

Validação controlada de 22/10/2026: o PR #12 foi integrado e o deployment `fdfd7a7` foi confirmado no domínio público. Um novo link de recuperação foi solicitado para a conta autorizada do responsável; ele confirmou que a confirmação abriu “Nova senha / Confirmar nova senha”. A troca efetiva de sua senha não foi necessária neste ensaio.

No canal transacional, foi enfileirada uma única mensagem identificada como teste autorizado em `account_notification_outbox`, sem criar solicitação de estudante. O processamento agendado pela hospedagem registrou `delivered`, uma tentativa, nenhum erro e horário de entrega preenchido; o destinatário confirmou o recebimento. Esse teste comprova o canal hospedado compartilhado pelo processador das filas, não cada gatilho, template ou comunicação de protocolo. A mensagem de diagnóstico permanece como evidência operacional, sem alteração dos demais registros. O aceite assistido ocorrerá após o teste do retrospectivo RAU+E.

- A fila transacional é processada a cada cinco minutos por Supabase Cron, que chama `POST /api/internal/email-delivery` na Vercel. O endpoint exige o segredo `EMAIL_WORKER_SECRET`; a função de banco aceita somente a chave de serviço no servidor. Nunca exponha essa chave ou a senha SMTP em variáveis `NEXT_PUBLIC_*`.
- Na Vercel Production, configure `SUPABASE_SECRET_KEY` (chave secret atual, nunca a chave pública), `SMTP_PASSWORD` e `EMAIL_WORKER_SECRET` como variáveis do tipo Secret. `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SITE_URL` também precisam estar corretas. O usuário SMTP é `bibarq@ufba.br` e o servidor é `smtps.ufba.br:465` com TLS.
- No Supabase Vault, mantenha `pronto_email_worker_url` com a URL completa do endpoint de produção e `pronto_email_worker_secret` com o mesmo valor de `EMAIL_WORKER_SECRET`. Ambos foram cadastrados em 16/10/2026. A tarefa agendada está ativa; sua última execução sem erro confirma o agendamento, não a entrega de e-mail.
- Configure separadamente o SMTP do Supabase Auth para confirmação de cadastro e recuperação de senha; a fila acima não entrega esses modelos. Faça um teste controlado de cada canal antes do lançamento, sem usar dados reais de estudantes.
- Em 16/10/2026, a recuperação de senha da conta administrativa retornou erro SMTP `535 5.7.8` em duas tentativas. Após o responsável salvar novamente a credencial do SMTP do Auth, a solicitação foi aceita e o destinatário confirmou o recebimento na caixa de entrada. Essa verificação não cobre a fila transacional da Vercel.
- A migração de entrega adicionou funções restritas à chave de serviço e uma tarefa agendada. A fila limita a cinco tentativas por mensagem; falhas persistentes exigem diagnóstico antes de nova tentativa.

O PR3 foi promovido para o domínio público em 16/10/2026. Ainda faltam o teste controlado de envio de e-mails pela hospedagem e a validação assistida dos fluxos antes de considerar concluído o aceite operacional. A responsabilidade operacional, a Política de Privacidade v1.1, a base institucional, os prazos de guarda e os textos transacionais foram confirmados pelo responsável pelo projeto; as URLs de produção foram confirmadas no painel do Supabase.

### Sincronização do banco e promoção do site

- Em 16/10/2026, após revisão de impacto e confirmação explícita, as 11 migrações versionadas de 13 a 15/10 foram aplicadas em ordem ao banco remoto. O `db push --linked --dry-run` indicou o banco atualizado e o `db lint --linked --level error` não apontou erros.
- Para migrações futuras, apresentar o impacto e obter confirmação explícita antes da aplicação remota. Aplicar as migrações versionadas em ordem, sem executar seus corpos isoladamente no SQL Editor nem alterar o histórico manualmente.
- As migrações acrescentaram estruturas e controles para catalogação, atendimento, administração, mensagens, pesquisa e e-mails; também configuraram políticas RLS, publicação Realtime, armazenamento e tarefas agendadas. As rotinas de expurgo de mensagens e pesquisa exigem atenção especial à retenção aprovada. Os dois itens do worker estão no Vault, mas o envio real ainda precisa de teste controlado.
- A migração `202610120002` remove as funções, a tabela e a política de ensaio local criadas por migrações anteriores, inclusive as RPCs de entrega via Mailpit, e restabelece a imutabilidade estrita das fichas homologadas. A tela de prévia com dados fictícios e os controles locais de persona, exclusão de protocolo e entrega de e-mails foram retirados do aplicativo. Os testes automatizados permanecem no repositório.
- Após a aplicação remota, o deployment do commit `e89aaef` (PR3) foi promovido para `prontobib.vercel.app` em 16/10/2026. Com a atribuição automática de domínios desativada na Vercel, builds prontos ficam em Production Staged e não atualizam o domínio sem promoção manual.
- Foram preservadas a conta administrativa, duas contas reais de catalogadores, cinco programas e a ocorrência de fechamento de 26/10 cadastradas pelo responsável. Não tratar esses registros como dados fictícios de teste.

## Backup e recuperação — requisito de lançamento

Seguir docs/protocolo-backup-recuperacao.md. Conferir diariamente último ponto recuperável e alertas. Antes do lançamento, registrar destino independente, executor e substituto, cobertura de banco/Auth/Storage, expiração de 90 dias e primeiro ensaio aprovado. Repetir o ensaio trimestralmente. Não restaurar sobre produção sem impacto explicado e confirmação explícita. Estado em 23/10/2026: protocolo documentado; execução e recuperação ainda não comprovadas nesta entrega.
