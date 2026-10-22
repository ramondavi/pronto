-- Administração: atribuições específicas de Depósitos pendentes.
insert into public.permission_definitions(code,area,screen,action,description,default_roles,professional_only,delegable) values
 ('admin.deposits.view','Administração','Depósitos pendentes','Consultar pendências','Consultar e filtrar trabalhos sem publicação; exige também acesso à consulta de protocolos','{cataloger,administrator}',true,true),
 ('admin.deposits.send','Administração','Depósitos pendentes','Enviar lembretes','Agendar lembretes individuais, por seleção ou em lotes; exige consultar pendências e finalizar atendimentos','{cataloger,administrator}',true,true),
 ('admin.deposits.history','Administração','Depósitos pendentes','Confirmar condição histórica','Confirmar que o guia estava desabilitado na conclusão; exige consultar pendências e finalizar atendimentos','{cataloger,administrator}',true,true),
 ('admin.deposits.publication','Administração','Depósitos pendentes','Registrar publicação','Registrar a URL do RI conferida pela Biblioteca; exige consultar pendências e finalizar atendimentos','{cataloger,administrator}',true,true);

create or replace function public.list_repository_deposit_followup(
  program_filter uuid default null, search_text text default '', page_offset integer default 0
) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
  if not public.has_permission('staff.case.view') or not public.has_permission('admin.deposits.view') then raise exception 'permission_denied'; end if;
  with filtered as (
    select * from public.repository_followup_candidates v
    where (program_filter is null or v.program_id=program_filter)
      and (btrim(coalesce(search_text,''))='' or concat_ws(' ',v.protocol,v.title,v.student_name,v.student_email) ilike '%'||left(search_text,150)||'%')
  ), page_rows as (select * from filtered order by completed_at desc nulls last,request_id limit 100 offset greatest(coalesce(page_offset,0),0))
  select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(page_rows)) from page_rows),'[]'::jsonb),
    'total',(select count(*) from filtered),'sendable',(select count(*) from filtered where can_send)) into result;
  return result;
end $$;

create or replace function public.confirm_repository_guide_history(target_request_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
  if not public.has_permission('staff.request.close') or not public.has_permission('admin.deposits.view') or not public.has_permission('admin.deposits.history') or not public.has_permission('staff.case.view') then raise exception 'permission_denied'; end if;
  perform 1 from public.cataloging_requests r where r.id=target_request_id and r.status='completed'
    and not r.retrospective and r.repository_guide_enabled_at_completion is null
    and not exists(select 1 from public.repository_publications where request_id=r.id) for update;
  if not found then raise exception 'unconfirmed_repository_history_required'; end if;
  update public.cataloging_requests set repository_guide_enabled_at_completion=false where id=target_request_id;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
    values(auth.uid(),'repository_guide_history_confirmed','cataloging_request',target_request_id::text,
      jsonb_build_object('enabled_at_completion',false,'source','staff_confirmation'));
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
        'Olá, '||candidate.student_name||'.'||E'\n\nA ficha catalográfica do trabalho abaixo foi concluída quando o guia de autodepósito do seu programa ainda não estava habilitado no Pronto!. O guia agora está disponível.'||
        E'\n\nTrabalho: '||candidate.title||E'\nProtocolo: '||candidate.protocol||
        E'\n\nConvidamos você a depositar seu trabalho no Repositório Institucional da UFBA, para ampliar sua circulação e preservação. Acesse o guia com os dados homologados pela biblioteca, entrando na mesma conta usada na solicitação:'||
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

create or replace function public.record_completed_repository_publication(target_request_id uuid, permanent_url text) returns void
language plpgsql security definer set search_path='' as $$
begin
  if not public.has_permission('staff.request.close') or not public.has_permission('admin.deposits.view') or not public.has_permission('admin.deposits.publication') or not public.has_permission('staff.case.view') then raise exception 'permission_denied'; end if;
  if permanent_url is null or permanent_url !~ '^https://repositorio[.]ufba[.]br/(handle/|jspui/handle/|items/)[^[:space:]?#]+$'
    then raise exception 'ri_ufba_url_required'; end if;
  perform 1 from public.cataloging_requests r join public.academic_enrollments ae on ae.id=r.academic_enrollment_id
    join public.academic_programs p on p.id=ae.academic_program_id where r.id=target_request_id and r.status='completed'
      and r.repository_guide_enabled_at_completion=false and p.active and p.repository_deposit_enabled for update of r;
  if not found then raise exception 'completed_repository_followup_required'; end if;
  insert into public.repository_publications(request_id,permanent_url,verified_by)
    values(target_request_id,permanent_url,auth.uid());
  insert into public.audit_logs(actor_id,action,entity_type,entity_id)
    values(auth.uid(),'repository_publication_verified','cataloging_request',target_request_id::text);
end $$;

