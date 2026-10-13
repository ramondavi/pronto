create or replace function public.cancel_request_for_failed_declaration(target_request_id uuid, failed_declarations text[], explanation text)
returns void language plpgsql security definer set search_path = '' as $$
declare recipient_email text; student_name text; protocol_value text; reason_labels text;
begin
  if coalesce(public.current_user_role() in ('cataloger', 'administrator'), false) is not true then
    raise exception 'active_staff_required';
  end if;
  if failed_declarations is null or cardinality(failed_declarations) < 1
    or exists (select 1 from unnest(failed_declarations) value where value is null or value not in ('defense_approval', 'final_file', 'approval_page', 'shared_file_changed')) then
    raise exception 'failed_declaration_reason_required';
  end if;
  select p.email, p.full_name, r.protocol into recipient_email, student_name, protocol_value
    from public.cataloging_requests r
    join public.student_profiles sp on sp.id = r.student_profile_id
    join public.profiles p on p.id = sp.profile_id
    where r.id = target_request_id and r.assigned_to = auth.uid() and r.status in ('in_review', 'changes_requested', 'approved')
    for update of r;
  if protocol_value is null then raise exception 'request_locked_by_another_staff'; end if;
  select string_agg(case value
      when 'defense_approval' then 'o trabalho foi defendido e aprovado por banca'
      when 'final_file' then 'o arquivo disponibilizado é completo e final'
      when 'approval_page' then 'o arquivo contém ata, página ou folha de aprovação datada e assinada por todos os membros da banca'
      when 'shared_file_changed' then 'o arquivo do link público foi alterado, substituído ou removido antes do encerramento'
    end, '; ' order by value)
    into reason_labels from (select distinct value from unnest(failed_declarations) value) selected;
  update public.cataloging_requests
    set status = 'canceled', cancellation_reason = reason_labels, updated_at = now()
    where id = target_request_id;
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
    values (auth.uid(), 'request_canceled_failed_declaration', 'cataloging_request', target_request_id::text,
      jsonb_build_object('failed_declarations', failed_declarations));
  insert into public.email_outbox (request_id, event_type, idempotency_key, recipient, subject, text_body)
    values (target_request_id, 'request_canceled', 'request_canceled:' || target_request_id::text, recipient_email,
      'Pronto! | Protocolo ' || protocol_value || ' cancelado',
      'Olá, ' || split_part(btrim(student_name), ' ', 1) || '.' || E'\n\nApós a análise da biblioteca, o protocolo ' || protocol_value || ' foi cancelado porque estas declarações não foram cumpridas: ' || reason_labels || '.' || E'\n\nEste protocolo não pode ser reaberto. Consulte o Pronto! para acompanhar seu registro. Em caso de dúvida, entre em contato com a BIB/FAUFBA pelo e-mail bibarq@ufba.br.')
    on conflict (idempotency_key) do nothing;
end;
$$;
