# Conferir e importar uma autoridade de assunto

**Estado editorial:** rascunho de 08/11/2026. Fluxo e rótulos conferidos na branch do PR #26 e nas decisões de importação do documento-mestre. Falta executar cada formato e caso de correspondência com arquivos fictícios na instância instalada, capturar as etapas e conferir a revisão técnica antes de publicar.

**Resultado:** uma autoridade conferida é vinculada ao catálogo de assuntos sem sobrescrever automaticamente um registro anterior. Importar não homologa a ficha. **Para quem:** integrante da equipe com permissão de importação no atendimento ou na Administração.

## Elementos desta tarefa

| Elemento no Pronto! | O que faz |
| --- | --- |
| **Catalogação → Assuntos controlados → Importar autoridade** | Abre o assistente no atendimento quando a busca completa terminou sem resultado e a fonte permite importação. |
| **Fonte**, **Texto ou arquivo**, **Conferência**, **Confirmação** | Quatro etapas sequenciais do assistente. |
| **Colar texto** / **Registro em texto** | Recebe MARC em texto, MARCXML ou JSON-LD/NDJSON completos. |
| **Selecionar arquivo** / **Arquivo de importação** | Recebe arquivo MARC em texto, ISO 2709 UTF-8, MARCXML ou JSON-LD/NDJSON. |
| **Conferir registro** e **Resultado da leitura** | Organizam os campos para leitura; ainda não cadastram a autoridade. |
| **Pendências de verificação** | Mostram campo, valor e providência que exigem conferência na fonte original. |
| **Identificador na fonte** | Confirma a identidade da autoridade; não deve ser inventado. |
| **Tipo de autoridade sugerido pelo MARC** | Indica o tipo lido; qualquer correção exige conferência e motivo. |
| **Termo preferido em português, verificado na fonte** | Confirma a forma que será usada no catálogo e na ficha. |
| **Equivalente em inglês (opcional)** | Registra equivalência somente quando confirmada na fonte. |
| **Importar e adicionar ao assunto** ou **Confirmar importação** | Salva o vínculo no atendimento ou na Administração após as confirmações. |

No editor do guia, inclua os elementos desta tabela pelo seletor **Inserir elemento do painel**; ícones e rótulos oficiais acompanham as menções. Se uma fonte ou campo mudar na interface, atualize as referências e o capítulo na mesma entrega.

## Prepare o registro

1. Antes de importar, pesquise o assunto no catálogo completo, inclusive por variantes. No atendimento, **Importar autoridade** só aparece depois de busca concluída sem correspondência; não aparece durante erro ou consulta pendente. Na Administração, o assistente permanece disponível conforme a permissão.
2. No assistente, em **Fonte**, indique a fonte real do registro e confira o original. Em **Texto ou arquivo**, escolha apenas um modo: **Colar texto** ou **Selecionar arquivo**. Não cole apenas o nome do assunto; inclua o registro completo com campos e identificadores.
3. Respeite o limite de 2 MB e 100 registros. O arquivo aceita MARC em texto, MARC ISO 2709 UTF-8, MARCXML e JSON-LD/NDJSON; os formatos não aceitos precisam ser conferidos no original e convertidos por procedimento apropriado.

## Leia e confira

4. Em **Conferência**, selecione **Conferir registro**. O **Resultado da leitura** mostra formato, identificador, tipo MARC, componentes do cabeçalho, variantes, relações, notas e fontes quando presentes. Se houver mais de um registro, escolha o correto em **Registro conferido**.
5. Leia cada **Pendência de verificação** e confirme o ponto na fonte consultada. Marque **Conferi este ponto na fonte consultada** apenas depois da verificação correspondente. Relações sem destino confirmado permanecem pendentes; não criam termos automaticamente.
6. Use **Continuar: confirmação**. Em **Identificador na fonte**, confira o código real; se não veio no arquivo, consulte a página oficial e copie o identificador. Confira **Tipo de autoridade sugerido pelo MARC**. Se precisar corrigi-lo, preencha **Motivo da correção do tipo**.
7. Confira **Termo preferido em português, verificado na fonte** e, se existir equivalência atestada, **Equivalente em inglês (opcional)**. Sugestões extraídas do MARC não representam tradução automática nem prova de equivalência.
8. Se o sistema mostrar assunto já cadastrado com o mesmo texto, confira se é o mesmo conceito e confirme explicitamente o vínculo. Os rótulos e fichas anteriores são preservados. Marque a declaração de conferência da fonte, identificador, termos, notas e alertas; então selecione **Importar e adicionar ao assunto** ou **Confirmar importação**.

## Resultado e impedimentos

Uma reimportação idêntica reutiliza o cadastro, sem criar cópia. Uma versão diferente exige revisão; não substitui silenciosamente o registro anterior. Cabeçalho homônimo de mesma fonte sob outro identificador requer tratamento profissional da duplicidade. Registro obsoleto ou excluído não serve para novos usos. Após importar no atendimento, salve e confira a catalogação; a ficha continua sujeita às demais condições de homologação.

Se a leitura falhar ou não reconhecer um campo, confira o registro na fonte original e não complete dados por suposição. **Limpar leitura** apaga texto, arquivo e resultado da conferência, mas mantém a fonte selecionada.

## Conferência antes de publicar

- [ ] Reproduzir texto MARC, MARCXML, JSON-LD/NDJSON e arquivos ISO 2709 UTF-8 de teste, com limites e erros.
- [ ] Capturar as quatro etapas, pendências, correspondência exata, variante, vínculo explícito e reimportação idêntica com dados fictícios.
- [ ] Confirmar revisão de versão diferente, registro obsoleto e cabeçalho homônimo sem criar duplicidade.
- [ ] Conferir permissões no atendimento e na Administração, sem supor validação automática da autoridade.
- [ ] Registrar **Atendimento · Catalogação; Administração · Assuntos** em **Telas e abas abordadas** conforme o caminho reproduzido.
