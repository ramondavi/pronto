# Inventário editorial do Guia da Equipe

Atualização de 16/11/2026: o [Guia da Equipe em produção](https://prontobib.vercel.app/guia-equipe) mostra **46 capítulos publicados e nenhum rascunho**. Os 22 procedimentos acrescentados depois da contagem anterior cobrem pessoas, CDU/Cutter, consulta e manutenção de assuntos, contas, programas, calendário, modelos, Ajuda/FAQ, Catálogo CDU, indicadores, depósitos, retenção, backup, auditoria, visão geral, filtros, conta própria e demonstração da visão estudantil. A conferência do editor encontrou em todos os 22 a tabela “Elementos desta tarefa”, “Quando usar”, passo a passo e referências sem elementos indisponíveis. As capturas indicadas nos textos continuam reservadas para inserção pela equipe. As caixas da fila inicial abaixo registram tarefas e qualidade de cobertura; uma caixa aberta não significa necessariamente ausência de capítulo publicado.

Levantamento de 08/11/2026 sobre a branch local do guia, baseada na `master` do PR #25. **A unidade de documentação é a tarefa que uma pessoa consegue realizar, com passo a passo e resultado verificável.** Uma tela pode exigir vários capítulos; uma tarefa pode passar por mais de uma tela. As tabelas por interface abaixo são um índice reverso para localizar tarefas e verificar lacunas, não uma proposta de capítulos com o nome de cada aba. Títulos citados aqui são provisórios; nenhum procedimento novo está aprovado apenas por constar no inventário. Antes de redigir, conferir rótulos e fluxos na versão instalada em produção.

Em 23/11/2026, foram redigidos localmente cinco procedimentos específicos ainda ausentes: conferência inicial, acesso efetivo, publicação de autoridade, percursos por área e exclusão de assunto sem uso. **São textos de trabalho, não capítulos publicados**; as 46 publicações confirmadas em 16/11 permanecem a contagem de referência. As capturas indicadas devem ser feitas pela equipe.

## Situação da cobertura

- **Publicados:** 46 capítulos, incluindo tarefas de atendimento, assuntos/autoridades, mapa, administração e controle. O índice e a publicação foram conferidos em 16/11/2026.
- **Capturas:** os textos publicados indicam as imagens a inserir pela equipe; essas capturas ainda não foram fornecidas.
- **Plano:** o [sumário editorial](guia-equipe-piloto.md) e o desdobramento por tarefa abaixo continuam como inventário de cobertura. A seção Casos segue sem procedimento publicado.
- **Lacuna principal:** os 14 títulos do sumário são macrotemas ou pilotos, ainda amplos para garantir um passo a passo de cada ação possível. Eles deverão ser desdobrados em tantos capítulos de tarefa quantos forem necessários, sem transformar a estrutura das telas em estrutura obrigatória do guia.

## Unidade de cobertura: tarefa executável

Cada linha de trabalho deve registrar: **ação e resultado**, perfis e permissões, telas/abas atravessadas, condição inicial, apresentação dos elementos usados, sequência de passos com rótulos e campos reais, variações por estado, impedimentos, efeito esperado, capturas e capítulo publicado. Só então a tarefa pode ser marcada como coberta. É possível reunir ações inseparáveis em um mesmo capítulo; ações com resultados ou permissões diferentes podem precisar de capítulos distintos. Os títulos abaixo descrevem tarefas para inventariar, não títulos editoriais aprovados.

### Estrutura de um capítulo de tarefa

1. **Para que serve e quando usar:** resultado da tarefa, perfil necessário e condição inicial.
2. **Elementos desta tarefa:** tabela no começo do capítulo, com **Elemento no Pronto!** e **O que faz**. Reproduzir na primeira coluna o rótulo e o ícone oficiais usando o recurso “Inserir elemento do painel”; para campos sem ícone, mostrar apenas o rótulo. Agrupar por tela/aba quando a tarefa atravessar várias. Descrever somente elementos necessários ao procedimento, inclusive disponibilidade condicionada ao estado ou à permissão.
3. **Passo a passo:** ações em ordem, alternativas relevantes, resultado esperado e como conferir que a tarefa foi concluída.
4. **Impedimentos e continuidade:** bloqueios comuns, encaminhamento permitido e links para outros capítulos ou tópicos reaproveitados.

A tabela é uma orientação editorial, não uma listagem de todos os campos da tela. Um mesmo elemento pode aparecer em capítulos diferentes se for necessário para tarefas diferentes; sua referência semântica mantém o rótulo da interface coerente, enquanto a explicação continua própria de cada tarefa.

| Grupo de tarefas a desdobrar | Exemplos de ações/resultados que exigem passo a passo | Telas e abas envolvidas |
| --- | --- | --- |
| Orientar-se e localizar trabalho | encontrar solicitação, ler avisos e estados, usar busca e ajuda, conferir a própria conta | Visão geral; Fila de solicitações; Minha conta |
| Organizar a fila | filtrar e priorizar, assumir, devolver, atribuir ou reatribuir, consultar histórico | Fila geral; Meus atendimentos; Atendimento |
| Analisar o pedido | conferir declarações e arquivo, revisar metadados, editar dado com registro, pedir correção e analisar retorno | Atendimento · Metadados; Fila de solicitações |
| Catalogar e liberar | registrar pessoas, assuntos, fontes, CDU e Cutter, revisar prévia, homologar ficha, validar Nada Consta e concluir | Atendimento · Catalogação; Revisão da ficha; Finalização e liberação |
| Cuidar de contas e acessos | provisionar, alterar situação ou perfil, conceder/restringir permissão, definir período e conferir efeito | Administração · Contas; Permissões da equipe |
| Configurar o serviço | alterar programa, prazo, guia do RI, expediente, exceção e comunicado | Administração · Programas e SLA; Calendário e mural; Calendário; Horários |
| Manter textos internos e externos | criar/revisar modelo, resposta rápida, artigo e capítulo; salvar rascunho e publicar para a audiência correta | Administração · Modelos de resposta; Ajuda e FAQ; Guia da equipe |
| Manter instrumentos de catalogação | escolher/criar/revisar assunto e autoridade, importar, conferir duplicidade, gerir temas por área e CDU | Atendimento · Catalogação; Administração · Assuntos; Temas por área; Catálogo CDU |
| Acompanhar e preservar | interpretar indicador, tratar depósito pendente, consultar retenção/auditoria, conferir backup e preparar restauro | Administração · Indicadores; Depósitos pendentes; Arquivos e retenção; Backup e restauro; Auditoria |

O desdobramento continua durante a conferência dos fluxos condicionais: por exemplo, mudar uma decisão individual de acesso, mudar o perfil de uma conta e verificar a permissão efetiva são ações relacionadas, mas não devem ser fundidas num único texto se houver condições, riscos ou resultados distintos. Esses exemplos **não fixam títulos nem aprovam a mudança de perfil entre papéis**.

## Fila inicial de tarefas a conferir

Cada caixa representa uma **tarefa a verificar**, não um título aprovado nem a certeza de que a ação esteja disponível a todos os perfis. Ao confirmar a interface, registrar o capítulo correspondente e todas as telas percorridas. Subdividir quando estados, permissões ou resultados exigirem passos diferentes.

### Navegação e atendimento

- [ ] Localizar atendimento por pessoa, matrícula, protocolo, título ou orientador; aplicar e limpar filtros; alternar Fila geral/Meus atendimentos e Ativos/Encerrados. [Localização](https://prontobib.vercel.app/guia-equipe/localizar-atendimento) e [filtros](https://prontobib.vercel.app/guia-equipe/filtrar-ordenar-fila) publicados; faltam capturas da equipe.
- [ ] Entender a situação de um atendimento pela legenda, linha de evolução, histórico e avisos. [Estados](https://prontobib.vercel.app/guia-equipe/entender-estados-atendimento) e [histórico](https://prontobib.vercel.app/guia-equipe/consultar-historico-atendimento) publicados; faltam capturas de todos os estados.
- [ ] Assumir atendimento sem responsável e abrir a análise. [Procedimento publicado](https://prontobib.vercel.app/guia-equipe/assumir-atendimento); falta captura da equipe.
- [ ] Devolver atendimento à fila; atribuir ou reatribuir a outro profissional quando houver permissão. [Devolução publicada](https://prontobib.vercel.app/guia-equipe/devolver-atendimento-fila) e [atribuição publicada](https://prontobib.vercel.app/guia-equipe/atribuir-reatribuir-atendimento); capturas pela equipe ainda pendentes.
- [ ] Marcar, alterar ou retirar prioridade com motivo, quando permitido. [Procedimento publicado](https://prontobib.vercel.app/guia-equipe/definir-prioridade-atendimento); falta captura da equipe.
- [ ] Conferir declarações, acesso ao trabalho completo e condição de início da análise. [Texto local](guia-equipe/capitulos/conferir-declaracoes-acesso-trabalho.md) pronto para conferência editorial e publicação; falta captura da equipe.
- [ ] Revisar dados enviados e corrigir diretamente os que admitem edição auditada. [Procedimento publicado](https://prontobib.vercel.app/guia-equipe/conferir-corrigir-metadados); falta captura da equipe.
- [ ] Solicitar correção ao estudante por modelo e orientação complementar; revisar o retorno. [Procedimento publicado](https://prontobib.vercel.app/guia-equipe/solicitar-conferir-correcao); falta captura da equipe.
- [ ] Registrar pessoas relacionadas e conferir nomes autorizados. [Procedimento publicado](https://prontobib.vercel.app/guia-equipe/conferir-pessoas-ficha); falta captura da equipe.
- [ ] Selecionar, criar ou vincular assuntos controlados e registrar fontes por termo. [Escolha](https://prontobib.vercel.app/guia-equipe/escolher-assuntos-controlados), [cadastro](https://prontobib.vercel.app/guia-equipe/cadastrar-assunto-manualmente) e [importação](https://prontobib.vercel.app/guia-equipe/conferir-importar-autoridade) publicados; faltam capturas e conferência das variantes condicionais.
- [ ] Informar CDU, Cutter e demais elementos da descrição; conferir prévia. [Procedimento publicado](https://prontobib.vercel.app/guia-equipe/informar-cdu-cutter-descricao); falta captura da equipe.
- [ ] Revisar a referência e homologar a ficha, inclusive impedimentos e efeitos. [Procedimento publicado](https://prontobib.vercel.app/guia-equipe/revisar-homologar-ficha); faltam capturas e conferência assistida do fluxo completo.
- [ ] Conferir ou devolver Nada Consta, liberar ficha e concluir o atendimento quando as condições forem atendidas. [Nada Consta](https://prontobib.vercel.app/guia-equipe/conferir-nada-consta) e [encerramento](https://prontobib.vercel.app/guia-equipe/registrar-publicacao-encerrar-protocolo) publicados; falta captura da equipe.
- [ ] Consultar histórico e registros de decisão sem alterar o atendimento. [Procedimento publicado](https://prontobib.vercel.app/guia-equipe/consultar-historico-atendimento); falta captura da equipe.

### Contas e funcionamento

- [ ] Criar/provisionar conta de integrante da equipe ou estudante conforme permissão. [Provisionamento da equipe publicado](https://prontobib.vercel.app/guia-equipe/provisionar-conta-equipe); criação de conta estudantil é tarefa distinta. Faltam captura e conferência assistida.
- [ ] Alterar situação de conta; compreender bloqueio, inativação e reativação. [Procedimento publicado](https://prontobib.vercel.app/guia-equipe/alterar-situacao-perfil-conta); falta captura da equipe.
- [ ] Conferir acesso efetivo de uma pessoa e registrar decisão individual de permissão ou período. [Texto local](guia-equipe/capitulos/conferir-permissoes-efetivas.md) pronto para conferência editorial e publicação; falta captura da equipe.
- [ ] Alterar perfil de conta apenas nas transições que o sistema e a regra institucional permitirem; conferir o efeito sobre permissões herdadas. [Procedimento publicado](https://prontobib.vercel.app/guia-equipe/alterar-situacao-perfil-conta); faltam captura e ensaio de cada transição.
- [ ] Criar ou modificar programa, prazo de atendimento, contato da coordenação e disponibilidade do guia do RI. [Edição de programa existente publicada](https://prontobib.vercel.app/guia-equipe/configurar-programa-sla-ri); não há criação de programa nessa aba.
- [ ] Cadastrar ou alterar horário, data especial e ocorrência do calendário. [Horário do dia](https://prontobib.vercel.app/guia-equipe/registrar-horario-dia) e [ocorrência](https://prontobib.vercel.app/guia-equipe/publicar-ocorrencia-mural) publicados; faltam capturas.
- [ ] Criar, revisar ou retirar aviso do mural. [Cadastro e revisão publicados](https://prontobib.vercel.app/guia-equipe/publicar-ocorrencia-mural); retirada ainda exige conferir a ação na interface.
- [ ] Consultar e ajustar os próprios dados de conta e credenciais quando a tela permitir. [Procedimento publicado](https://prontobib.vercel.app/guia-equipe/ajustar-minha-conta-equipe); falta captura da equipe.

### Conteúdo e catalogação administrativa

- [ ] Criar, revisar, ordenar e usar modelo de resposta. [Procedimento publicado](https://prontobib.vercel.app/guia-equipe/criar-revisar-modelo-resposta); falta captura da equipe.
- [ ] Criar/revisar resposta rápida interna ou artigo da Central de Ajuda, definir audiência e publicação. [Procedimento publicado](https://prontobib.vercel.app/guia-equipe/manter-ajuda-faq-respostas); falta captura da equipe.
- [ ] Criar/revisar capítulo do Guia da Equipe, preencher telas abordadas, incorporar trecho, guardar rascunho e publicar versão conferida. [Procedimento publicado](https://prontobib.vercel.app/guia-equipe/criar-publicar-capitulo); faltam captura e conferência assistida.
- [ ] Encontrar assunto existente e conferir estado, forma preferida, variantes, fontes e vínculos. [Consulta de autoridade publicada](https://prontobib.vercel.app/guia-equipe/consultar-autoridade-assunto); falta captura da equipe.
- [ ] Cadastrar assunto manual ou importar autoridade; tratar correspondência e pendência. [Cadastro](https://prontobib.vercel.app/guia-equipe/cadastrar-assunto-manualmente) e [importação](https://prontobib.vercel.app/guia-equipe/conferir-importar-autoridade) publicados; faltam capturas e conferência assistida de arquivos e estados.
- [ ] Revisar, ativar, desativar, mesclar ou excluir assunto quando a ação for permitida. [Correção de forma](https://prontobib.vercel.app/guia-equipe/corrigir-assunto-existente), [situação](https://prontobib.vercel.app/guia-equipe/alterar-situacao-assunto) e [mesclagem](https://prontobib.vercel.app/guia-equipe/mesclar-assuntos-duplicados) publicados. [Exclusão permanente](guia-equipe/capitulos/excluir-assunto-sem-uso.md) redigida localmente, ainda sem publicação; faltam capturas.
- [ ] Preparar publicação pública de autoridade e conferir resultado no catálogo. [Texto local](guia-equipe/capitulos/publicar-autoridade-catalogo.md) pronto para conferência editorial e publicação; falta captura da equipe.
- [ ] Manter lugar e vínculos geográficos usados no mapa. [Procedimento publicado](https://prontobib.vercel.app/guia-equipe/revisar-lugar-autoridade); falta captura da equipe.
- [ ] Criar/revisar percurso de Temas por área e conferir a apresentação pública. [Texto local](guia-equipe/capitulos/manter-percursos-area.md) pronto para conferência editorial e publicação; falta captura da equipe.
- [ ] Criar/revisar descrição e composição de código no Catálogo CDU. [Procedimento publicado](https://prontobib.vercel.app/guia-equipe/cadastrar-revisar-cdu-catalogo); falta captura da equipe.

### Acompanhamento e controle

- [ ] Consultar indicadores, selecionar período e interpretar limites dos números. [Procedimento publicado](https://prontobib.vercel.app/guia-equipe/consultar-indicadores-atendimento); falta captura da equipe.
- [ ] Localizar depósito pendente e registrar condição histórica, lembrete ou publicação conforme a permissão. [Procedimento publicado](https://prontobib.vercel.app/guia-equipe/acompanhar-deposito-pendente); falta captura da equipe.
- [ ] Consultar prazos e estados dos arquivos e executar ações de retenção permitidas. [Procedimento publicado](https://prontobib.vercel.app/guia-equipe/conferir-retencao-arquivos); falta captura da equipe.
- [ ] Conferir execução e recibos de backup; seguir o procedimento autorizado de restauro. [Procedimento publicado](https://prontobib.vercel.app/guia-equipe/conferir-backup-restauro); faltam captura e ensaio assistido de recuperação.
- [ ] Buscar e interpretar evento na Auditoria. [Procedimento publicado](https://prontobib.vercel.app/guia-equipe/consultar-auditoria); falta captura da equipe.

Esta lista é inicial: diálogos, estados condicionais e ações que surgirem na conferência de cada tela entram como linhas próprias antes de considerar sua cobertura completa. Os capítulos de **Casos** explicam combinações de tarefas para resolver situações recorrentes e podem incorporar tópicos já publicados.

## Índice reverso: telas e abas da equipe

| Interface real | Macrotema atual relacionado | Tarefas e variações a inventariar | Situação |
| --- | --- | --- | --- |
| Visão geral | Conheça o Pronto! | cartões, tarefas, atualizações, avisos, busca e ajuda contextual | introdução local; detalhamento pendente |
| Fila de solicitações: Fila geral, Meus atendimentos | Trabalhe na fila; Entenda os estados do atendimento | busca, filtros, visões, responsável, prioridade, assumir/devolver, histórico | pendente |
| Atendimento: Metadados | Faça a conferência inicial; Revise os metadados e peça correções | declarações, trabalho completo, dados enviados, orientação, modelos, correções e decisão | pendente |
| Atendimento: Catalogação | Prepare a catalogação; trilha Assuntos/autoridades | pessoas, assuntos, fontes, CDU, Cutter, descrição e prévia | pendente |
| Atendimento: Revisão da ficha | Revise e homologue a ficha | referência, requisitos, prévia, PDF, confirmação e efeitos | rascunho local |
| Atendimento: Finalização e liberação | Valide o Nada Consta e conclua | verificação, liberação, encerramento e comunicação | pendente |
| Minha conta | Conheça o Pronto!; capítulo específico a definir | dados da conta, senha, avatar e ações disponíveis | introdução local; procedimento pendente |
| Calendário da biblioteca; Horários da biblioteca | Configure programas e funcionamento | consulta de expediente, avisos e exceções | pendente |
| Guia da equipe | Conheça o Pronto!; Mantenha modelos e ajuda | busca, índice, leitura, referências e edição conforme permissão | introdução local; procedimento de edição pendente |
| Ver como estudante | Conheça o Pronto! | finalidade, limites e retorno ao painel da equipe | pendente |

## Índice reverso: Administração · Operação

| Aba real | Macrotema atual relacionado | Tarefas, formulários e campos a conferir | Situação |
| --- | --- | --- | --- |
| Contas | Gerencie contas e acessos | busca, Nome completo, Conta institucional, CRB, Perfil, Situação, provisionamento e mudança de estado | rascunho local |
| Permissões da equipe | Gerencie contas e acessos | Pessoa da equipe, Período da decisão, Decisão para esta atividade; permissões efetivas e exceções | pendente |
| Programas e SLA | Configure programas e funcionamento | Nível, Guia do RI, SLA (dias úteis), contato e e-mail da coordenação; opções do autodepósito | pendente |
| Calendário e mural | Configure programas e funcionamento | Tipo de ocorrência, Nome da ocorrência, Mensagem do mural; datas, horários e publicação | pendente |

## Índice reverso: Administração · Conteúdo

| Aba real | Macrotema atual relacionado | Tarefas, formulários e campos a conferir | Situação |
| --- | --- | --- | --- |
| Modelos de resposta | Mantenha modelos e ajuda | Tipo, Nome do modelo, Mensagem para o estudante, ordenação e aplicação no atendimento | pendente |
| Ajuda e FAQ | Mantenha modelos e ajuda | Tipo de conteúdo, Categoria, Endereço do artigo, Onde mostrar, publicação e respostas rápidas internas | pendente |
| Guia da equipe | Mantenha modelos e ajuda | Seção, Título, Resumo, Endereço do capítulo, Telas e abas abordadas, Quem pode ler, Ordem de exibição, Versão do Pronto! conferida, editor, rascunho e publicação | pendente |
| Assuntos | Trilha Assuntos/autoridades | busca, estados, importação, cadastro manual, fontes, variantes, vínculos, revisão e publicação | oito tutoriais propostos; pendentes |
| Temas por área | Trilha Assuntos/autoridades | percurso editorial, áreas, vínculos, ordem e resultado público | pendente |
| Catálogo CDU | Mantenha os instrumentos de catalogação | Identificação do código, descrição, fonte, auxiliares, composição e revisão | pendente |

## Índice reverso: Administração · Controle

| Aba real | Macrotema atual relacionado | Tarefas e variações a documentar | Situação |
| --- | --- | --- | --- |
| Indicadores | Acompanhe o serviço e a publicação | períodos, métricas, filtros e limites de interpretação | pendente |
| Depósitos pendentes | Acompanhe o serviço e a publicação | consulta, condição histórica, lembretes, confirmação de publicação e permissões | pendente |
| Arquivos e retenção | Cuide dos registros e da preservação | prazos, estados, limpeza e impedimentos | pendente |
| Backup e restauro | Cuide dos registros e da preservação | execuções, recibos, recuperação e limites operacionais | pendente |
| Auditoria | Cuide dos registros e da preservação | busca, período, Tipo de ação e leitura do histórico | pendente |

## Telas condicionais e recursos transversais a verificar

- Administração → Programas e SLA possui também a rota de edição de programa. Administração → Controle → Depósitos pendentes pode abrir detalhes e ações próprias. Conferir essas subpáginas no capítulo correspondente.
- A análise do atendimento contém painéis, diálogos, etapas e campos dinâmicos além dos rótulos permanentes listados acima. Inventariar cada variante por estado do protocolo durante a redação e captura.
- Assuntos e autoridades têm diálogos de importação, fontes, histórico, publicação e locais; a trilha de oito tutoriais deve trazer os campos de cada fluxo. Temas por área e Catálogo CDU também exigem conferência de formulários condicionais.
- Permissões efetivas mudam quais ações aparecem; cada capítulo precisa indicar perfil, condição inicial, resultado esperado e motivo de bloqueio. Os “Casos” podem reutilizar trechos publicados sem duplicar passos.

## Critério de conclusão do inventário

Para marcar **uma tarefa** como coberta: passo a passo publicado para a audiência correta, condições, variações, campos e resultado conferidos na versão de produção, captura atual e vínculo de todas as telas/abas envolvidas na coluna “Telas e abas abordadas” da lista inicial. Uma tela só estará integralmente coberta quando todas as tarefas disponíveis nela tiverem procedimento correspondente; a presença de um capítulo introdutório ou de uma menção à tela não basta. Mudança posterior de rótulo, campo, validação ou fluxo exige atualizar o registro de elementos do painel, os capítulos afetados e suas imagens na mesma entrega. O [documento-mestre](documento-mestre.md) fixa essa obrigação; este inventário acompanha a execução.
