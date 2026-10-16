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

- A fila transacional é processada a cada cinco minutos por Supabase Cron, que chama `POST /api/internal/email-delivery` na Vercel. O endpoint exige o segredo `EMAIL_WORKER_SECRET`; a função de banco aceita somente a chave de serviço no servidor. Nunca exponha essa chave ou a senha SMTP em variáveis `NEXT_PUBLIC_*`.
- Na Vercel Production, configure `SUPABASE_SECRET_KEY` (chave secret atual, nunca a chave pública), `SMTP_PASSWORD` e `EMAIL_WORKER_SECRET` como variáveis do tipo Secret. `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SITE_URL` também precisam estar corretas. O usuário SMTP é `bibarq@ufba.br` e o servidor é `smtps.ufba.br:465` com TLS.
- Após a migração aprovada, cadastre no Supabase Vault `pronto_email_worker_url` com a URL completa do endpoint de produção e `pronto_email_worker_secret` com o mesmo valor de `EMAIL_WORKER_SECRET`. Enquanto faltarem esses dois itens, a tarefa agendada não chama o endpoint.
- Configure separadamente o SMTP do Supabase Auth para confirmação de cadastro e recuperação de senha; a fila acima não entrega esses modelos. Faça um teste controlado de cada canal antes do lançamento, sem usar dados reais de estudantes.
- A migração adiciona funções restritas à chave de serviço e uma tarefa agendada. Sua aplicação remota exige revisão de impacto e confirmação explícita. A fila limita a cinco tentativas por mensagem; falhas persistentes exigem diagnóstico antes de nova tentativa.

O lançamento público permanece bloqueado enquanto estiverem pendentes o envio de e-mails pela hospedagem e a validação assistida dos fluxos. A responsabilidade operacional, a Política de Privacidade v1.1, a base institucional, os prazos de guarda e os textos transacionais foram confirmados pelo responsável pelo projeto; as URLs de produção foram confirmadas no painel do Supabase.

### Sincronização do banco e promoção do site

- Em 15/10/2026, `supabase migration list --linked` mostrou `202610120002` como última migração aplicada. Restam 11 migrações versionadas de 13 a 15/10; não promover uma versão dependente delas enquanto o banco remoto estiver nesse estado.
- Antes de solicitar a aplicação remota, concluir a revisão e a verificação da branch, apresentar o impacto das migrações e obter confirmação explícita. Aplicar as migrações versionadas em ordem, sem executar seus corpos isoladamente no SQL Editor nem alterar o histórico manualmente.
- As migrações acrescentam estruturas e controles para catalogação, atendimento, administração, mensagens, pesquisa e e-mails; também configuram políticas RLS, publicação Realtime, armazenamento e tarefas agendadas. As rotinas de expurgo de mensagens e pesquisa exigem atenção especial à retenção aprovada. A tarefa de entrega de e-mails não chama a aplicação até que os dois segredos do worker estejam no Vault.
- A migração `202610120002` remove as funções, a tabela e a política de ensaio local criadas por migrações anteriores, inclusive as RPCs de entrega via Mailpit, e restabelece a imutabilidade estrita das fichas homologadas. A tela de prévia com dados fictícios e os controles locais de persona, exclusão de protocolo e entrega de e-mails foram retirados do aplicativo. Os testes automatizados permanecem no repositório.
- Depois da aplicação remota e da conferência de compatibilidade, promover o deployment já preparado ou um novo deployment da versão aprovada para `prontobib.vercel.app`. Com a atribuição automática de domínios desativada na Vercel, builds prontos ficam em Production Staged e não atualizam o domínio sem promoção manual.
