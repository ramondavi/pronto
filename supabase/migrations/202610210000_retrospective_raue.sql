-- Acesso administrativo provisório para o acervo retrospectivo da RAU+E.
create table public.retrospective_accounts (
  profile_id uuid primary key references public.profiles(id) on delete restrict,
  granted_by uuid not null references public.profiles(id),
  granted_at timestamptz not null default now(),
  ended_at timestamptz,
  ended_by uuid references public.profiles(id),
  check ((ended_at is null) = (ended_by is null))
);
alter table public.retrospective_accounts enable row level security;
create policy retrospective_accounts_read on public.retrospective_accounts for select to authenticated
 using (public.is_active_user() and (profile_id = auth.uid() or public.current_user_role() = 'administrator'));
revoke all on public.retrospective_accounts from anon, authenticated;
grant select on public.retrospective_accounts to authenticated;

create function public.has_retrospective_access() returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.retrospective_accounts a join public.profiles p on p.id=a.profile_id
 where a.profile_id=auth.uid() and a.ended_at is null and p.status='active' and p.role='student');
$$;
revoke all on function public.has_retrospective_access() from public, anon, authenticated;
grant execute on function public.has_retrospective_access() to authenticated;

-- A representante não precisa fornecer CPF ou nascimento de estudante.
alter table public.student_profiles alter column cpf drop not null;
create function public.check_student_identity_or_representation() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.cpf is null and not exists(select 1 from public.retrospective_accounts where profile_id=new.profile_id)
 then raise exception 'student_cpf_required'; end if;
 return new;
end $$;
create trigger check_student_identity_or_representation before insert or update on public.student_profiles
 for each row execute function public.check_student_identity_or_representation();

create function public.grant_retrospective_access(target_email text, display_name text) returns uuid
language plpgsql security definer set search_path='' as $$
declare target_id uuid; saved_role public.user_role;
begin
 if public.current_user_role() is distinct from 'administrator' then raise exception 'active_administrator_required'; end if;
 if lower(btrim(target_email)) !~ '^[^@[:space:]]+@ufba[.]br$' or char_length(btrim(display_name)) not between 3 and 300
 then raise exception 'institutional_account_required'; end if;
 select id into target_id from auth.users where lower(email)=lower(btrim(target_email)) and email_confirmed_at is not null for update;
 if target_id is null then raise exception 'confirmed_account_required'; end if;
 select role into saved_role from public.profiles where id=target_id;
 if saved_role is not null and saved_role <> 'student' then raise exception 'student_role_required'; end if;
 if exists(select 1 from public.profiles where id=target_id and status <> 'active') then raise exception 'active_account_required'; end if;
 if exists(select 1 from public.cataloging_requests r join public.student_profiles s on s.id=r.student_profile_id where s.profile_id=target_id)
 then raise exception 'dedicated_account_required'; end if;
 insert into public.profiles(id,full_name,email,role,status) values(target_id,btrim(display_name),lower(btrim(target_email)),'student','active') on conflict(id) do nothing;
 insert into public.retrospective_accounts(profile_id,granted_by) values(target_id,auth.uid());
 insert into public.student_profiles(profile_id,cpf) values(target_id,null) on conflict(profile_id) do nothing;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
 values(auth.uid(),'retrospective_access_granted','profile',target_id::text,'{}');
 return target_id;
end $$;

create function public.end_retrospective_access(target_profile_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if public.current_user_role() is distinct from 'administrator' then raise exception 'active_administrator_required'; end if;
 perform 1 from public.retrospective_accounts where profile_id=target_profile_id and ended_at is null for update;
 if not found then raise exception 'retrospective_access_required'; end if;
 if not exists(select 1 from public.cataloging_requests r join public.student_profiles s on s.id=r.student_profile_id where s.profile_id=target_profile_id and r.status='completed')
 or exists(select 1 from public.cataloging_requests r join public.student_profiles s on s.id=r.student_profile_id where s.profile_id=target_profile_id and r.status not in ('completed','canceled'))
 then raise exception 'retrospective_batch_not_finished'; end if;
 update public.retrospective_accounts set ended_at=now(),ended_by=auth.uid() where profile_id=target_profile_id;
 update public.profiles set status='inactive',updated_at=now() where id=target_profile_id;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
 values(auth.uid(),'retrospective_access_ended','profile',target_profile_id::text,'{}');
end $$;
revoke all on function public.grant_retrospective_access(text,text), public.end_retrospective_access(uuid) from public,anon,authenticated;
grant execute on function public.grant_retrospective_access(text,text), public.end_retrospective_access(uuid) to authenticated;

alter table public.cataloging_requests add column retrospective boolean not null default false;
drop index public.cataloging_requests_one_active_per_student;
create unique index cataloging_requests_one_active_per_student on public.cataloging_requests(student_profile_id)
 where not retrospective and status in ('submitted','in_review','changes_requested','approved');

create function public.guard_retrospective_request() returns trigger
language plpgsql security definer set search_path='' as $$
declare represented boolean;
begin
 if tg_op='INSERT' then
   select exists(select 1 from public.retrospective_accounts a join public.profiles p on p.id=a.profile_id
    join public.student_profiles s on s.profile_id=p.id where s.id=new.student_profile_id and a.ended_at is null and p.status='active' and p.role='student') into represented;
   new.retrospective:=represented;
 elsif new.retrospective is distinct from old.retrospective or new.student_profile_id is distinct from old.student_profile_id then
   raise exception 'request_representation_immutable';
 end if;
 if new.retrospective and not exists(select 1 from public.academic_enrollments e join public.academic_programs p on p.id=e.academic_program_id
 where e.id=new.academic_enrollment_id and p.code='athdc-specialization') then raise exception 'retrospective_raue_only'; end if;
 return new;
end $$;
create trigger guard_retrospective_request before insert or update on public.cataloging_requests
 for each row execute function public.guard_retrospective_request();

create table public.retrospective_deposit_reports (
 request_id uuid primary key references public.cataloging_requests(id) on delete restrict,
 permanent_url text not null check (permanent_url ~ '^https://repositorio[.]ufba[.]br/(handle/|jspui/handle/|items/)[^[:space:]?#]+$'),
 reported_by uuid not null references public.profiles(id),
 reported_at timestamptz not null default now()
);
alter table public.retrospective_deposit_reports enable row level security;
create policy retrospective_deposit_reports_read on public.retrospective_deposit_reports for select to authenticated
 using (public.is_active_user() and exists(select 1 from public.cataloging_requests r where r.id=request_id));
revoke all on public.retrospective_deposit_reports from anon,authenticated;
grant select on public.retrospective_deposit_reports to authenticated;
create function public.report_retrospective_deposit(target_request_id uuid, permanent_url text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.has_retrospective_access() then raise exception 'retrospective_access_required'; end if;
 perform 1 from public.retrospective_accounts where profile_id=auth.uid() and ended_at is null for update;
 if not found then raise exception 'retrospective_access_required'; end if;
 perform 1 from public.cataloging_requests r join public.student_profiles s on s.id=r.student_profile_id
 where r.id=target_request_id and s.profile_id=auth.uid() and r.retrospective and r.status='approved'
 and exists(select 1 from public.cataloging_card_homologations h where h.request_id=r.id) for update of r;
 if not found then raise exception 'released_retrospective_request_required'; end if;
 if permanent_url is null or permanent_url !~ '^https://repositorio[.]ufba[.]br/(handle/|jspui/handle/|items/)[^[:space:]?#]+$' then raise exception 'ri_ufba_url_required'; end if;
 perform public.start_repository_deposit(target_request_id);
 insert into public.retrospective_deposit_reports(request_id,permanent_url,reported_by) values(target_request_id,permanent_url,auth.uid())
 on conflict(request_id) do update set permanent_url=excluded.permanent_url,reported_at=now(),reported_by=auth.uid();
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
 values(auth.uid(),'retrospective_deposit_reported','cataloging_request',target_request_id::text,'{}');
end $$;
revoke all on function public.report_retrospective_deposit(uuid,text) from public,anon,authenticated;
grant execute on function public.report_retrospective_deposit(uuid,text) to authenticated;

create policy retrospective_card_released_read on public.cataloging_card_homologations for select to authenticated
 using (public.has_retrospective_access() and exists(select 1 from public.cataloging_requests r join public.student_profiles s on s.id=r.student_profile_id
 where r.id=request_id and s.profile_id=auth.uid() and r.retrospective and r.status in ('approved','completed')));

create or replace function public.open_student_request(payload jsonb)
returns table (request_id uuid, generated_protocol text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  student_id uuid;
  enrollment_id uuid;
  request_uuid uuid;
  program_id uuid;
  protocol_year integer := extract(year from current_date)::integer;
  protocol_number integer;
  protocol_value text;
  keyword_value text;
  keyword_position integer;
  special_case text;
begin
  perform 1 from public.retrospective_accounts where profile_id=auth.uid() for update;
  perform 1 from public.profiles where id=auth.uid() and status='active' and role='student' for update;
  if not found then raise exception 'active_student_required'; end if;
  if public.current_user_role() is distinct from 'student'::public.user_role then
    raise exception 'active_student_required';
  end if;

  select id into student_id from public.student_profiles where profile_id = auth.uid();
  if public.has_retrospective_access() then
    perform 1 from public.retrospective_accounts where profile_id=auth.uid() and ended_at is null for update;
    if not found then raise exception 'retrospective_access_required'; end if;
  end if;
  program_id := nullif(payload ->> 'academicProgramId', '')::uuid;
  if not exists (select 1 from public.academic_programs where id = program_id and active) then
    raise exception 'active_academic_program_required';
  end if;
  if not public.has_retrospective_access() and exists (select 1 from public.cataloging_requests where student_profile_id = student_id
    and status in ('submitted', 'in_review', 'changes_requested', 'approved')) then
    raise exception 'active_request_already_exists';
  end if;
  if public.has_retrospective_access() and not exists(select 1 from public.academic_programs where id=program_id and code='athdc-specialization') then raise exception 'retrospective_raue_only'; end if;
  if coalesce(payload ->> 'registrationNumber', '') !~ '^[[:alnum:]./-]{3,30}$' then
    raise exception 'valid_registration_required';
  end if;
  if char_length(btrim(coalesce(payload ->> 'title', ''))) not between 3 and 500 then
    raise exception 'valid_title_required';
  end if;
  if coalesce(payload ->> 'publicWorkUrl', '') !~ '^https://[^[:space:]]+$' then
    raise exception 'public_https_url_required';
  end if;
  if coalesce((payload ->> 'defendedAndApproved')::boolean, false) is not true
    or coalesce((payload ->> 'finalFileConfirmed')::boolean, false) is not true
    or coalesce((payload ->> 'approvalPageConfirmed')::boolean, false) is not true then
    raise exception 'required_declarations_missing';
  end if;
  if char_length(btrim(coalesce(payload #>> '{people,author}', ''))) < 3
    or char_length(btrim(coalesce(payload #>> '{people,advisor}', ''))) < 3 then
    raise exception 'author_and_advisor_required';
  end if;
  if jsonb_array_length(coalesce(payload -> 'keywordsPt', '[]'::jsonb)) = 0 then
    raise exception 'portuguese_keyword_required';
  end if;
  for special_case in select jsonb_array_elements_text(coalesce(payload -> 'specialCases', '[]'::jsonb)) loop
    if special_case not in ('coadvisor', 'cotutelle', 'double_degree', 'multiple_volumes') then
      raise exception 'invalid_special_case';
    end if;
  end loop;

  insert into public.academic_enrollments (student_profile_id, academic_program_id, registration_number)
  values (student_id, program_id, btrim(payload ->> 'registrationNumber'))
  on conflict (student_profile_id, academic_program_id, registration_number)
  do update set updated_at = now()
  returning id into enrollment_id;

  insert into public.protocol_counters (year, last_number) values (protocol_year, 1)
  on conflict (year) do update set last_number = public.protocol_counters.last_number + 1
  returning last_number into protocol_number;
  if protocol_number > 9999 then raise exception 'annual_protocol_limit_reached'; end if;
  protocol_value := 'FC' || protocol_year::text || '-' || lpad(protocol_number::text, 4, '0');

  insert into public.cataloging_requests (
    student_profile_id, academic_enrollment_id, protocol, title, subtitle,
    equivalent_title, other_titles, public_work_url, special_cases, volume_information,
    library_note, defended_and_approved, final_file_confirmed, approval_page_confirmed
  ) values (
    student_id, enrollment_id, protocol_value, btrim(payload ->> 'title'),
    nullif(btrim(payload ->> 'subtitle'), ''), nullif(btrim(payload ->> 'equivalentTitle'), ''),
    coalesce(payload -> 'otherTitles', '[]'::jsonb), payload ->> 'publicWorkUrl',
    coalesce(payload -> 'specialCases', '[]'::jsonb), nullif(btrim(payload ->> 'volumeInformation'), ''),
    nullif(btrim(payload ->> 'libraryNote'), ''), true, true, true
  ) returning id into request_uuid;

  insert into public.request_people (request_id, role, transcribed_name, position)
  values (request_uuid, 'author', btrim(payload #>> '{people,author}'), 0),
         (request_uuid, 'advisor', btrim(payload #>> '{people,advisor}'), 0);
  if char_length(btrim(coalesce(payload #>> '{people,coadvisor}', ''))) >= 3 then
    insert into public.request_people (request_id, role, transcribed_name, position)
    values (request_uuid, 'coadvisor', btrim(payload #>> '{people,coadvisor}'), 0);
  end if;

  keyword_position := 0;
  for keyword_value in select btrim(value) from jsonb_array_elements_text(coalesce(payload -> 'keywordsPt', '[]'::jsonb)) loop
    if char_length(keyword_value) not between 2 and 100 then raise exception 'invalid_keyword'; end if;
    insert into public.request_keywords (request_id, language, term, position)
    values (request_uuid, 'pt', keyword_value, keyword_position);
    keyword_position := keyword_position + 1;
  end loop;
  keyword_position := 0;
  for keyword_value in select btrim(value) from jsonb_array_elements_text(coalesce(payload -> 'keywordsEn', '[]'::jsonb)) loop
    if char_length(keyword_value) not between 2 and 100 then raise exception 'invalid_keyword'; end if;
    insert into public.request_keywords (request_id, language, term, position)
    values (request_uuid, 'en', keyword_value, keyword_position);
    keyword_position := keyword_position + 1;
  end loop;

  return query select request_uuid, protocol_value;
end;
$$;


-- Qualifica colunas que conflitam com o parâmetro de saída request_id.
create or replace function public.open_student_request_v3(payload jsonb)
returns table (request_id uuid, generated_protocol text) language plpgsql security definer set search_path = '' as $$
declare
  created_request_id uuid;
  created_protocol text;
  saved_birth_date date;
  use_birth_year boolean := coalesce((payload #>> '{people,birthYearAcknowledged}')::boolean, false);
  safe_payload jsonb := jsonb_set(jsonb_set(payload, '{people,birthYear}', 'null'::jsonb, true), '{people,birthYearAcknowledged}', 'false'::jsonb, true);
begin
  if public.has_retrospective_access() and use_birth_year then raise exception 'representative_is_not_author'; end if;
  select sp.birth_date into saved_birth_date from public.student_profiles sp
    join public.profiles p on p.id = sp.profile_id
    where sp.profile_id = auth.uid() and p.role = 'student' and p.status = 'active';
  if saved_birth_date is null and not public.has_retrospective_access() then raise exception 'student_birth_date_required'; end if;
  select opened.request_id, opened.generated_protocol into created_request_id, created_protocol from public.open_student_request_v2(safe_payload) opened;
  if use_birth_year then
    update public.request_people rp set birth_year = extract(year from saved_birth_date)::integer, birth_year_acknowledged_at = now()
      where rp.request_id = created_request_id and role = 'author';
  end if;
  return query select created_request_id, created_protocol;
end;
$$;


create or replace function public.start_repository_deposit(target_request_id uuid)
returns timestamptz language plpgsql security definer set search_path='' as $$
declare student_profile uuid; started_value timestamptz;
begin
  if public.current_user_role() is distinct from 'student' then raise exception 'active_student_required'; end if;
  select s.id into student_profile from public.student_profiles s where s.profile_id=auth.uid();
  if student_profile is null then raise exception 'active_student_required'; end if;
  if not exists (
    select 1 from public.cataloging_requests r
    join public.academic_enrollments e on e.id=r.academic_enrollment_id
    join public.academic_programs p on p.id=e.academic_program_id
    where r.id=target_request_id and r.student_profile_id=student_profile and r.status='approved'
      and p.active and p.repository_deposit_enabled
      and exists (select 1 from public.cataloging_card_homologations h where h.request_id=r.id)
      and (r.retrospective or exists (select 1 from public.nada_consta_documents n where n.request_id=r.id and n.status='approved'))
  ) then raise exception 'repository_deposit_not_available'; end if;
  insert into public.repository_deposit_progress(request_id,started_by)
  values(target_request_id,auth.uid()) on conflict(request_id) do update set updated_at=now()
  returning started_at into started_value;
  if not exists (select 1 from public.audit_logs where action='repository_deposit_started' and entity_id=target_request_id::text) then
    insert into public.audit_logs(actor_id,action,entity_type,entity_id)
    values(auth.uid(),'repository_deposit_started','cataloging_request',target_request_id::text);
  end if;
  return started_value;
end $$;


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
    'Olá, '||student_name||'.'||E'\n\nSeu protocolo foi encerrado após a verificação da publicação do trabalho no Repositório Institucional da UFBA.'||E'\n\nEndereço permanente da publicação: '||permanent_url||E'\n\nGuarde este endereço para consulta e divulgação do seu trabalho.'||case when exists(select 1 from public.cataloging_requests where id=target_request_id and retrospective) then E'\n\nSolicitação retrospectiva da RAU+E com dispensa de Nada Consta.' else E'\n\nO arquivo Nada Consta enviado ao Pronto! será mantido somente pelo período operacional previsto e depois removido. O registro acadêmico pertinente permanece nos sistemas institucionais aplicáveis.' end);
  for contact in select c.id,c.email,c.name from public.coordination_contacts c join public.academic_enrollments ae on ae.academic_program_id=c.academic_program_id join public.cataloging_requests r on r.academic_enrollment_id=ae.id where r.id=target_request_id and c.active and c.receives_completion_emails loop
    insert into public.email_outbox(request_id,event_type,idempotency_key,recipient,subject,text_body) values(target_request_id,'request_completed_coordination','request_completed:coordination:'||target_request_id||':'||contact.id,contact.email,
      'Pronto! | Protocolo n.º '||protocol_value||' concluído',
      'Olá, '||contact.name||'.'||E'\n\nO atendimento da solicitação abaixo foi concluído. Isso significa que o trabalho do(a) estudante teve sua ficha catalográfica feita pela Biblioteca e já se encontra disponível no Repositório Institucional da UFBA.'||E'\n\nTrabalho: '||title_value||E'\nSolicitante: '||student_name||E'\nProtocolo: '||protocol_value||E'\nPublicação no RI/UFBA: '||permanent_url||E'\n\nA página de acompanhamento desta solicitação foi fechada juntamente com o protocolo de atendimento. O Magic Link enviado anteriormente não é mais válido.') on conflict(idempotency_key) do nothing;
  end loop;
  return closed_at;
end $$;


create or replace function public.open_student_request_v12(payload jsonb)
returns table (request_id uuid, generated_protocol text)
language plpgsql security definer set search_path = '' as $$
declare
  deposit_text text := payload ->> 'depositDate';
  defense_text text := payload ->> 'defenseDate';
  deposit_value date;
  defense_value date;
  safe_payload jsonb;
  created_id uuid;
  created_protocol text;
begin
  if public.has_retrospective_access() and coalesce((payload #>> '{people,birthYearAcknowledged}')::boolean,false) then raise exception 'representative_is_not_author'; end if;
  if deposit_text is null or defense_text is null
    or deposit_text !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
    or defense_text !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    raise exception 'valid_cataloging_dates_required';
  end if;
  begin
    deposit_value := deposit_text::date;
    defense_value := defense_text::date;
  exception when datetime_field_overflow or invalid_datetime_format then
    raise exception 'valid_cataloging_dates_required';
  end;
  if extract(year from deposit_value) < 1900 or defense_value > deposit_value
    or extract(year from defense_value) < 1900 then
    raise exception 'valid_cataloging_dates_required';
  end if;

  safe_payload := jsonb_set(payload, '{depositYear}', to_jsonb(extract(year from deposit_value)::integer), true);
  safe_payload := jsonb_set(safe_payload, '{defenseYear}', to_jsonb(extract(year from defense_value)::integer), true);
  select opened.request_id, opened.generated_protocol into created_id, created_protocol
    from public.open_student_request_v11(safe_payload) opened;
  update public.request_card_details
    set deposit_date = deposit_value, defense_date = defense_value
    where request_card_details.request_id = created_id;
  return query select created_id, created_protocol;
end;
$$;

revoke all on function public.open_student_request_v11(jsonb), public.open_student_request_v12(jsonb) from public, anon, authenticated;
grant execute on function public.open_student_request_v12(jsonb) to authenticated;


create function public.guard_retrospective_enrollment() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.cataloging_requests where academic_enrollment_id=new.id and retrospective)
 and (new.student_profile_id is distinct from old.student_profile_id or not exists(select 1 from public.academic_programs where id=new.academic_program_id and code='athdc-specialization'))
 then raise exception 'retrospective_raue_only'; end if;
 return new;
end $$;
create trigger guard_retrospective_enrollment before update on public.academic_enrollments
 for each row execute function public.guard_retrospective_enrollment();

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
    'Pronto! | Ficha retrospectiva liberada',
    'Olá, '||student_name||'. A ficha do protocolo '||protocol_value||' foi homologada. Este pedido retrospectivo da RAU+E tem dispensa de Nada Consta. Acesse o Pronto! para baixar a ficha e, após o depósito, informar a URL permanente do RI/UFBA para conferência pela biblioteca.') on conflict(idempotency_key) do nothing;
    return;
  end if;
  insert into public.email_outbox (request_id, event_type, idempotency_key, recipient, subject, text_body) values (target_request_id, 'request_released', 'request_released:' || target_request_id::text, recipient_email,
    'Pronto! | Sua ficha catalográfica está liberada!',
    'Olá, ' || student_name || '.' || E'\n\nSua ficha catalográfica foi homologada e o Nada Consta que você forneceu foi validado. A ficha já está disponível no Pronto!.' || E'\n\nAcesse sua solicitação para gerar o PDF completo do trabalho com a ficha catalográfica já inserida (opção recomendada), baixar a ficha catalográfica a parte e consultar as orientações para o autodepósito no RI/UFBA, quando aplicável.' || E'\n\nAtenção! Antes de gerar o arquivo final do seu trabalho contendo a ficha, confira se o PDF selecionado por você no seu dispositivo é o mesmo trabalho final completo que foi analisado pela Biblioteca.') on conflict (idempotency_key) do nothing;
end;
$$;


create or replace function public.release_when_card_and_document_are_ready()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status='approved' and exists(select 1 from public.cataloging_card_homologations where request_id=new.id)
 and (new.retrospective or exists(select 1 from public.nada_consta_documents where request_id=new.id and status='approved'))
 then perform public.queue_request_release_notice(new.id); end if;
 return new;
end $$;
