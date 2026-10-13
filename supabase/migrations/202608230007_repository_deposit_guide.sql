-- Incremento 10: autodepósito assistido, sem upload ou integração com o RI/UFBA.

create table public.repository_deposit_progress (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.cataloging_requests(id) on delete restrict,
  started_by uuid not null references public.profiles(id) on delete restrict,
  started_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.repository_deposit_progress enable row level security;
create policy "repository_deposit_progress_student_read_own" on public.repository_deposit_progress
  for select to authenticated using (exists (
    select 1 from public.cataloging_requests r
    join public.student_profiles s on s.id=r.student_profile_id
    where r.id=request_id and s.profile_id=auth.uid()
      and public.current_user_role() = 'student'
  ));
create policy "repository_deposit_progress_staff_read" on public.repository_deposit_progress
  for select to authenticated using (public.current_user_role() in ('cataloger','administrator'));
revoke all on public.repository_deposit_progress from anon, authenticated;
grant select on public.repository_deposit_progress to authenticated;

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
      and exists (select 1 from public.nada_consta_documents n where n.request_id=r.id and n.status='approved')
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

create or replace function public.set_repository_deposit_enabled(target_program_id uuid, enabled boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
  if public.current_user_role() is distinct from 'administrator' then raise exception 'active_administrator_required'; end if;
  update public.academic_programs set repository_deposit_enabled=enabled,updated_at=now() where id=target_program_id;
  if not found then raise exception 'academic_program_not_found'; end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
  values(auth.uid(),'repository_deposit_configuration_changed','academic_program',target_program_id::text,jsonb_build_object('enabled',enabled));
end $$;

revoke all on function public.start_repository_deposit(uuid) from public,anon,authenticated;
revoke all on function public.set_repository_deposit_enabled(uuid,boolean) from public,anon,authenticated;
grant execute on function public.start_repository_deposit(uuid) to authenticated;
grant execute on function public.set_repository_deposit_enabled(uuid,boolean) to authenticated;
