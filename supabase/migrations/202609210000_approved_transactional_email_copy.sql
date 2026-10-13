-- Textos transacionais aprovados em conjunto com a BIB/FAUFBA.

create or replace function public.enqueue_opening_email()
returns trigger language plpgsql security definer set search_path = '' as $$
declare recipient_email text; student_name text; sla_days integer;
begin
  select p.email, p.full_name, ap.service_level_business_days
    into recipient_email, student_name, sla_days
  from public.student_profiles sp
  join public.profiles p on p.id = sp.profile_id
  join public.academic_enrollments ae on ae.id = new.academic_enrollment_id
  join public.academic_programs ap on ap.id = ae.academic_program_id
  where sp.id = new.student_profile_id;
  insert into public.email_outbox (request_id, event_type, idempotency_key, recipient, subject, text_body)
  values (new.id, 'request_opened', 'request_opened:' || new.id::text, recipient_email,
    'Pronto! | Recebemos sua solicitação n.º ' || new.protocol,
    'Olá, ' || student_name || '.' || E'\n\n' ||
    'Tudo certo! Recebemos sua solicitação de ficha catalográfica, identificada pelo protocolo n.º ' || new.protocol || '.' || E'\n\n' ||
    'Você pode acompanhar o andamento e as próximas etapas acessando o Pronto!.' || E'\n\n' ||
    'O prazo de referência para o atendimento é de ' || sla_days || ' dias úteis. Caso a biblioteca identifique alguma informação a corrigir, você receberá uma nova mensagem.');
  return new;
end;
$$;

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
    final_message := concat_ws(' ', template_message, nullif(free_message, ''));
    if char_length(final_message) < 3 then raise exception 'issue_justification_required'; end if;
    insert into public.request_field_issues (revision_round_id, field_key, field_label, template_id, justification, original_value) values (round_id, key_value, label_value, template_uuid, final_message, public.request_field_value(target_request_id, key_value));
  end loop;
  update public.cataloging_requests set status = 'changes_requested', updated_at = now() where id = target_request_id;
  select p.email, p.full_name, r.protocol into recipient_email, student_name, protocol_value from public.cataloging_requests r join public.student_profiles sp on sp.id = r.student_profile_id join public.profiles p on p.id = sp.profile_id where r.id = target_request_id;
  select string_agg('• ' || field_label || ': ' || justification, E'\n' order by field_label) into email_lines from public.request_field_issues where revision_round_id = round_id;
  insert into public.email_outbox (request_id, event_type, idempotency_key, recipient, subject, text_body) values (target_request_id, 'changes_requested', 'changes_requested:' || round_id::text, recipient_email,
    'Pronto! | Correções necessárias na solicitação n.º ' || protocol_value,
    'Olá, ' || student_name || '.' || E'\n\nA Biblioteca analisou sua solicitação e identificou informações que precisam ser corrigidas antes do prosseguimento.' || E'\n\nNo Pronto!, estarão liberados somente os campos abaixo para sua correção:' || E'\n\n' || email_lines || E'\n\nAcesse o sistema para revisar e reenviar as informações.' || E'\n\nSe precisar de orientação sobre o atendimento, entre em contato com a BIB/FAUFBA pelo e-mail bibarq@ufba.br.');
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata) values (auth.uid(), 'request_changes_requested', 'cataloging_request', target_request_id::text, jsonb_build_object('revision_round_id', round_id, 'issue_count', jsonb_array_length(issues)));
  return round_id;
end;
$$;

create or replace function public.queue_request_release_notice(target_request_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare recipient_email text; student_name text; protocol_value text;
begin
  if coalesce(public.current_user_role() in ('cataloger', 'administrator'), false) is not true then raise exception 'active_staff_required'; end if;
  select p.email, p.full_name, r.protocol into recipient_email, student_name, protocol_value from public.cataloging_requests r join public.student_profiles sp on sp.id = r.student_profile_id join public.profiles p on p.id = sp.profile_id where r.id = target_request_id and r.status = 'approved';
  if recipient_email is null then raise exception 'approved_request_required'; end if;
  insert into public.email_outbox (request_id, event_type, idempotency_key, recipient, subject, text_body) values (target_request_id, 'request_released', 'request_released:' || target_request_id::text, recipient_email,
    'Pronto! | Sua ficha catalográfica está liberada!',
    'Olá, ' || student_name || '.' || E'\n\nSua ficha catalográfica foi homologada e o Nada Consta que você forneceu foi validado. A ficha já está disponível no Pronto!.' || E'\n\nAcesse sua solicitação para gerar o PDF completo do trabalho com a ficha catalográfica já inserida (opção recomendada), baixar a ficha catalográfica a parte e consultar as orientações para o autodepósito no RI/UFBA, quando aplicável.' || E'\n\nAtenção! Antes de gerar o arquivo final do seu trabalho contendo a ficha, confira se o PDF selecionado por você no seu dispositivo é o mesmo trabalho final completo que foi analisado pela Biblioteca.') on conflict (idempotency_key) do nothing;
end;
$$;

create or replace function public.close_cataloging_request(target_request_id uuid, permanent_url text)
returns timestamptz language plpgsql security definer set search_path='' as $$
declare actor_role public.user_role; closed_at timestamptz:=now(); student_email text; student_name text; protocol_value text; title_value text; contact record;
begin
  actor_role:=public.current_user_role();
  if actor_role not in ('cataloger','administrator') then raise exception 'active_staff_required'; end if;
  if permanent_url is null or permanent_url !~ '^https://[^[:space:]]+$' then raise exception 'invalid_permanent_url'; end if;
  select pr.email,pr.full_name,r.protocol,r.title into student_email,student_name,protocol_value,title_value from public.cataloging_requests r join public.student_profiles sp on sp.id=r.student_profile_id join public.profiles pr on pr.id=sp.profile_id where r.id=target_request_id and r.status='approved' and (actor_role='administrator' or r.assigned_to=auth.uid()) and exists(select 1 from public.cataloging_card_homologations h where h.request_id=r.id) and exists(select 1 from public.nada_consta_documents n where n.request_id=r.id and n.status='approved') and exists(select 1 from public.repository_deposit_progress d where d.request_id=r.id) for update;
  if protocol_value is null then raise exception 'request_not_ready_for_closure'; end if;
  insert into public.repository_publications(request_id,permanent_url,verified_by,verified_at) values(target_request_id,permanent_url,auth.uid(),closed_at);
  update public.cataloging_requests set status='completed',updated_at=closed_at where id=target_request_id;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'repository_publication_verified','cataloging_request',target_request_id::text,jsonb_build_object('permanent_url',permanent_url)),(auth.uid(),'cataloging_request_completed','cataloging_request',target_request_id::text,jsonb_build_object('permanent_url',permanent_url));
  insert into public.email_outbox(request_id,event_type,idempotency_key,recipient,subject,text_body) values(target_request_id,'request_completed','request_completed:student:'||target_request_id,student_email,
    'Pronto! | Protocolo n.º '||protocol_value||' encerrado',
    'Olá, '||student_name||'.'||E'\n\nSeu protocolo foi encerrado após a verificação da publicação do trabalho no Repositório Institucional da UFBA.'||E'\n\nEndereço permanente da publicação: '||permanent_url||E'\n\nGuarde este endereço para consulta e divulgação do seu trabalho.'||E'\n\nO arquivo Nada Consta enviado ao Pronto! será mantido somente pelo período operacional previsto e depois removido. O registro acadêmico pertinente permanece nos sistemas institucionais aplicáveis.');
  for contact in select c.id,c.email,c.name from public.coordination_contacts c join public.academic_enrollments ae on ae.academic_program_id=c.academic_program_id join public.cataloging_requests r on r.academic_enrollment_id=ae.id where r.id=target_request_id and c.active and c.receives_completion_emails loop
    insert into public.email_outbox(request_id,event_type,idempotency_key,recipient,subject,text_body) values(target_request_id,'request_completed_coordination','request_completed:coordination:'||target_request_id||':'||contact.id,contact.email,
      'Pronto! | Protocolo n.º '||protocol_value||' concluído',
      'Olá, '||contact.name||'.'||E'\n\nO atendimento da solicitação abaixo foi concluído. Isso significa que o trabalho do(a) estudante teve sua ficha catalográfica feita pela Biblioteca e já se encontra disponível no Repositório Institucional da UFBA.'||E'\n\nTrabalho: '||title_value||E'\nSolicitante: '||student_name||E'\nProtocolo: '||protocol_value||E'\nPublicação no RI/UFBA: '||permanent_url||E'\n\nA página de acompanhamento desta solicitação foi fechada juntamente com o protocolo de atendimento.') on conflict(idempotency_key) do nothing;
  end loop;
  return closed_at;
end $$;

create or replace function public.enqueue_pending_staff_account_notification()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.email_confirmed_at is null or lower(new.email) !~ '^[^@]+@ufba\.br$' or exists (select 1 from public.profiles where id = new.id) then return new; end if;
  insert into public.account_notification_outbox (target_user_id, recipient, subject, text_body, idempotency_key)
  select new.id, administrator.email,
    'Pronto! | Conta interna aguardando provisionamento',
    'Olá.' || E'\n\nA conta institucional ' || lower(new.email) || ' foi confirmada e está aguardando a definição de perfil no painel administrativo do Pronto!.' || E'\n\nAcesse Administração → Equipe e acessos para atribuir o perfil adequado.' || E'\n\nSó faça o provisionamento após confirmar que a pessoa integra a equipe autorizada da Biblioteca.',
    'staff_account_pending:' || new.id::text || ':' || administrator.id::text
  from public.profiles administrator where administrator.role = 'administrator' and administrator.status = 'active' on conflict (idempotency_key) do nothing;
  return new;
end $$;
