# Protocolo de backup, recuperação e preservação — Pronto!

Decisão de 23/10/2026. Este documento complementa o Documento-Mestre e a política interna. Define o procedimento aprovado; não atesta sua implantação. Nenhum backup ou teste de restauração em produção foi executado nesta entrega.

## 1. Objetivo e responsabilidade

Ramon Davi Santana acompanha a execução, os alertas e as evidências. A execução técnica deve ter responsável e substituto nominalmente registrados antes do lançamento, com acesso institucional individual e mínimo necessário. A UFBA mantém as competências institucionais de custódia e privacidade.

Metas iniciais: nenhuma alteração deve passar mais de 24 horas sem cópia recuperável; restabelecimento em até um dia útil. Uma cópia antiga continua válida quando a verificação diária comprova ausência de mudanças. São metas a comprovar no ensaio, não garantias atuais do serviço. Se o ensaio não as cumprir, registrar o bloqueio e corrigir a rotina ou submeter nova meta ao responsável.

## 2. Cobertura e cópias

- Verificar mudanças diariamente; gerar nova cópia quando houver inclusão, alteração ou exclusão, e antes de mudanças críticas autorizadas. Registrar dias sem mudanças; falha de verificação nunca equivale a ausência de mudanças. Renovar a cópia aos 80 dias, mesmo sem alterações, antes da expiração de 90 dias. Incluir dados operacionais, cadastros, protocolos, snapshots das fichas homologadas, auditoria, configurações, esquema, funções, permissões e políticas RLS.
- Incluir um procedimento compatível com o Supabase Auth para recuperar contas e seus vínculos. Exportação CSV/JSON de indicadores não substitui backup completo. Não presumir que uma exportação padrão contenha Auth, papéis, permissões ou configurações externas.
- Copiar separadamente os objetos privados do Storage ainda dentro do prazo de guarda e um inventário para conciliar objetos e registros do banco. Registrar o intervalo entre as cópias e verificar consistência. O backup do banco do Supabase não contém os bytes dos arquivos.
- Manter uma cópia independente do projeto Supabase, criptografada em trânsito e em repouso, preferencialmente sob custódia institucional. Usar acesso separado, versões protegidas contra sobrescrita/exclusão e privilégio mínimo para a rotina; uma credencial comprometida da aplicação não deve permitir apagar todas as versões.
- Guardar as chaves de recuperação em mecanismo institucional separado das cópias, acessível ao responsável e substituto autorizados. Nunca colocar backups, credenciais ou material de recuperação no Git, em logs, chats ou pastas públicas.
- Manter inventário de dependências de recuperação: versão do código e migrações, configurações de Auth, modelos de e-mail, SMTP, domínio e hospedagem. O inventário registra nomes e responsáveis, nunca valores secretos. Recuperar segredos somente pelo mecanismo institucional autorizado.

Backblaze B2 foi escolhido para preparar a integração com franquia gratuita, com executor separado da Vercel. Conta, destino, credenciais, limites e ativação permanecem pendentes. Vercel e Supabase usam plano Free, conforme informado pelo responsável em 23/10/2026. Implantação: docs/configuracao-backup-b2.md. Recursos pagos não estão autorizados por este protocolo. Confirmar o plano atual; se gratuito, não pressupor backup nativo recuperável. Redundância do provedor e replicação não substituem cópias históricas independentes.

## 3. Retenção e preservação

Backups rotativos expiram após 90 dias, salvo preservação necessária documentada segundo a política vigente. O destino deve permitir cumprir essa expiração; proteção contra exclusão não pode impor guarda indefinida.

O Nada Consta continua sujeito à eliminação 60 dias após encerramento. Cópias anteriores ficam segregadas para recuperação, expiram pela rotação e não podem servir como arquivo de consulta. Antes de devolver uma restauração ao uso, reaplicar expurgos e restrições vencidos e conciliar exclusões posteriores à cópia. Manter registro mínimo das eliminações necessárias à conciliação, sem conteúdo do documento.

A guarda acadêmica de 100 anos registrada no mestre exige preservação além dos backups de 90 dias: formatos documentados e abertos para exportação dos dados, dicionário de dados, versões do esquema, vínculos e verificações de integridade. Planejar transferência de custódia e migração de formatos com a UFBA/STI, sem atribuir a esta entrega aceite institucional nem garantia de preservação secular. O Pronto! não armazena o trabalho acadêmico completo nem substitui o RI/UFBA.

## 4. Monitoramento e evidência diária

A rotina registra início, fim, resultado, versão do esquema, tamanho, inventário e verificação de integridade, sem dados pessoais ou segredos. Alertar o responsável e o substituto em caso de falha, verificação ausente por mais de 24 horas ou alteração sem cópia dentro da meta, falta de espaço ou falha de integridade. Detectar também ausência de execução por verificação independente; sucesso do agendador sozinho não comprova cópia utilizável.

O responsável confere diariamente o último ponto recuperável. Cópia defeituosa não substitui a última versão válida. Registrar diagnóstico e correção; não declarar proteção normal enquanto a meta estiver descumprida.

## 5. Ensaio e recuperação

Realizar o primeiro ensaio antes do lançamento público, trimestralmente e após mudanças relevantes de infraestrutura ou do procedimento:

1. Selecionar uma cópia e restaurar em ambiente isolado, com acesso restrito. Desabilitar e-mails, tarefas agendadas, webhooks e outras integrações antes de ativar os dados recuperados. Usar dados sintéticos sempre que bastarem; recuperação de dados reais exige ambiente institucional autorizado, sem exposição em previews ou evidências.
2. Conferir integridade, contagens e vínculos; comparar amostras de cadastros, protocolos, fichas homologadas e auditoria. Verificar recuperação de contas e permissões sem registrar credenciais.
3. Conciliar o inventário do Storage, conferir hashes e reaplicar eliminações devidas. Confirmar RLS, isolamento entre perfis e impedimento operacional de contas bloqueadas/inativas.
4. Medir a idade do ponto recuperado e o tempo de recuperação. Registrar data, identificador da cópia, versão, responsável, verificações, resultado e falhas, sem dados pessoais.
5. Remover o ambiente e as cópias temporárias do ensaio após documentar o resultado. Corrigir falhas e repetir apenas os pontos afetados.

Em incidente real, preservar evidências e avaliar o intervalo de dados afetado antes de restaurar. Restauração sobre produção exige explicação de impacto e confirmação explícita; não sobrescrever dados recentes automaticamente. Preparar retorno à situação anterior, interromper integrações durante a recuperação e reativá-las somente após conciliação, evitando reenvios e ações duplicadas.

## 6. Critério de prontidão

A proteção só pode ser declarada operacional quando houver destino e responsáveis definidos, verificação diária e cópia independente válida, alertas testados, expiração configurada e primeiro ensaio aprovado dentro das metas. Até lá, registrar backup/recuperação como pendência de lançamento.

## Referência técnica

[Backups do Supabase](https://supabase.com/docs/guides/platform/backups): confirmar cobertura e limitações do plano vigente, especialmente Auth, configurações externas e objetos do Storage, antes de escolher a implementação.
