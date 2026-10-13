-- Exclusão integral de protocolos próprios, somente no banco local de testes.
create function public.is_local_test_persona()
returns boolean language sql stable security definer set search_path = '' as $$
  select current_setting('pronto.local_test_personas', true) = 'on'
    and exists(select 1 from public.profiles where id = auth.uid() and status = 'active')
    and exists(select 1 from public.local_test_personas where profile_id = auth.uid())
$$;
revoke all on function public.is_local_test_persona() from public, anon, authenticated;
grant execute on function public.is_local_test_persona() to authenticated;

create or replace function public.prevent_cataloging_card_homologation_change()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE'
    and current_setting('pronto.local_test_personas', true) = 'on'
    and current_setting('pronto.local_test_deleting_request', true) = old.request_id::text
    and exists(select 1 from public.local_test_personas where profile_id = auth.uid())
  then return old; end if;
  raise exception 'cataloging_card_homologation_is_immutable';
end $$;

create policy "nada_consta_objects_local_test_delete" on storage.objects
  for delete to authenticated using (
    bucket_id = 'nada-consta'
    and public.is_local_test_persona()
    and exists (
      select 1 from public.cataloging_requests r
      join public.student_profiles s on s.id = r.student_profile_id
      where r.id::text = (storage.foldername(name))[1] and s.profile_id = auth.uid()
    )
  );

create function public.delete_own_local_test_protocol(target_request_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare request_protocol text;
begin
  if current_setting('pronto.local_test_personas', true) is distinct from 'on' then raise exception 'local_test_only'; end if;
  if not exists(select 1 from public.local_test_personas where profile_id = auth.uid()) then raise exception 'test_persona_not_enabled'; end if;
  select r.protocol into request_protocol
  from public.cataloging_requests r
  join public.student_profiles s on s.id = r.student_profile_id
  where r.id = target_request_id and s.profile_id = auth.uid()
  for update of r;
  if request_protocol is null then raise exception 'own_test_protocol_required'; end if;
  if exists(select 1 from public.nada_consta_documents d
    join storage.objects o on o.bucket_id = 'nada-consta' and o.name = d.object_path
    where d.request_id = target_request_id) then
    raise exception 'remove_test_document_first';
  end if;

  perform set_config('pronto.local_test_deleting_request', target_request_id::text, true);
  delete from public.feedback_invitations where request_id = target_request_id;
  delete from public.repository_publications where request_id = target_request_id;
  delete from public.repository_deposit_progress where request_id = target_request_id;
  delete from public.nada_consta_documents where request_id = target_request_id;
  delete from public.cataloging_card_homologations where request_id = target_request_id;
  delete from public.staff_notifications where request_id = target_request_id;
  delete from public.cataloging_requests where id = target_request_id;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values(auth.uid(), 'local_test_protocol_deleted', 'cataloging_request', target_request_id::text,
    jsonb_build_object('protocol', request_protocol));
end $$;

revoke all on function public.delete_own_local_test_protocol(uuid) from public, anon, authenticated;
grant execute on function public.delete_own_local_test_protocol(uuid) to authenticated;
