-- Incremento 13: correção de estabilização identificada pelo lint do PostgreSQL.

create or replace function public.admin_save_announcement(
  announcement_id uuid, announcement_type public.announcement_type,
  announcement_title text, announcement_message text, starts_at timestamptz,
  ends_at timestamptz, enabled boolean
)
returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
  if public.current_user_role() is distinct from 'administrator' then raise exception 'active_administrator_required'; end if;
  if length(trim(coalesce(announcement_title,'')))<3 or length(trim(coalesce(announcement_message,'')))<3 or $5 is null or ($6 is not null and $6<=$5) then raise exception 'invalid_announcement'; end if;
  if announcement_id is null then
    insert into public.library_announcements(type,title,message,starts_at,ends_at,active,created_by)
      values(announcement_type,trim(announcement_title),trim(announcement_message),$5,$6,enabled,auth.uid()) returning id into result;
  else
    update public.library_announcements as announcement
      set type=announcement_type,title=trim(announcement_title),message=trim(announcement_message),starts_at=$5,ends_at=$6,active=enabled,updated_at=now()
      where announcement.id=announcement_id returning announcement.id into result;
    if result is null then raise exception 'announcement_not_found'; end if;
  end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id) values(auth.uid(),'library_announcement_saved','library_announcement',result::text);
  return result;
end $$;

revoke all on function public.admin_save_announcement(uuid,public.announcement_type,text,text,timestamptz,timestamptz,boolean) from public,anon,authenticated;
grant execute on function public.admin_save_announcement(uuid,public.announcement_type,text,text,timestamptz,timestamptz,boolean) to authenticated;
