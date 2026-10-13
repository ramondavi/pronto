create or replace function public.staff_correct_request_field(target_request_id uuid, field_key_value text, corrected_value jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  clean_value text := btrim(coalesce(corrected_value #>> '{}', ''));
  previous_value jsonb;
  item text;
  item_position integer := 0;
begin
  if coalesce(public.current_user_role() in ('cataloger', 'administrator'), false) is not true then raise exception 'active_staff_required'; end if;
  perform 1 from public.cataloging_requests where id = target_request_id and assigned_to = auth.uid() and status = 'in_review' for update;
  if not found then raise exception 'request_locked_by_another_staff'; end if;
  previous_value := public.request_field_value(target_request_id, field_key_value);

  if field_key_value in ('title', 'author', 'advisor') and char_length(clean_value) < 3 then raise exception 'required_corrected_value'; end if;
  if field_key_value = 'public_work_url' and clean_value !~ '^https://[^[:space:]]+$' then raise exception 'public_https_url_required'; end if;
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
    if jsonb_typeof(corrected_value) <> 'array' or (field_key_value = 'keywords_pt' and jsonb_array_length(corrected_value) = 0) then raise exception 'valid_keywords_required'; end if;
    delete from public.request_keywords where request_id = target_request_id and language = case when field_key_value = 'keywords_pt' then 'pt' else 'en' end;
    for item in select btrim(value) from jsonb_array_elements_text(corrected_value) loop
      if char_length(item) not between 2 and 100 then raise exception 'invalid_keyword'; end if;
      insert into public.request_keywords (request_id, language, term, position) values (target_request_id, case when field_key_value = 'keywords_pt' then 'pt' else 'en' end, item, item_position);
      item_position := item_position + 1;
    end loop;
  else raise exception 'invalid_correction_field'; end if;

  update public.cataloging_requests set updated_at = now() where id = target_request_id;
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata) values (auth.uid(), 'request_field_corrected_by_staff', 'cataloging_request', target_request_id::text, jsonb_build_object('field_key', field_key_value, 'previous_value', previous_value, 'corrected_value', corrected_value));
end;
$$;

create or replace function public.normalize_cutter_without_title_initial()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.cutter_code := regexp_replace(btrim(new.cutter_code), '^([[:alpha:]]+[[:digit:]]+)[[:alpha:]]+$', '\1', 'i');
  return new;
end;
$$;
drop trigger if exists request_cataloging_metadata_normalize_cutter on public.request_cataloging_metadata;
create trigger request_cataloging_metadata_normalize_cutter before insert or update of cutter_code on public.request_cataloging_metadata for each row execute function public.normalize_cutter_without_title_initial();

alter table public.request_card_details drop constraint if exists request_card_details_advisor_note_label_check;
alter table public.request_card_details drop constraint if exists request_card_details_coadvisor_note_label_check;
alter table public.request_card_details add constraint request_card_details_advisor_note_label_check check (char_length(btrim(advisor_note_label)) between 3 and 60);
alter table public.request_card_details add constraint request_card_details_coadvisor_note_label_check check (coadvisor_note_label is null or char_length(btrim(coadvisor_note_label)) between 3 and 60);

create or replace function public.open_student_request_v2(payload jsonb)
returns table (request_id uuid, generated_protocol text) language plpgsql security definer set search_path = '' as $$
declare
  created_request_id uuid; created_protocol text; selected_program record;
  deposit_year_value integer := nullif(payload ->> 'depositYear', '')::integer;
  defense_year_value integer := nullif(payload ->> 'defenseYear', '')::integer;
  extent_unit_value public.physical_extent_unit := nullif(payload ->> 'extentUnit', '')::public.physical_extent_unit;
  extent_count_value integer := nullif(payload ->> 'extentCount', '')::integer;
  advisor_label_value text := btrim(payload #>> '{people,advisorNoteLabel}');
  coadvisor_label_value text := nullif(btrim(payload #>> '{people,coadvisorNoteLabel}'), '');
begin
  select p.code, p.work_type into selected_program from public.academic_programs p where p.id = nullif(payload ->> 'academicProgramId', '')::uuid and p.active;
  if not found then raise exception 'active_academic_program_required'; end if;
  if deposit_year_value is null or deposit_year_value not between 1900 and 9999 or defense_year_value is null or defense_year_value not between 1900 and deposit_year_value then raise exception 'valid_cataloging_years_required'; end if;
  if extent_count_value is null or extent_count_value < 1 then raise exception 'valid_physical_extent_required'; end if;
  if selected_program.code = 'mp-cecre-master' then
    if extent_unit_value <> 'volumes' or extent_count_value not in (2, 3) then raise exception 'mp_cecre_volume_extent_required'; end if;
  elsif extent_unit_value <> 'pages' then raise exception 'page_extent_required'; end if;
  if char_length(advisor_label_value) not between 3 and 60 or (coadvisor_label_value is not null and char_length(coadvisor_label_value) not between 3 and 60) then raise exception 'valid_orientation_labels_required'; end if;
  if nullif(btrim(payload #>> '{people,coadvisor}'), '') is not null and coadvisor_label_value is null then raise exception 'coadvisor_note_label_required'; end if;
  select opened.request_id, opened.generated_protocol into created_request_id, created_protocol from public.open_student_request(payload) opened;
  insert into public.request_card_details (request_id, deposit_year, defense_year, extent_unit, extent_count, has_illustrations, advisor_note_label, coadvisor_note_label) values (created_request_id, deposit_year_value, defense_year_value, extent_unit_value, extent_count_value, coalesce((payload ->> 'hasIllustrations')::boolean, false), advisor_label_value, case when nullif(btrim(payload #>> '{people,coadvisor}'), '') is null then null else coadvisor_label_value end);
  return query select created_request_id, created_protocol;
end;
$$;

create or replace function public.save_request_card_details(target_request_id uuid, payload jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  selected_program_code text; has_coadvisor boolean;
  deposit_year_value integer := nullif(payload ->> 'depositYear', '')::integer;
  defense_year_value integer := nullif(payload ->> 'defenseYear', '')::integer;
  extent_unit_value public.physical_extent_unit := nullif(payload ->> 'extentUnit', '')::public.physical_extent_unit;
  extent_count_value integer := nullif(payload ->> 'extentCount', '')::integer;
  advisor_label_value text := btrim(payload ->> 'advisorNoteLabel');
  coadvisor_label_value text := nullif(btrim(payload ->> 'coadvisorNoteLabel'), '');
begin
  if coalesce(public.current_user_role() in ('cataloger', 'administrator'), false) is not true then raise exception 'active_staff_required'; end if;
  select p.code, exists (select 1 from public.request_cataloging_people people where people.request_id = r.id and people.role = 'coadvisor') into selected_program_code, has_coadvisor from public.cataloging_requests r join public.academic_enrollments e on e.id = r.academic_enrollment_id join public.academic_programs p on p.id = e.academic_program_id where r.id = target_request_id and r.assigned_to = auth.uid() and r.status = 'in_review' for update of r;
  if not found then raise exception 'request_locked_by_another_staff'; end if;
  if deposit_year_value is null or deposit_year_value not between 1900 and 9999 or defense_year_value is null or defense_year_value not between 1900 and deposit_year_value or extent_count_value is null or extent_count_value < 1 then raise exception 'valid_card_details_required'; end if;
  if selected_program_code = 'mp-cecre-master' then if extent_unit_value <> 'volumes' or extent_count_value not in (2, 3) then raise exception 'mp_cecre_volume_extent_required'; end if; elsif extent_unit_value <> 'pages' then raise exception 'page_extent_required'; end if;
  if char_length(advisor_label_value) not between 3 and 60 or (coadvisor_label_value is not null and char_length(coadvisor_label_value) not between 3 and 60) then raise exception 'valid_orientation_labels_required'; end if;
  if has_coadvisor and coadvisor_label_value is null then raise exception 'coadvisor_note_label_required'; end if;
  insert into public.request_card_details (request_id, deposit_year, defense_year, extent_unit, extent_count, has_illustrations, advisor_note_label, coadvisor_note_label) values (target_request_id, deposit_year_value, defense_year_value, extent_unit_value, extent_count_value, coalesce((payload ->> 'hasIllustrations')::boolean, false), advisor_label_value, coadvisor_label_value) on conflict (request_id) do update set deposit_year = excluded.deposit_year, defense_year = excluded.defense_year, extent_unit = excluded.extent_unit, extent_count = excluded.extent_count, has_illustrations = excluded.has_illustrations, advisor_note_label = excluded.advisor_note_label, coadvisor_note_label = excluded.coadvisor_note_label, updated_at = now();
end;
$$;

revoke all on function public.staff_correct_request_field(uuid, text, jsonb) from public, anon;
grant execute on function public.staff_correct_request_field(uuid, text, jsonb) to authenticated;
grant execute on function public.open_student_request_v2(jsonb) to authenticated;
grant execute on function public.save_request_card_details(uuid, jsonb) to authenticated;
revoke all on function public.normalize_cutter_without_title_initial() from public, anon, authenticated;
