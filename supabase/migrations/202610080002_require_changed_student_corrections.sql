-- Exige alteração real em cada campo, exceto confirmação de acesso para URL preservada.

create or replace function public.submit_request_corrections(target_request_id uuid, corrections jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  student_id uuid;
  round_id uuid;
  correction jsonb;
  key_value text;
  value_json jsonb;
  original_json jsonb;
  value_text text;
  item text;
  item_position integer;
begin
  if public.current_user_role() is distinct from 'student'::public.user_role then raise exception 'active_student_required'; end if;
  select id into student_id from public.student_profiles where profile_id = auth.uid();
  perform 1 from public.cataloging_requests where id = target_request_id and student_profile_id = student_id and status = 'changes_requested' for update;
  if not found then raise exception 'request_not_awaiting_corrections'; end if;
  select id into round_id from public.request_revision_rounds where request_id = target_request_id and responded_at is null order by round_number desc limit 1;
  if round_id is null then raise exception 'open_revision_round_required'; end if;
  if jsonb_typeof(corrections) <> 'array'
    or (select count(*) from jsonb_array_elements(corrections)) <> (select count(*) from public.request_field_issues where revision_round_id = round_id)
    or (select count(distinct value ->> 'fieldKey') from jsonb_array_elements(corrections)) <> (select count(*) from public.request_field_issues where revision_round_id = round_id)
    or exists (select 1 from jsonb_array_elements(corrections) c where not exists (select 1 from public.request_field_issues i where i.revision_round_id = round_id and i.field_key = c.value ->> 'fieldKey'))
  then raise exception 'only_pending_fields_required'; end if;

  for correction in select value from jsonb_array_elements(corrections) loop
    key_value := correction ->> 'fieldKey'; value_json := correction -> 'value'; value_text := btrim(coalesce(value_json #>> '{}', ''));
    select original_value into original_json from public.request_field_issues where revision_round_id = round_id and field_key = key_value;
    if key_value = 'public_work_url' then
      if value_text = btrim(coalesce(original_json #>> '{}', '')) and coalesce((correction ->> 'accessConfirmed')::boolean, false) is not true then
        raise exception 'correction_change_or_access_confirmation_required';
      end if;
    elsif jsonb_typeof(value_json) = 'array' then
      if value_json is not distinct from original_json then raise exception 'corrected_value_must_change'; end if;
    elsif value_text = btrim(coalesce(original_json #>> '{}', '')) then
      raise exception 'corrected_value_must_change';
    end if;
    if key_value in ('title', 'author', 'advisor') and char_length(value_text) < 3 then raise exception 'required_corrected_value'; end if;
    if key_value = 'public_work_url' and value_text !~ '^https://[^[:space:]]+$' then raise exception 'public_https_url_required'; end if;
    if key_value = 'title' then update public.cataloging_requests set title = value_text where id = target_request_id;
    elsif key_value = 'subtitle' then update public.cataloging_requests set subtitle = nullif(value_text, '') where id = target_request_id;
    elsif key_value = 'equivalent_title' then update public.cataloging_requests set equivalent_title = nullif(value_text, '') where id = target_request_id;
    elsif key_value = 'other_titles' then update public.cataloging_requests set other_titles = value_json where id = target_request_id;
    elsif key_value = 'public_work_url' then update public.cataloging_requests set public_work_url = value_text where id = target_request_id;
    elsif key_value = 'volume_information' then update public.cataloging_requests set volume_information = nullif(value_text, '') where id = target_request_id;
    elsif key_value = 'library_note' then update public.cataloging_requests set library_note = nullif(value_text, '') where id = target_request_id;
    elsif key_value = 'registration_number' then update public.academic_enrollments set registration_number = value_text, updated_at = now() where id = (select academic_enrollment_id from public.cataloging_requests where id = target_request_id);
    elsif key_value = 'academic_program_id' then update public.academic_enrollments set academic_program_id = value_text::uuid, updated_at = now() where id = (select academic_enrollment_id from public.cataloging_requests where id = target_request_id) and exists (select 1 from public.academic_programs where id = value_text::uuid and active);
    elsif key_value in ('author', 'advisor') then update public.request_people set transcribed_name = value_text, updated_at = now() where request_id = target_request_id and role::text = key_value;
    elsif key_value = 'coadvisor' then
      if value_text = '' then delete from public.request_people where request_id = target_request_id and role = 'coadvisor';
      elsif exists (select 1 from public.request_people where request_id = target_request_id and role = 'coadvisor') then
        update public.request_people set transcribed_name = value_text, updated_at = now() where request_id = target_request_id and role = 'coadvisor';
      else insert into public.request_people (request_id, role, transcribed_name) values (target_request_id, 'coadvisor', value_text);
      end if;
    elsif key_value in ('keywords_pt', 'keywords_en') then
      if jsonb_typeof(value_json) <> 'array' or (key_value = 'keywords_pt' and jsonb_array_length(value_json) = 0) then raise exception 'valid_keywords_required'; end if;
      delete from public.request_keywords where request_id = target_request_id and language = case when key_value = 'keywords_pt' then 'pt' else 'en' end;
      item_position := 0;
      for item in select btrim(value) from jsonb_array_elements_text(value_json) loop
        if char_length(item) not between 2 and 100 then raise exception 'invalid_keyword'; end if;
        insert into public.request_keywords (request_id, language, term, position) values (target_request_id, case when key_value = 'keywords_pt' then 'pt' else 'en' end, item, item_position);
        item_position := item_position + 1;
      end loop;
    else raise exception 'invalid_correction_field'; end if;
    insert into public.request_corrections (revision_round_id, field_key, previous_value, corrected_value)
      select round_id, key_value, original_value, value_json from public.request_field_issues where revision_round_id = round_id and field_key = key_value;
  end loop;
  update public.request_field_issues set resolved_at = now(), updated_at = now() where revision_round_id = round_id;
  update public.request_revision_rounds set responded_at = now(), updated_at = now() where id = round_id;
  update public.cataloging_requests set status = 'in_review', updated_at = now() where id = target_request_id;
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'request_corrections_submitted', 'cataloging_request', target_request_id::text, jsonb_build_object('revision_round_id', round_id));
end;
$$;
