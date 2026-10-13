-- Separa a orientação padrão da observação complementar nos pedidos de ajuste.

create or replace function public.return_request_for_corrections(target_request_id uuid, issues jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare round_id uuid; next_round integer; issue jsonb; key_value text; label_value text; template_uuid uuid; template_message text; free_message text; final_message text; recipient_email text; student_name text; protocol_value text; email_lines text;
begin
  if coalesce(public.current_user_role() in ('cataloger', 'administrator'), false) is not true then raise exception 'active_staff_required'; end if;
  if jsonb_typeof(issues) <> 'array' or jsonb_array_length(issues) = 0 then raise exception 'at_least_one_issue_required'; end if;
  perform 1 from public.cataloging_requests where id = target_request_id and assigned_to = auth.uid() and status = 'in_review' for update;
  if not found then raise exception 'request_locked_by_another_staff'; end if;
  if (select count(*) from jsonb_array_elements(issues)) <> (select count(distinct value ->> 'fieldKey') from jsonb_array_elements(issues)) then raise exception 'duplicate_issue_field'; end if;
  select coalesce(max(round_number), 0) + 1 into next_round from public.request_revision_rounds where request_id = target_request_id;
  insert into public.request_revision_rounds (request_id, round_number, returned_by) values (target_request_id, next_round, auth.uid()) returning id into round_id;
  for issue in select value from jsonb_array_elements(issues) loop
    key_value := issue ->> 'fieldKey'; label_value := public.request_field_label(key_value);
    if label_value is null then raise exception 'invalid_issue_field'; end if;
    template_uuid := nullif(issue ->> 'templateId', '')::uuid; free_message := btrim(coalesce(issue ->> 'freeJustification', '')); template_message := null;
    if template_uuid is not null then select message into template_message from public.issue_templates where id = template_uuid and active; if template_message is null then raise exception 'active_issue_template_required'; end if; end if;
    final_message := case when template_message is not null and free_message <> '' then template_message || E'\n' || case when free_message like 'Observação complementar: %' then free_message else 'Observação complementar: ' || free_message end else coalesce(template_message, free_message) end;
    if char_length(final_message) < 3 then raise exception 'issue_justification_required'; end if;
    insert into public.request_field_issues (revision_round_id, field_key, field_label, template_id, justification, original_value) values (round_id, key_value, label_value, template_uuid, final_message, public.request_field_value(target_request_id, key_value));
  end loop;
  update public.cataloging_requests set status = 'changes_requested', updated_at = now() where id = target_request_id;
  select p.email, p.full_name, r.protocol into recipient_email, student_name, protocol_value from public.cataloging_requests r join public.student_profiles sp on sp.id = r.student_profile_id join public.profiles p on p.id = sp.profile_id where r.id = target_request_id;
  select string_agg('• ' || field_label || ': ' || justification, E'\n\n' order by field_label) into email_lines from public.request_field_issues where revision_round_id = round_id;
  insert into public.email_outbox (request_id, event_type, idempotency_key, recipient, subject, text_body) values (target_request_id, 'changes_requested', 'changes_requested:' || round_id::text, recipient_email,
    'Pronto! | Correções necessárias na solicitação n.º ' || protocol_value,
    'Olá, ' || student_name || '.' || E'\n\nA Biblioteca analisou sua solicitação e identificou informações que precisam ser corrigidas antes do prosseguimento.' || E'\n\nNo Pronto!, estarão liberados somente os campos abaixo para sua correção:' || E'\n\n' || email_lines || E'\n\nAcesse o sistema para revisar e reenviar as informações.' || E'\n\nSe precisar de orientação sobre o atendimento, entre em contato com a BIB/FAUFBA pelo e-mail bibarq@ufba.br.');
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata) values (auth.uid(), 'request_changes_requested', 'cataloging_request', target_request_id::text, jsonb_build_object('revision_round_id', round_id, 'issue_count', jsonb_array_length(issues)));
  return round_id;
end;
$$;
