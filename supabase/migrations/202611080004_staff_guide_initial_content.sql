-- Capítulo introdutório da equipe. Não altera páginas já criadas pelos editores.
insert into public.staff_guide_pages (
  slug, section, audience, position, draft_title, draft_summary, draft_html,
  published_slug, published_section, published_audience, published_position,
  published_title, published_summary, published_html, published_at, reviewed_version
)
select
  'conheca-o-pronto', 'comece-aqui', 'team', 10,
  'Conheça o Pronto!',
  'Encontre as áreas do painel, acompanhe os atendimentos e use a ajuda da equipe.',
  $guide$
  <h2>Onde começar</h2>
  <p>Ao entrar no painel interno, a barra lateral normalmente aparece contraída, mostrando os ícones. Ao expandir o menu, você vê os nomes das áreas.</p>
  <p>A <span data-panel-ref="overview"></span> reúne tarefas, atualizações e avisos. Em <span data-panel-ref="queue-general"></span>, consulte os protocolos visíveis conforme sua permissão. <span data-panel-ref="work"></span> mostra os casos sob sua responsabilidade.</p>
  <h2>Como ler um atendimento</h2>
  <p>O cartão da fila mostra o estado operacional do protocolo. Dentro do atendimento, a análise percorre <span data-panel-ref="analysis-metadata"></span>, <span data-panel-ref="analysis-cataloging"></span>, <span data-panel-ref="analysis-review"></span> e <span data-panel-ref="analysis-documentation"></span>.</p>
  <p>O estado do protocolo, a homologação da ficha e a aprovação do Nada Consta são verificações diferentes. A ficha homologada só é liberada quando as demais condições forem atendidas.</p>
  <h2>Encontre orientação para sua tarefa</h2>
  <p>Use a busca deste guia para localizar um procedimento detalhado. No painel, a busca interna e a janela flutuante de ajuda também encontram conteúdo da equipe. As respostas rápidas de Ajuda e FAQ explicam dúvidas frequentes; os capítulos do guia apresentam o passo a passo completo.</p>
  $guide$,
  'conheca-o-pronto', 'comece-aqui', 'team', 10,
  'Conheça o Pronto!',
  'Encontre as áreas do painel, acompanhe os atendimentos e use a ajuda da equipe.',
  $guide$
  <h2>Onde começar</h2>
  <p>Ao entrar no painel interno, a barra lateral normalmente aparece contraída, mostrando os ícones. Ao expandir o menu, você vê os nomes das áreas.</p>
  <p>A <span data-panel-ref="overview"></span> reúne tarefas, atualizações e avisos. Em <span data-panel-ref="queue-general"></span>, consulte os protocolos visíveis conforme sua permissão. <span data-panel-ref="work"></span> mostra os casos sob sua responsabilidade.</p>
  <h2>Como ler um atendimento</h2>
  <p>O cartão da fila mostra o estado operacional do protocolo. Dentro do atendimento, a análise percorre <span data-panel-ref="analysis-metadata"></span>, <span data-panel-ref="analysis-cataloging"></span>, <span data-panel-ref="analysis-review"></span> e <span data-panel-ref="analysis-documentation"></span>.</p>
  <p>O estado do protocolo, a homologação da ficha e a aprovação do Nada Consta são verificações diferentes. A ficha homologada só é liberada quando as demais condições forem atendidas.</p>
  <h2>Encontre orientação para sua tarefa</h2>
  <p>Use a busca deste guia para localizar um procedimento detalhado. No painel, a busca interna e a janela flutuante de ajuda também encontram conteúdo da equipe. As respostas rápidas de Ajuda e FAQ explicam dúvidas frequentes; os capítulos do guia apresentam o passo a passo completo.</p>
  $guide$,
  now(), '0.1.0'
where not exists (select 1 from public.staff_guide_pages where slug = 'conheca-o-pronto');
