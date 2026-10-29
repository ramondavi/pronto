-- Resposta editorial restrita à equipe: não altera fichas, códigos ou políticas de acesso.
insert into public.knowledge_base_entries
(id,kind,title,summary,body_html,category,audiences,active,position,published_at)
values (
'cd000000-0000-4000-8000-000000000001'::uuid,
'answer',
'Como cadastrar e compor uma notação CDU?',
'Guia da equipe bibliotecária: campos do repertório local, hierarquia, edição, auxiliares, relações e exemplos de composição na Administração e na análise.',
$help$
<h2>O que o Pronto! organiza</h2>
<p>A CDU representa assuntos por números e sinais. O repertório do Pronto! é uma base local construída pela biblioteca: ele não contém uma tabela completa da CDU nem substitui a edição consultada. A classificação exige análise do conteúdo e conferência profissional.</p>
<h2>Cadastrar ou compor?</h2>
<p>Na Administração, use <strong>Adicionar CDU</strong>. Escolha <strong>Cadastrar um código</strong> para registrar uma classe ou auxiliar que ainda não existe. Escolha <strong>Montar uma notação</strong> para combinar componentes já cadastrados. Na análise, <strong>Compor notação CDU</strong> abre o mesmo compositor; <strong>Usar na ficha</strong> aplica a escolha ao rascunho. A homologação continua sendo uma etapa separada.</p>
<h2>Campos do cadastro</h2>
<ul>
<li><strong>Código CDU:</strong> transcreva a notação completa, preservando pontuação e delimitadores. Não confunda o número CDU com o Cutter.</li>
<li><strong>Descrição técnica:</strong> informe o significado conferido na edição consultada. Uma composição precisa de descrição própria, sem simplesmente concatenar os textos dos componentes.</li>
<li><strong>Edição da CDU:</strong> a opção inicial é 2ª edição (IBICT, 2007). A 1ª edição (IBICT, 1997) aparece como edição defasada. Selecione a fonte efetivamente usada; não misture componentes de edições diferentes.</li>
<li><strong>Tipo de código:</strong> distingue classe da tabela principal, notação composta, famílias de auxiliares comuns e auxiliares especiais. “Ainda não organizado” mantém o cadastro pendente de organização.</li>
<li><strong>Classe de aplicação:</strong> aparece somente para auxiliar especial. É obrigatória e indica em qual classe o auxiliar pode ser empregado. A aplicação aos descendentes depende da hierarquia registrada e das instruções da edição.</li>
<li><strong>Código um nível acima:</strong> relação hierárquica com o código imediatamente mais amplo. É opcional e não é deduzida por cortar algarismos. Não confunda hierarquia com classe de aplicação.</li>
<li><strong>Orientações de uso:</strong> registre condições, exceções e referências para a equipe. O campo é opcional.</li>
<li><strong>Memória de composição:</strong> registra os componentes, a ordem e a aplicação dos complementos. O compositor a produz para conferência; na revisão administrativa ela pode ser complementada.</li>
<li><strong>Auxiliares empregados e códigos relacionados:</strong> na revisão, informe códigos separados por vírgula. Auxiliares descrevem os complementos usados; relacionados documentam associações e remissivas, sem estabelecer automaticamente uma relação hierárquica.</li>
<li><strong>Código validado:</strong> assinale apenas depois da revisão bibliotecária. Salvar uma composição não significa validá-la.</li>
</ul>
<h2>Auxiliares: cadastre antes de combinar</h2>
<p>Para selecionar um auxiliar no compositor, cadastre-o na mesma edição e organize seu tipo. Um auxiliar de língua, por exemplo =111, é cadastrado como auxiliar comum de língua, separadamente da classe principal. Depois pode ser usado em diferentes composições, conforme a edição. Isso não autoriza empregar todo auxiliar sozinho como classificação final.</p>
<p>As famílias comuns incluem língua (=…), forma (0…), lugar (…), ascendência humana/povo (=…), tempo (entre aspas duplas), características gerais, materiais e pessoas (-02, -03, -04 e -05). Os auxiliares especiais usam formas como -1/-9, .01/.09 e apóstrofo, com aplicação restrita. Preserve os delimitadores e confira as instruções próprias de cada tabela.</p>
<h2>Exemplo guiado: 711.4(813.8)</h2>
<ol>
<li>Cadastre ou confira 711.4 como classe principal e (813.8) como auxiliar comum de lugar, ambos na edição usada. Confira as descrições na fonte da biblioteca.</li>
<li>Abra o compositor em <strong>Montagem guiada</strong>. Selecione 711.4 no assunto 1.</li>
<li>Use <strong>Adicionar auxiliar</strong> e selecione (813.8). Com um assunto, ele se aplica a esse assunto.</li>
<li>Confira a prévia 711.4(813.8), a memória e a descrição. Marque a confirmação e salve no catálogo ou use na ficha, conforme a tela.</li>
</ol>
<h2>Exemplo de relação: 711.4:316.55(813.8)</h2>
<p>Adicione 711.4 e depois o assunto relacionado 316.55, usando a relação simples (:). Acrescente (813.8) e escolha sua aplicação ao <strong>assunto 2</strong>. O código resultante será 711.4:316.55(813.8). Se o lugar qualificar o conjunto, selecione “Ao conjunto dos assuntos”: o resultado será [711.4:316.55](813.8). Esses alcances não são equivalentes. Confira o significado de cada classe e a ordem apropriada na edição.</p>
<h2>Montagem por símbolos</h2>
<p>Use esta modalidade quando precisar controlar a sequência de componentes, relações e grupos. Acrescente cada bloco na ordem desejada. “Antes”, “Depois” e “Remover” alteram a sequência; o sistema não decide o significado por você.</p>
<ul>
<li><strong>+ (adição):</strong> reúne assuntos não consecutivos. Exemplo estrutural: 51+53.</li>
<li><strong>/ (extensão):</strong> representa a sequência consecutiva entre os extremos, inclusive as classes intermediárias. Exemplo: 53/54. Não equivale a selecionar apenas os dois extremos.</li>
<li><strong>: (relação simples):</strong> relaciona assuntos. Exemplo: 711.4:316.55.</li>
<li><strong>:: (relação com ordem fixada):</strong> mantém a sequência de citação fixada; não intercambie os componentes como se fosse uma relação simples.</li>
<li><strong>[ ] (agrupamento):</strong> delimita o conjunto ao qual se aplica um complemento. Exemplo: [53/54](0.034.2PDF), desde que os componentes estejam cadastrados e conferidos.</li>
<li><strong>* (notação externa):</strong> introduz código de outro sistema. Em 006.44*NBR6023, informe NBR6023 e identifique a fonte; o asterisco é inserido pelo compositor.</li>
<li><strong>A/Z (especificação alfabética):</strong> indica uso de letras, sem escrever “A/Z” na notação. A posição dentro ou fora de um auxiliar pode alterar o aspecto qualificado.</li>
</ul>
<h2>Outras formas de composição</h2>
<p><strong>Síntese dentro de um auxiliar:</strong> combina dois auxiliares da mesma família, mantendo um único invólucro. Exemplo estrutural: (81+73). A síntese temporal permite intervalo com /.</p>
<p><strong>Intercalação:</strong> insere auxiliar independente em um ponto do número principal. Exemplo: 622(430).341.1. Acrescente a classe principal por último e escolha o ponto de inserção antes dos demais complementos. Não retire os pontos da classe.</p>
<p><strong>Divisão paralela:</strong> reaproveita subdivisões somente quando a tabela autoriza expressamente. Informe classe de destino, classe-modelo, subdivisão e localização da instrução. O sinal de instrução não integra o código final. Uma remissiva também deve ser documentada como orientação ou relação, sem ser copiada como operador de composição.</p>
<h2>Conferência antes de usar</h2>
<p>O Pronto! confere a estrutura, o equilíbrio dos grupos, a edição e a aplicação registrada dos auxiliares especiais. Não confirma automaticamente todo significado, todas as exceções nem a ordem de arquivamento. Ordem de citação e ordem de arquivamento são diferentes. Não trate o antigo ponto de vista .00 como auxiliar especial .0.</p>
<p>Novas composições ficam pendentes de organização e validação. Uma notação já existente é reutilizada sem sobrescrever sua descrição. A edição não deve ser alterada apenas para contornar um conflito. A manutenção e a mesclagem do catálogo preservam as fichas já produzidas; uma revisão de ficha exige seu próprio fluxo.</p>
<p>Referências de estrutura e notação: <a href="https://udcc.org/index.php/site/page?view=about_structure">UDC Consortium — estrutura da CDU</a> e <a href="https://udcc.org/index.php/site/page?view=about_notation">UDC Consortium — notação</a>. Exemplos são didáticos e exigem conferência na edição utilizada pela biblioteca.</p>
$help$,
'Análise',array['cataloger','administrator']::text[],true,0,now())
on conflict (id) do nothing;

