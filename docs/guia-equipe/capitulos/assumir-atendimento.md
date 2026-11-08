# Assumir um atendimento sem responsável

**Estado editorial:** rascunho salvo na edição local do Guia da Equipe em 08/11/2026. Fluxo conferido no código da interface e na regra de atribuição da branch; falta conferir a operação e as capturas na versão de produção. O capítulo não está publicado para leitura.

**Resultado:** o atendimento passa a ter você como responsável técnico e fica disponível em **Meus atendimentos** para abrir a análise. **Condição:** conta ativa com permissão de assumir atendimentos e protocolo ativo sem responsável.

## Elementos desta tarefa

| Elemento no Pronto! | O que faz |
| --- | --- |
| **Fila de solicitações** | Abre a fila da equipe. No menu lateral contraído, aparece pelo ícone. |
| **Fila geral** | Permite localizar o protocolo que ainda não tem responsável. |
| **Responsável técnico** | Filtro e informação do cartão que ajudam a distinguir casos sem responsável dos já atribuídos. |
| **Assumir atendimento** | Atribui o protocolo à pessoa autenticada quando ele continua disponível. |
| **Meus atendimentos** | Mostra os protocolos atribuídos à pessoa autenticada. |
| **Abrir análise** | Abre o atendimento ativo atribuído a você, quando a permissão de visualização está presente. |

Na edição pelo Pronto!, inserir os elementos da primeira coluna pelo seletor **Inserir elemento do painel**, preservando o ícone real quando houver.

## Passo a passo

1. Abra **Fila de solicitações** e escolha **Fila geral**. Mantenha a visão **Ativos**.
2. Localize o protocolo pelo campo **Buscar atendimento**. Se necessário, abra **Mais filtros** e escolha **Sem responsável** em **Responsável técnico**.
3. Confira número do protocolo, título, solicitante e estado no cartão para evitar assumir outro trabalho de nome parecido.
4. No cartão sem responsável, selecione **Assumir atendimento**. A ação só aparece quando sua conta tem a permissão necessária e o atendimento não está encerrado.
5. Confira se seu nome aparece como **Responsável técnico**. Abra **Meus atendimentos** para localizar o mesmo protocolo e, se sua conta puder visualizá-lo, use **Abrir análise**.

## Impedimentos e resultado

Se outro profissional assumir o protocolo antes do seu clique, a interface informa que o atendimento já foi assumido e atualiza a fila. Refaça a busca e confira o responsável. O banco só atribui quando o protocolo permanece sem responsável e em um estado que permite assumir; a atribuição e a mudança para análise são registradas. Se o botão não aparecer, confira a situação do protocolo e peça a verificação de suas permissões pelo procedimento administrativo correspondente.

## Conferência antes de publicar

- [ ] Reproduzir com protocolo fictício sem responsável e contas de equipe com/sem a permissão.
- [ ] Capturar a fila antes e depois de assumir, sem dados pessoais reais.
- [ ] Confirmar o texto dos impedimentos e o efeito sobre **Meus atendimentos** na versão de produção.
- [ ] Registrar **Fila de solicitações; Fila geral; Meus atendimentos; Atendimento** em “Telas e abas abordadas”.
- [x] Converter as menções à interface em referências semânticas no rascunho local e reabrir após salvar para confirmar que permanecem editáveis.
- [ ] Registrar a versão conferida antes de publicar.
