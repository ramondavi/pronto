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

## Composição assistida

Disponível em Administração → Catálogo CDU e em Classificação na análise bibliotecária. O profissional escolhe componentes da mesma edição, relações simples (:), com ordem fixa (::) ou adição (+), e auxiliares ligados a um assunto ou ao conjunto. O conjunto recebe colchetes quando há mais de um assunto. A ordem dos auxiliares segue as escolhas e precisa de conferência profissional. A primeira entrega aceita apenas as formas simples reconhecidas pelo compositor; não interpreta expressões arbitrárias, intervalos, notação externa nem todas as regras de síntese. O preenchimento manual é preservado.

Auxiliares especiais dependem da hierarquia explicitamente registrada: o assunto deve pertencer à classe de aplicação. Para compor o sufixo, o registro precisa conter essa classe seguida da forma especial reconhecida; outras representações continuam manuais. Não se deduz parentesco pelo prefixo numérico.

A confirmação grava a descrição profissional, os auxiliares, os componentes relacionados e a memória explicativa pela operação atômica existente `save_cdu_code_description`. A Administração abre a revisão do registro resultante; sua organização e validação continuam explícitas. Na análise, somente após confirmar o registro persistido o código é aplicado ao campo CDU, seguindo o salvamento normal do atendimento. Abertura/edição/cancelamento do compositor não mudam a ficha. Não requer nova migração. Registros concorrentes/existentes são reutilizados sem sobrescrever dados. A descrição composta não é gerada por concatenação.

Referências de sintaxe: [UDC Consortium — Notation](https://udcc.org/index.php/site/page?view=about_notation) e [UDC Summary — Signs](https://udcsummary.info/php/index.php?id=1). As tabelas não foram importadas.

### Verificação do compositor (27/10/2026)

150 testes da aplicação, tipos, lint sem erros (13 avisos preexistentes) e build aprovados. Casos próprios cobrem relação simples, ordem fixa e adição, aplicação individual/conjunto, edições divergentes/desconhecidas, registros mesclados, âmbito especial baseado em hierarquia, pontuação incompleta, auxiliares repetidos e limites de tamanho. Ensaio com dados exclusivamente fictícios confirmou gravação e recuperação dos auxiliares e memória na Administração, escolha explícita na análise, recuperação da CDU no rascunho após recarregar e reutilização sem sobrescrever cadastro. Falha simulada no envio não alterou a CDU da ficha; a nova tentativa foi confirmada antes de aplicá-la. Conferência móvel: sem transbordamento e seletores com 46 px. Nenhuma migração nova ou alteração de banco remoto.
