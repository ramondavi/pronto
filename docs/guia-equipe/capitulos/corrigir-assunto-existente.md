# Corrigir a forma de um assunto existente

**Estado editorial:** rascunho de 08/11/2026. Campos e ações conferidos na interface da branch do PR #26; faltam execução com registros fictícios em diferentes estados, captura final e conferência na versão instalada antes da publicação.

**Resultado:** corrigir o termo preferido em português ou o equivalente em inglês do cadastro usado em novas catalogações, com motivo auditado. Fichas anteriores preservam a forma que já registraram. **Para quem:** pessoa ativa com permissão de gestão de assuntos.

## Escolha a operação certa

| Ação no Pronto! | Campos e resultado |
| --- | --- |
| **Editar** | Abre **Editar assunto** com **Termo preferido em português**, **Equivalente em inglês** e **Motivo da edição**. Mostra fontes e permite abrir **Ver autoridade** para conferir a origem. **Salvar alterações** muda a forma do assunto para novos usos; não reescreve as fichas anteriores. |
| **Ver autoridade** | Abre **Detalhes da autoridade** para leitura da origem, identificador, composição do cabeçalho, variantes, notas e fundamentação, quando existem. Há controles especializados para **Tipo de autoridade**, **Catálogo público**, **Localização no mapa público** e **Apresentação pública do tema**. Essas revisões têm campos e consequências próprios; o formulário curto de **Editar** não modifica essa estrutura. |

Um assunto legado pode ter apenas o cabeçalho. Nesse caso, **Ver autoridade** informa que ainda não há registro estruturado associado. A ausência desse registro não torna o assunto automaticamente inválido nem autoriza inventar fonte ou identificador.

## Elementos desta tarefa

| Elemento no Pronto! | O que faz |
| --- | --- |
| **Administração → Conteúdo → Assuntos** | Abre o vocabulário controlado. |
| **Buscar assunto**, **Situação**, **Tipo de autoridade**, **Mostrar** | Localizam o cadastro e ajudam a conferir seu estado e uso. |
| **Ver protocolos que usam este assunto** | Lista vínculos recentes e indica se há atendimentos relacionados. |
| **Ver autoridade** | Permite conferir os dados estruturados antes da correção. |
| **Editar → Termo preferido em português** | Altera a forma usada em novas escolhas. |
| **Editar → Equivalente em inglês** | Registra ou corrige equivalência somente quando confirmada na fonte. |
| **Motivo da edição** | Registra a justificativa da alteração para auditoria. |
| **Salvar alterações** | Confirma a revisão, sujeita às regras de duplicidade e de atendimento aberto. |

Na edição do guia, insira os elementos da primeira coluna com **Inserir elemento do painel** quando o seletor oferecer o rótulo e ícone oficiais. Não use um rótulo da janela **Ver autoridade** para descrever um campo do formulário **Editar**.

## Passo a passo

1. Abra **Administração → Conteúdo → Assuntos**. Use **Buscar assunto** e os filtros para localizar o cadastro correto. Confira estado, fonte e quantidade de protocolos antes de mudar qualquer coisa.
2. Se o motivo da correção depende da origem ou da composição do cabeçalho, abra **Ver autoridade**. Leia identificador e fonte, componentes, variantes e notas existentes. Feche a janela e selecione **Editar** no cartão do assunto correto.
3. Corrija **Termo preferido em português** ou **Equivalente em inglês** apenas com base na fonte conferida. Não use o equivalente inglês como tradução livre. Preencha **Motivo da edição** com a verificação feita e a razão da mudança.
4. Selecione **Salvar alterações**. Reabra o cartão e confira a forma atualizada. Se a autoridade estava publicada, verifique o estado da publicação pública: dados alterados exigem nova revisão individual antes de aparecerem no catálogo público.
5. Se a necessidade era mudar tipo MARC, ponto geográfico, condições de publicação ou texto da apresentação pública, volte a **Ver autoridade** e use a seção própria; esta correção de rótulo não substitui esses procedimentos.

## Impedimentos

O sistema bloqueia uma forma já pertencente a outro assunto. Um registro vinculado a atendimento ainda aberto não pode ser alterado até a conclusão ou cancelamento do protocolo. Não tente usar **Mesclar**, **Desativar** ou **Excluir** como atalho para corrigir um erro de grafia: cada ação tem efeito diferente e precisa de procedimento próprio. Se a autoridade for apenas um cabeçalho legado, registre a necessidade de revisão estruturada sem preencher dados presumidos.

## Conferência antes de publicar

- [ ] Corrigir termo português e equivalente inglês em registros fictícios, com motivo e conferência na lista após salvar.
- [ ] Testar duplicidade, vínculo a atendimento aberto e efeito sobre publicação pública.
- [ ] Capturar o cartão, o formulário **Editar assunto** e **Ver autoridade** com e sem registro estruturado.
- [ ] Confirmar fichas históricas preservadas e auditar o motivo registrado.
- [ ] Registrar **Administração · Assuntos** em **Telas e abas abordadas**.
