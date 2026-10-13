-- Incremento 2: contas vinculadas ao Supabase Auth e protegidas por RLS.

create or replace function public.is_valid_cpf(value text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  i integer;
  total integer := 0;
  digit integer;
begin
  if value !~ '^\d{11}$' or value ~ '^(\d)\1{10}$' then return false; end if;
  for i in 1..9 loop total := total + substring(value, i, 1)::integer * (11 - i); end loop;
  digit := (total * 10) % 11; if digit = 10 then digit := 0; end if;
  if digit <> substring(value, 10, 1)::integer then return false; end if;
  total := 0;
  for i in 1..10 loop total := total + substring(value, i, 1)::integer * (12 - i); end loop;
  digit := (total * 10) % 11; if digit = 10 then digit := 0; end if;
  return digit = substring(value, 11, 1)::integer;
end;
$$;

alter table public.profiles
  add constraint profiles_auth_user_fk foreign key (id) references auth.users(id) on delete cascade;
alter table public.student_profiles
  add constraint student_profiles_valid_cpf check (public.is_valid_cpf(cpf));

create or replace function public.handle_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  full_name_value text := btrim(coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  cpf_value text := regexp_replace(coalesce(new.raw_user_meta_data ->> 'cpf', ''), '\D', '', 'g');
begin
  if lower(new.email) !~ '^[^@]+@ufba\.br$' then raise exception 'institutional_email_required'; end if;
  -- Usuários internos são convidados pelo Dashboard e provisionados como equipe
  -- em uma operação administrativa separada. Nunca se aceita papel vindo do cliente.
  if coalesce(new.raw_user_meta_data ->> 'registration_source', '') <> 'student' then return new; end if;
  if char_length(full_name_value) < 3 then raise exception 'full_name_required'; end if;
  if not public.is_valid_cpf(cpf_value) then raise exception 'valid_cpf_required'; end if;
  insert into public.profiles (id, full_name, email, role, status)
    values (new.id, full_name_value, lower(new.email), 'student', 'active');
  insert into public.student_profiles (profile_id, cpf) values (new.id, cpf_value);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_auth_user();

create or replace function public.sync_auth_user_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if lower(new.email) !~ '^[^@]+@ufba\.br$' then raise exception 'institutional_email_required'; end if;
  update public.profiles set email = lower(new.email), updated_at = now() where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_updated
  after update of email on auth.users for each row
  when (old.email is distinct from new.email)
  execute function public.sync_auth_user_email();

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$ select role from public.profiles where id = auth.uid() $$;

alter table public.profiles enable row level security;
alter table public.student_profiles enable row level security;

grant select on public.profiles, public.student_profiles to authenticated;

create policy "profiles_read_own_or_staff" on public.profiles for select to authenticated
  using (id = auth.uid() or public.current_user_role() in ('cataloger', 'administrator'));
create policy "student_profiles_read_own_or_staff" on public.student_profiles for select to authenticated
  using (profile_id = auth.uid() or public.current_user_role() in ('cataloger', 'administrator'));

revoke all on function public.handle_auth_user() from public, anon, authenticated;
revoke all on function public.sync_auth_user_email() from public, anon, authenticated;
revoke all on function public.current_user_role() from public, anon, authenticated;
grant execute on function public.current_user_role() to authenticated;
