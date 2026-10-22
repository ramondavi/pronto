-- Terminologia de conclusão unificada por decisão de 22/10/2026.
-- Preserva regras de conclusão e dados da publicação quando existente.
begin;

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
    'Pronto! | Atendimento concluído — '||protocol_value,
    'Olá, '||student_name||'.'||E'\n\nSeu atendimento foi concluído. A publicação do trabalho no Repositório Institucional da UFBA foi verificada pela Biblioteca.'||E'\n\nEndereço permanente da publicação: '||permanent_url||case when exists(select 1 from public.cataloging_requests where id=target_request_id and retrospective) then '' else E'\n\nGuarde este endereço para consulta e divulgação do seu trabalho. Ele é permanente e único.\n\nO arquivo Nada Consta enviado ao Pronto! será mantido somente pelo período operacional previsto e depois removido. O registro acadêmico pertinente permanece nos sistemas institucionais aplicáveis.' end);
  for contact in select c.id,c.email,c.name from public.coordination_contacts c join public.academic_enrollments ae on ae.academic_program_id=c.academic_program_id join public.cataloging_requests r on r.academic_enrollment_id=ae.id where r.id=target_request_id and c.active and c.receives_completion_emails loop
    insert into public.email_outbox(request_id,event_type,idempotency_key,recipient,subject,text_body) values(target_request_id,'request_completed_coordination','request_completed:coordination:'||target_request_id||':'||contact.id,contact.email,
      'Pronto! | Atendimento concluído — '||protocol_value,
      'Olá, '||contact.name||'.'||E'\n\nO atendimento da solicitação abaixo foi concluído. Isso significa que o trabalho do(a) estudante teve sua ficha catalográfica feita pela Biblioteca e já se encontra disponível no Repositório Institucional da UFBA.'||E'\n\nTrabalho: '||title_value||E'\nSolicitante: '||student_name||E'\nProtocolo: '||protocol_value||E'\nPublicação no RI/UFBA: '||permanent_url||E'\n\nA página de acompanhamento desta solicitação foi fechada juntamente com o protocolo de atendimento. O botão e URL de acesso ao protocolo enviados anteriormente não são mais válidos.') on conflict(idempotency_key) do nothing;
  end loop;
  return closed_at;
end $$;

create or replace function public.complete_request_without_repository(target_request_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare request_record record; contact record;
begin
  if not public.has_permission('staff.request.close') then raise exception 'permission_denied'; end if;
  select r.*,pr.email,pr.full_name into request_record from public.cataloging_requests r
    join public.student_profiles s on s.id=r.student_profile_id join public.profiles pr on pr.id=s.profile_id
    join public.academic_enrollments ae on ae.id=r.academic_enrollment_id
    join public.academic_programs p on p.id=ae.academic_program_id
    where r.id=target_request_id and r.status='approved' and not r.retrospective and not p.repository_deposit_enabled
      and (public.current_user_role()='administrator' or r.assigned_to=auth.uid())
      and exists(select 1 from public.cataloging_card_homologations h where h.request_id=r.id)
      and exists(select 1 from public.nada_consta_documents n where n.request_id=r.id and n.status='approved') for update of r;
  if not found then raise exception 'request_not_ready_without_repository'; end if;
  update public.cataloging_requests set status='completed',updated_at=now() where id=target_request_id;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
    values(auth.uid(),'cataloging_request_completed','cataloging_request',target_request_id::text,
      jsonb_build_object('repository_guide_enabled',false,'reason','repository_guide_disabled'));
  insert into public.email_outbox(request_id,event_type,idempotency_key,recipient,subject,text_body)
    values(target_request_id,'request_completed','request_completed:student:'||target_request_id,request_record.email,
      'Pronto! | Atendimento concluído — '||request_record.protocol,
      'Olá, '||request_record.full_name||'.'||E'\n\nO atendimento da ficha catalográfica foi concluído.'||
      E'\n\nTrabalho: '||request_record.title||E'\nProtocolo: '||request_record.protocol);
  for contact in select c.id,c.email,c.name from public.coordination_contacts c
    join public.academic_enrollments ae on ae.academic_program_id=c.academic_program_id
    where ae.id=request_record.academic_enrollment_id and c.active and c.receives_completion_emails
  loop
    insert into public.email_outbox(request_id,event_type,idempotency_key,recipient,subject,text_body)
      values(target_request_id,'request_completed_coordination','request_completed:coordination:'||target_request_id||':'||contact.id,
        contact.email,'Pronto! | Atendimento concluído — '||request_record.protocol,
        E'Olá!\n\nO atendimento da ficha catalográfica foi concluído.'||
        E'\n\nTrabalho: '||request_record.title||E'\nProtocolo: '||request_record.protocol);
  end loop;
end $$;

commit;
