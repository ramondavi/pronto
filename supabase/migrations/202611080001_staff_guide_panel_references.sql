-- Atualiza somente o capítulo fictício do piloto local, quando ele existir.
-- As referências guardam identificadores; o SVG e o rótulo vêm da interface do Pronto!.
create function pg_temp.staff_guide_pilot_references(source text) returns text language sql as $$
  select replace(
    replace(source,
      '<p>A Visão geral reúne as tarefas, atualizações e avisos da equipe. Em Fila geral, consulte os protocolos conforme sua permissão. Meus atendimentos mostra os casos sob sua responsabilidade.</p>',
      '<p>No painel interno, a barra lateral normalmente aparece contraída, mostrando apenas os ícones. Passe o mouse ou expanda o menu para ver os rótulos.</p><p>A <span data-panel-ref="overview"></span> reúne as tarefas, atualizações e avisos da equipe. Em <span data-panel-ref="queue-general"></span>, consulte os protocolos conforme sua permissão. <span data-panel-ref="work"></span> mostra os casos sob sua responsabilidade.</p>'
    ),
    'a análise percorre Metadados, Catalogação, Revisão da ficha e Finalização e liberação.',
    'a análise percorre <span data-panel-ref="analysis-metadata"></span>, <span data-panel-ref="analysis-cataloging"></span>, <span data-panel-ref="analysis-review"></span> e <span data-panel-ref="analysis-documentation"></span>.'
  );
$$;

update public.staff_guide_pages
set draft_html = pg_temp.staff_guide_pilot_references(draft_html),
    published_html = pg_temp.staff_guide_pilot_references(published_html)
where published_slug = 'conheca-o-pronto'
  and published_html like '%A Visão geral reúne as tarefas%';
