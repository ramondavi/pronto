-- Aniversário opcional da equipe: somente dia e mês, sem ano de nascimento.
alter table public.staff_profiles
  add column birthday_month smallint,
  add column birthday_day smallint,
  add constraint staff_birthday_complete check ((birthday_month is null) = (birthday_day is null)),
  add constraint staff_birthday_valid check (
    birthday_month is null or (
      birthday_month between 1 and 12
      and birthday_day between 1 and extract(day from (make_date(2000, birthday_month, 1) + interval '1 month - 1 day'))
    )
  );

create function public.set_staff_birthday(target_month integer, target_day integer)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(public.current_user_role() in ('cataloger', 'administrator'), false) is not true then
    raise exception 'active_staff_required';
  end if;
  if (target_month is null) <> (target_day is null) then
    raise exception 'birthday_incomplete';
  end if;
  update public.staff_profiles
     set birthday_month = target_month, birthday_day = target_day, updated_at = now()
   where profile_id = auth.uid();
  if not found then raise exception 'staff_profile_required'; end if;
end $$;

revoke all on function public.set_staff_birthday(integer, integer) from public, anon, authenticated;
grant execute on function public.set_staff_birthday(integer, integer) to authenticated;
