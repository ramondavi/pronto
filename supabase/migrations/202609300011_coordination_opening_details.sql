create or replace function public.ensure_own_coordination_opening_email(target_request_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare request_data record; contact record; raw_token text;
begin
  if public.current_user_role() is distinct from 'student'::public.user_role then
    raise exception 'active_student_required';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(target_request_id::text, 0));
  select r.id, r.protocol, r.title, r.subtitle, r.submitted_at, ae.registration_number, p.full_name as student_name,
    ap.service_level_business_days as sla_days
    into request_data
  from public.cataloging_requests r
  join public.student_profiles sp on sp.id = r.student_profile_id
  join public.profiles p on p.id = sp.profile_id
  join public.academic_enrollments ae on ae.id = r.academic_enrollment_id
  join public.academic_programs ap on ap.id = ae.academic_program_id
  where r.id = target_request_id and sp.profile_id = auth.uid()
    and r.status in ('submitted', 'in_review', 'changes_requested', 'approved')
    and ap.active and ap.coordination_magic_link_enabled;
  if request_data.id is null then return; end if;
  if exists (select 1 from public.email_outbox e
    where e.request_id = target_request_id and e.event_type = 'request_opened_coordination') then return; end if;

  select c.id, c.name, c.email into contact
  from public.coordination_contacts c
  join public.academic_enrollments ae on ae.academic_program_id = c.academic_program_id
  join public.cataloging_requests r on r.academic_enrollment_id = ae.id
  where r.id = target_request_id and c.active and c.receives_opening_emails
  order by c.created_at desc limit 1;
  if contact.id is null then return; end if;

  -- Um link gerado manualmente sem e-mail não pode ser recuperado em texto.
  -- Invalide-o e crie um novo link vinculado à mensagem automática.
  update public.coordination_magic_links set invalidated_at = now()
    where request_id = target_request_id and invalidated_at is null;
  raw_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  insert into public.coordination_magic_links (request_id, coordination_contact_id, token_hash, issued_by)
  values (target_request_id, contact.id, encode(extensions.digest(raw_token, 'sha256'), 'hex'), auth.uid());
  insert into public.email_outbox (request_id, event_type, idempotency_key, recipient, subject, text_body)
  values (target_request_id, 'request_opened_coordination',
    'request_opened:coordination:' || target_request_id::text || ':' || contact.id::text, contact.email,
    'Pronto! | Nova solicitação n.º ' || request_data.protocol,
    'Olá, ' || contact.name || '.' || E'\n\n' ||
    'Uma solicitação de ficha catalográfica foi aberta para o curso ou programa sob sua coordenação.' || E'\n\n' ||
    'Trabalho: ' || request_data.title || case when nullif(btrim(coalesce(request_data.subtitle, '')), '') is not null then ': ' || btrim(request_data.subtitle) else '' end || E'\n' ||
    'Solicitante: ' || request_data.student_name || E'\n' ||
    'Matrícula: ' || request_data.registration_number || E'\n' ||
    'Protocolo: ' || request_data.protocol || E'\n' ||
    'Prazo de referência: ' || request_data.sla_days || ' dias úteis' || E'\n' ||
    'Previsão da análise: ' || coalesce(to_char(public.add_business_days(request_data.submitted_at, request_data.sla_days) at time zone 'America/Sao_Paulo', 'DD/MM/YYYY'), 'indisponível durante a suspensão do atendimento') || E'\n\n' ||
    'Para acompanhar o andamento, use o acesso seguro abaixo: {{SITE_URL}}/coordenacao/' || raw_token || E'\n\n' ||
    'Esse acesso é somente para acompanhamento da solicitação realizada pelo(a) referido(a) estudante.');
end;
$$;

create or replace function public.enqueue_opening_email()
returns trigger language plpgsql security definer set search_path = '' as $$
declare recipient_email text; student_name text; registration text; sla_days integer; contact record; raw_token text;
begin
  select p.email, p.full_name, ae.registration_number, ap.service_level_business_days
    into recipient_email, student_name, registration, sla_days
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

  for contact in
    select c.id, c.name, c.email, ap.name as program_name
    from public.academic_enrollments ae
    join public.academic_programs ap on ap.id = ae.academic_program_id
    join public.coordination_contacts c on c.academic_program_id = ap.id
    where ae.id = new.academic_enrollment_id and ap.active and ap.coordination_magic_link_enabled
      and c.active and c.receives_opening_emails
    order by c.created_at desc
    limit 1
  loop
    raw_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
    insert into public.coordination_magic_links (request_id, coordination_contact_id, token_hash, issued_by)
    values (new.id, contact.id, encode(extensions.digest(raw_token, 'sha256'), 'hex'), auth.uid());
    insert into public.email_outbox (request_id, event_type, idempotency_key, recipient, subject, text_body)
    values (new.id, 'request_opened_coordination', 'request_opened:coordination:' || new.id::text || ':' || contact.id::text, contact.email,
      'Pronto! | Nova solicitação n.º ' || new.protocol,
      'Olá, ' || contact.name || '.' || E'\n\n' ||
      'Uma solicitação de ficha catalográfica foi aberta para o curso ou programa sob sua coordenação.' || E'\n\n' ||
      'Trabalho: ' || new.title || case when nullif(btrim(coalesce(new.subtitle, '')), '') is not null then ': ' || btrim(new.subtitle) else '' end || E'\n' ||
      'Solicitante: ' || student_name || E'\n' ||
      'Matrícula: ' || registration || E'\n' ||
      'Protocolo: ' || new.protocol || E'\n' ||
      'Prazo de referência: ' || sla_days || ' dias úteis' || E'\n' ||
      'Previsão da análise: ' || coalesce(to_char(public.add_business_days(new.submitted_at, sla_days) at time zone 'America/Sao_Paulo', 'DD/MM/YYYY'), 'indisponível durante a suspensão do atendimento') || E'\n\n' ||
      'Para acompanhar o andamento, use o acesso seguro abaixo: {{SITE_URL}}/coordenacao/' || raw_token || E'\n\n' ||
      'Esse acesso é somente para acompanhamento da solicitação realizada pelo(a) referido(a) estudante.');
  end loop;
  return new;
end;
$$;
