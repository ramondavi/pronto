-- Registra a condição no encerramento, sem inferi-la da configuração atual.
alter table public.cataloging_requests
  add column repository_guide_enabled_at_completion boolean,
  add column completed_at timestamptz;

create function public.capture_repository_guide_at_completion() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if tg_op='UPDATE' and old.status='completed' and old.repository_guide_enabled_at_completion is not null
    and new.repository_guide_enabled_at_completion is distinct from old.repository_guide_enabled_at_completion then
    raise exception 'completion_repository_history_immutable';
  end if;
  if new.status='completed' and (tg_op='INSERT' or old.status is distinct from 'completed') then
    select p.repository_deposit_enabled into new.repository_guide_enabled_at_completion
      from public.academic_enrollments e join public.academic_programs p on p.id=e.academic_program_id
      where e.id=new.academic_enrollment_id;
    new.completed_at:=now();
  end if;
  return new;
end $$;
create trigger capture_repository_guide_at_completion before insert or update on public.cataloging_requests
  for each row execute function public.capture_repository_guide_at_completion();

-- A data antiga só é recuperada de um evento real. A configuração antiga permanece
-- desconhecida até haver evidência ou confirmação explícita da biblioteca.
update public.cataloging_requests r set completed_at=(
  select min(a.occurred_at) from public.audit_logs a
  where a.entity_type='cataloging_request' and a.entity_id=r.id::text and a.action='cataloging_request_completed'
) where r.status='completed';

create table public.repository_deposit_reminders (
  request_id uuid primary key references public.cataloging_requests(id) on delete restrict,
  outbox_id uuid not null unique references public.email_outbox(id) on delete restrict,
  queued_by uuid not null references public.profiles(id),
  queued_at timestamptz not null default now()
);
alter table public.repository_deposit_reminders enable row level security;
revoke all on public.repository_deposit_reminders from public,anon,authenticated;
grant select on public.repository_deposit_reminders to authenticated;
create policy repository_deposit_reminders_read on public.repository_deposit_reminders for select to authenticated
  using (public.is_active_user() and exists(select 1 from public.cataloging_requests r
    where r.id=request_id and (public.has_permission('staff.case.view') or exists(
      select 1 from public.student_profiles s where s.id=r.student_profile_id and s.profile_id=auth.uid()))));

alter table public.email_outbox drop constraint email_outbox_event_type_check;
alter table public.email_outbox add constraint email_outbox_event_type_check check
  (event_type in ('request_opened','request_opened_coordination','changes_requested','request_released',
   'request_completed','request_completed_coordination','feedback_reminder','request_canceled',
   'student_message_reply','repository_deposit_reminder'));

create function public.can_access_completed_cataloging_card(target_request_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select public.current_user_role()='student' and exists(
    select 1 from public.cataloging_requests r join public.student_profiles s on s.id=r.student_profile_id
    where r.id=target_request_id and s.profile_id=auth.uid() and r.status='completed'
      and r.repository_guide_enabled_at_completion=false
  );
$$;
revoke all on function public.can_access_completed_cataloging_card(uuid) from public,anon,authenticated;
grant execute on function public.can_access_completed_cataloging_card(uuid) to authenticated;

create function public.can_access_completed_repository_guide(target_request_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select public.current_user_role()='student' and exists(
    select 1 from public.cataloging_requests r
    join public.student_profiles s on s.id=r.student_profile_id
    join public.academic_enrollments e on e.id=r.academic_enrollment_id
    join public.academic_programs p on p.id=e.academic_program_id
    where r.id=target_request_id and s.profile_id=auth.uid() and r.status='completed'
      and r.repository_guide_enabled_at_completion=false and p.active and p.repository_deposit_enabled
  );
$$;
revoke all on function public.can_access_completed_repository_guide(uuid) from public,anon,authenticated;
grant execute on function public.can_access_completed_repository_guide(uuid) to authenticated;
create policy completed_repository_guide_card_read on public.cataloging_card_homologations
  for select to authenticated using (public.can_access_completed_cataloging_card(request_id));

create view public.repository_followup_candidates with (security_invoker=true) as
  select r.id as request_id,r.protocol,r.title,r.completed_at,r.repository_guide_enabled_at_completion,
    p.id as program_id,p.name as program_name,p.repository_deposit_enabled,
    pr.full_name as student_name,pr.email as student_email,
    m.queued_at,e.status as email_status,e.delivered_at,
    (r.repository_guide_enabled_at_completion=false and p.active and p.repository_deposit_enabled
      and pr.role='student' and pr.status='active'
      and exists(select 1 from public.cataloging_card_homologations h where h.request_id=r.id)
      and (m.request_id is null or e.status='failed')) as can_send
  from public.cataloging_requests r
  join public.student_profiles s on s.id=r.student_profile_id
  join public.profiles pr on pr.id=s.profile_id
  join public.academic_enrollments ae on ae.id=r.academic_enrollment_id
  join public.academic_programs p on p.id=ae.academic_program_id
  left join public.repository_deposit_reminders m on m.request_id=r.id
  left join public.email_outbox e on e.id=m.outbox_id
  where r.status='completed' and not r.retrospective
    and r.repository_guide_enabled_at_completion is distinct from true
    and not exists(select 1 from public.repository_publications pub where pub.request_id=r.id);
-- Relação interna às funções abaixo, não uma nova superfície pública da API.
revoke all on public.repository_followup_candidates from public,anon,authenticated;

create function public.list_repository_deposit_followup(
  program_filter uuid default null, search_text text default '', page_offset integer default 0
) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
  if not public.has_permission('staff.case.view') then raise exception 'permission_denied'; end if;
  with filtered as (
    select * from public.repository_followup_candidates v
    where (program_filter is null or v.program_id=program_filter)
      and (btrim(coalesce(search_text,''))='' or concat_ws(' ',v.protocol,v.title,v.student_name,v.student_email) ilike '%'||left(search_text,150)||'%')
  ), page_rows as (select * from filtered order by completed_at desc nulls last,request_id limit 100 offset greatest(coalesce(page_offset,0),0))
  select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(page_rows)) from page_rows),'[]'::jsonb),
    'total',(select count(*) from filtered),'sendable',(select count(*) from filtered where can_send)) into result;
  return result;
end $$;

create function public.confirm_repository_guide_history(target_request_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
  if not public.has_permission('staff.request.close') then raise exception 'permission_denied'; end if;
  perform 1 from public.cataloging_requests r where r.id=target_request_id and r.status='completed'
    and not r.retrospective and r.repository_guide_enabled_at_completion is null
    and not exists(select 1 from public.repository_publications where request_id=r.id) for update;
  if not found then raise exception 'unconfirmed_repository_history_required'; end if;
  update public.cataloging_requests set repository_guide_enabled_at_completion=false where id=target_request_id;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
    values(auth.uid(),'repository_guide_history_confirmed','cataloging_request',target_request_id::text,
      jsonb_build_object('enabled_at_completion',false,'source','staff_confirmation'));
end $$;

create function public.enqueue_repository_deposit_reminders(
  target_request_ids uuid[], program_filter uuid, search_text text, all_matching boolean, site_origin text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare candidate record; queued_count integer:=0; remaining_count integer; outbox_uuid uuid;
begin
  if not public.has_permission('staff.request.close') then raise exception 'permission_denied'; end if;
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

create function public.record_completed_repository_publication(target_request_id uuid, permanent_url text) returns void
language plpgsql security definer set search_path='' as $$
begin
  if not public.has_permission('staff.request.close') then raise exception 'permission_denied'; end if;
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

create function public.complete_request_without_repository(target_request_id uuid) returns void
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
      'Olá, '||request_record.full_name||'.'||E'\n\nO atendimento da ficha catalográfica foi concluído. O guia de autodepósito do seu programa não está habilitado neste momento. A biblioteca poderá enviar posteriormente um lembrete com acesso ao guia, quando ele for disponibilizado.'||
      E'\n\nTrabalho: '||request_record.title||E'\nProtocolo: '||request_record.protocol);
  for contact in select c.id,c.email,c.name from public.coordination_contacts c
    join public.academic_enrollments ae on ae.academic_program_id=c.academic_program_id
    where ae.id=request_record.academic_enrollment_id and c.active and c.receives_completion_emails
  loop
    insert into public.email_outbox(request_id,event_type,idempotency_key,recipient,subject,text_body)
      values(target_request_id,'request_completed_coordination','request_completed:coordination:'||target_request_id||':'||contact.id,
        contact.email,'Pronto! | Atendimento da ficha concluído',
        'O atendimento da ficha catalográfica foi concluído sem depósito no RI/UFBA, pois o guia do programa estava desativado.'||
        E'\n\nTrabalho: '||request_record.title||E'\nProtocolo: '||request_record.protocol);
  end loop;
end $$;

revoke all on function public.capture_repository_guide_at_completion(), public.list_repository_deposit_followup(uuid,text,integer),
  public.confirm_repository_guide_history(uuid), public.enqueue_repository_deposit_reminders(uuid[],uuid,text,boolean,text),
  public.record_completed_repository_publication(uuid,text), public.complete_request_without_repository(uuid) from public,anon,authenticated;
grant execute on function public.list_repository_deposit_followup(uuid,text,integer), public.confirm_repository_guide_history(uuid),
  public.enqueue_repository_deposit_reminders(uuid[],uuid,text,boolean,text), public.record_completed_repository_publication(uuid,text),
  public.complete_request_without_repository(uuid) to authenticated;

-- Mantém o fluxo normal e acrescenta somente o guia dos protocolos já concluídos elegíveis.
create or replace function public.start_repository_deposit(target_request_id uuid)
returns timestamptz language plpgsql security definer set search_path='' as $$
declare student_profile uuid; started_value timestamptz;
begin
  if public.current_user_role() is distinct from 'student' then raise exception 'active_student_required'; end if;
  select s.id into student_profile from public.student_profiles s where s.profile_id=auth.uid();
  if not exists(select 1 from public.cataloging_requests r
    join public.academic_enrollments ae on ae.id=r.academic_enrollment_id
    join public.academic_programs p on p.id=ae.academic_program_id
    where r.id=target_request_id and r.student_profile_id=student_profile and p.active
      and (p.repository_deposit_enabled or r.retrospective)
      and exists(select 1 from public.cataloging_card_homologations h where h.request_id=r.id)
      and ((r.status='approved' and (r.retrospective or exists(select 1 from public.nada_consta_documents n where n.request_id=r.id and n.status='approved')))
        or public.can_access_completed_repository_guide(r.id))) then raise exception 'repository_deposit_not_available'; end if;
  insert into public.repository_deposit_progress(request_id,started_by) values(target_request_id,auth.uid())
    on conflict(request_id) do update set updated_at=now() returning started_at into started_value;
  if not exists(select 1 from public.audit_logs where action='repository_deposit_started' and entity_id=target_request_id::text) then
    insert into public.audit_logs(actor_id,action,entity_type,entity_id)
      values(auth.uid(),'repository_deposit_started','cataloging_request',target_request_id::text);
  end if;
  return started_value;
end $$;
