-- Guia editorial da equipe, separado da Central pública e de suas imagens.
insert into public.permission_definitions
  (code,area,screen,action,description,default_roles,professional_only,delegable)
values
  ('admin.guide.manage','Administração','Guia da equipe','Editar e publicar guia','Criar, revisar e publicar procedimentos internos da equipe','{administrator}',true,true)
on conflict (code) do nothing;

create table public.staff_guide_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  section text not null check (section in ('comece-aqui','atendimento','administracao')),
  audience text not null check (audience in ('team','administrator')),
  position integer not null default 0 check (position between 0 and 9999),
  draft_title text not null check (char_length(draft_title) between 1 and 300),
  draft_summary text not null default '' check (char_length(draft_summary) <= 1000),
  draft_html text not null default '<p></p>' check (char_length(draft_html) <= 100000),
  published_slug text unique,
  published_section text,
  published_audience text,
  published_position integer,
  published_title text,
  published_summary text,
  published_html text,
  published_at timestamptz,
  reviewed_version text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
create index staff_guide_pages_order on public.staff_guide_pages(section,position);
alter table public.staff_guide_pages enable row level security;
create policy staff_guide_read on public.staff_guide_pages for select to authenticated using (
  public.has_permission('admin.guide.manage')
  or (published_at is not null and public.current_user_role() in ('cataloger','administrator')
      and (published_audience = 'team' or public.current_user_role() = 'administrator'))
);
revoke all on public.staff_guide_pages from anon, authenticated;
grant select(id,published_slug,published_section,published_audience,published_position,published_title,published_summary,published_html,published_at,reviewed_version,updated_at)
  on public.staff_guide_pages to authenticated;

create function public.admin_list_staff_guide_pages()
returns setof public.staff_guide_pages language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.has_permission('admin.guide.manage') then raise exception 'permission_denied'; end if;
  return query select * from public.staff_guide_pages order by section, position;
end $$;
revoke all on function public.admin_list_staff_guide_pages() from public, anon;
grant execute on function public.admin_list_staff_guide_pages() to authenticated;

create function public.admin_save_staff_guide_page(
  page_id uuid, page_slug text, page_section text, page_audience text,
  page_position integer, page_title text, page_summary text, page_html text
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
    or char_length(coalesce(page_html,'')) > 100000 then
    raise exception 'invalid_staff_guide_page';
  end if;
  if page_id is null then
    insert into public.staff_guide_pages(slug,section,audience,position,draft_title,draft_summary,draft_html,updated_by)
    values(page_slug,page_section,page_audience,page_position,btrim(page_title),coalesce(page_summary,''),coalesce(page_html,'<p></p>'),auth.uid()) returning id into result;
  else
    update public.staff_guide_pages set slug=page_slug,section=page_section,audience=page_audience,
      position=page_position,draft_title=btrim(page_title),draft_summary=coalesce(page_summary,''),
      draft_html=coalesce(page_html,'<p></p>'),updated_at=now(),updated_by=auth.uid()
    where id=page_id returning id into result;
    if result is null then raise exception 'staff_guide_page_not_found'; end if;
  end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
    values(auth.uid(),'staff_guide_saved','staff_guide_page',result::text,jsonb_build_object('slug',page_slug));
  return result;
end $$;
revoke all on function public.admin_save_staff_guide_page(uuid,text,text,text,integer,text,text,text) from public, anon;
grant execute on function public.admin_save_staff_guide_page(uuid,text,text,text,integer,text,text,text) to authenticated;

create function public.admin_publish_staff_guide_page(page_id uuid, checked_version text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_permission('admin.guide.manage') then raise exception 'permission_denied'; end if;
  if char_length(btrim(coalesce(checked_version,''))) < 3 or char_length(checked_version) > 100 then
    raise exception 'checked_version_required';
  end if;
  update public.staff_guide_pages set published_slug=slug,published_section=section,
    published_audience=audience,published_position=position,published_title=draft_title,published_summary=draft_summary,
    published_html=draft_html,published_at=now(),reviewed_version=btrim(checked_version)
  where id=page_id and btrim(regexp_replace(draft_html,'<[^>]*>','','g')) <> '';
  if not found then raise exception 'staff_guide_page_not_ready'; end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
    values(auth.uid(),'staff_guide_published','staff_guide_page',page_id::text,jsonb_build_object('version',checked_version));
end $$;
revoke all on function public.admin_publish_staff_guide_page(uuid,text) from public, anon;
grant execute on function public.admin_publish_staff_guide_page(uuid,text) to authenticated;

create function public.admin_unpublish_staff_guide_page(page_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_permission('admin.guide.manage') then raise exception 'permission_denied'; end if;
  update public.staff_guide_pages set published_at=null where id=page_id and published_at is not null;
  if not found then raise exception 'staff_guide_page_not_published'; end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id)
    values(auth.uid(),'staff_guide_unpublished','staff_guide_page',page_id::text);
end $$;
revoke all on function public.admin_unpublish_staff_guide_page(uuid) from public, anon;
grant execute on function public.admin_unpublish_staff_guide_page(uuid) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('staff-guide-images','staff-guide-images',false,2097152,array['image/png','image/jpeg','image/webp'])
on conflict(id) do nothing;
create policy staff_guide_images_read on storage.objects for select to authenticated using (
  bucket_id='staff-guide-images' and exists (
    select 1 from public.staff_guide_pages p where p.id::text=split_part(name,'/',1)
      and (public.has_permission('admin.guide.manage') or
        (p.published_at is not null and public.current_user_role() in ('cataloger','administrator')
          and (p.published_audience='team' or public.current_user_role()='administrator')))
  )
);
create policy staff_guide_images_insert on storage.objects for insert to authenticated with check (
  bucket_id='staff-guide-images' and public.has_permission('admin.guide.manage')
  and exists (select 1 from public.staff_guide_pages p where p.id::text=split_part(name,'/',1))
);
