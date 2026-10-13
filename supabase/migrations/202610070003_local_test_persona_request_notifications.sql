-- Recompõe avisos dos protocolos criados pela própria conta enquanto ela testava a visão de estudante.
create function public.sync_local_test_persona_request_notifications()
returns integer language plpgsql security definer set search_path = '' as $$
declare inserted_count integer := 0;
begin
  if current_setting('pronto.local_test_personas', true) is distinct from 'on' then return 0; end if;
  if not exists (select 1 from public.local_test_personas where profile_id = auth.uid()) then return 0; end if;
  if public.current_user_role() not in ('cataloger', 'administrator') then return 0; end if;

  insert into public.staff_notifications(recipient_id, request_id, source_key, kind, title, message, href)
  select auth.uid(), request.id, 'request:new:' || request.id, 'new_request',
    'Nova solicitação na fila', 'O protocolo ' || request.protocol || ' entrou na fila.', '/painel/fila'
  from public.cataloging_requests request
  join public.student_profiles student on student.id = request.student_profile_id
  where student.profile_id = auth.uid()
    and request.status in ('submitted', 'in_review', 'changes_requested', 'approved')
    and request.submitted_at >= now() - interval '90 days'
  on conflict (recipient_id, source_key) do nothing;
  get diagnostics inserted_count = row_count;
  return inserted_count;
end $$;

revoke all on function public.sync_local_test_persona_request_notifications() from public, anon, authenticated;
grant execute on function public.sync_local_test_persona_request_notifications() to authenticated;
