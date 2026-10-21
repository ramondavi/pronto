-- O depósito retrospectivo autorizado não depende da disponibilidade do guia comum.
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
      and p.active and (p.repository_deposit_enabled or r.retrospective)
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


