-- A ficha usa o mesmo nome completo cadastrado na conta da equipe.
-- Snapshots de fichas já homologadas permanecem imutáveis.
create or replace function public.sync_staff_card_name_from_account()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  account_name text;
begin
  select full_name into account_name from public.profiles where id = new.profile_id;
  if account_name is null then
    raise exception 'staff_account_required';
  end if;
  new.professional_name := account_name;
  return new;
end;
$$;

create trigger staff_card_name_from_account
before insert or update on public.staff_profiles
for each row execute function public.sync_staff_card_name_from_account();

create or replace function public.sync_staff_card_name_after_account_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.staff_profiles
     set professional_name = new.full_name
   where profile_id = new.id
     and professional_name is distinct from new.full_name;
  return new;
end;
$$;

create trigger staff_card_name_after_account_update
after update of full_name on public.profiles
for each row
when (old.full_name is distinct from new.full_name)
execute function public.sync_staff_card_name_after_account_update();

update public.staff_profiles as staff
   set professional_name = account.full_name
  from public.profiles as account
 where staff.profile_id = account.id
   and staff.professional_name is distinct from account.full_name;
