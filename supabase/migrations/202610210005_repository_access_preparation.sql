create table public.repository_access_preparations (
 request_id uuid primary key references public.cataloging_requests(id) on delete restrict,
 state jsonb not null default '{}'::jsonb check(jsonb_typeof(state)='object'),
 destination jsonb not null,
 revision integer not null default 1 check(revision>0),
 updated_at timestamptz not null default now()
);
alter table public.repository_access_preparations enable row level security;
revoke all on public.repository_access_preparations from public,anon,authenticated;
grant select on public.repository_access_preparations to authenticated;
create policy repository_access_preparations_own on public.repository_access_preparations for select to authenticated
 using(public.current_user_role()='student' and exists(select 1 from public.cataloging_requests r join public.student_profiles s on s.id=r.student_profile_id where r.id=request_id and s.profile_id=auth.uid()));

create function public.repository_preparation_destination(target_request_id uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_array(p.code,p.repository_collection_label,p.repository_document_type_label)
 from public.cataloging_requests r join public.student_profiles s on s.id=r.student_profile_id
 join public.academic_enrollments ae on ae.id=r.academic_enrollment_id join public.academic_programs p on p.id=ae.academic_program_id
 where r.id=target_request_id and s.profile_id=auth.uid() and public.current_user_role()='student' and p.active
 and (p.repository_deposit_enabled or r.retrospective)
 and exists(select 1 from public.cataloging_card_homologations h where h.request_id=r.id)
 and ((r.status='approved' and (r.retrospective or exists(select 1 from public.nada_consta_documents n where n.request_id=r.id and n.status='approved'))) or public.can_access_completed_repository_guide(r.id));
$$;
revoke all on function public.repository_preparation_destination(uuid) from public,anon,authenticated;

create function public.load_repository_access_preparation(target_request_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare current_destination jsonb; saved record;
begin
 current_destination:=public.repository_preparation_destination(target_request_id);
 if current_destination is null then raise exception 'repository_deposit_not_available'; end if;
 select * into saved from public.repository_access_preparations where request_id=target_request_id;
 if not found then return jsonb_build_object('state','{}'::jsonb,'revision',0,'destination_current',true,'destination',current_destination); end if;
 return jsonb_build_object('state',saved.state,'revision',saved.revision,'destination_current',saved.destination=current_destination,'destination',current_destination);
end $$;

create function public.save_repository_access_preparation(target_request_id uuid, preparation_state jsonb, expected_revision integer, expected_destination jsonb) returns integer
language plpgsql security definer set search_path='' as $$
declare current_destination jsonb; next_revision integer;
begin
 current_destination:=public.repository_preparation_destination(target_request_id);
 if current_destination is null then raise exception 'repository_deposit_not_available'; end if;
 if expected_destination is distinct from current_destination then raise exception 'repository_destination_changed'; end if;
 if preparation_state is null or jsonb_typeof(preparation_state)<>'object' or octet_length(preparation_state::text)>6000 or expected_revision is null or expected_revision<0 then raise exception 'invalid_preparation'; end if;
 if coalesce(preparation_state->>'route','') not in ('','ready','account','none','wrong')
 or coalesce(preparation_state->>'account','') not in ('','has','create','confirmed')
 or coalesce(preparation_state->>'request','') not in ('','sent','compose','correction')
 or coalesce(preparation_state->>'release','') not in ('','granted','waiting','wrong')
 or coalesce(preparation_state->>'final','') not in ('','confirmed','waiting')
 or coalesce(preparation_state->>'requestPhase','choice') not in ('choice','compose','verify')
 or coalesce(preparation_state->>'emailChoice','') not in ('','same','other')
 or char_length(coalesce(preparation_state->>'otherEmail',''))>254
 or jsonb_typeof(preparation_state->'requestSent') is distinct from 'boolean'
 then raise exception 'invalid_preparation'; end if;
 if expected_revision=0 then
  insert into public.repository_access_preparations(request_id,state,destination) values(target_request_id,preparation_state,current_destination)
  on conflict(request_id) do nothing returning revision into next_revision;
 else
  update public.repository_access_preparations set state=preparation_state,destination=current_destination,revision=revision+1,updated_at=now()
   where request_id=target_request_id and revision=expected_revision returning revision into next_revision;
 end if;
 if next_revision is null then raise exception 'preparation_changed_elsewhere'; end if;
 return next_revision;
end $$;
revoke all on function public.load_repository_access_preparation(uuid),public.save_repository_access_preparation(uuid,jsonb,integer,jsonb) from public,anon,authenticated;
grant execute on function public.load_repository_access_preparation(uuid),public.save_repository_access_preparation(uuid,jsonb,integer,jsonb) to authenticated;

create or replace function public.start_repository_deposit(target_request_id uuid)
returns timestamptz language plpgsql security definer set search_path='' as $$
declare student_profile uuid; started_value timestamptz;
begin
  if public.current_user_role() is distinct from 'student' then raise exception 'active_student_required'; end if;
  if not exists(select 1 from public.repository_access_preparations a where a.request_id=target_request_id
   and a.destination=public.repository_preparation_destination(target_request_id)
   and (a.state->>'route'='ready' or (
    (a.state->>'route' in ('account','wrong') or (a.state->>'route'='none' and a.state->>'account' in ('has','confirmed')))
    and a.state->>'requestSent'='true' and a.state->>'release'='granted' and a.state->>'final'='confirmed'
   ))) then raise exception 'repository_access_confirmation_required'; end if;

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
