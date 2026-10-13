-- Incremento 11: encerramento do protocolo e acompanhamento seguro pela coordenação.

create table public.repository_publications (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.cataloging_requests(id) on delete restrict,
  permanent_url text not null check (permanent_url ~ '^https://'),
  verified_by uuid not null references public.profiles(id) on delete restrict,
  verified_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.coordination_magic_links (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.cataloging_requests(id) on delete cascade,
  coordination_contact_id uuid not null references public.coordination_contacts(id) on delete restrict,
  token_hash text not null unique,
  issued_by uuid not null references public.profiles(id) on delete restrict,
  issued_at timestamptz not null default now(),
  invalidated_at timestamptz,
  final_communicated_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index coordination_magic_links_one_active_request
  on public.coordination_magic_links(request_id) where invalidated_at is null;

alter table public.repository_publications enable row level security;
alter table public.coordination_magic_links enable row level security;

create policy "repository_publications_student_read_own" on public.repository_publications
  for select to authenticated using (exists (
    select 1 from public.cataloging_requests r
    join public.student_profiles s on s.id=r.student_profile_id
    where r.id=request_id and s.profile_id=auth.uid() and public.current_user_role()='student'
  ));
create policy "repository_publications_staff_read" on public.repository_publications
  for select to authenticated using (public.current_user_role() in ('cataloger','administrator'));

revoke all on public.repository_publications from anon, authenticated;
revoke all on public.coordination_magic_links from anon, authenticated;
grant select on public.repository_publications to authenticated;

create or replace function public.add_business_days(start_at timestamptz, business_days integer)
returns timestamptz language plpgsql immutable set search_path='' as $$
declare result timestamptz:=start_at; remaining integer:=greatest(business_days,0);
begin
  while remaining>0 loop
    result:=result+interval '1 day';
    if extract(isodow from result)<6 then remaining:=remaining-1; end if;
  end loop;
  return result;
end $$;

create or replace function public.request_timeline(target_request_id uuid)
returns table(event_key text, label text, occurred_at timestamptz)
language sql security definer set search_path='' stable as $$
  with authorized as (
    select r.id from public.cataloging_requests r
    join public.student_profiles s on s.id=r.student_profile_id
    where r.id=target_request_id and (
      (public.current_user_role()='student' and s.profile_id=auth.uid()) or
      public.current_user_role() in ('cataloger','administrator')
    )
  ), events as (
    select 'request_submitted'::text event_key, 'Solicitação aberta'::text label, r.submitted_at occurred_at from public.cataloging_requests r join authorized a on a.id=r.id
    union all select 'service_started','Atendimento iniciado',r.assigned_at from public.cataloging_requests r join authorized a on a.id=r.id where r.assigned_at is not null
    union all select 'changes_requested_'||rr.round_number,'Correções solicitadas — rodada '||rr.round_number,rr.returned_at from public.request_revision_rounds rr join authorized a on a.id=rr.request_id
    union all select 'corrections_sent_'||rr.round_number,'Correções reenviadas — rodada '||rr.round_number,rr.responded_at from public.request_revision_rounds rr join authorized a on a.id=rr.request_id where rr.responded_at is not null
    union all select 'card_homologated','Ficha catalográfica homologada',h.homologated_at from public.cataloging_card_homologations h join authorized a on a.id=h.request_id
    union all select 'nada_uploaded','Nada Consta enviado',n.uploaded_at from public.nada_consta_documents n join authorized a on a.id=n.request_id
    union all select 'nada_approved','Nada Consta validado',n.validated_at from public.nada_consta_documents n join authorized a on a.id=n.request_id where n.status in ('approved','purged') and n.validated_at is not null
    union all select 'repository_started','Autodepósito no RI/UFBA iniciado',p.started_at from public.repository_deposit_progress p join authorized a on a.id=p.request_id
    union all select 'repository_verified','Publicação no RI/UFBA verificada',p.verified_at from public.repository_publications p join authorized a on a.id=p.request_id
    union all select 'request_completed','Protocolo encerrado',r.updated_at from public.cataloging_requests r join authorized a on a.id=r.id where r.status='completed'
  ) select * from events order by occurred_at, event_key
$$;

create or replace function public.issue_coordination_magic_link(target_request_id uuid)
returns text language plpgsql security definer set search_path='' as $$
declare raw_token text; contact_id uuid; actor_role public.user_role;
begin
  actor_role:=public.current_user_role();
  if actor_role not in ('cataloger','administrator') then raise exception 'active_staff_required'; end if;
  select c.id into contact_id
  from public.cataloging_requests r
  join public.academic_enrollments e on e.id=r.academic_enrollment_id
  join public.academic_programs p on p.id=e.academic_program_id
  join public.coordination_contacts c on c.academic_program_id=p.id and c.active
  where r.id=target_request_id and r.status<>'completed' and p.active and p.coordination_magic_link_enabled
    and (actor_role='administrator' or r.assigned_to=auth.uid())
  order by c.created_at desc limit 1;
  if contact_id is null then raise exception 'coordination_access_not_available'; end if;
  update public.coordination_magic_links set invalidated_at=now()
    where request_id=target_request_id and invalidated_at is null;
  raw_token:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
  insert into public.coordination_magic_links(request_id,coordination_contact_id,token_hash,issued_by)
    values(target_request_id,contact_id,encode(extensions.digest(raw_token,'sha256'),'hex'),auth.uid());
  insert into public.audit_logs(actor_id,action,entity_type,entity_id)
    values(auth.uid(),'coordination_magic_link_issued','cataloging_request',target_request_id::text);
  return raw_token;
end $$;

create or replace function public.coordination_request_snapshot(access_token text)
returns jsonb language plpgsql security definer set search_path='' stable as $$
declare result jsonb;
begin
  if access_token is null or length(access_token)<>64 then return null; end if;
  select jsonb_build_object(
    'protocol',r.protocol,'title',r.title,'student_name',pr.full_name,
    'program_name',ap.name,'level',ap.level,'status',r.status,
    'submitted_at',r.submitted_at,
    'sla_business_days',ap.service_level_business_days,
    'sla_due_at',public.add_business_days(r.submitted_at,ap.service_level_business_days),
    'timeline',coalesce((select jsonb_agg(jsonb_build_object('key',x.event_key,'label',x.label,'occurred_at',x.occurred_at) order by x.occurred_at) from (
      select 'request_submitted'::text event_key,'Solicitação aberta'::text label,r.submitted_at occurred_at
      union all select 'service_started','Atendimento iniciado',r.assigned_at where r.assigned_at is not null
      union all select 'changes_requested_'||rr.round_number,'Correções solicitadas — rodada '||rr.round_number,rr.returned_at from public.request_revision_rounds rr where rr.request_id=r.id
      union all select 'corrections_sent_'||rr.round_number,'Correções reenviadas — rodada '||rr.round_number,rr.responded_at from public.request_revision_rounds rr where rr.request_id=r.id and rr.responded_at is not null
      union all select 'card_homologated','Ficha catalográfica homologada',h.homologated_at from public.cataloging_card_homologations h where h.request_id=r.id
      union all select 'nada_approved','Nada Consta validado',n.validated_at from public.nada_consta_documents n where n.request_id=r.id and n.status in ('approved','purged') and n.validated_at is not null
      union all select 'repository_started','Autodepósito no RI/UFBA iniciado',p.started_at from public.repository_deposit_progress p where p.request_id=r.id
      union all select 'repository_verified','Publicação no RI/UFBA verificada',p.verified_at from public.repository_publications p where p.request_id=r.id
      union all select 'request_completed','Protocolo encerrado',r.updated_at where r.status='completed'
    ) x),'[]'::jsonb)
  ) into result
  from public.coordination_magic_links ml
  join public.cataloging_requests r on r.id=ml.request_id
  join public.student_profiles sp on sp.id=r.student_profile_id
  join public.profiles pr on pr.id=sp.profile_id
  join public.academic_enrollments ae on ae.id=r.academic_enrollment_id
  join public.academic_programs ap on ap.id=ae.academic_program_id
  where ml.token_hash=encode(extensions.digest(access_token,'sha256'),'hex')
    and ml.invalidated_at is null;
  return result;
end $$;

create or replace function public.close_cataloging_request(target_request_id uuid, permanent_url text)
returns timestamptz language plpgsql security definer set search_path='' as $$
declare actor_role public.user_role; closed_at timestamptz:=now(); student_email text; student_name text; protocol_value text; title_value text; contact record;
begin
  actor_role:=public.current_user_role();
  if actor_role not in ('cataloger','administrator') then raise exception 'active_staff_required'; end if;
  if permanent_url is null or permanent_url !~ '^https://[^[:space:]]+$' then raise exception 'invalid_permanent_url'; end if;
  select pr.email,pr.full_name,r.protocol,r.title into student_email,student_name,protocol_value,title_value
  from public.cataloging_requests r join public.student_profiles sp on sp.id=r.student_profile_id join public.profiles pr on pr.id=sp.profile_id
  where r.id=target_request_id and r.status='approved' and (actor_role='administrator' or r.assigned_to=auth.uid())
    and exists(select 1 from public.cataloging_card_homologations h where h.request_id=r.id)
    and exists(select 1 from public.nada_consta_documents n where n.request_id=r.id and n.status='approved')
    and exists(select 1 from public.repository_deposit_progress d where d.request_id=r.id)
  for update;
  if protocol_value is null then raise exception 'request_not_ready_for_closure'; end if;
  insert into public.repository_publications(request_id,permanent_url,verified_by,verified_at)
    values(target_request_id,permanent_url,auth.uid(),closed_at);
  update public.cataloging_requests set status='completed',updated_at=closed_at where id=target_request_id;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
    values(auth.uid(),'repository_publication_verified','cataloging_request',target_request_id::text,jsonb_build_object('permanent_url',permanent_url)),
          (auth.uid(),'cataloging_request_completed','cataloging_request',target_request_id::text,jsonb_build_object('permanent_url',permanent_url));
  insert into public.email_outbox(request_id,event_type,idempotency_key,recipient,subject,text_body)
    values(target_request_id,'request_completed','request_completed:student:'||target_request_id,student_email,
      'Protocolo '||protocol_value||' encerrado',
      'Olá, '||student_name||'. Seu protocolo '||protocol_value||' foi encerrado após a verificação da publicação no RI/UFBA. Endereço permanente: '||permanent_url||'.');
  for contact in
    select c.id,c.email,c.name from public.coordination_contacts c
    join public.academic_enrollments ae on ae.academic_program_id=c.academic_program_id
    join public.cataloging_requests r on r.academic_enrollment_id=ae.id
    where r.id=target_request_id and c.active and c.receives_completion_emails
  loop
    insert into public.email_outbox(request_id,event_type,idempotency_key,recipient,subject,text_body)
      values(target_request_id,'request_completed_coordination','request_completed:coordination:'||target_request_id||':'||contact.id,contact.email,
        'Protocolo '||protocol_value||' concluído',
        'Olá, '||contact.name||'. O protocolo '||protocol_value||' ('||title_value||') foi encerrado. Publicação no RI/UFBA: '||permanent_url||'.')
      on conflict(idempotency_key) do nothing;
  end loop;
  return closed_at;
end $$;

create or replace function public.invalidate_coordination_access_after_final_email()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.status='delivered' and old.status is distinct from 'delivered'
    and new.event_type in ('request_completed','request_completed_coordination')
    and not exists(select 1 from public.email_outbox e where e.request_id=new.request_id and e.event_type in ('request_completed','request_completed_coordination') and e.status<>'delivered') then
    update public.coordination_magic_links set invalidated_at=now(),final_communicated_at=now() where request_id=new.request_id and invalidated_at is null;
    insert into public.audit_logs(action,entity_type,entity_id) values('coordination_magic_link_invalidated','cataloging_request',new.request_id::text);
  end if;
  return new;
end $$;
create trigger email_outbox_invalidate_coordination_access after update of status on public.email_outbox
for each row execute function public.invalidate_coordination_access_after_final_email();

create or replace function public.configure_program_coordination(target_program_id uuid, enabled boolean, contact_name text, contact_email text)
returns void language plpgsql security definer set search_path='' as $$
begin
  if public.current_user_role() is distinct from 'administrator' then raise exception 'active_administrator_required'; end if;
  if enabled and (length(trim(coalesce(contact_name,'')))<2 or trim(coalesce(contact_email,'')) !~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$') then raise exception 'valid_coordination_contact_required'; end if;
  update public.academic_programs set coordination_magic_link_enabled=enabled,updated_at=now() where id=target_program_id;
  if not found then raise exception 'academic_program_not_found'; end if;
  update public.coordination_contacts set active=false,updated_at=now() where academic_program_id=target_program_id and active;
  if enabled then insert into public.coordination_contacts(academic_program_id,name,email) values(target_program_id,trim(contact_name),lower(trim(contact_email))); end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'coordination_configuration_changed','academic_program',target_program_id::text,jsonb_build_object('enabled',enabled));
end $$;

revoke all on function public.request_timeline(uuid) from public,anon,authenticated;
revoke all on function public.issue_coordination_magic_link(uuid) from public,anon,authenticated;
revoke all on function public.coordination_request_snapshot(text) from public,anon,authenticated;
revoke all on function public.close_cataloging_request(uuid,text) from public,anon,authenticated;
revoke all on function public.configure_program_coordination(uuid,boolean,text,text) from public,anon,authenticated;
grant execute on function public.request_timeline(uuid) to authenticated;
grant execute on function public.issue_coordination_magic_link(uuid) to authenticated;
grant execute on function public.coordination_request_snapshot(text) to anon,authenticated;
grant execute on function public.close_cataloging_request(uuid,text) to authenticated;
grant execute on function public.configure_program_coordination(uuid,boolean,text,text) to authenticated;
