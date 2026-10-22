-- Ajustes editoriais do parecer de 22/10/2026. Sem reenvio ou alteração de mensagens já enfileiradas.
begin;

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
      'Olá!' || E'\n\n' ||
      'Uma solicitação de ficha catalográfica foi aberta para o curso ou programa sob sua coordenação.' || E'\n\n' ||
      'Trabalho: ' || new.title || case when nullif(btrim(coalesce(new.subtitle, '')), '') is not null then ': ' || btrim(new.subtitle) else '' end || E'\n' ||
      'Solicitante: ' || student_name || E'\n' ||
      'Matrícula: ' || registration || E'\n' ||
      'Protocolo: ' || new.protocol || E'\n' ||
      'Prazo de referência: ' || sla_days || ' dias úteis' || E'\n' ||
      'Previsão da análise: ' || coalesce(to_char(public.add_business_days(new.submitted_at, sla_days) at time zone 'America/Sao_Paulo', 'DD/MM/YYYY'), 'indisponível durante a suspensão do atendimento') || E'\n\n' ||
      'Para acompanhar o andamento, use o acesso seguro abaixo: {{SITE_URL}}/coordenacao/' || raw_token || E'\n\n' ||
      'Esse acesso é somente para acompanhamento da solicitação realizada pelo(a) referido(a) discente concluinte.');
  end loop;
  return new;
end;
$$;

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
    'Olá!' || E'\n\n' ||
    'Uma solicitação de ficha catalográfica foi aberta para o curso ou programa sob sua coordenação.' || E'\n\n' ||
    'Trabalho: ' || request_data.title || case when nullif(btrim(coalesce(request_data.subtitle, '')), '') is not null then ': ' || btrim(request_data.subtitle) else '' end || E'\n' ||
    'Solicitante: ' || request_data.student_name || E'\n' ||
    'Matrícula: ' || request_data.registration_number || E'\n' ||
    'Protocolo: ' || request_data.protocol || E'\n' ||
    'Prazo de referência: ' || request_data.sla_days || ' dias úteis' || E'\n' ||
    'Previsão da análise: ' || coalesce(to_char(public.add_business_days(request_data.submitted_at, request_data.sla_days) at time zone 'America/Sao_Paulo', 'DD/MM/YYYY'), 'indisponível durante a suspensão do atendimento') || E'\n\n' ||
    'Para acompanhar o andamento, use o acesso seguro abaixo: {{SITE_URL}}/coordenacao/' || raw_token || E'\n\n' ||
    'Esse acesso é somente para acompanhamento da solicitação realizada pelo(a) referido(a) discente concluinte.');
end;
$$;

create or replace function public.queue_request_release_notice(target_request_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare recipient_email text; student_name text; protocol_value text;
begin
  if coalesce(public.current_user_role() in ('cataloger', 'administrator'), false) is not true then raise exception 'active_staff_required'; end if;
  select p.email, p.full_name, r.protocol into recipient_email, student_name, protocol_value from public.cataloging_requests r join public.student_profiles sp on sp.id = r.student_profile_id join public.profiles p on p.id = sp.profile_id where r.id = target_request_id and r.status = 'approved';
  if recipient_email is null then raise exception 'approved_request_required'; end if;
  if exists(select 1 from public.cataloging_requests where id=target_request_id and retrospective) then
    insert into public.email_outbox(request_id,event_type,idempotency_key,recipient,subject,text_body)
    values(target_request_id,'request_released','request_released:'||target_request_id::text,recipient_email,
    'Pronto! | Ficha retrospectiva n.º '||protocol_value||' liberada',
    'Olá!'||E'\n\nA ficha do protocolo '||protocol_value||E' foi homologada.\n\nAcesse o Pronto! para gerar a ficha e consultar o guia de depósito do trabalho no RI/UFBA.') on conflict(idempotency_key) do nothing;
    return;
  end if;
  insert into public.email_outbox (request_id, event_type, idempotency_key, recipient, subject, text_body) values (target_request_id, 'request_released', 'request_released:' || target_request_id::text, recipient_email,
    'Pronto! | Sua ficha catalográfica está liberada!',
    'Olá, ' || student_name || '.' || E'\n\nSua ficha catalográfica foi homologada e o Nada Consta que você forneceu foi validado. A ficha já está disponível no Pronto!.' || E'\n\nAcesse sua solicitação para gerar o PDF completo do seu trabalho com a ficha catalográfica já inserida (opção recomendada) ou baixá-la separadamente.\n\nNo painel do Pronto!, você também pode consultar as orientações para o autodepósito do seu trabalho no RI/UFBA.' || E'\n\nAtenção! Antes de gerar o arquivo final do seu trabalho contendo a ficha, confira se o PDF selecionado por você no seu dispositivo é o mesmo trabalho final completo que você enviou durante o atendimento no Pronto!.') on conflict (idempotency_key) do nothing;
end;
$$;

create or replace function public.close_cataloging_request(target_request_id uuid, permanent_url text)
returns timestamptz language plpgsql security definer set search_path='' as $$
declare actor_role public.user_role; closed_at timestamptz:=now(); student_email text; student_name text; protocol_value text; title_value text; contact record;
begin
  actor_role:=public.current_user_role();
  if actor_role not in ('cataloger','administrator') then raise exception 'active_staff_required'; end if;
  if permanent_url is null or permanent_url !~ '^https://[^[:space:]]+$' then raise exception 'invalid_permanent_url'; end if;
  select pr.email,pr.full_name,r.protocol,r.title into student_email,student_name,protocol_value,title_value from public.cataloging_requests r join public.student_profiles sp on sp.id=r.student_profile_id join public.profiles pr on pr.id=sp.profile_id where r.id=target_request_id and r.status='approved' and (actor_role='administrator' or r.assigned_to=auth.uid()) and exists(select 1 from public.cataloging_card_homologations h where h.request_id=r.id) and (r.retrospective or exists(select 1 from public.nada_consta_documents n where n.request_id=r.id and n.status='approved')) and exists(select 1 from public.repository_deposit_progress d where d.request_id=r.id) for update;
  if exists(select 1 from public.cataloging_requests where id=target_request_id and retrospective) and not exists(select 1 from public.retrospective_deposit_reports where request_id=target_request_id and retrospective_deposit_reports.permanent_url=close_cataloging_request.permanent_url) then raise exception 'retrospective_deposit_report_required'; end if;
  if protocol_value is null then raise exception 'request_not_ready_for_closure'; end if;
  insert into public.repository_publications(request_id,permanent_url,verified_by,verified_at) values(target_request_id,permanent_url,auth.uid(),closed_at);
  update public.cataloging_requests set status='completed',updated_at=closed_at where id=target_request_id;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'repository_publication_verified','cataloging_request',target_request_id::text,jsonb_build_object('permanent_url',permanent_url)),(auth.uid(),'cataloging_request_completed','cataloging_request',target_request_id::text,jsonb_build_object('permanent_url',permanent_url));
  insert into public.email_outbox(request_id,event_type,idempotency_key,recipient,subject,text_body) values(target_request_id,'request_completed','request_completed:student:'||target_request_id,student_email,
    'Pronto! | Protocolo n.º '||protocol_value||' encerrado',
    'Olá, '||student_name||'.'||E'\n\nSeu protocolo foi encerrado após a verificação da publicação do trabalho no Repositório Institucional da UFBA.'||E'\n\nEndereço permanente da publicação: '||permanent_url||case when exists(select 1 from public.cataloging_requests where id=target_request_id and retrospective) then '' else E'\n\nGuarde este endereço para consulta e divulgação do seu trabalho. Ele é permanente e único.\n\nO arquivo Nada Consta enviado ao Pronto! será mantido somente pelo período operacional previsto e depois removido. O registro acadêmico pertinente permanece nos sistemas institucionais aplicáveis.' end);
  for contact in select c.id,c.email,c.name from public.coordination_contacts c join public.academic_enrollments ae on ae.academic_program_id=c.academic_program_id join public.cataloging_requests r on r.academic_enrollment_id=ae.id where r.id=target_request_id and c.active and c.receives_completion_emails loop
    insert into public.email_outbox(request_id,event_type,idempotency_key,recipient,subject,text_body) values(target_request_id,'request_completed_coordination','request_completed:coordination:'||target_request_id||':'||contact.id,contact.email,
      'Pronto! | Protocolo n.º '||protocol_value||' concluído',
      'Olá, '||contact.name||'.'||E'\n\nO atendimento da solicitação abaixo foi concluído. Isso significa que o trabalho do(a) estudante teve sua ficha catalográfica feita pela Biblioteca e já se encontra disponível no Repositório Institucional da UFBA.'||E'\n\nTrabalho: '||title_value||E'\nSolicitante: '||student_name||E'\nProtocolo: '||protocol_value||E'\nPublicação no RI/UFBA: '||permanent_url||E'\n\nA página de acompanhamento desta solicitação foi fechada juntamente com o protocolo de atendimento. O botão e URL de acesso ao protocolo enviados anteriormente não são mais válidos.') on conflict(idempotency_key) do nothing;
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
    'Olá.' || E'\n\nA conta institucional ' || lower(new.email) || ' foi confirmada e está aguardando a definição de perfil no painel administrativo do Pronto!.' || E'\n\nAcesse Administração → Operação → Contas para atribuir o perfil adequado.' || E'\n\nSó faça o provisionamento após confirmar que a pessoa integra a equipe autorizada da Biblioteca.',
    'staff_account_pending:' || new.id::text || ':' || administrator.id::text
  from public.profiles administrator where administrator.role = 'administrator' and administrator.status = 'active' on conflict (idempotency_key) do nothing;
  return new;
end $$;

create or replace function public.enqueue_due_feedback_reminders()
returns void language plpgsql security definer set search_path = '' as $$
declare item record; campaign_url text; reminder_day integer;
begin
  select site_url into campaign_url from public.feedback_campaign where id and activated_at is not null;
  if campaign_url is null then return; end if;
  for item in select i.request_id, i.invited_at, r.protocol, p.email, p.full_name
    from public.feedback_invitations i join public.cataloging_requests r on r.id = i.request_id
    join public.student_profiles s on s.id = r.student_profile_id join public.profiles p on p.id = s.profile_id
    where not i.responded and p.status = 'active' and r.status = 'completed'
  loop
    foreach reminder_day in array array[3,10,17,24] loop
      if now() >= item.invited_at + make_interval(days => reminder_day)
        and now() < item.invited_at + make_interval(days => reminder_day + 1) then
        insert into public.email_outbox(request_id,event_type,idempotency_key,recipient,subject,text_body)
          values(item.request_id,'feedback_reminder','feedback_reminder:'||item.request_id::text||':'||reminder_day::text,
            item.email,case reminder_day when 10 then 'Pronto! | Somente 3 minutos e você pode ajudar a melhorar nossos serviços ⏱️' when 17 then 'Pronto! | Toc toc! Teria 3 minutinhos? 🚪' when 24 then 'Pronto! | Última chamada! Rsrs 📣' else 'Pronto! | Sua avaliação ajuda a melhorar a BIB/FAUFBA 💬' end,
            'Olá, '||item.full_name||'.'||E'\n\n'||case reminder_day when 10 then 'Há 10 dias, você usou nosso mais novo serviço, o Pronto!, e imaginamos que sua experiência tenha sido a melhor possível. Poderia compartilhar com a gente o que achou?' when 17 then 'Desculpa atrapalhar o silêncio da sua viagem... Mas você poderia compartilhar com a gente como foi sua experiência ao usar o Pronto!? Sua resposta certamente vai contribuir bastante com a melhoria do que oferecemos à comunidade FAUFBA.' when 24 then E'A gente jura que será o último pedido! Valorizamos muito sua avaliação dos nossos serviços e, por isso, continuamos aguardando que compartilhe conosco como foi sua experiência usando o Pronto!.\n\nSério! Um pequeno tempo seu gasto pode contribuir bastante para um serviço melhor da Biblioteca para seus colegas e demais membros da FAUFBA.' else 'Você concluiu o protocolo '||item.protocol||' e sua experiência pode ajudar a melhorar o Pronto! e os serviços da Biblioteca da Faculdade de Arquitetura da UFBA.' end||E'\n\nA avaliação leva cerca de 3 minutos. Acesse: '||campaign_url||'/painel/avaliacao'||E'\n\nSe você já respondeu, desconsidere esta mensagem.')
          on conflict(idempotency_key) do nothing;
      end if;
    end loop;
  end loop;
end $$;

create or replace function public.enqueue_repository_deposit_reminders(
  target_request_ids uuid[], program_filter uuid, search_text text, all_matching boolean, site_origin text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare candidate record; queued_count integer:=0; remaining_count integer; outbox_uuid uuid;
begin
  if not public.has_permission('staff.request.close') or not public.has_permission('admin.deposits.view') or not public.has_permission('admin.deposits.send') or not public.has_permission('staff.case.view') then raise exception 'permission_denied'; end if;
  -- Não aceitar um destino arbitrário nos e-mails institucionais.
  if site_origin not in ('https://prontobib.vercel.app',
    'https://pronto-git-codex-ajustes-administrac-c0c3a4-ramondavis-projects.vercel.app') or site_origin is null
    then raise exception 'invalid_reminder_origin'; end if;
  if not coalesce(all_matching,false) and (coalesce(cardinality(target_request_ids),0)=0 or cardinality(target_request_ids)>100)
    then raise exception 'select_up_to_100_requests'; end if;
  for candidate in
    select v.* from public.repository_followup_candidates v join public.cataloging_requests locked on locked.id=v.request_id
    where v.can_send and (coalesce(all_matching,false) or v.request_id=any(target_request_ids))
      and (program_filter is null or v.program_id=program_filter)
      and (btrim(coalesce(search_text,''))='' or concat_ws(' ',v.protocol,v.title,v.student_name,v.student_email) ilike '%'||left(search_text,150)||'%')
    order by v.request_id limit 100 for update of locked skip locked
  loop
    if candidate.email_status='failed' then
      update public.email_outbox o set status='pending',attempts=0,last_error=null,updated_at=now()
        from public.repository_deposit_reminders m where m.request_id=candidate.request_id and o.id=m.outbox_id and o.status='failed'
        returning o.id into outbox_uuid;
      if not found then continue; end if;
      update public.repository_deposit_reminders set queued_at=now(),queued_by=auth.uid() where request_id=candidate.request_id;
    else
      insert into public.email_outbox(request_id,event_type,idempotency_key,recipient,subject,text_body)
      values(candidate.request_id,'repository_deposit_reminder','repository_deposit_reminder:'||candidate.request_id::text,
        candidate.student_email,'Pronto! | Deposite seu trabalho no RI/UFBA',
        'Olá, '||candidate.student_name||'.'||E'\n\nSeu trabalho abaixo infelizmente não consta ainda no Repositório Institucional da UFBA (RI/UFBA).'||
        E'\n\nTrabalho: '||candidate.title||E'\nProtocolo: '||candidate.protocol||
        E'\n\nE sabe o que é ruim nisso? Que ele poderia estar sendo visto pelo mundo todo se estivesse lá disponível. Por isso, considerando a adequada divulgação científica da produção do conhecimento da nossa Faculdade e da nossa UFBA, convidamos você a depositar seu trabalho no RI. Essa ação, mais que tudo, visa a ampliar a circulação e preservação do seu trabalho, da ciência que você ajudou a construir.\n\nAcesse o guia com os dados homologados pela biblioteca, entrando na mesma conta usada na solicitação:'||
        E'\n'||site_origin||'/painel/autodeposito?pedido='||candidate.request_id::text||
        E'\n\nO atendimento da ficha continua concluído. Este lembrete não altera a aprovação da ficha nem declara uma obrigação retroativa. Se o trabalho já estiver no RI/UFBA, informe o endereço permanente à biblioteca.')
      returning id into outbox_uuid;
      insert into public.repository_deposit_reminders(request_id,outbox_id,queued_by)
        values(candidate.request_id,outbox_uuid,auth.uid());
    end if;
    insert into public.audit_logs(actor_id,action,entity_type,entity_id)
      values(auth.uid(),'repository_deposit_reminder_queued','cataloging_request',candidate.request_id::text);
    queued_count:=queued_count+1;
  end loop;
  select count(*) into remaining_count from public.repository_followup_candidates v where v.can_send
    and (coalesce(all_matching,false) or v.request_id=any(target_request_ids))
    and (program_filter is null or v.program_id=program_filter)
    and (btrim(coalesce(search_text,''))='' or concat_ws(' ',v.protocol,v.title,v.student_name,v.student_email) ilike '%'||left(search_text,150)||'%');
  return jsonb_build_object('queued',queued_count,'remaining',remaining_count);
end $$;

create or replace function public.enqueue_repository_preparation_reminders() returns void
language plpgsql security definer set search_path='' set timezone='America/Bahia' as $$
declare reminder record; outbox uuid; next_due timestamptz;
begin
 for reminder in
  select m.*,a.state,a.destination as current_destination,r.protocol,r.title,r.status as request_status,p.full_name,p.email,p.status as account_status,
   ap.active as program_active,ap.repository_deposit_enabled,r.retrospective,
   jsonb_build_array(ap.code,ap.repository_collection_label,ap.repository_document_type_label) as configured_destination
  from public.repository_preparation_reminders m
  join public.repository_access_preparations a on a.request_id=m.request_id
  join public.cataloging_requests r on r.id=m.request_id
  join public.student_profiles s on s.id=r.student_profile_id join public.profiles p on p.id=s.profile_id
  join public.academic_enrollments ae on ae.id=r.academic_enrollment_id join public.academic_programs ap on ap.id=ae.academic_program_id
  where m.status in ('scheduled','queued') order by m.due_at limit 200 for update of m skip locked
 loop
  if reminder.account_status<>'active' or reminder.request_status not in ('approved','completed') or not reminder.program_active
   or not reminder.repository_deposit_enabled
   or reminder.waiting_kind is distinct from public.repository_preparation_waiting_kind(reminder.state)
   or reminder.destination is distinct from reminder.current_destination or reminder.destination is distinct from reminder.configured_destination
   or exists(select 1 from public.repository_publications where request_id=reminder.request_id) then
   perform public.cancel_repository_preparation_reminder(reminder.request_id); continue;
  end if;
  if reminder.status='queued' then
   update public.repository_preparation_reminders m set status=case when e.status='delivered' then 'delivered' else 'failed' end
   from public.email_outbox e where m.request_id=reminder.request_id and e.id=m.outbox_id and (e.status='delivered' or (e.status='failed' and e.attempts>=5));
   continue;
  end if;
  next_due:=public.add_business_days(reminder.created_at,2);
  if next_due is null then continue; end if;
  update public.repository_preparation_reminders set due_at=next_due where request_id=reminder.request_id;
  if next_due>now() then continue; end if;
  insert into public.email_outbox(request_id,event_type,idempotency_key,recipient,subject,text_body)
  values(reminder.request_id,'repository_preparation_reminder','repository_preparation_reminder:'||reminder.generation,reminder.email,
   'Pronto! | Continue a preparação do autodepósito',
   'Olá, '||reminder.full_name||E'.\n\nVocê pediu este lembrete para voltar ao Pronto! e conferir '||
   case reminder.waiting_kind when 'account' then 'a criação e confirmação da sua conta no RI/UFBA.' when 'correction' then 'a correção da sua liberação para o autodepósito no RI/UFBA.' else 'a liberação do seu autodepósito no RI/UFBA.' end||
   E'\n\nTrabalho: '||reminder.title||E'\nProtocolo: '||reminder.protocol||
   E'\n\nConfira a resposta por e-mail ou entre na sua conta do RI/UFBA. Este lembrete não significa que a pendência foi resolvida nem informa um prazo de resposta do RI.\n\nContinue de onde parou: {{SITE_URL}}/painel/autodeposito?pedido='||reminder.request_id)
  on conflict(idempotency_key) do update set idempotency_key=excluded.idempotency_key returning id into outbox;
  update public.repository_preparation_reminders set status='queued',outbox_id=outbox where request_id=reminder.request_id;
 end loop;
end $$;

commit;
