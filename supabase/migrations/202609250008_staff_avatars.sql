-- Catálogo fechado: 25 retratos ilustrados, três paletas por retrato.
alter table public.profiles add column avatar_choice integer check (avatar_choice between 0 and 74);

create function public.choose_staff_avatar(target_choice integer)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(public.current_user_role() in ('cataloger','administrator'), false) is not true then
    raise exception 'active_staff_required';
  end if;
  if target_choice is null or target_choice not between 0 and 74 then
    raise exception 'invalid_avatar_choice';
  end if;
  update public.profiles set avatar_choice = target_choice, updated_at = now() where id = auth.uid();
end $$;

revoke all on function public.choose_staff_avatar(integer) from public, anon, authenticated;
grant execute on function public.choose_staff_avatar(integer) to authenticated;
