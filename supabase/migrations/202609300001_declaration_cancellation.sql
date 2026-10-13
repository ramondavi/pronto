alter table public.cataloging_requests
  add column cancellation_acknowledged boolean not null default false;

alter table public.email_outbox drop constraint if exists email_outbox_event_type_check;
alter table public.email_outbox add constraint email_outbox_event_type_check
  check (event_type in ('request_opened', 'changes_requested', 'request_released', 'request_completed', 'request_completed_coordination', 'feedback_reminder', 'request_canceled'));

create function public.open_student_request_v9(payload jsonb)
returns table (request_id uuid, generated_protocol text)
language plpgsql security definer set search_path = '' as $$
declare created_id uuid; created_protocol text;
begin
  if coalesce((payload ->> 'cancellationAcknowledged')::boolean, false) is not true then
    raise exception 'cancellation_acknowledgement_required';
  end if;
  select opened.request_id, opened.generated_protocol into created_id, created_protocol
    from public.open_student_request_v8(payload) opened;
  update public.cataloging_requests set cancellation_acknowledged = true where id = created_id;
  return query select created_id, created_protocol;
end;
$$;

revoke all on function public.open_student_request_v8(jsonb) from public, anon, authenticated;
revoke all on function public.open_student_request_v9(jsonb) from public, anon, authenticated;
grant execute on function public.open_student_request_v9(jsonb) to authenticated;

create function public.cancel_request_for_failed_declaration(target_request_id uuid, failed_declarations text[], explanation text)
returns void language plpgsql security definer set search_path = '' as $$
declare recipient_email text; student_name text; protocol_value text; reason_labels text;
begin
  if coalesce(public.current_user_role() in ('cataloger', 'administrator'), false) is not true then
    raise exception 'active_staff_required';
  end if;
  if failed_declarations is null or cardinality(failed_declarations) < 1
    or exists (select 1 from unnest(failed_declarations) value where value is null or value not in ('defense_approval', 'final_file', 'approval_page'))
    or char_length(btrim(coalesce(explanation, ''))) not between 10 and 1000 then
    raise exception 'failed_declaration_reason_required';
  end if;
  select p.email, p.full_name, r.protocol into recipient_email, student_name, protocol_value
    from public.cataloging_requests r
    join public.student_profiles sp on sp.id = r.student_profile_id
    join public.profiles p on p.id = sp.profile_id
    where r.id = target_request_id and r.assigned_to = auth.uid() and r.status = 'in_review'
    for update of r;
  if protocol_value is null then raise exception 'request_locked_by_another_staff'; end if;
  select string_agg(case value when 'defense_approval' then 'trabalho defendido e aprovado' when 'final_file' then 'arquivo final e completo' when 'approval_page' then 'folha de aprovação no arquivo' end, '; ' order by value)
    into reason_labels from (select distinct value from unnest(failed_declarations) value) selected;
  update public.cataloging_requests set status = 'canceled', updated_at = now() where id = target_request_id;
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
    values (auth.uid(), 'request_canceled_failed_declaration', 'cataloging_request', target_request_id::text,
      jsonb_build_object('failed_declarations', failed_declarations, 'explanation', btrim(explanation)));
  insert into public.email_outbox (request_id, event_type, idempotency_key, recipient, subject, text_body)
    values (target_request_id, 'request_canceled', 'request_canceled:' || target_request_id::text, recipient_email,
      'Pronto! | Protocolo ' || protocol_value || ' cancelado',
      'Olá, ' || student_name || '.' || E'\n\nApós a análise da biblioteca, o protocolo ' || protocol_value || ' foi cancelado porque uma ou mais declarações obrigatórias não foram cumpridas: ' || reason_labels || '.' || E'\n\nEsclarecimento da biblioteca: ' || btrim(explanation) || E'\n\nConsulte o Pronto! para acompanhar o registro do protocolo. Em caso de dúvida, entre em contato com a BIB/FAUFBA pelo e-mail bibarq@ufba.br.')
    on conflict (idempotency_key) do nothing;
end;
$$;

revoke all on function public.cancel_request_for_failed_declaration(uuid, text[], text) from public, anon, authenticated;
grant execute on function public.cancel_request_for_failed_declaration(uuid, text[], text) to authenticated;

create or replace function public.request_timeline(target_request_id uuid)
returns table(event_key text, label text, occurred_at timestamptz)
language sql security definer set search_path = '' stable as $$
  with authorized as (
    select r.id from public.cataloging_requests r
    join public.student_profiles s on s.id = r.student_profile_id
    where r.id = target_request_id and (
      (public.current_user_role() = 'student' and s.profile_id = auth.uid()) or
      public.current_user_role() in ('cataloger', 'administrator')
    )
  ), events as (
    select 'request_submitted'::text event_key, 'Solicitação aberta'::text label, r.submitted_at occurred_at from public.cataloging_requests r join authorized a on a.id = r.id
    union all select 'service_started', 'Atendimento iniciado', r.assigned_at from public.cataloging_requests r join authorized a on a.id = r.id where r.assigned_at is not null
    union all select 'changes_requested_' || rr.round_number, 'Correções solicitadas — rodada ' || rr.round_number, rr.returned_at from public.request_revision_rounds rr join authorized a on a.id = rr.request_id
    union all select 'corrections_sent_' || rr.round_number, 'Correções reenviadas — rodada ' || rr.round_number, rr.responded_at from public.request_revision_rounds rr join authorized a on a.id = rr.request_id where rr.responded_at is not null
    union all select 'card_homologated', 'Ficha catalográfica homologada', h.homologated_at from public.cataloging_card_homologations h join authorized a on a.id = h.request_id
    union all select 'nada_uploaded', 'Nada Consta enviado', n.uploaded_at from public.nada_consta_documents n join authorized a on a.id = n.request_id
    union all select 'nada_approved', 'Nada Consta validado', n.validated_at from public.nada_consta_documents n join authorized a on a.id = n.request_id where n.status in ('approved', 'purged') and n.validated_at is not null
    union all select 'repository_started', 'Autodepósito no RI/UFBA iniciado', p.started_at from public.repository_deposit_progress p join authorized a on a.id = p.request_id
    union all select 'repository_verified', 'Publicação no RI/UFBA verificada', p.verified_at from public.repository_publications p join authorized a on a.id = p.request_id
    union all select 'request_completed', 'Protocolo encerrado', r.updated_at from public.cataloging_requests r join authorized a on a.id = r.id where r.status = 'completed'
    union all select 'request_canceled', 'Protocolo cancelado após análise das declarações', r.updated_at from public.cataloging_requests r join authorized a on a.id = r.id where r.status = 'canceled'
  ) select * from events order by occurred_at, event_key
$$;
