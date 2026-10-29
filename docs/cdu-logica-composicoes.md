# Revisão da lógica de composição CDU — 27/10/2026

## Fontes e alcance

Material didático “Classificação Decimal Universal”, Marcelo Nair dos Santos, 2009, 19 páginas, fornecido pelo responsável como `3_0_CDU.pdf`; conferidas as páginas completas 8–13 e 15–18, com revisão visual das páginas 9, 14 e 17. O arquivo e suas tabelas não são incorporados ao código. Exemplos pontuais de notação são usados em testes com descrições fictícias.

Referência primária: [UDC Consortium — Structure & Tables](https://udcc.org/index.php/site/page?view=about_structure), [Notation](https://udcc.org/index.php/site/page?view=about_notation), [relocações do antigo ponto de vista](https://udcc.org/relocation.htm). O material de 2009 não é tomado como se fosse uma atualização da edição impressa adotada. Contém lapsos de exemplos, como ano divergente entre uma expressão e sua legenda (p. 11) e repetição de código na lista de divisão paralela (p. 16); não se convertem essas legendas em regras automáticas.

## O que a revisão corrigiu

- O compositor inicial montava apenas +, : e ::, um agrupamento externo e auxiliares de formato estritamente numérico. Isso excluía expressões legítimas com letras, intervalos e síntese interna nos auxiliares.
- A modalidade por símbolos monta expressões a partir de blocos tipados, não de texto livre: classe/auxiliar cadastrado, relação, abertura/fechamento de grupo, complemento, intercalação, síntese de auxiliares e divisão paralela declarada.
- Os quatro operadores são oferecidos. A extensão / exige extremos numéricos simples, distintos e crescentes; não enumera nem garante a existência das classes intermediárias. A notação completa do segundo extremo é preservada (a abreviação de prefixos repetidos é opcional no material, p. 8).
- Grupos podem estar em qualquer operando e ser aninhados até oito níveis. Não se deduz precedência profissional de uma expressão sem agrupamento explícito.
- A/Z é uma indicação de especificação, nunca o texto literal “A/Z” no código. Letras podem ficar dentro de um auxiliar ou depois do elemento anterior, conforme escolha explícita. * é inserido antes do código externo e sua fonte é obrigatória na memória.
- Aceita os tipos de auxiliares comuns previstos no catálogo, inclusive negativos temporais, nomes e códigos externos em auxiliares já cadastrados. Não converte automaticamente datas, séculos nem calendários. Combina dois auxiliares da mesma tabela entre lugar, forma, grupo étnico/nacionalidade ou tempo; o invólucro aparece uma vez. O profissional confere o sentido da combinação.
- Auxiliares especiais dependem do âmbito registrado e da hierarquia efetivamente cadastrada, inclusive em cadeias homogêneas/heterogêneas. Não se infere aplicação por semelhança numérica. Não converte a antiga .00 em .0 automaticamente.
- Auxiliares independentes podem preceder o número principal. A intercalação é explícita, imediatamente após o bloco da classe: escolhe-se a fronteira decimal e preserva-se a pontuação original (ex.: 622(430).341.1). Essa modalidade não inventa regras para omitir separadores.
- A ordem de citação fica sob escolha profissional. 811.134.3-31(81) e 811.134.3(81)-31 permanecem distintos. Não se aplica a recomendação de ordem do material como política institucional já aprovada. A ordem de arquivamento não é calculada por esse compositor.
- Remissivas são documentadas nos campos relacionados/notas; não entram como setas no código final. A divisão paralela exige classe-base, modelo, subdivisão com relação hierárquica registrada e instrução/localização declarada. Só então aproveita o sufixo para o destino, mantendo o agrupamento decimal de três algarismos da notação principal; não deduz uma instrução de tabelas parecidas.

## Proteções preservadas

Mesma edição declarada para todos os componentes; registros atuais; conferência dos registros novamente antes do envio; descrição profissional obrigatória para códigos inéditos; reutilização sem sobrescrita; confirmação antes de aplicar na ficha. Auxiliares e componentes de todos os grupos são guardados na memória, junto às fontes externas e instruções. O salvamento usa a operação atômica já existente; sem nova migração ou alteração remota. Novos registros continuam pendentes de organização/validação. Fichas homologadas permanecem imutáveis.

Limites: 64 blocos, oito níveis de grupo, código final de até 80 caracteres e memória de até 4.000 caracteres. As validações são estruturais, não um certificado de validade integral CDU nem confirmação automática das instruções da edição. A representação de códigos externos impede operadores reservados ambíguos; expressões não representáveis seguem pelo preenchimento manual e revisão profissional.

## Verificações

166 testes da aplicação, incluindo operadores, grupos e recusas de expressões incompletas, intervalos, complementos externos com fonte, especificação dentro/fora de auxiliar, auxiliares complexos, tempos negativos, intercalação, ordem semântica, cadeias especiais, divisão paralela declarada, edições/históricos e limites. Tipos, lint e build verificados; os 13 avisos de lint preexistentes permanecem. Ensaio local com dados fictícios confirmou as modalidades no catálogo, grupos, extensão, intercalação, divisão paralela, posição do alfabético, fonte externa obrigatória e sua memória persistida. Na análise, confirmou aplicação explícita de [53/54](0.034.2PDF), salvamento e recuperação do rascunho, sem transbordamento móvel. Sem importação de tabelas, migração nova ou alterações no banco remoto.

### Layout e ajuda da equipe — 27/10/2026

- Grade compartilhada responsiva: campos organizacionais em duas colunas, assunto e auxiliares lado a lado na montagem guiada, controles de símbolos alinhados e descrição sem esticamento na análise. Controles mantêm tokens, botões e altura de campo do design system.
- Resposta rápida editável na base de conhecimento, restrita a `cataloger` e `administrator`; a API exige perfil ativo. Inclui explicações dos campos, exemplos, alcance dos auxiliares, relações e limites da validação.
- Validação: 166 testes da aplicação; tipos, lint (13 avisos preexistentes, sem erros) e build. Os 29 testes de autorização incluem seis verificações da resposta por RLS. Navegação validada nos dois perfis de equipe, composição e persistência de rascunho, ajuda contextual, exclusão da API pública, celular e tema escuro. Captura consolidada local: `cdu-layout-validacao.png`.

- Migração `202610270002` aplicada somente à prévia, com autorização explícita e conferência do público restrito. Não modifica códigos, fichas ou produção.
