-- Abre a seção editorial de casos; não cria nem publica capítulos.
alter table public.staff_guide_pages
  drop constraint if exists staff_guide_pages_section_check;
alter table public.staff_guide_pages
  add constraint staff_guide_pages_section_check
  check (section in ('comece-aqui','atendimento','administracao','casos'));
create or replace function public.admin_save_staff_guide_page(
  page_id uuid, page_slug text, page_section text, page_audience text,
  page_position integer, page_title text, page_summary text, page_html text, page_screens text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare result uuid;
begin
  if not public.has_permission('admin.guide.manage') then raise exception 'permission_denied'; end if;
  if page_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    or page_section not in ('comece-aqui','atendimento','administracao','casos')
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
