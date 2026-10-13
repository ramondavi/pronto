-- Production delivery is invoked by pg_cron through a secret-protected HTTP endpoint.
create extension if not exists pg_net with schema extensions;
create extension if not exists supabase_vault with schema vault;

create or replace function public.claim_production_email_outbox(batch_limit integer default 5)
returns table (email_id uuid, recipient text, subject text, text_body text, claim_attempt integer, queue_name text)
language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() is distinct from 'service_role' then raise exception 'service_role_required'; end if;
  return query
  with candidates as (
    select 'request'::text as queue_name, e.id, e.created_at from public.email_outbox e
    where (e.status in ('pending', 'failed') or (e.status = 'processing' and e.updated_at < now() - interval '10 minutes')) and e.attempts < 5
    union all
    select 'account'::text, n.id, n.created_at from public.account_notification_outbox n
    where (n.status in ('pending', 'failed') or (n.status = 'processing' and n.updated_at < now() - interval '10 minutes')) and n.attempts < 5
    order by created_at limit greatest(1, least(batch_limit, 10))
  ), request_claims as (
    update public.email_outbox e set status = 'processing', attempts = e.attempts + 1, last_error = null, updated_at = now()
    from candidates c where c.queue_name = 'request' and e.id = c.id
      and (e.status in ('pending', 'failed') or (e.status = 'processing' and e.updated_at < now() - interval '10 minutes'))
    returning e.id, e.recipient, e.subject, e.text_body, e.attempts
  ), account_claims as (
    update public.account_notification_outbox n set status = 'processing', attempts = n.attempts + 1, last_error = null, updated_at = now()
    from candidates c where c.queue_name = 'account' and n.id = c.id
      and (n.status in ('pending', 'failed') or (n.status = 'processing' and n.updated_at < now() - interval '10 minutes'))
    returning n.id, n.recipient, n.subject, n.text_body, n.attempts
  )
  select r.id, r.recipient, r.subject, r.text_body, r.attempts, 'request'::text from request_claims r
  union all
  select a.id, a.recipient, a.subject, a.text_body, a.attempts, 'account'::text from account_claims a;
end;
$$;

create or replace function public.complete_production_email_delivery(
  target_email_id uuid, target_queue_name text, target_claim_attempt integer, succeeded boolean, error_code text default null
)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() is distinct from 'service_role' then raise exception 'service_role_required'; end if;
  if target_queue_name = 'request' then
    update public.email_outbox set status = case when succeeded then 'delivered' else 'failed' end,
      delivered_at = case when succeeded then now() else null end,
      last_error = case when succeeded then null else left(coalesce(error_code, 'delivery_failed'), 100) end,
      updated_at = now()
    where id = target_email_id and status = 'processing' and attempts = target_claim_attempt;
  elsif target_queue_name = 'account' then
    update public.account_notification_outbox set status = case when succeeded then 'delivered' else 'failed' end,
      delivered_at = case when succeeded then now() else null end,
      last_error = case when succeeded then null else left(coalesce(error_code, 'delivery_failed'), 100) end,
      updated_at = now()
    where id = target_email_id and status = 'processing' and attempts = target_claim_attempt;
  else
    raise exception 'invalid_queue_name';
  end if;
end;
$$;

revoke all on function public.claim_production_email_outbox(integer) from public, anon, authenticated;
revoke all on function public.complete_production_email_delivery(uuid, text, integer, boolean, text) from public, anon, authenticated;
grant execute on function public.claim_production_email_outbox(integer) to service_role;
grant execute on function public.complete_production_email_delivery(uuid, text, integer, boolean, text) to service_role;

create or replace function public.invoke_production_email_worker()
returns void language plpgsql security definer set search_path = '' as $$
declare worker_url text; worker_secret text;
begin
  select decrypted_secret into worker_url from vault.decrypted_secrets where name = 'pronto_email_worker_url';
  select decrypted_secret into worker_secret from vault.decrypted_secrets where name = 'pronto_email_worker_secret';
  if worker_url is null or worker_secret is null then return; end if;
  perform net.http_post(
    url := worker_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || worker_secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 10000
  );
end;
$$;

revoke all on function public.invoke_production_email_worker() from public, anon, authenticated, service_role;
select cron.schedule('pronto-production-email-delivery', '*/5 * * * *', $$select public.invoke_production_email_worker()$$);
