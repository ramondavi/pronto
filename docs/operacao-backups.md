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
- Definir o substituto nominalmente e seu contato institucional. Não compartilhar a conta pessoal do responsável.
- Confirmar a custódia institucional da chave de recuperação e o acesso individual mínimo do substituto; guardar a chave separada do B2 e do GitHub. Não registrar valores na documentação, chat ou logs.
- Garantir que o substituto disponha do pacote manual e dos acessos necessários antes de uma indisponibilidade. A existência do código no Git não comprova entrega, treinamento ou acesso ao pacote.
- Autorizar uma cópia operacional atual. A última execução bem-sucedida consultada em 28/10 continua sendo a de 24/10; as execuções agendadas seguintes foram ignoradas com BACKUP_ENABLED=false.
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
