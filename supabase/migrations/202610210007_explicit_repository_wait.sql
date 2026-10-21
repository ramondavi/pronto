-- Lembrete apenas após resposta explícita de que a confirmação/liberação ainda não chegou.
create or replace function public.repository_preparation_waiting_kind(preparation jsonb) returns text
language sql immutable set search_path='' as $$
 select case
 when preparation->>'route'='none' and preparation->>'account'='create' and preparation->>'accountAwaitingConfirmation'='true' then 'account'
 when preparation->>'route' in ('account','wrong','none') and preparation->>'requestSent'='true' and preparation->>'release'='waiting'
 then case when preparation->>'request'='correction' then 'correction' else 'release' end
 else null end;
$$;
revoke all on function public.repository_preparation_waiting_kind(jsonb) from public,anon,authenticated;
