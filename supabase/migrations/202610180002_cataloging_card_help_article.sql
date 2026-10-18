insert into public.knowledge_base_entries
  (slug, kind, title, summary, body_html, category, audiences, active, position, published_at)
values (
  'o-que-e-ficha-catalografica',
  'article',
  'O que é a ficha catalográfica e por que ela importa?',
  'Conheça a função, a história e a importância da ficha catalográfica para seu trabalho acadêmico.',
  $article$
<h2>O que é a ficha catalográfica?</h2>
<p>É um conjunto organizado de dados que descreve e identifica uma obra. No trabalho acadêmico, apresenta informações como autoria, título, curso, natureza do trabalho, ano, características físicas e assuntos. A ficha ajuda a biblioteca a registrar o trabalho no catálogo e ajuda outras pessoas a encontrá-lo.</p>
<p>A ficha não substitui o resumo, a referência bibliográfica nem a avaliação do conteúdo. Ela descreve o trabalho para fins de identificação, organização e recuperação.</p>
<h2>De onde veio essa ideia?</h2>
<p>Antes dos catálogos digitais, bibliotecas usavam fichas de papel para organizar seus acervos e orientar a busca por autor, título e assunto. No início do século XX, a distribuição de fichas catalográficas impressas permitiu que bibliotecas compartilhassem esse trabalho. Mais tarde, a catalogação na publicação passou a colocar dados bibliográficos na própria obra. Um marco desse modelo foi o programa <em>Cataloging in Publication</em>, iniciado pela Biblioteca do Congresso dos Estados Unidos em 1971.</p>
<p>Hoje, os registros também circulam em sistemas digitais, mas a finalidade permanece: descrever a obra de modo consistente para que ela possa ser identificada e encontrada.</p>
<h2>Por que isso importa para o seu trabalho?</h2>
<ul>
  <li>Identifica o trabalho e distingue obras com títulos ou autores parecidos.</li>
  <li>Organiza dados de autoria, título e assunto para facilitar a busca nos catálogos.</li>
  <li>Ajuda a biblioteca a incorporar e recuperar o trabalho no acervo.</li>
  <li>Preserva uma descrição bibliográfica consistente, útil para quem consulta o trabalho no futuro.</li>
</ul>
<h2>Como a ficha é feita no Pronto!?</h2>
<p>Você informa os dados da versão final do trabalho. A equipe da biblioteca confere e homologa a descrição antes de liberar a ficha. Por isso, preencha título, autoria, orientação, datas e demais campos exatamente como constam no trabalho aprovado. Depois de liberada, a ficha pode ser incluída no arquivo final conforme as orientações do seu curso.</p>
<h2>Para saber mais</h2>
<p><a href="https://antigo.bn.gov.br/sites/default/files/documentos/miscelanea/2015/bibliotecapublica_principiosdiretrizes_edicao2.pdf">Biblioteca Nacional: princípios e diretrizes de catalogação</a></p>
<p><a href="https://www.loc.gov/loc/lcib/0112/cds.html">Biblioteca do Congresso: distribuição histórica de fichas</a></p>
<p><a href="https://www.loc.gov/loc/lcib/9615/cip2.html">Biblioteca do Congresso: história da catalogação na publicação</a></p>
  $article$,
  'Ficha', array['public','student','panel'], true, 1050, now()
)
on conflict (slug) do nothing;

update public.knowledge_base_entries
set summary = 'A matrícula identifica o vínculo acadêmico da solicitação. Após cancelamento, você pode iniciar outro pedido; um protocolo concluído encerra essa possibilidade.',
    body_html = '<p>A matrícula identifica o vínculo acadêmico associado ao protocolo. Se um pedido for cancelado, você pode iniciar outro e informar novamente a matrícula correspondente.</p><p>Se o protocolo foi concluído, o Pronto! não permite abrir outra solicitação. O histórico continua disponível na mesma conta.</p>',
    updated_at = now()
where kind = 'faq' and title = 'Por que preciso informar a matrícula em cada nova solicitação?';

update public.knowledge_base_entries
set summary = 'Após o cancelamento de um protocolo, informe novamente a matrícula ao iniciar outro pedido. Um protocolo concluído não permite nova solicitação.',
    body_html = '<p>Se o protocolo anterior foi cancelado, você pode iniciar uma nova solicitação e informar novamente a matrícula, inclusive a mesma do pedido cancelado. Se foi concluído, não é possível abrir outra solicitação.</p>',
    updated_at = now()
where kind = 'answer' and title = 'Preciso informar a matrícula novamente?';
