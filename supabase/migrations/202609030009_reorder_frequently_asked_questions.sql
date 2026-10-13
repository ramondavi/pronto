create function public.admin_reorder_frequently_asked_questions(faq_ids uuid[])
returns void language plpgsql security definer set search_path='' as $$
begin
  if public.current_user_role() is distinct from 'administrator' then raise exception 'active_administrator_required'; end if;
  update public.frequently_asked_questions f set position=ordered.position*10,updated_by=auth.uid(),updated_at=now()
  from unnest(faq_ids) with ordinality as ordered(id,position) where f.id=ordered.id;
end $$;
revoke all on function public.admin_reorder_frequently_asked_questions(uuid[]) from public,anon;
grant execute on function public.admin_reorder_frequently_asked_questions(uuid[]) to authenticated;
