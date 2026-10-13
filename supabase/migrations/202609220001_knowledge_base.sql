-- A Central de ajuda passa a usar uma única base editorial.
create table public.knowledge_base_entries (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  kind text not null check (kind in ('faq', 'answer', 'article')),
  title text not null check (char_length(btrim(title)) between 5 and 300),
  summary text not null check (char_length(btrim(summary)) between 5 and 1000),
  body_html text not null default '' check (char_length(body_html) <= 50000),
  category text not null check (category in ('Geral', 'Solicitação', 'Análise', 'Ficha', 'Autodepósito', 'Atendimento', 'Administração')),
  audiences text[] not null check (cardinality(audiences) > 0 and audiences <@ array['public','student','cataloger','administrator','panel']::text[]),
  active boolean not null default false,
  position integer not null default 0 check (position between 0 and 9999),
  featured_position integer check (featured_position between 1 and 3),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  check ((kind = 'article' and slug is not null and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$') or (kind <> 'article' and slug is null)),
  check (featured_position is null or (kind = 'faq' and 'public' = any(audiences)))
);
create unique index knowledge_base_featured_unique on public.knowledge_base_entries(featured_position) where featured_position is not null;
create index knowledge_base_public_order on public.knowledge_base_entries(position) where active;
alter table public.knowledge_base_entries enable row level security;
create policy knowledge_base_public_read on public.knowledge_base_entries for select to anon, authenticated
  using (active and 'public' = any(audiences));
create policy knowledge_base_role_read on public.knowledge_base_entries for select to authenticated
  using (public.current_user_role() = 'administrator'
    or (active and (
      (public.current_user_role() is not null and 'panel' = any(audiences))
      or (public.current_user_role() = 'student' and 'student' = any(audiences))
      or (public.current_user_role() = 'cataloger' and 'cataloger' = any(audiences))
    )));
revoke all on public.knowledge_base_entries from anon, authenticated;
grant select on public.knowledge_base_entries to anon, authenticated;

create function public.admin_save_knowledge_base_entry(
  entry_id uuid, entry_slug text, entry_kind text, entry_title text, entry_summary text,
  entry_body_html text, entry_category text, entry_audiences text[], entry_active boolean,
  entry_position integer, entry_featured_position integer
) returns uuid language plpgsql security definer set search_path = '' as $$
declare result uuid; clean_slug text := nullif(btrim(entry_slug), '');
begin
  if public.current_user_role() is distinct from 'administrator' then raise exception 'active_administrator_required'; end if;
  if entry_kind not in ('faq', 'answer', 'article')
    or char_length(btrim(coalesce(entry_title, ''))) not between 5 and 300
    or char_length(btrim(coalesce(entry_summary, ''))) not between 5 and 1000
    or char_length(coalesce(entry_body_html, '')) > 50000
    or entry_category not in ('Geral', 'Solicitação', 'Análise', 'Ficha', 'Autodepósito', 'Atendimento', 'Administração')
    or coalesce(cardinality(entry_audiences), 0) = 0
    or not (entry_audiences <@ array['public','student','cataloger','administrator','panel']::text[])
    or entry_position not between 0 and 9999
    or (entry_kind = 'article' and (clean_slug is null or clean_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'))
    or (entry_kind <> 'article' and clean_slug is not null)
    or (entry_featured_position is not null and (entry_kind <> 'faq' or 'public' <> all(entry_audiences) or entry_featured_position not between 1 and 3))
  then raise exception 'invalid_knowledge_base_entry'; end if;
  if entry_featured_position is not null then
    update public.knowledge_base_entries set featured_position = null where featured_position = entry_featured_position and id is distinct from entry_id;
  end if;
  if entry_id is null then
    insert into public.knowledge_base_entries(slug,kind,title,summary,body_html,category,audiences,active,position,featured_position,published_at,created_by,updated_by)
    values(clean_slug,entry_kind,btrim(entry_title),btrim(entry_summary),coalesce(entry_body_html,''),entry_category,entry_audiences,entry_active,entry_position,entry_featured_position,case when entry_active then now() end,auth.uid(),auth.uid())
    returning id into result;
  else
    update public.knowledge_base_entries
    set slug=clean_slug,kind=entry_kind,title=btrim(entry_title),summary=btrim(entry_summary),body_html=coalesce(entry_body_html,''),category=entry_category,
        audiences=entry_audiences,active=entry_active,position=entry_position,featured_position=entry_featured_position,
        published_at=case when entry_active then coalesce(published_at, now()) else null end,updated_at=now(),updated_by=auth.uid()
    where id=entry_id returning id into result;
  end if;
  if result is null then raise exception 'knowledge_base_entry_not_found'; end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
  values(auth.uid(),'knowledge_base_entry_saved','knowledge_base_entry',result::text,jsonb_build_object('kind',entry_kind,'audiences',entry_audiences,'active',entry_active));
  return result;
end $$;
revoke all on function public.admin_save_knowledge_base_entry(uuid,text,text,text,text,text,text,text[],boolean,integer,integer) from public, anon;
grant execute on function public.admin_save_knowledge_base_entry(uuid,text,text,text,text,text,text,text[],boolean,integer,integer) to authenticated;

insert into public.knowledge_base_entries(kind,title,summary,body_html,category,audiences,active,position,featured_position,created_at,updated_at,published_at,created_by,updated_by)
select 'faq',question,answer,'<p>' || replace(replace(replace(answer,'&','&amp;'),'<','&lt;'),'>','&gt;') || '</p>',
       'Geral',array['public','student','cataloger','administrator','panel'],active,position,featured_position,created_at,updated_at,
       case when active then created_at end,created_by,updated_by
from public.frequently_asked_questions;

insert into public.knowledge_base_entries(slug,kind,title,summary,body_html,category,audiences,active,position,published_at) values
('preparar-solicitacao','article','Como preparar sua solicitação','Confira o que separar antes de iniciar o formulário.',
'<h2>Antes de abrir o formulário</h2><p>Use a versão final do trabalho, já defendida ou aprovada pela banca. Quando aplicável, ela deve incluir a folha de aprovação assinada ou digitalizada.</p><h2>Passo a passo</h2><ol><li>Hospede o arquivo em um serviço de nuvem.</li><li>Confirme que o link funciona para qualquer pessoa.</li><li>Separe os dados exatamente como aparecem no trabalho.</li><li>Inicie o formulário e retome o rascunho quando precisar.</li></ol><h2>Atenção ao link público</h2><p>Google Drive, OneDrive e serviços equivalentes podem ser usados. O Pronto! recebe somente o link: o PDF completo não é enviado ao sistema.</p>',
'Solicitação',array['public','student','panel'],true,1000,now()),
('corrigir-solicitacao','article','Como responder a uma correção da biblioteca','Entenda o que acontece quando a solicitação volta para você.',
'<h2>O que significa uma correção</h2><p>A biblioteca indica exatamente quais informações precisam de ajuste e explica o motivo de cada devolução.</p><h2>Passo a passo</h2><ol><li>Entre no painel e abra sua solicitação.</li><li>Leia as justificativas enviadas pela biblioteca.</li><li>Altere somente os campos disponibilizados.</li><li>Envie novamente pelo próprio painel.</li></ol><h2>O que permanece protegido</h2><p>Os campos que já foram conferidos ficam bloqueados. Isso preserva a revisão feita e evita que dados corretos sejam alterados por engano.</p>',
'Análise',array['public','student','cataloger','panel'],true,1010,now()),
('concluir-autodeposito','article','Como concluir o autodepósito','Veja o que fazer depois da liberação da ficha.',
'<h2>Antes de começar</h2><p>A liberação ocorre quando a ficha foi homologada e o Nada Consta aprovado. A partir daí, o guia aparece no painel.</p><h2>Passo a passo</h2><ol><li>Abra o guia do RI/UFBA no painel.</li><li>Reaproveite os metadados homologados.</li><li>Faça o depósito e escolha a licença no Repositório Institucional.</li><li>Informe a URL permanente ou Handle à biblioteca.</li></ol><h2>Importante</h2><p>O Pronto! orienta o processo, mas o depósito e as escolhas no RI/UFBA continuam sendo realizados por você.</p>',
'Autodepósito',array['public','student','panel'],true,1020,now()),
(null,'answer','Preciso enviar o PDF do trabalho?','Não. Informe um link público para o trabalho final; o PDF completo não é enviado ao Pronto!.','<p>Não. Informe um link público para o trabalho final; o PDF completo não é enviado ao Pronto!.</p>','Solicitação',array['public','student','panel'],true,1030,now()),
(null,'answer','Quando a ficha fica disponível?','Após a homologação pela biblioteca e a aprovação do Nada Consta.','<p>Após a homologação pela biblioteca e a aprovação do Nada Consta.</p>','Ficha',array['public','student','panel'],true,1040,now());
