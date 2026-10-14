-- Gestão do calendário e mural como ação delegável separada da Administração.
insert into public.permission_definitions(code,area,screen,action,description,default_roles,professional_only,delegable)
values('library.calendar.manage','Operação','Calendário e mural','Gerenciar ocorrências e avisos',
  'Criar, editar e excluir avisos e ocorrências da biblioteca','{administrator}',true,true);

drop policy if exists "library_announcements_manage_by_administrator" on public.library_announcements;
create policy library_announcements_manage_by_permission on public.library_announcements for all to authenticated
  using (public.has_permission('library.calendar.manage'))
  with check (public.has_permission('library.calendar.manage'));

create or replace function public.admin_save_announcement(
  announcement_id uuid,announcement_type public.announcement_type,
  announcement_title text,announcement_message text,starts_at timestamptz,
  ends_at timestamptz,enabled boolean
) returns uuid language plpgsql security definer set search_path = '' as $$
declare result uuid;
begin
  if not public.has_permission('library.calendar.manage') then raise exception 'permission_denied'; end if;
  if length(trim(coalesce(announcement_title,''))) < 3 or length(trim(coalesce(announcement_message,''))) < 3
    or starts_at is null or (ends_at is not null and ends_at <= starts_at) then raise exception 'invalid_announcement'; end if;
  if announcement_id is null then
    insert into public.library_announcements(type,title,message,starts_at,ends_at,active,created_by)
      values(announcement_type,trim(announcement_title),trim(announcement_message),$5,$6,enabled,auth.uid())
      returning id into result;
  else
    update public.library_announcements as announcement
      set type=announcement_type,title=trim(announcement_title),message=trim(announcement_message),
        starts_at=$5,ends_at=$6,active=enabled,updated_at=now()
      where announcement.id=announcement_id returning announcement.id into result;
    if result is null then raise exception 'announcement_not_found'; end if;
  end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id)
    values(auth.uid(),'library_announcement_saved','library_announcement',result::text);
  return result;
end $$;
