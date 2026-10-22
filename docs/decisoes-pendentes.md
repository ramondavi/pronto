# Decisões pendentes

Este arquivo contém somente pontos que o Documento-Mestre Consolidado ainda não resolveu. Nenhuma opção abaixo deve ser inferida durante o desenvolvimento. Ao resolver uma pendência, atualizar também `docs/documento-mestre.md`.

## Vocabulário, CDU, Cutter e MARC 21

- **CDU:** após uso piloto, avaliar se a fórmula simples `2:1` precisa de curadoria ou refinamento, mantendo a ausência de IA.
- **Vocabulário:** definir futuramente o fluxo administrativo de mesclagem de termos; o cadastro bilíngue, a normalização inicial e a prevenção de novas duplicidades já estão decididos.
- **MARC 21:** na fase posterior, mapear campos/subcampos e o formato útil ao fluxo real do Pergamum.

## DSpace/RI-UFBA

- O mapeamento das telas de TCC, dissertação e tese foi validado em 23/08/2026 com capturas do fluxo real e tutoriais oficiais do RI/UFBA. Permanecem pendentes somente decisões futuras explicitadas abaixo.

## Coordenação, Magic Link e comunicações

- Avaliar após o piloto se a página da coordenação precisa de outros dados além da identificação básica do trabalho, status, SLA e timeline operacional já implementados.
- Cadastrar os e-mails oficiais das coordenações por curso/programa.
- Testar a entrega SMTP pela aplicação hospedada usando `bibarq@ufba.br`. O SMTP institucional aceitou e entregou uma mensagem de teste enviada de um computador local em 12/10/2026. Se o uso hospedado for inviável, escolher o serviço transacional externo gratuito.
- Após o MVP, avaliar integração das notificações da equipe com notificações nativas do navegador/sistema e Web Push, inclusive com a aba do Pronto! fechada; definir consentimento, compatibilidade, operação e retenção das assinaturas antes de implementar.

## Atendimento e operação

- Refinar os textos dos templates de justificativas após uso piloto, sem alterar a decisão de bloquear campos já aprovados.

## Interface

- Detalhar telas e componentes do MVP dentro do design system consolidado.
- Escolher entre as alternativas tipográficas sugeridas quando necessário, sem descaracterizar a identidade da BIB/FA.
- Definir a lista, a descoberta e as combinações de atalhos globais para acelerar a análise bibliotecária, respeitando a regra já aprovada de não executar ações críticas sem confirmação explícita.

## Lançamento

- Testar o envio pela hospedagem e confirmar a configuração SMTP do Supabase Auth antes do lançamento público.
- Executar a validação assistida com estudantes e bibliotecários e registrar o aceite sem dados pessoais.


## Fluxo de publicação no RI — discussão de 21/10/2026

- O bibliotecário já registra URL/Handle ao encerrar; nos retrospectivos, o fluxo vigente também exige a URL informada pela secretaria e o início do guia. Avaliar permitir que a Biblioteca registre e valide a publicação antes dessas ações. Proposta ainda não aprovada: estudante/secretaria declara o envio, Biblioteca valida e informa o Handle definitivo; dispensar a dependência da URL fornecida pelo solicitante. Alternativa: aceitar URL sugerida pelo estudante, sempre dependente de validação bibliotecária.
- Para programas com depósito obrigatório, avaliar acompanhamento separado de “aguardando envio” e “aguardando validação”, lembretes após liberação da ficha e encerramento somente com publicação verificada. Definir a obrigação institucional por programa; a declaração de envio não comprova publicação. Não implementar automaticamente esta proposta.

### Validação individual dos e-mails — 22/10/2026

Aguardando o responsável pelo projeto revisar os 23 modelos e variantes E01–E23 do catálogo docs/revisao-emails/index.html (texto completo: docs/revisao-emails/modelos-completos.md). Nenhuma redação foi aprovada por esta solicitação de apresentação. Marcas locais no catálogo servem como anotações e não alteram envio ou produção.


- Parecer dos e-mails (22/10/2026): E01–E04 aprovados explicitamente no arquivo `docs/revisao-emails/parecer-recebido-2026-10-22.json`. Aplicar a todos os botões o texto de contingência com URL integral imediatamente abaixo; quando houver vários botões, identificar o rótulo correspondente. Rodapé comum em duas linhas contíguas: “Mensagem automática do Pronto!, serviço da Biblioteca da Faculdade de Arquitetura da UFBA.” e “Não responda a este e-mail.”. Incorporar as redações e caixas solicitadas para E05–E15 e E18–E23; lembretes de avaliação têm assuntos e textos próprios nos dias 3/10/17/24, com emoji no assunto e apenas um botão para avaliação. E20–E23 usam apenas o botão para Antes de começar. E16/E17 permanecem sem alteração editorial, aguardando decisão após esclarecimento: ambos terminam em `completed`, mas sem publicação registrada e com guia desativado no momento da conclusão; E13–E15 encerram após conferência da publicação no RI. As alterações não aprovam automaticamente os modelos que receberam pedido de ajuste. Catálogo atualizado com 26 variantes (E19 inclui as três redações adicionais). Migração nova `202610220000_email_review_wording.sql` preparada localmente; nenhuma alteração em migrações anteriores, mensagens já enfileiradas ou produção. Testes e validações adiados até o próximo PR solicitado.


- Refinamento dos e-mails (22/10/2026): URLs alternativas de todos os botões usam 12px, como E06, inclusive modelos Auth; preservar destaques semânticos nos termos revisados. E16/E17 passam a comunicar apenas a conclusão do atendimento da ficha, com trabalho e protocolo, sem citar guia ou RI. A diferença é o destinatário (solicitante/coordenação), mantendo condições de envio. Coordenação não recebe botão para o painel interno. Nova migração local 202610220001_completion_email_wording.sql; não aplicada remotamente. Conteúdo ajustado para conferência, sem aprovação automática integral.


- Terminologia dos e-mails de conclusão (22/10/2026): decisão aprovada de usar “Atendimento concluído” nos assuntos de E13–E17, com protocolo para identificação. Mensagens com publicação mantêm endereço permanente e informação da conferência; sem publicação registrada, informar apenas a conclusão da ficha, sem citar guia ou RI. As regras e o status completed permanecem. Migração 202610220002_unify_completion_email_subject.sql preparada localmente, sem aplicação remota. Substitui a distinção editorial entre protocolo encerrado e concluído.


- Atualização de 22/10/2026: parecer de e-mails e esclarecimentos posteriores consolidados pela autorização de publicação. A antiga pendência editorial de E16/E17 foi resolvida: Atendimento concluído, sem menção ao RI/guia e com botão da página pública do trabalho. Pendências futuras do mestre e aceite assistido não são implementados automaticamente por esta liberação.
