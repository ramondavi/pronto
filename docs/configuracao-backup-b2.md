# Implantação do backup independente no Backblaze B2

Preparado em 23/10/2026. O executor está em `scripts/backup/run_backup.py`; a rotina agendada está em `.github/workflows/backup.yml`. Esta entrega prepara a integração; não cria conta, bucket, chaves ou cópias de produção. A ativação depende dos itens abaixo e de confirmação de acesso remoto conforme as regras do projeto.

## Funcionamento

O GitHub Actions verifica diariamente às 08h23 UTC (05h23 de Brasília), com possíveis atrasos do agendador. A rotina lê o banco em transação somente leitura com snapshot consistente. Calcula hashes ordenados dentro do PostgreSQL, transferindo apenas resumos para detectar inclusões, alterações e exclusões; não usa somente datas de atualização, contadores voláteis ou existência de fichas novas.

São cobertos esquema, dados, funções, políticas e permissões dos schemas `public`, `auth`, `storage` e `supabase_migrations`, além das definições de papéis sem suas senhas. Contas e identidades do Auth entram no arquivo criptografado; nunca no repositório ou nos logs. Versões de extensões e sequências entram na verificação. Um schema de aplicação fora da lista ou bucket não revisado interrompe a execução para revisão da cobertura. Schemas gerenciados de extensões, como Vault, Cron e Realtime, não são tratados como dados de negócio recuperáveis por esta exportação. Suas dependências e configurações precisam ser reconstituídas pelas migrações e pelo inventário institucional, sem presumir que o dump recupere segredos de Vault em outro projeto.

Sem mudanças, registra a verificação e confirma a existência da última cópia concluída. Com mudanças, usa `pg_dump` com o mesmo snapshot e exporta separadamente os PDFs privados do Nada Consta. Confere tamanho, assinatura PDF e inventário antes/depois do download; alterações concorrentes no Storage interrompem a tentativa. O Storage e o PostgreSQL não oferecem uma transação única compartilhada. O Pronto! usa nomes de objetos exclusivos, sem sobrescrita, condição que deve permanecer para este método de conciliação.

Empacota os dados e um manifesto com hashes e os criptografa com `age`, usando somente a chave pública do destinatário. A chave privada não fica no executor. Envia ao B2 e baixa o arquivo criptografado para conferir SHA-256. Somente depois grava um marcador de conclusão. Um envio interrompido ou inválido não substitui a última cópia válida. Os nomes de objetos e dados pessoais ficam dentro do pacote criptografado; os relatórios externos contêm apenas datas, resultado e identificador técnico da cópia.

Aos 80 dias, renova a cópia mesmo sem mudanças, para não perder o último ponto recuperável por expiração. O destino mantém retenção de 90 dias. A verificação sem alterações não estende a vida de arquivos antigos com documentos já eliminados: uma renovação exporta novamente o estado atual, respeitando os expurgos.

## Conta e armazenamento — configuração ainda pendente

1. Criar conta B2 sob custódia adequada à operação institucional, sem contratar plano pago; habilitar autenticação de dois fatores. O usuário faz o cadastro/login pessoal, sem entregar senha ao agente.
2. Criar um bucket dedicado, privado, com Object Lock. Configurar retenção padrão em modo **Compliance por 90 dias**. Essa trava impede exclusão antecipada das versões protegidas; o efeito deve ser compreendido antes de configurar. Não habilitar retenção legal indefinida.
3. Configurar uma única regra de ciclo de vida para todo o bucket: ocultar versões atuais após 89 dias e eliminar versões ocultas após 1 dia. O Object Lock impede eliminação antes dos 90 dias e o processamento diário pode causar pequena diferença operacional na data efetiva. Confirmar que `GetBucketLifecycleConfiguration` devolve `Expiration.Days=89` e `NoncurrentVersionExpiration.NoncurrentDays=1`; diferenças de representação da API devem ser conciliadas e testadas antes de ativar, nunca contornadas desabilitando a validação.
4. Criar credencial limitada ao bucket com leitura, listagem e escrita de arquivos, leitura de configuração do bucket, retenção e ciclo de vida. Não conceder exclusão de arquivos/bucket, alteração de retenção, geração de chaves ou bypass de proteção. Nunca usar a chave mestra na rotina de backup. Para o cadastro inicial com permissões exatas, o assistente local abaixo pode utilizá-la somente em memória, sem cadastrá-la no GitHub. A configuração do bucket fica sob credencial institucional separada.
5. Configurar limites e alertas de custo da conta para impedir gastos não aprovados. A franquia de 10 GB não é garantia de custo zero em qualquer volume de operações ou downloads. Não cadastrar cartão ou habilitar cobrança em nome do projeto sem decisão do responsável.

O executor bloqueia novos envios quando versões visíveis/ocultas, somadas ao novo arquivo e uma reserva, atingirem 8 GB; também recusa um arquivo maior que 2 GB. Não apaga cópias protegidas para caber. Essa proteção cobre o bucket dedicado, não o consumo de outros buckets ou serviços na mesma conta.

## Executor e credenciais

Criar o ambiente GitHub **backup-production**, limitando a execução à branch `master`. A rotina não recebe credenciais em pull requests. Não usar runners compartilhados de terceiros nem publicar artifacts dos backups. A cópia de trabalho e os temporários existem somente no runner efêmero, com permissões restritas e limpeza ao término.

| Environment secrets | Finalidade |
| --- | --- |
| `BACKUP_PG_HOST`, `BACKUP_PG_USER`, `BACKUP_PG_PASSWORD` | Conexão de sessão ao PostgreSQL de produção, porta 5432; não usar pooler de transações |
| `BACKUP_PG_CA_CERT` | Certificado público CA baixado da seção SSL do Supabase; nunca uma chave privada |
| `BACKUP_STORAGE_READ_TOKEN` | Credencial de servidor para leitura dos PDFs; nunca enviar ao navegador, logs ou chat |
| `BACKUP_B2_KEY_ID`, `BACKUP_B2_APPLICATION_KEY` | Acesso limitado ao bucket B2 |
| `BACKUP_HEARTBEAT_URL` | Identificador secreto do monitor externo |

| Environment variables | Finalidade |
| --- | --- |
| `BACKUP_SUPABASE_URL` | Endereço público do projeto correto |
| `BACKUP_B2_ENDPOINT`, `BACKUP_B2_REGION`, `BACKUP_B2_BUCKET` | Destino privado confirmado |
| `BACKUP_AGE_RECIPIENT` | Chave pública age; a identidade privada correspondente fica sob custódia institucional separada |

Usar PostgreSQL 17, conforme o projeto; falha de compatibilidade ou acesso deve interromper a rotina. A conexão exige TLS com validação de certificado (`verify-full`, CA pública do projeto fornecida em BACKUP_PG_CA_CERT e materializada somente em arquivo temporário). Avaliar os privilégios necessários sem criar usuário ou aplicar migração remota automaticamente. `row_security=off` evita aceitar uma exportação silenciosamente filtrada por RLS. As credenciais de backup são privilegiadas e devem ficar exclusivamente no ambiente protegido do executor. Credenciais da aplicação não recebem acesso ao B2 nem à identidade de descriptografia.

A chave pública age e sua identidade privada devem ser produzidas em ambiente institucional controlado. Entregar a identidade privada ao responsável e substituto por mecanismo institucional; não exibi-la no terminal de logs, versioná-la ou colocá-la em GitHub Secrets. Comprovar a descriptografia com ela no ensaio, sem registrar o valor. Nenhuma identidade de produção foi gerada nesta entrega.

Somente após todas as configurações e autorização para a primeira leitura/cópia remota, cadastrar a variável de repositório `BACKUP_ENABLED=true`. Antes disso, o workflow permanece inativo. Não é necessário mudar o plano da Vercel ou do Supabase, mas o volume real pode exigir reavaliação da solução gratuita.

## Alertas e ausência de execução

Configurar um monitor externo compatível com a Pinging API do Healthchecks.io (ou revisar o adaptador para serviço institucional equivalente), com destinatários institucionais do responsável e substituto. A rotina envia início, sucesso ou falha sem corpo de logs/dados pessoais. O monitor deve avisar também se nenhum sucesso chegar no intervalo esperado; isso cobre falhas antes de o script iniciar e suspensão do agendamento no GitHub.

O endpoint do monitor é segredo. Não confundir sua configuração com autorização para enviar testes a estudantes ou terceiros: direcionar os testes somente aos responsáveis definidos. Escolher/configurar a conta do monitor continua pendente; a implementação não presume sua ativação. Ao configurar intervalo e tolerância para atrasos, registrar qualquer diferença em relação à meta de 24 horas e não declarar SLA garantido pelo plano gratuito.

## Controle de franquias

Medir o primeiro arquivo e o tráfego no painel do Supabase, incluindo a exportação, antes de autorizar a rotina contínua. O banco Free tem franquia de saída de dados; exportar somente em dias com mudanças reduz o uso, mas dias consecutivos com mudanças podem ultrapassá-la. O cálculo de hashes não baixa todas as linhas, porém consome processamento no banco. O executor não mede toda a franquia de tráfego do Supabase nem garante custo zero em todos os serviços.

Estimar 90 dias de versões, objetos, marcadores e relatórios, além do download para verificação. Manter margem para renovação e ensaios. Atingir limite deve gerar alerta e decisão; não reduzir retenção, interromper expurgos ou apagar a última cópia válida para economizar. Com volume incompatível, registrar que a meta não cabe nas franquias e avaliar custódia institucional ou novo orçamento.

## Ensaio e aceite

Os testes em `.github/workflows/backup-checks.yml` usam PostgreSQL e contas fictícias locais, sem segredos ou acesso remoto. Conferem inclusão, edição, exclusão, conta bloqueada, RLS, política, permissão e sequência, além de snapshot, restauração em outro banco sintético e criptografia/descriptografia com identidade descartável. Não equivalem a um ensaio de recuperação de Supabase Auth/Storage de produção.

Para o aceite, executar o roteiro de `protocolo-backup-recuperacao.md` em destino institucional isolado e compatível com a versão do Supabase, com integrações desabilitadas. Inspecionar o catálogo do archive e reconstituir os componentes da plataforma antes de selecionar objetos a restaurar: não aplicar cegamente o dump completo sobre schemas gerenciados já existentes. Usar o esquema/roles exportados e migrações como referência, sem restaurar senhas de papéis ou configurações privilegiadas automaticamente.

Comprovar contas e vínculos, schema/RLS, fichas, auditoria, extensão necessária e objetos do Storage; invalidar sessões/tokens restaurados quando aplicável. Reconfigurar SMTP/Vault e reativar tarefas somente após conciliação. Reaplicar exclusões e restrições vencidas antes de liberar acesso. Registrar tempos, resultados e falhas sem dados pessoais, apagar temporários e confirmar expiração e alertas. A necessidade de adaptação de schemas gerenciados deve ser resolvida no ensaio, antes de declarar recuperação aprovada.

## Referências

- [Supabase: backup e restauração](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore)
- [Supabase: backups e limitação do Storage](https://supabase.com/docs/guides/platform/backups)
- [Backblaze: ciclo de vida](https://www.backblaze.com/docs/en/cloud-storage-lifecycle-rules)
- [Backblaze: Object Lock](https://www.backblaze.com/docs/cloud-storage-object-lock)
- [GitHub: limitações de agendamento](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows)
- [Monitor: sinais de início, sucesso e falha](https://healthchecks.io/docs/http_api/)

## Cadastro local da credencial com permissões exatas

O formulário padrão do Backblaze oferece grupos amplos de acesso. `scripts/backup/provision_b2.py` prepara uma credencial restrita ao bucket pronto-backups com listagem, leitura, escrita e leitura das configurações necessárias, sem deleteFiles, alteração de retenção ou criação de outras chaves. A validade é de 180 dias; revisar e renovar antes do vencimento como parte da operação, sem apagar a credencial anterior até validar sua substituta.

O responsável preenche pessoalmente a credencial mestra numa página local temporária, sem passar os valores ao agente. O assistente usa somente a API oficial do Backblaze por HTTPS e cadastra apenas a credencial filha nos dois GitHub Secrets do ambiente backup-production, por entrada padrão do cliente oficial, sem valores na linha de comando. A credencial mestra não é persistida, exibida, enviada ao GitHub nem usada pelo backup. Uma falha no cadastro revoga somente a credencial nova criada naquela tentativa; nunca remove chaves existentes ou arquivos.

O servidor escuta somente em 127.0.0.1, verifica Host, Origin e token contra CSRF, não carrega recursos externos, impede enquadramento e cache, não registra requisições e encerra após sucesso ou 30 minutos. O arquivo de estado contém somente endereço local e resultado estático, sem valores de credenciais. O operador não deve enviar capturas da página preenchida ou da tela de chave mestra, nem salvar a mestra no navegador. O agente acompanha apenas o resultado público do cadastro, sem inspecionar campos, clipboard ou tráfego de credenciais.

Configuração acompanhada em 23/10/2026: responsável criou e confirmou a conta, escolheu US East e criou pronto-backups, privado, com criptografia e retenção padrão de 90 dias. Informou conclusão da regra de ciclo de vida 89 dias até ocultar e 1 dia após ocultar para eliminar; confirmar representação pela API antes de ativar. Conta sem cartão: painel mostra limites gratuitos e exige cartão para editá-los, portanto os limites foram mantidos. GitHub: ambiente backup-production criado, restrito à master; endereços públicos cadastrados e BACKUP_ENABLED=false. O cadastro de credenciais e os demais requisitos de ativação seguem pendentes até sua comprovação.

Cadastro B2 concluído pelo responsável: o assistente confirmou configured e os dois nomes de secrets apareceram no GitHub, sem consulta aos valores; BACKUP_ENABLED permanece false. A primeira tentativa foi bloqueada porque Referrer-Policy no-referrer faz o navegador enviar Origin nulo em POST de formulário. Corrigido para same-origin, mantendo Host/Origin estritos e CSRF; reproduzido o bloqueio e aprovado o envio corrigido no navegador com credenciais fictícias e backend simulado. Origens externas, origem nula e token incorreto continuam recusados nos testes.

## Cadastro local do acesso PostgreSQL

O responsável autorizou em 23/10/2026 o cadastro do acesso ao banco nos GitHub Secrets do ambiente backup-production de ramondavi/pronto. O assistente scripts/backup/provision_supabase.py reutiliza as proteções do formulário local, recebe a URI de Session pooler e a senha em campos mascarados e cadastra somente BACKUP_PG_HOST, BACKUP_PG_USER e BACKUP_PG_PASSWORD. A URI completa nunca é armazenada; a senha embutida na URI é ignorada em favor do campo separado. Espaços na senha são preservados.

O cadastro aceita somente o projeto de produção documentado, host do pooler oficial e porta de sessão 5432. Não conecta ao Supabase, não redefine senha e exige BACKUP_ENABLED=false antes de gravar. Falhas parciais mantêm a rotina desativada e permitem repetir o cadastro; não excluem credenciais existentes. O operador acompanha apenas resultado estático e nomes dos Secrets, sem ler campos, clipboard ou tráfego. Certificado CA, acesso ao Storage, chave de recuperação, monitor e primeiro ensaio continuam em etapas separadas.

## Cadastro da chave de servidor para documentos privados

Autorizado pelo responsável em 23/10/2026, no mesmo ambiente protegido do GitHub. O assistente local pode ser iniciado com --storage-key. O responsável cria pessoalmente uma chave dedicada pronto_backup em Settings > API Keys > Secret keys do projeto de produção e a informa somente no formulário local. A página não carrega recursos externos, não armazena a chave localmente e grava apenas BACKUP_STORAGE_READ_TOKEN por entrada padrão do cliente oficial do GitHub. Recusa chaves públicas/legadas e exige a rotina desativada.

Esta chave tem acesso privilegiado ao projeto, não uma limitação técnica a leitura do bucket; o executor a usa somente em GET para os PDFs inventariados do Nada Consta. Chaves atuais sb_secret_ são enviadas no cabeçalho apikey, sem tratá-las como JWT no Authorization. O nome histórico do Secret permanece para evitar alterações de configuração. Compatibilidade com chave service_role legada já existente é mantida no executor; novos cadastros usam o formato atual. A identidade do projeto para chaves opacas não pode ser comprovada só pelo texto: a validade real e a origem da chave dependem do primeiro ensaio controlado.

Acesso PostgreSQL cadastrado pelo responsável; confirmação do formulário e nomes dos três Secrets conferidos sem consulta aos valores. A senha guardada foi descrita como de prévia, portanto sua validade para produção continua sem comprovação. Certificado público prod-ca-2021.crt baixado pelo responsável, validado como CA autoassinada dentro da validade (até 26/04/2031) e cadastrado em BACKUP_PG_CA_CERT. Nenhuma conexão ao banco ou leitura de documentos foi feita nessas etapas. BACKUP_ENABLED permanece false.

Referência do formato atual: https://supabase.com/docs/guides/getting-started/api-keys.

Cadastro da chave dos documentos concluído pelo responsável em 23/10/2026: resultado configured e presença de BACKUP_STORAGE_READ_TOKEN confirmados sem consulta ao valor. O formulário do Supabase aceita nome com letras minúsculas, números e sublinhado: usar pronto_backup, sem prefixar o nome com sb_secret_. Corrigida a orientação; esse prefixo pertence ao valor gerado. A chave ainda não foi testada contra o Storage; BACKUP_ENABLED permanece false.

## Entrega local da identidade de recuperação

O responsável informou usar gerenciador de senhas. scripts/backup/provision_recovery.py prepara uma página local temporária para gerar e entregar a identidade privada como download direto, nunca em HTML, logs, argumentos de processos, arquivo de estado ou GitHub. A geração usa age-keygen oficial; antes de entregar, comprova criptografia/descriptografia de conteúdo sintético. Só o arquivo criptografado desse teste toca temporários; a identidade vai por entrada padrão aos subprocessos.

O operador baixa pronto-recuperacao-backup.txt e guarda pessoalmente seu conteúdo em nota segura ou anexo do gerenciador. Um novo pedido de download na mesma sessão entrega a mesma identidade. Após conferir a guarda, confirma na página; somente então BACKUP_AGE_RECIPIENT recebe a parte pública no ambiente backup-production. O executor permanece desativado. Uma parte pública já cadastrada bloqueia esta preparação: rotação exige preservar as identidades antigas até expirarem todas as cópias correspondentes. A página encerra após confirmação ou 30 minutos e descarta o estado em memória; não recuperar identidades privadas pelo agente.

Foi preparada a distribuição oficial age v1.3.2 para Windows x64, com checksum SHA-256 do pacote conferido contra a publicação oficial em FiloSottile/age. O arquivo privado que o navegador salva em Downloads fica sob controle do responsável; após conferir sua guarda no gerenciador, ele deve remover pessoalmente essa cópia solta. O assistente não lê, transmite ou exclui esse arquivo. A guarda informada pelo responsável não substitui o primeiro ensaio real, a definição institucional de custódia e o acesso do substituto.

Entrega de recuperação concluída em 23/10/2026: o responsável confirmou na página que guardou e conferiu a identidade no gerenciador de senhas; resultado public_recipient_configured e presença do nome BACKUP_AGE_RECIPIENT no ambiente GitHub confirmados, sem leitura de identidade privada ou de arquivo baixado. BACKUP_ENABLED permanece false. Monitor externo, teste dos acessos e primeiro ensaio real ainda pendentes.

## Cadastro do monitor externo

O responsável criou conta Healthchecks.io e o monitor Pronto! — backup diário. Conferidos na captura fornecida os campos Cron 23 8 * * *, UTC e Grace Time 2 hours; confirmou salvamento em 23/10/2026. A integração de e-mail do próprio responsável aparece ativada. O substituto institucional ainda precisa ser definido; não adicionar terceiros nem enviar testes a eles sem autorização.

A rotina está prevista para 05h23 de Brasília. A tolerância de duas horas significa alerta de ausência a partir de aproximadamente 07h23: pode haver cerca de 26 horas desde a execução bem-sucedida anterior. Isso excede a meta nominal de 24 horas em caso de ausência; não interpretar a tolerância ou o plano gratuito como garantia dessa meta. Atrasos do GitHub, tempo de execução e entrega do aviso precisam ser medidos no ensaio.

O responsável autorizou cadastrar o endereço secreto de ping no GitHub. scripts/backup/provision_monitor.py recebe o endereço somente na página local protegida, valida HTTPS e domínio hc-ping.com, exige o endereço base com UUID sem sufixo /start ou /fail, e salva apenas BACKUP_HEARTBEAT_URL no ambiente backup-production. Exige a rotina desativada, não envia pings nem confunde cadastro com backup concluído. O operador acompanha só estado estático e nomes de Secrets. O teste de aviso e a ausência de execução continuam pendentes até sua comprovação.

## Verificação manual anterior à primeira cópia

Cadastro do monitor concluído pelo responsável em 23/10/2026: resultado configured e presença de BACKUP_HEARTBEAT_URL confirmados sem consulta ao endereço. Todos os nomes de Secrets/variables previstos estão presentes; isso ainda não comprova credenciais válidas. BACKUP_ENABLED permanece false.

O workflow backup-preflight.yml é apenas manual, restrito à master e ao ambiente backup-production. Antes de executar, obter aprovação para incorporar o PR e realizar a verificação remota. O teste usa a senha por conexão TLS verify-full, exige sessão somente leitura e consulta apenas SHOW transaction_read_only, SELECT 1 e versão do servidor. Não consulta tabelas de fichas. Lê configuração de privacidade, retenção e ciclo de vida do B2, além da configuração do bucket Nada Consta; não lista nem baixa documentos e não envia objetos ao B2. Testa a parte pública age com conteúdo fictício. Não usa identidade privada nem envia pings de sucesso/falha ao monitor.

Falhas são registradas somente com etapa e código estático, sem exceções detalhadas dos provedores ou valores de credenciais. A verificação não ativa o agendamento, não substitui uma cópia, não comprova permissão de envio e não equivale ao ensaio de recuperação. Após corrigir qualquer falha de acesso, preparar a primeira cópia/recuperação isolada antes de declarar a operação ativa.

A primeira cópia para ensaio pode ser solicitada manualmente em backup.yml com first_copy=true, somente na master e após autorização explícita para copiar os dados ao B2 sob retenção de 90 dias. O valor padrão é false. Esse caminho não altera BACKUP_ENABLED, portanto não ativa as execuções diárias. A incorporação do PR e a verificação prévia de leitura não autorizam essa primeira cópia. Somente depois do ensaio e do aceite da recuperação/alertas autorizar a ativação do agendamento contínuo.

## Diagnóstico acompanhado em 24/10/2026

Após o PR 17, a verificação de produção confirmou conexão TLS ao banco e transação somente leitura, sem consultar fichas. A etapa B2 interrompeu com diagnóstico genérico; nenhuma cópia foi criada e BACKUP_ENABLED continua false.

A revisão identificou duas incompatibilidades com a API documentada: a credencial provisionada não incluía readBucketLifecycleRules, exigida para Get Lifecycle Configuration, e a conferência pressupunha uma única regra S3. O B2 pode dividir a regra nativa em expiração, remoção de versões anteriores e limpeza de marcadores órfãos. A correção aceita as representações equivalentes sem mudar os valores: ocultação em 89 dias, eliminação de versões ocultas após 1 dia e Object Lock COMPLIANCE de 90 dias. Prefixos diferentes, ações adicionais, duplicações, regras desativadas ou outros prazos são recusados.

A permissão adicional lê somente a configuração do ciclo de vida do bucket dedicado. Não concede writeBucketLifecycleRules, writeBucketRetentions, deleteFiles ou acesso ao conteúdo de outros buckets. Criar a credencial substituta exige autorização explícita; será cadastrada em backup-production usando o formulário local protegido. A chave mestra é informada pessoalmente e permanece fora de arquivos, argumentos e logs. Chaves antigas não são apagadas automaticamente. Confirmar o resultado remoto e depois revisar a revogação da credencial antiga pelo responsável.

Os diagnósticos B2 agora distinguem a operação e categorias fixas de permissão, autenticação, assinatura, rede e configuração; mensagens do provedor, identificadores de requisição e códigos desconhecidos não são publicados. Uma permissão ausente está comprovada no provisionador; a causa completa da execução remota só será confirmada depois da substituição e do novo teste.

Fontes oficiais: [permissões S3](https://www.backblaze.com/docs/cloud-storage-s3-compatible-app-keys) e [representação das regras](https://www.backblaze.com/apidocs/s3-get-lifecycle-configuration). Os 56 testes Python passaram, incluindo as duas representações e casos que devem ser recusados, além de exportação, criptografia e restauração exclusivamente fictícias no PostgreSQL local.

## Primeira cópia autorizada em 24/10/2026

O responsável informou que ainda não há PDFs no Pronto e autorizou a primeira cópia real, sem ativar a agenda. Após o PR 18 e o recadastro protegido da credencial B2, a verificação completa passou: TLS e transação somente leitura, privacidade/retenção/ciclo de vida do B2, configuração do Storage privado e criptografia de mensagem fictícia para a parte pública de recuperação.

A primeira tentativa de exportação interrompeu por sequences_changed_during_backup, antes do envio; a repetição retornou execution_failed. Não há confirmação de cópia válida. Não presumir ausência de objetos órfãos na segunda falha, pois o diagnóstico anterior não indicava a etapa. A proteção contra mudança de sequência permanece: não ignorar a falha nem declarar a exportação consistente.

A revisão também identificou ausência de checksum de transporte explícito nos PutObject. O protocolo S3 exige Content-MD5 ou checksum equivalente para objetos com retenção. A correção envia Content-MD5 do arquivo já criptografado e dos marcadores/relatórios, sem substituir SHA-256, TLS ou criptografia age. O arquivo é baixado e conferido por SHA-256 antes do marcador de conclusão. Não há permissão nova, exclusão automática de objetos ou alteração de retenção.

A execução passa a registrar somente nomes fixos de etapas e categorias fixas de falha. Mensagens do provedor, stderr, SQL, arquivos, nomes de documentos, respostas e credenciais não são publicados. A nova tentativa remota deve comprovar a causa e o resultado depois da incorporação; a autorização da primeira cópia já foi dada, mas o agendamento continua desativado. Ensaio real de restauração e testes de alerta ainda pendentes.

Referência: [requisitos de upload com Object Lock](https://docs.aws.amazon.com/us_en/AmazonS3/latest/userguide/object-lock-managing.html).
