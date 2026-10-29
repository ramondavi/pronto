# Ensaio de aviso por ausência — 26/10/2026

## Procedimento e resultado

- Criado no mesmo projeto Healthchecks um monitor separado, nomeado **Pronto! — ensaio de ausência (não é backup)**, com período de um minuto e tolerância de um minuto, usando a integração de e-mail já existente do próprio responsável.
- Enviado um único sinal inicial pela ação Ping Now do monitor de ensaio. Nenhum sinal explícito de falha e nenhum sinal ao monitor do backup real foi enviado.
- Observadas as transições UP, atraso (grace) e DOWN após faltar o próximo sinal e vencer a tolerância.
- A integração exibiu registro de entrega atualizado durante o ensaio. O responsável confirmou expressamente: **Recebi o aviso DOWN do ensaio**. A confirmação de chegada à caixa de entrada completa a evidência do envio do serviço.
- Monitor de ensaio pausado após a detecção, com estado paused conferido. Mantido no projeto para preservar o histórico, sem exclusão e sem continuidade do teste.
- Agenda BACKUP_ENABLED=false confirmada; cron e tolerância do monitor diário não foram alterados. Não houve acesso a dados do Supabase, geração de cópia, alteração de produção ou cadastro de outro destinatário.

Endereços de ping e credenciais não foram exibidos nem registrados na evidência. A operação usou os controles da interface e leituras limitadas a nome, estado e duração do ensaio. A captura da integração fica fora do Git e não contém o endereço de ping.

## Limites

O ensaio comprova o mecanismo de detecção e entrega por ausência no modo simples do serviço. Não mede o prazo real do cron diário de produção nem equivale a uma cópia recuperável. O cron permanece previsto para 05h23 de Brasília com tolerância de duas horas; o guia configuracao-backup-b2.md registra a possibilidade de aproximadamente 26 horas desde a execução anterior e a limitação frente à meta nominal de 24 horas. Não usar este teste de dois minutos como prova de cumprimento dessa meta.

Falha explícita e recuperação já tinham recebimento comprovado pelas capturas dos e-mails de 24/10, apresentadas em 26/10. Login pelo Auth, perfis e bloqueio operacional após recuperação, configurações externas, expurgos e substituto autorizado continuam pendências específicas. A agenda não foi ativada e o PR não foi incorporado por este ensaio.
