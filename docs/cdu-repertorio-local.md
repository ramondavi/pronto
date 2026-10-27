# Repertório local da CDU

Decisão do responsável em 27/10/2026: construir a base da biblioteca com os registros cadastrados pela equipe, usando a lógica estrutural da CDU. Não importar tabelas, traduções ou a base completa do UDC Consortium/IBICT.

## Organização

Cada registro mantém descrição, edição consultada, tipo de notação, superior imediato, âmbito de aplicação quando auxiliar especial, notas de aplicação, composição, auxiliares empregados e códigos relacionados. As relações são informadas e conferidas pelo bibliotecário, sem atribuir códigos automaticamente a trabalhos.

Os tipos distinguem tabela principal, notação composta, auxiliares comuns (língua, forma, lugar, ascendência/nacionalidade, tempo, propriedades, materiais, relações/processos e pessoas) e auxiliares especiais (.0, hífen e apóstrofo). Auxiliares especiais exigem uma classe principal de aplicação. Auxiliares comuns não recebem esse âmbito restrito.

A navegação reúne o caminho hierárquico registrado, os subordinados e os auxiliares especiais aplicáveis à classe. Códigos relacionados e auxiliares permitem abrir a busca do registro correspondente. Os sinais +, /, :, ::, agrupamento, asterisco e especificação alfabética são apresentados como apoio à leitura da notação. Esse apoio não valida integralmente a sintaxe, o significado ou a aplicabilidade de uma classificação: a edição consultada e a decisão profissional continuam obrigatórias. Não se inventam superiores por truncamento do código nem se presume que relações de síntese sejam uma árvore.

A hierarquia impede ciclos, referências a registros inexistentes/mesclados e confusão entre famílias de tabelas. Mesclagens não podem transformar uma classe em seu descendente nem misturar uma classe já organizada com uma família diferente. Os cadastros antigos ficam como “Ainda não organizado”, sem inventar hierarquia ou edição. Cadastros inicialmente criados na ficha ficam pendentes para organização e revisão administrativa.

## Edição

Novos cadastros, tanto na Administração quanto no primeiro uso na ficha, oferecem 2ª edição (IBICT, 2007) selecionada por padrão; 1ª edição (IBICT, 1997) aparece no grupo “Edição defasada”. A seleção usa o campo de proveniência existente, sem reclassificar registros antigos. Valores anteriores, inclusive fontes livres ou ausência de edição, são preservados e identificados como registro anterior até revisão explícita.

## Migrações

- 202610260001: cadastro e mesclagem de assuntos/CDU. Aplicada exclusivamente à prévia cfntochwiztdcawbaedx em 27/10/2026, após autorização do responsável e sucesso de todas as verificações do PR #21. Simulação: apenas essa migração, sem seeds ou roles; funções de cadastro e mesclagem confirmadas no projeto. Produção preservada.
- 202610270001: estrutura local da CDU, operações atômicas e proteção hierárquica da mesclagem. Aplicada exclusivamente à prévia cfntochwiztdcawbaedx em 27/10/2026, no escopo da autorização do responsável para atualizar somente a prévia e após validação local. Simulação confirmou apenas essa migração, sem seeds/roles/Vault. Colunas, funções e histórico oficial confirmados por consulta de metadados; produção preservada. Não contém importação de tabelas externas.

## Fontes técnicas

- UDC Consortium, estrutura e tabelas: https://udcc.org/index.php/site/page?view=about_structure
- UDC Consortium, notação: https://udcc.org/index.php/site/page?view=about_notation

A edição local selecionada não é declarada equivalente ao repertório atual do Consortium. Notas e relações devem ser conferidas na edição efetivamente consultada.

## Verificações desta ampliação

141 testes da aplicação e 302 verificações do banco local (15 arquivos, 18 verificações próprias da estrutura CDU). Tipos, lint sem erros e build padrão verificados. Conferência visual de cadastro/revisão, edição padrão e defasada, primeira gravação na ficha com confirmação do valor persistido, hierarquia, auxiliares aplicáveis e largura móvel. Captura consolidada local: cdu-repertorio-local-validacao.png. Os treze avisos de lint já existentes permanecem; não há erro novo.
