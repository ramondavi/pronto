alter table public.staff_guide_pages
  add column draft_screens text not null default '' check (char_length(draft_screens) <= 500),
  add column published_screens text;

update public.staff_guide_pages
set draft_screens = 'Visão geral; Fila de solicitações; Meus atendimentos; Atendimento',
    published_screens = 'Visão geral; Fila de solicitações; Meus atendimentos; Atendimento'
where published_slug = 'conheca-o-pronto' and draft_screens = '' and published_screens is null;

grant select(published_screens) on public.staff_guide_pages to authenticated;

drop function public.admin_save_staff_guide_page(uuid,text,text,text,integer,text,text,text);
create function public.admin_save_staff_guide_page(
  page_id uuid, page_slug text, page_section text, page_audience text,
  page_position integer, page_title text, page_summary text, page_html text, page_screens text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare result uuid;
begin
  if not public.has_permission('admin.guide.manage') then raise exception 'permission_denied'; end if;
  if page_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    or page_section not in ('comece-aqui','atendimento','administracao')
    or page_audience not in ('team','administrator')
    or page_position not between 0 and 9999
    or char_length(btrim(page_title)) not between 1 and 300
    or char_length(coalesce(page_summary,'')) > 1000
    or char_length(coalesce(page_html,'')) > 100000
    or char_length(coalesce(page_screens,'')) > 500 then
    raise exception 'invalid_staff_guide_page';
  end if;
  if page_id is null then
    insert into public.staff_guide_pages(slug,section,audience,position,draft_title,draft_summary,draft_html,draft_screens,updated_by)
    values(page_slug,page_section,page_audience,page_position,btrim(page_title),coalesce(page_summary,''),coalesce(page_html,'<p></p>'),btrim(coalesce(page_screens,'')),auth.uid()) returning id into result;
  else
    update public.staff_guide_pages set slug=page_slug,section=page_section,audience=page_audience,
      position=page_position,draft_title=btrim(page_title),draft_summary=coalesce(page_summary,''),
      draft_html=coalesce(page_html,'<p></p>'),draft_screens=btrim(coalesce(page_screens,'')),updated_at=now(),updated_by=auth.uid()
    where id=page_id returning id into result;
    if result is null then raise exception 'staff_guide_page_not_found'; end if;
  end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
    values(auth.uid(),'staff_guide_saved','staff_guide_page',result::text,jsonb_build_object('slug',page_slug));
  return result;
end $$;
revoke all on function public.admin_save_staff_guide_page(uuid,text,text,text,integer,text,text,text,text) from public, anon;
grant execute on function public.admin_save_staff_guide_page(uuid,text,text,text,integer,text,text,text,text) to authenticated;

create or replace function public.admin_publish_staff_guide_page(page_id uuid, checked_version text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_permission('admin.guide.manage') then raise exception 'permission_denied'; end if;
  if char_length(btrim(coalesce(checked_version,''))) < 3 or char_length(checked_version) > 100 then
    raise exception 'checked_version_required';
  end if;
  update public.staff_guide_pages set published_slug=slug,published_section=section,
    published_audience=audience,published_position=position,published_title=draft_title,published_summary=draft_summary,
    published_html=draft_html,published_screens=draft_screens,published_at=now(),reviewed_version=btrim(checked_version)
  where id=page_id and btrim(regexp_replace(draft_html,'<[^>]*>','','g')) <> '';
  if not found then raise exception 'staff_guide_page_not_ready'; end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
    values(auth.uid(),'staff_guide_published','staff_guide_page',page_id::text,jsonb_build_object('version',checked_version));
end $$;
