-- Substitui a digitação manual de UUID pela seleção segura de contas Auth elegíveis.

create or replace function public.list_confirmed_staff_candidates()
returns table (user_id uuid, email text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if public.current_user_role() is distinct from 'administrator'::public.user_role then
    raise exception 'active_administrator_required';
  end if;

  return query
  select users.id, lower(users.email)
  from auth.users users
  where users.email_confirmed_at is not null
    and lower(users.email) ~ '^[^@]+@ufba\.br$'
    and not exists (
      select 1 from public.profiles profiles where profiles.id = users.id
    )
  order by lower(users.email);
end;
$$;

revoke all on function public.list_confirmed_staff_candidates()
  from public, anon, authenticated;
grant execute on function public.list_confirmed_staff_candidates()
  to authenticated;
