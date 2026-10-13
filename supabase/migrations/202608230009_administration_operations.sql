-- Incremento 12: administração, operação, indicadores e expurgo assistido.

create or replace function public.admin_manage_account(
  target_profile_id uuid,
  target_role public.user_role,
  target_status public.account_status,
  professional_name text default null,
  professional_crb text default null
)
returns void language plpgsql security definer set search_path='' as $$
declare previous_role public.user_role; previous_status public.account_status;
begin
  if public.current_user_role() is distinct from 'administrator' then raise exception 'active_administrator_required'; end if;
  if target_profile_id=auth.uid() and (target_status<>'active' or target_role<>'administrator') then raise exception 'administrator_cannot_remove_own_access'; end if;
  select role,status into previous_role,previous_status from public.profiles where id=target_profile_id for update;
  if previous_role is null then raise exception 'profile_not_found'; end if;
  if target_role in ('cataloger','administrator') then
    if length(trim(coalesce(professional_name,'')))<3 or length(trim(coalesce(professional_crb,'')))<3 then raise exception 'staff_data_required'; end if;
    insert into public.staff_profiles(profile_id,professional_name,crb)
      values(target_profile_id,trim(professional_name),trim(professional_crb))
      on conflict(profile_id) do update set professional_name=excluded.professional_name,crb=excluded.crb,updated_at=now();
  end if;
  update public.profiles set role=target_role,status=target_status,updated_at=now() where id=target_profile_id;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
    values(auth.uid(),'account_administration_changed','profile',target_profile_id::text,
      jsonb_build_object('previous_role',previous_role,'role',target_role,'previous_status',previous_status,'status',target_status));
end $$;

create or replace function public.admin_configure_program(
  target_program_id uuid, sla_business_days integer,
  repository_enabled boolean, coordination_enabled boolean,
  contact_name text, contact_email text
)
returns void language plpgsql security definer set search_path='' as $$
begin
  if public.current_user_role() is distinct from 'administrator' then raise exception 'active_administrator_required'; end if;
  if sla_business_days not between 1 and 30 then raise exception 'invalid_sla'; end if;
  if coordination_enabled and (length(trim(coalesce(contact_name,'')))<2 or trim(coalesce(contact_email,'')) !~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$') then raise exception 'valid_coordination_contact_required'; end if;
  update public.academic_programs set service_level_business_days=sla_business_days,
    repository_deposit_enabled=repository_enabled,coordination_magic_link_enabled=coordination_enabled,updated_at=now()
    where id=target_program_id;
  if not found then raise exception 'academic_program_not_found'; end if;
  update public.coordination_contacts set active=false,updated_at=now() where academic_program_id=target_program_id and active;
  if coordination_enabled then insert into public.coordination_contacts(academic_program_id,name,email)
    values(target_program_id,trim(contact_name),lower(trim(contact_email))); end if;
  insert into public.sla_settings(academic_program_id,business_days) values(target_program_id,sla_business_days);
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
    values(auth.uid(),'program_operation_configuration_changed','academic_program',target_program_id::text,
      jsonb_build_object('sla_business_days',sla_business_days,'repository_deposit_enabled',repository_enabled,'coordination_magic_link_enabled',coordination_enabled));
end $$;

create or replace function public.admin_save_announcement(
  announcement_id uuid, announcement_type public.announcement_type,
  announcement_title text, announcement_message text, starts_at timestamptz,
  ends_at timestamptz, enabled boolean
)
returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
  if public.current_user_role() is distinct from 'administrator' then raise exception 'active_administrator_required'; end if;
  if length(trim(coalesce(announcement_title,'')))<3 or length(trim(coalesce(announcement_message,'')))<3 or starts_at is null or (ends_at is not null and ends_at<=starts_at) then raise exception 'invalid_announcement'; end if;
  if announcement_id is null then
    insert into public.library_announcements(type,title,message,starts_at,ends_at,active,created_by)
      values(announcement_type,trim(announcement_title),trim(announcement_message),starts_at,ends_at,enabled,auth.uid()) returning id into result;
  else
    update public.library_announcements set type=announcement_type,title=trim(announcement_title),message=trim(announcement_message),starts_at=starts_at,ends_at=ends_at,active=enabled,updated_at=now()
      where id=announcement_id returning id into result;
    if result is null then raise exception 'announcement_not_found'; end if;
  end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id) values(auth.uid(),'library_announcement_saved','library_announcement',result::text);
  return result;
end $$;

create or replace function public.admin_update_issue_template(target_template_id uuid, template_label text, template_message text, enabled boolean, template_position integer)
returns void language plpgsql security definer set search_path='' as $$
begin
  if public.current_user_role() is distinct from 'administrator' then raise exception 'active_administrator_required'; end if;
  if length(trim(coalesce(template_label,'')))<3 or length(trim(coalesce(template_message,'')))<3 then raise exception 'invalid_issue_template'; end if;
  update public.issue_templates set label=trim(template_label),message=trim(template_message),active=enabled,position=template_position,updated_at=now() where id=target_template_id;
  if not found then raise exception 'issue_template_not_found'; end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'issue_template_changed','issue_template',target_template_id::text,jsonb_build_object('active',enabled));
end $$;

create or replace function public.admin_statistics(period_start timestamptz default null, period_end timestamptz default null)
returns jsonb language plpgsql security definer set search_path='' stable as $$
declare result jsonb;
begin
  if public.current_user_role() is distinct from 'administrator' then raise exception 'active_administrator_required'; end if;
  with filtered as (
    select r.id,r.protocol,r.status,r.submitted_at,r.assigned_to,ap.id program_id,ap.name program_name,p.full_name staff_name
    from public.cataloging_requests r join public.academic_enrollments ae on ae.id=r.academic_enrollment_id
    join public.academic_programs ap on ap.id=ae.academic_program_id left join public.profiles p on p.id=r.assigned_to
    where (period_start is null or r.submitted_at>=period_start) and (period_end is null or r.submitted_at<period_end)
  ) select jsonb_build_object(
    'total',(select count(*) from filtered),
    'by_status',coalesce((select jsonb_agg(jsonb_build_object('label',status,'count',amount) order by status) from (select status,count(*) amount from filtered group by status)s),'[]'::jsonb),
    'by_program',coalesce((select jsonb_agg(jsonb_build_object('id',program_id,'label',program_name,'count',amount) order by program_name) from (select program_id,program_name,count(*) amount from filtered group by program_id,program_name)s),'[]'::jsonb),
    'by_staff',coalesce((select jsonb_agg(jsonb_build_object('id',assigned_to,'label',coalesce(staff_name,'Não atribuído'),'count',amount) order by coalesce(staff_name,'Não atribuído')) from (select assigned_to,staff_name,count(*) amount from filtered group by assigned_to,staff_name)s),'[]'::jsonb),
    'records',coalesce((select jsonb_agg(jsonb_build_object('protocol',protocol,'status',status,'submitted_at',submitted_at,'program',program_name,'staff',staff_name) order by submitted_at desc) from filtered),'[]'::jsonb)
  ) into result;
  return result;
end $$;

create or replace function public.admin_confirm_nada_consta_purge(target_document_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  if public.current_user_role() is distinct from 'administrator' then raise exception 'active_administrator_required'; end if;
  update public.nada_consta_documents set object_path=null,status='purged',purged_at=now(),updated_at=now()
    where id=target_document_id and purge_after<=now() and object_path is not null;
  if not found then raise exception 'document_not_ready_for_purge'; end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id) values(auth.uid(),'nada_consta_purged','nada_consta_document',target_document_id::text);
end $$;

create policy "issue_templates_manage_by_administrator" on public.issue_templates for update to authenticated
  using(public.current_user_role()='administrator') with check(public.current_user_role()='administrator');
grant update(label,message,active,position) on public.issue_templates to authenticated;
revoke all on function public.admin_manage_account(uuid,public.user_role,public.account_status,text,text) from public,anon,authenticated;
revoke all on function public.admin_configure_program(uuid,integer,boolean,boolean,text,text) from public,anon,authenticated;
revoke all on function public.admin_save_announcement(uuid,public.announcement_type,text,text,timestamptz,timestamptz,boolean) from public,anon,authenticated;
revoke all on function public.admin_update_issue_template(uuid,text,text,boolean,integer) from public,anon,authenticated;
revoke all on function public.admin_statistics(timestamptz,timestamptz) from public,anon,authenticated;
revoke all on function public.admin_confirm_nada_consta_purge(uuid) from public,anon,authenticated;
grant execute on function public.admin_manage_account(uuid,public.user_role,public.account_status,text,text) to authenticated;
grant execute on function public.admin_configure_program(uuid,integer,boolean,boolean,text,text) to authenticated;
grant execute on function public.admin_save_announcement(uuid,public.announcement_type,text,text,timestamptz,timestamptz,boolean) to authenticated;
grant execute on function public.admin_update_issue_template(uuid,text,text,boolean,integer) to authenticated;
grant execute on function public.admin_statistics(timestamptz,timestamptz) to authenticated;
grant execute on function public.admin_confirm_nada_consta_purge(uuid) to authenticated;
