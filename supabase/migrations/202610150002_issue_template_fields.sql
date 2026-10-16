-- Modelos de resposta vinculados aos campos corrigíveis do pedido.
alter table public.issue_templates add column field_keys text[] not null default '{}';

update public.issue_templates set field_keys = case code
  when 'public_link_unavailable' then array['public_work_url']
  when 'title_page_name' then array['author','advisor','coadvisor']
  when 'required_missing' then array['registration_number','academic_program_id','author','title','other_titles','advisor','coadvisor','keywords_pt','keywords_en','public_work_url','volume_information','library_note']
  else array['registration_number','academic_program_id','author','title','subtitle','equivalent_title','other_titles','advisor','coadvisor','keywords_pt','keywords_en','volume_information','library_note']
end;

alter table public.issue_templates add constraint issue_templates_field_keys_valid check (
  cardinality(field_keys) > 0 and
  field_keys <@ array['registration_number','academic_program_id','author','title','subtitle','equivalent_title','other_titles','advisor','coadvisor','keywords_pt','keywords_en','public_work_url','volume_information','library_note']::text[]
);

create function public.admin_save_issue_template(
  target_template_id uuid, template_label text, template_message text,
  template_field_keys text[], enabled boolean, template_position integer
) returns uuid language plpgsql security definer set search_path = '' as $$
declare saved_id uuid;
begin
  if not public.has_permission('admin.service.manage') then raise exception 'permission_denied'; end if;
  if length(btrim(coalesce(template_label,''))) < 3 or length(btrim(coalesce(template_message,''))) < 3
    or coalesce(cardinality(template_field_keys),0) = 0 or template_position < 0
    or template_field_keys is null or array_position(template_field_keys,null) is not null
    or not template_field_keys <@ array['registration_number','academic_program_id','author','title','subtitle','equivalent_title','other_titles','advisor','coadvisor','keywords_pt','keywords_en','public_work_url','volume_information','library_note']::text[]
  then raise exception 'invalid_issue_template'; end if;
  if target_template_id is null then
    insert into public.issue_templates(code,label,message,field_keys,active,position)
    values('custom_' || replace(gen_random_uuid()::text,'-',''),btrim(template_label),btrim(template_message),template_field_keys,enabled,template_position)
    returning id into saved_id;
  else
    update public.issue_templates set label=btrim(template_label), message=btrim(template_message),
      field_keys=template_field_keys, active=enabled, position=template_position, updated_at=now()
    where id=target_template_id returning id into saved_id;
    if saved_id is null then raise exception 'issue_template_not_found'; end if;
  end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
  values(auth.uid(),case when target_template_id is null then 'issue_template_created' else 'issue_template_changed' end,
    'issue_template',saved_id::text,jsonb_build_object('active',enabled,'field_keys',template_field_keys));
  return saved_id;
end $$;
revoke all on function public.admin_save_issue_template(uuid,text,text,text[],boolean,integer) from public,anon,authenticated;
grant execute on function public.admin_save_issue_template(uuid,text,text,text[],boolean,integer) to authenticated;

create function public.enforce_issue_template_field() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.template_id is not null and not exists (
    select 1 from public.issue_templates template
    where template.id = new.template_id and template.active and new.field_key = any(template.field_keys)
  ) then raise exception 'issue_template_not_available_for_field'; end if;
  return new;
end $$;
create trigger enforce_issue_template_field before insert or update of template_id,field_key
on public.request_field_issues for each row execute function public.enforce_issue_template_field();
