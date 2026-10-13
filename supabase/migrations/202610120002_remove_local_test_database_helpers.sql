-- Remove recursos de ensaio local antes da liberação do banco hospedado.
-- As migrações anteriores permanecem imutáveis para preservar o histórico.
drop policy if exists "nada_consta_objects_local_test_delete" on storage.objects;

create or replace function public.prevent_cataloging_card_homologation_change()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'cataloging_card_homologation_is_immutable';
end;
$$;

drop function if exists public.sync_local_test_persona_request_notifications();
drop function if exists public.delete_own_local_test_protocol(uuid);
drop function if exists public.is_local_test_persona();
drop function if exists public.switch_local_test_persona(public.user_role);
drop function if exists public.enable_local_test_persona();
drop function if exists public.local_test_persona_status();
drop table if exists public.local_test_personas;

-- O worker de produção usa RPCs exclusivas da chave secreta do servidor.
drop function if exists public.claim_local_email_outbox(integer);
drop function if exists public.complete_local_email_delivery(uuid, boolean, text);
drop function if exists public.claim_local_account_notification_outbox(integer);
drop function if exists public.complete_local_account_notification_delivery(uuid, boolean, text);
