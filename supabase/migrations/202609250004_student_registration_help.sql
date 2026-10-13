-- A matrícula pertence ao vínculo acadêmico da solicitação, não à conta permanente.
insert into public.knowledge_base_entries
  (kind, title, summary, body_html, category, audiences, active, position, published_at)
select
  'faq',
  'Por que preciso informar a matrícula em cada nova solicitação?',
  'A matrícula identifica o vínculo acadêmico daquela solicitação. Se você iniciar outro curso ou grau, poderá usar a mesma conta com uma matrícula diferente.',
  '<p>A matrícula identifica o vínculo acadêmico ao qual a ficha catalográfica daquela solicitação se refere. Sua conta no Pronto! continua a mesma, mas a matrícula pode mudar se você iniciar outro curso ou grau acadêmico.</p><p>Por isso, informe a matrícula do vínculo atual em cada nova solicitação. Isso mantém cada protocolo ligado ao curso e à matrícula correspondentes, sem alterar seu cadastro ou o histórico de solicitações anteriores.</p>',
  'Solicitação', array['public','student','panel'], true, 65, now()
where not exists (
  select 1 from public.knowledge_base_entries
  where kind = 'faq' and title = 'Por que preciso informar a matrícula em cada nova solicitação?'
);

insert into public.knowledge_base_entries
  (kind, title, summary, body_html, category, audiences, active, position, published_at)
select
  'answer',
  'Preciso informar a matrícula novamente?',
  'Sim. Cada solicitação usa a matrícula do seu vínculo acadêmico atual; sua conta e seus protocolos anteriores continuam os mesmos.',
  '<p>Sim. Informe a matrícula do curso ou grau acadêmico correspondente à nova solicitação. Ela pode mudar ao longo da sua trajetória, enquanto sua conta e seus protocolos anteriores permanecem no Pronto!.</p>',
  'Solicitação', array['public','student','panel'], true, 15, now()
where not exists (
  select 1 from public.knowledge_base_entries
  where kind = 'answer' and title = 'Preciso informar a matrícula novamente?'
);
