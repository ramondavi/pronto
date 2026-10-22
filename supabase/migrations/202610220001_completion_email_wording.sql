-- Redação de conclusão sem referência ao fluxo do RI, aprovada em 22/10/2026.
-- Preserva condições, destinatários, status, permissões e idempotência.
begin;

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
      'Pronto! | Atendimento da ficha concluído',
      'Olá, '||request_record.full_name||'.'||E'\n\nO atendimento da ficha catalográfica foi concluído.'||
      E'\n\nTrabalho: '||request_record.title||E'\nProtocolo: '||request_record.protocol);
  for contact in select c.id,c.email,c.name from public.coordination_contacts c
    join public.academic_enrollments ae on ae.academic_program_id=c.academic_program_id
    where ae.id=request_record.academic_enrollment_id and c.active and c.receives_completion_emails
  loop
    insert into public.email_outbox(request_id,event_type,idempotency_key,recipient,subject,text_body)
      values(target_request_id,'request_completed_coordination','request_completed:coordination:'||target_request_id||':'||contact.id,
        contact.email,'Pronto! | Atendimento da ficha concluído',
        E'Olá!\n\nO atendimento da ficha catalográfica foi concluído.'||
        E'\n\nTrabalho: '||request_record.title||E'\nProtocolo: '||request_record.protocol);
  end loop;
end $$;

commit;
