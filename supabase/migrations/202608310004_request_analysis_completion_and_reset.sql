create table public.request_direct_correction_baselines (
  request_id uuid not null references public.cataloging_requests(id) on delete cascade,
  field_key text not null,
  original_value jsonb not null,
  corrected_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (request_id, field_key)
);

alter table public.request_direct_correction_baselines enable row level security;
revoke all on table public.request_direct_correction_baselines from anon, authenticated;

alter table public.request_analyses add column review_completed_at timestamptz;
alter table public.request_analyses add column review_completed_by uuid references public.profiles(id) on delete restrict;

create or replace function public.apply_direct_correction_value(target_request_id uuid, field_key_value text, value_to_apply jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  clean_value text := btrim(coalesce(value_to_apply #>> '{}', ''));
  item text;
  item_position integer := 0;
begin
  if field_key_value = 'title' then update public.cataloging_requests set title = clean_value where id = target_request_id;
  elsif field_key_value = 'subtitle' then update public.cataloging_requests set subtitle = nullif(clean_value, '') where id = target_request_id;
  elsif field_key_value = 'equivalent_title' then update public.cataloging_requests set equivalent_title = nullif(clean_value, '') where id = target_request_id;
  elsif field_key_value = 'public_work_url' then update public.cataloging_requests set public_work_url = clean_value where id = target_request_id;
  elsif field_key_value = 'library_note' then update public.cataloging_requests set library_note = nullif(clean_value, '') where id = target_request_id;
  elsif field_key_value = 'registration_number' then update public.academic_enrollments set registration_number = clean_value, updated_at = now() where id = (select academic_enrollment_id from public.cataloging_requests where id = target_request_id);
  elsif field_key_value in ('author', 'advisor') then update public.request_people set transcribed_name = clean_value, updated_at = now() where request_id = target_request_id and role::text = field_key_value;
  elsif field_key_value = 'coadvisor' then
    if clean_value = '' then delete from public.request_people where request_id = target_request_id and role = 'coadvisor';
    elsif exists (select 1 from public.request_people where request_id = target_request_id and role = 'coadvisor') then update public.request_people set transcribed_name = clean_value, updated_at = now() where request_id = target_request_id and role = 'coadvisor';
    else insert into public.request_people (request_id, role, transcribed_name) values (target_request_id, 'coadvisor', clean_value); end if;
  elsif field_key_value in ('keywords_pt', 'keywords_en') then
    delete from public.request_keywords where request_id = target_request_id and language = case when field_key_value = 'keywords_pt' then 'pt' else 'en' end;
    for item in select btrim(value) from jsonb_array_elements_text(value_to_apply) loop
      insert into public.request_keywords (request_id, language, term, position) values (target_request_id, case when field_key_value = 'keywords_pt' then 'pt' else 'en' end, item, item_position);
      item_position := item_position + 1;
    end loop;
  else raise exception 'invalid_correction_field'; end if;
end;
$$;

create or replace function public.staff_correct_request_field(target_request_id uuid, field_key_value text, corrected_value jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  clean_value text := btrim(coalesce(corrected_value #>> '{}', ''));
  previous_value jsonb;
begin
  if coalesce(public.current_user_role() in ('cataloger', 'administrator'), false) is not true then raise exception 'active_staff_required'; end if;
  perform 1 from public.cataloging_requests where id = target_request_id and assigned_to = auth.uid() and status = 'in_review' for update;
  if not found then raise exception 'request_locked_by_another_staff'; end if;
  previous_value := public.request_field_value(target_request_id, field_key_value);
  if field_key_value in ('title', 'author', 'advisor') and char_length(clean_value) < 3 then raise exception 'required_corrected_value'; end if;
  if field_key_value = 'public_work_url' and clean_value !~ '^https://[^[:space:]]+$' then raise exception 'public_https_url_required'; end if;
  if field_key_value in ('keywords_pt', 'keywords_en') and (jsonb_typeof(corrected_value) <> 'array' or (field_key_value = 'keywords_pt' and jsonb_array_length(corrected_value) = 0)) then raise exception 'valid_keywords_required'; end if;
  insert into public.request_direct_correction_baselines (request_id, field_key, original_value, corrected_by)
  values (target_request_id, field_key_value, coalesce(previous_value, 'null'::jsonb), auth.uid()) on conflict (request_id, field_key) do nothing;
  perform public.apply_direct_correction_value(target_request_id, field_key_value, corrected_value);
  update public.cataloging_requests set updated_at = now() where id = target_request_id;
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata) values (auth.uid(), 'request_field_corrected_by_staff', 'cataloging_request', target_request_id::text, jsonb_build_object('field_key', field_key_value, 'previous_value', previous_value, 'corrected_value', corrected_value));
end;
$$;

create or replace function public.reset_direct_request_corrections(target_request_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare baseline record; restored_count integer := 0;
begin
  if coalesce(public.current_user_role() in ('cataloger', 'administrator'), false) is not true then raise exception 'active_staff_required'; end if;
  perform 1 from public.cataloging_requests where id = target_request_id and assigned_to = auth.uid() and status = 'in_review' for update;
  if not found then raise exception 'request_locked_by_another_staff'; end if;
  for baseline in select field_key, original_value from public.request_direct_correction_baselines where request_id = target_request_id order by created_at loop
    perform public.apply_direct_correction_value(target_request_id, baseline.field_key, baseline.original_value);
    restored_count := restored_count + 1;
  end loop;
  if restored_count = 0 then raise exception 'no_reversible_direct_corrections'; end if;
  delete from public.request_direct_correction_baselines where request_id = target_request_id;
  update public.cataloging_requests set updated_at = now() where id = target_request_id;
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata) values (auth.uid(), 'request_direct_corrections_reset', 'cataloging_request', target_request_id::text, jsonb_build_object('restored_field_count', restored_count));
  return restored_count;
end;
$$;

create or replace function public.complete_request_analysis(target_request_id uuid)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare completed_at_value timestamptz := now();
begin
  if coalesce(public.current_user_role() in ('cataloger', 'administrator'), false) is not true then raise exception 'active_staff_required'; end if;
  perform 1 from public.cataloging_requests where id = target_request_id and assigned_to = auth.uid() and status = 'in_review' for update;
  if not found then raise exception 'request_locked_by_another_staff'; end if;
  insert into public.request_analyses (request_id, analysis_notes, internal_note, last_edited_by, review_completed_at, review_completed_by, updated_at)
  values (target_request_id, '', '', auth.uid(), completed_at_value, auth.uid(), completed_at_value)
  on conflict (request_id) do update set review_completed_at = completed_at_value, review_completed_by = auth.uid(), updated_at = completed_at_value;
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata) values (auth.uid(), 'request_analysis_completed', 'cataloging_request', target_request_id::text, '{}'::jsonb);
  return completed_at_value;
end;
$$;

revoke all on function public.apply_direct_correction_value(uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.reset_direct_request_corrections(uuid) from public, anon;
revoke all on function public.complete_request_analysis(uuid) from public, anon;
grant execute on function public.staff_correct_request_field(uuid, text, jsonb) to authenticated;
grant execute on function public.reset_direct_request_corrections(uuid) to authenticated;
grant execute on function public.complete_request_analysis(uuid) to authenticated;
