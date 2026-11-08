# Localizar um atendimento na fila

**Estado editorial:** rascunho salvo na edição local do Guia da Equipe em 08/11/2026. Passos conferidos no código da interface local; falta conferir capturas e comportamento com os perfis da equipe na versão de produção. O capítulo não está publicado para leitura.

**Resultado:** encontrar um protocolo e reconhecer se ele está ativo ou encerrado. **Para quem:** integrante da equipe com acesso à Fila de solicitações. Esta tarefa é de consulta; assumir, devolver e reatribuir atendimentos terão procedimentos próprios.

## Elementos desta tarefa

| Elemento no Pronto! | O que faz |
| --- | --- |
| **Fila de solicitações** | Abre a fila da equipe. Na barra lateral contraída, aparece pelo ícone. |
| **Fila geral** | Mostra a visão ampla dos atendimentos disponíveis ao perfil. |
| **Meus atendimentos** | Abre a visão filtrada pelos atendimentos atribuídos à pessoa autenticada. |
| **Ativos** | Mostra os atendimentos em andamento. |
| **Encerrados** | Mostra os atendimentos concluídos ou cancelados. |
| **Buscar atendimento** | Procura estudante, matrícula, protocolo, título ou orientador. |
| **Mais filtros** | Abre os campos de filtragem adicionais. |
| **Status** | Restringe a lista a uma situação de atendimento. |
| **Programa** | Restringe a lista a um programa acadêmico. |
| **Tipo de monografia** | Restringe a lista ao tipo de trabalho; as opções dependem do programa escolhido. |
| **Responsável técnico** | Restringe a lista a um profissional ou a protocolos sem responsável. |
| **Tempo na fila** | Restringe a lista pelo tempo desde a solicitação. |
| **Ordenar por** | Altera a ordem de apresentação dos resultados. |
| **Limpar filtros** | Remove busca e filtros ativos; na visão Meus atendimentos, conserva a restrição aos próprios casos. |
| **Legenda** | Explica os estados mostrados na fila. |

Na versão editada dentro do Pronto!, as referências da primeira coluna devem ser inseridas com **Inserir elemento do painel** para acompanhar o rótulo e o pictograma oficiais; campos sem pictograma ficam apenas com o nome.

## Passo a passo

1. Abra **Fila de solicitações**. Se o menu lateral estiver contraído, identifique a fila pelo ícone e expanda ou use o nome exibido ao navegar.
2. Escolha **Fila geral** para procurar em toda a fila visível ao seu perfil, ou **Meus atendimentos** para ver os casos atribuídos a você.
3. Escolha **Ativos** ou **Encerrados**. Os casos concluídos e cancelados ficam em **Encerrados**. Ao trocar entre essas duas situações, a busca e o filtro de status são reiniciados.
4. Em **Buscar atendimento**, digite parte do nome do estudante, matrícula, protocolo, título ou orientador. Os resultados são atualizados na própria tela.
5. Se precisar restringir a lista, abra **Mais filtros** e escolha **Status**, **Programa**, **Tipo de monografia**, **Responsável técnico** ou **Tempo na fila**. Escolher outro programa limpa a seleção anterior de tipo de monografia.
6. Se necessário, altere **Ordenar por**. Confira a quantidade de resultados e identifique o protocolo pelo número, título, pessoa solicitante, programa e situação exibidos no cartão.
7. Para começar outra busca, use **Limpar filtros**. Na visão **Meus atendimentos**, a restrição de responsável continua selecionada; volte a **Fila geral** para consultar os demais casos permitidos.

## Como conferir o resultado

O cartão encontrado mostra protocolo, título, solicitante, dados do trabalho, estado e responsável técnico quando houver. Use a **Legenda** e a linha de evolução para interpretar a situação; a leitura detalhada dos estados terá capítulo próprio. As ações disponíveis no cartão variam conforme a situação, o vínculo com o atendimento e as permissões da pessoa autenticada.

## Conferência antes de publicar

- [ ] Reproduzir a busca e os filtros com dados fictícios plausíveis em conta de catalogador e administrador.
- [ ] Confirmar o comportamento de Ativos/Encerrados e Meus atendimentos na versão instalada em produção.
- [x] Inserir referências semânticas reais na tabela e no passo a passo do rascunho local; reabrir após salvar para confirmar que permanecem editáveis.
- [ ] Capturar a fila, o painel **Mais filtros** e um resultado sem dados pessoais reais.
- [ ] Preencher “Telas e abas abordadas” com **Fila de solicitações; Fila geral; Meus atendimentos** e registrar a versão conferida antes de publicar.
