# Operação e passagem de responsabilidade dos backups

Situação consolidada em 28/10/2026. Este documento não declara a agenda ativada nem substitui o aceite institucional.

## O que já foi comprovado

| Etapa | Evidência disponível |
| --- | --- |
| Cópia independente criptografada | Execução [40146034584](https://github.com/ramondavi/pronto/actions/runs/40146034584), concluída em 24/10, com inventário de 96 tabelas e nenhum PDF |
| Restauração e equivalência estrutural | [Ensaio de 24/10](validacao-restauracao-2026-10-24.md), ambiente isolado e credencial temporária revogada |
| Auth e permissões após restauração | [Ensaio de 26/10](validacao-auth-restauracao-2026-10-26.md), seis contas fictícias na cópia real já conferida |
| Fluxo do site | [Ensaio separado de 26/10](validacao-site-recuperacao-2026-10-26.md), base inteiramente fictícia, computador e celular |
| Avisos de falha e recuperação | Recebimento pelo responsável documentado no ensaio de restauração |
| Aviso por ausência | [Ensaio de 26/10](validacao-alerta-ausencia-2026-10-26.md), monitor separado pausado ao final |

Não há comprovação de restauração de PDFs reais: nenhum existia nos ensaios. Tampouco há comprovação de recuperação completa do domínio, SMTP e configuração pública apenas a partir dessas cópias. Os ensaios não foram repetidos nesta retomada.

## Pendências para ativar e declarar operação

- Incorporar o PR [#20](https://github.com/ramondavi/pronto/pull/20), após autorização de merge e verificações obrigatórias aprovadas.
- Substituto designado pelo responsável em 28/10. A identificação e o contato devem permanecer no registro operacional restrito, fora do repositório público. Ainda falta comprovar acesso, treinamento e recebimento dos alertas; não compartilhar a conta pessoal do responsável.
- Proton Pass escolhido pelo responsável em 28/10 para a custódia. Ainda falta organizar o cofre destinado à biblioteca, guardar pessoalmente a identidade de recuperação e confirmar o acesso individual do substituto. A escolha do serviço não comprova entrega, titularidade institucional ou aceite. Guardar a chave separada do B2 e do GitHub; não registrar valores na documentação, chat ou logs.
- Garantir que o substituto disponha do pacote manual e dos acessos necessários antes de uma indisponibilidade. A existência do código no Git não comprova entrega, treinamento ou acesso ao pacote.
- Cópia operacional atual concluída em 28/10, após autorização explícita para banco/Auth/documentos privados de produção criptografados no B2. Execução [40724106039](https://github.com/ramondavi/pronto/actions/runs/40724106039), iniciada às 13h15min06s e concluída às 13h19min03s de Brasília; a rotina informou nova cópia conferida. Esse resultado não é um novo ensaio de restauração. A agenda permaneceu desligada.
- Dar aceite explícito para ativar a agenda. A variável permanece false nesta retomada.
- Após ativação, acompanhar um ciclo agendado real e seu relatório de integridade. Não confundir cron configurado, execução ignorada ou aviso UP com prova suficiente de uma cópia atual recuperável.

## Horário e limite observado

O workflow configura 08h23 UTC, correspondente a 05h23 de Brasília, com tolerância de duas horas no monitor. Os metadados consultados em 28/10 mostram eventos agendados criados às 10h14, 12h18, 11h40 e 12h13 de Brasília nos dias 25 a 28/10, respectivamente. Todos foram ignorados pela variável desligada. Esses horários não medem duração de cópia e não explicam, por si, a causa do atraso, mas impedem presumir pontualidade pelo texto do cron.

A agenda e a tolerância atuais não comprovam a meta nominal de proteger mudanças em 24 horas. Antes de declarar essa meta atendida, medir o ciclo real e decidir a margem/frequência ou alternativa operacional com o responsável. Não alterar periodicidade, fornecedores ou custos silenciosamente. Alertas de ausência exigem ação humana; não criam uma cópia automaticamente.

## Rotina do responsável e substituto

1. No [workflow de backup](https://github.com/ramondavi/pronto/actions/workflows/backup.yml), conferir o último resultado e sua data. Resultado skipped não é backup. Quando não houver mudanças, verificar a evidência da conferência recente, sem exigir uma nova cópia idêntica.
2. Acompanhar os avisos do Healthchecks. Se houver falha ou ausência, registrar o período sem proteção e acionar o responsável técnico; não silenciar o monitor para aparentar normalidade.
3. Para cópia durante indisponibilidade de GitHub/B2/Healthchecks, seguir [Backup manual independente](backup-manual-independente.md). O pacote não depende desses serviços durante a geração, mas depende de Supabase e internet. Guardar o arquivo criptografado e o recibo juntos, em destino privado; chave de recuperação separada.
4. Se o Supabase estiver indisponível, uma nova exportação não é possível. Preservar as cópias anteriores e preparar recuperação com suporte autorizado.
5. Para restaurar, seguir [Ensaio isolado](ensaio-restauracao-isolada.md) e [Protocolo](protocolo-backup-recuperacao.md). Não restaurar sobre produção nem reativar integrações sem aprovação de impacto e conciliação de exclusões/restrições.
6. Controlar o expurgo de 90 dias também nas cópias locais. Disco desconectado não elimina arquivos sozinho. Guarda acadêmica de longo prazo continua sendo responsabilidade institucional separada.

## Aceite e sucessão

Registrar data, responsável, substituto e localização institucional dos procedimentos e materiais, sem segredos. A passagem só fica comprovada quando outra pessoa consegue localizar os acessos, gerar uma cópia e participar de uma recuperação orientada usando a documentação, sem depender de Ramon ou desta conversa.

O próximo ensaio trimestral de referência é janeiro de 2027, contado do ensaio de outubro; isso é uma orientação operacional, não um agendamento externo criado nesta retomada. A aba de administração de backups continua uma entrega separada, sem implementação por este documento.

## Registro da execução operacional de 28/10

O workflow de produção executou a etapa Verificar mudanças e preservar cópia com resultado success. A mensagem fixa do executor confirmou nova cópia conferida, distinguindo o resultado de uma conferência sem alterações. Não foram publicados SQL, documentos, nomes privados ou credenciais. O intervalo do workflow inclui preparo das ferramentas e não mede recuperação do serviço. Nenhum ensaio de restauração foi repetido; as evidências de restauração permanecem as de 24 e 26/10.

A tentativa inicial de disparo foi bloqueada pela revisão automática por exigir consentimento específico para exportação sensível. O responsável autorizou expressamente a mesma finalidade e o mesmo destino; só então o run acima foi iniciado. A identificação pessoal do substituto não foi incorporada ao Git público.

## Painel de acompanhamento e pedido — 29/10/2026

Implementação somente na prévia, sem testes de navegação ou disparo de workflow nesta entrega. Atualização em 60 segundos, ou 15 em execução, pausada com a aba oculta e com recuo em falhas. Os metadados públicos podem ter cache de até 60 segundos sem credencial; o navegador conserva os últimos dados com aviso de falha, sem fingir atualização.

O responsável orientou reservar a credencial exclusivamente à produção. A prévia não recebe token e o servidor recusa acionamento fora de produção. Após autorização de publicação: aplicar separadamente 202610290001 em produção e cadastrar BACKUP_PANEL_GITHUB_TOKEN como segredo somente do ambiente production, com token fine-grained restrito a ramondavi/pronto e Actions: Read and write; BACKUP_PANEL_DISPATCH_ENABLED=true somente nesse ambiente. Não usar a chave do Supabase nem reutilizar credenciais do B2. O cadastro dessas variáveis ainda não foi autorizado nem realizado. Nenhum segredo é solicitado no navegador do Pronto!.

Acionamento exige administrador ativo, permissão específica no banco e confirmação da exportação criptografada para o destino existente. A reserva transacional usa UUID idempotente; cinco minutos entre pedidos aceitos/recusados, uma hora para pedidos reservados ou incertos, além de bloqueio enquanto houver execução ativa. Não reenviar automaticamente POST. Um aceite do GitHub significa apenas pedido aceito; conferir o produtor para distinguir cópia nova de verificação sem mudanças. O pedido usa master e first_copy=false: não contorna BACKUP_ENABLED=false.

Auditoria registra somente ator, horário, identificador do pedido e estados fixos, sem credenciais, dados exportados ou logs do produtor. A migração foi aplicada apenas em cfntochwiztdcawbaedx, com histórico 202610290001; produção não foi alterada.

### Distribuição do pacote local — preparada, sem hospedagem

O responsável indicou o pacote existente e determinou hospedar somente ao publicar produção. O ZIP permanece fora do Git, em tmp/Pronto-Backup-Manual.zip do worktree protocolo-preservacao-dados, ao lado da pasta extraída de mesmo nome. A enumeração encontrou 907 arquivos, um inventário de integridade e configuração com apenas project_url, recipient e ca_certificate; não foram encontrados arquivos de backup ou extensões privadas na enumeração. Nenhuma ferramenta foi executada, reconstruída ou novamente ensaiada nesta preparação.

Distribuição proposta e preparada: bucket privado backup-tools, objeto windows/f62fc8b4/Pronto-Backup-Manual.zip, tamanho 46.537.177 bytes e SHA-256 f62fc8b46dba4ed5e04e6972d504793eb742d2f676695d38d7145d68eea79845. Migração 202610290002 preparada, não aplicada. Após autorização da publicação, confirmar que o pacote corresponde ao recebido e permanece sem credenciais, aplicar política privada, enviar esse ZIP por acesso administrativo e conferir tamanho/hash antes de liberar o botão. O endpoint usa sessão normal e RLS, sem service_role, com link temporário de 60 segundos. O servidor nunca envia o ZIP junto ao código da Vercel.

Não houve upload do pacote, criação de bucket ou alteração de produção. Download não é backup nem ensaio de restauração. A configuração pública do pacote inclui o destinatário de criptografia: mudanças da identidade de recuperação exigem preparar e validar uma nova versão antes de substituir a distribuída.

### Autorização de publicação e configuração — 29/10/2026

O responsável autorizou testes, PR e publicação, incluindo os preparativos pendentes. O formulário local confirmou configured para o cadastro de BACKUP_PANEL_GITHUB_TOKEN como Secret e BACKUP_PANEL_DISPATCH_ENABLED=true exclusivamente em production na Vercel. O valor não foi lido pelo agente, exibido, versionado ou recebido pelo chat. O provisionador fez apenas GET do workflow; não verificou o privilégio de escrita por disparo real, não mudou a agenda e não iniciou backup.

O ZIP existente foi conferido contra seus 906 hashes do inventário, sem divergências ou arquivos adicionais; tamanho e SHA-256 coincidem com a referência. A configuração possui somente project_url, recipient e ca_certificate. Não foram reconstruídas ferramentas nem incluídos backups de dados ou credenciais. Hospedagem e migrações de produção serão feitas após as verificações do PR. Testes SQL locais novos: 23 asserções de backup e 17 de permissões passaram; a rodada completa adicional depende do ambiente isolado/CI. Aplicação: 191 testes, tipos, lint sem erros e build passaram; avisos preexistentes não foram ocultados.

### Preparativos concluídos para o PR #24 — 29/10/2026

Migrações de produção aplicadas até 202610290002, sem alteração dos seis conjuntos de registros conferidos. Pacote portátil hospedado em bucket privado de produção; tamanho, inventário e SHA-256 conferidos após download. Credencial de acionamento cadastrada somente em production pelo formulário local. As indicações anteriores de não aplicação/hospedagem descrevem as etapas anteriores desta linha do tempo. Ver validacao-publicacao-2026-10-29.md. A liberação das telas depende do CI e do deploy do PR #24; nenhum backup foi iniciado para verificar a credencial.
