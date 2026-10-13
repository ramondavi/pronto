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
      'Olá, '||contact.name||'.'||E'\n\nO atendimento da solicitação abaixo foi concluído. Isso significa que o trabalho do(a) estudante teve sua ficha catalográfica feita pela Biblioteca e já se encontra disponível no Repositório Institucional da UFBA.'||E'\n\nTrabalho: '||title_value||E'\nSolicitante: '||student_name||E'\nProtocolo: '||protocol_value||E'\nPublicação no RI/UFBA: '||permanent_url||E'\n\nA página de acompanhamento desta solicitação foi fechada juntamente com o protocolo de atendimento. O Magic Link enviado anteriormente não é mais válido.') on conflict(idempotency_key) do nothing;
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
