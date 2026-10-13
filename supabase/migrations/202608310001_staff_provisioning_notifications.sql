-- Avisos locais de desenvolvimento para novas contas internas pendentes.

create table public.account_notification_outbox (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid not null references auth.users(id) on delete cascade,
  recipient text not null,
  subject text not null,
  text_body text not null,
  idempotency_key text not null unique,
  status text not null default 'pending' check (status in ('pending', 'processing', 'delivered', 'failed', 'cancelled')),
  attempts integer not null default 0,
  delivered_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.account_notification_outbox enable row level security;
create policy "account_notification_outbox_read_by_administrator" on public.account_notification_outbox for select to authenticated
  using (public.current_user_role() = 'administrator');
revoke all on table public.account_notification_outbox from anon, authenticated;
grant select on public.account_notification_outbox to authenticated;

create or replace function public.enqueue_pending_staff_account_notification()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.email_confirmed_at is null
    or lower(new.email) !~ '^[^@]+@ufba\.br$'
    or exists (select 1 from public.profiles where id = new.id) then
    return new;
  end if;

  insert into public.account_notification_outbox (target_user_id, recipient, subject, text_body, idempotency_key)
  select new.id, administrator.email,
    'Pronto! — Conta interna aguardando provisionamento',
    'A conta institucional ' || lower(new.email) || ' foi confirmada no Supabase e aguarda provisionamento no painel administrativo do Pronto!.',
    'staff_account_pending:' || new.id::text || ':' || administrator.id::text
  from public.profiles administrator
  where administrator.role = 'administrator' and administrator.status = 'active'
  on conflict (idempotency_key) do nothing;
  return new;
end $$;

create trigger on_auth_pending_staff_account_notification
  after insert or update of email_confirmed_at on auth.users
  for each row execute function public.enqueue_pending_staff_account_notification();

create or replace function public.claim_local_account_notification_outbox(batch_limit integer default 20)
returns table (email_id uuid, recipient text, subject text, text_body text)
language plpgsql security definer set search_path='' as $$
begin
  if public.current_user_role() is distinct from 'administrator' then raise exception 'active_administrator_required'; end if;
  return query
  with claimed as (
    select id from public.account_notification_outbox where status in ('pending', 'failed') order by created_at
    limit greatest(1, least(batch_limit, 50)) for update skip locked
  ), updated as (
    update public.account_notification_outbox notification set status='processing',attempts=attempts+1,last_error=null,updated_at=now()
    from claimed where notification.id=claimed.id returning notification.id,notification.recipient,notification.subject,notification.text_body
  ) select updated.id,updated.recipient,updated.subject,updated.text_body from updated;
end $$;

create or replace function public.complete_local_account_notification_delivery(target_email_id uuid, succeeded boolean, error_message text default null)
returns void language plpgsql security definer set search_path='' as $$
begin
  if public.current_user_role() is distinct from 'administrator' then raise exception 'active_administrator_required'; end if;
  update public.account_notification_outbox set status=case when succeeded then 'delivered' else 'failed' end,
    delivered_at=case when succeeded then now() else null end,
    last_error=case when succeeded then null else left(coalesce(error_message,'delivery_failed'),1000) end,
    updated_at=now() where id=target_email_id and status='processing';
end $$;

create or replace function public.provision_staff_account(
  target_user_id uuid, staff_full_name text, staff_professional_name text, staff_crb text, staff_role public.user_role
)
returns void language plpgsql security definer set search_path='' as $$
declare target_email text;
begin
  if public.current_user_role() is distinct from 'administrator'::public.user_role then raise exception 'active_administrator_required'; end if;
  if staff_role is null or staff_role not in ('cataloger', 'administrator') then raise exception 'staff_role_required'; end if;
  if char_length(btrim(staff_full_name)) < 3 or char_length(btrim(staff_professional_name)) < 3 or char_length(btrim(staff_crb)) < 3 then raise exception 'staff_data_required'; end if;
  select lower(email) into target_email from auth.users where id=target_user_id and email_confirmed_at is not null;
  if target_email is null or target_email !~ '^[^@]+@ufba\.br$' then raise exception 'confirmed_institutional_user_required'; end if;
  insert into public.profiles(id,full_name,email,role,status) values(target_user_id,btrim(staff_full_name),target_email,staff_role,'active');
  insert into public.staff_profiles(profile_id,professional_name,crb) values(target_user_id,btrim(staff_professional_name),btrim(staff_crb));
  update public.account_notification_outbox notification set status='cancelled',updated_at=now()
    where notification.target_user_id=$1 and notification.status in ('pending','failed');
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
    values(auth.uid(),'staff_account_provisioned','profile',target_user_id::text,jsonb_build_object('role',staff_role));
end $$;

revoke all on function public.enqueue_pending_staff_account_notification() from public, anon, authenticated;
revoke all on function public.claim_local_account_notification_outbox(integer) from public, anon, authenticated;
revoke all on function public.complete_local_account_notification_delivery(uuid,boolean,text) from public, anon, authenticated;
revoke all on function public.provision_staff_account(uuid,text,text,text,public.user_role) from public, anon, authenticated;
grant execute on function public.claim_local_account_notification_outbox(integer) to authenticated;
grant execute on function public.complete_local_account_notification_delivery(uuid,boolean,text) to authenticated;
grant execute on function public.provision_staff_account(uuid,text,text,text,public.user_role) to authenticated;
