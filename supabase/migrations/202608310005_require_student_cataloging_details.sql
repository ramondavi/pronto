create or replace function public.open_student_request_v2(payload jsonb)
returns table (request_id uuid, generated_protocol text) language plpgsql security definer set search_path = '' as $$
declare
  created_request_id uuid; created_protocol text; selected_program record;
  deposit_year_value integer := nullif(payload ->> 'depositYear', '')::integer;
  defense_year_value integer := nullif(payload ->> 'defenseYear', '')::integer;
  extent_unit_value public.physical_extent_unit := nullif(payload ->> 'extentUnit', '')::public.physical_extent_unit;
  extent_count_value integer := nullif(payload ->> 'extentCount', '')::integer;
  illustrations_value boolean;
  advisor_label_value text := btrim(payload #>> '{people,advisorNoteLabel}');
  coadvisor_label_value text := nullif(btrim(payload #>> '{people,coadvisorNoteLabel}'), '');
begin
  select p.code, p.work_type into selected_program from public.academic_programs p where p.id = nullif(payload ->> 'academicProgramId', '')::uuid and p.active;
  if not found then raise exception 'active_academic_program_required'; end if;
  if deposit_year_value is null or deposit_year_value not between 1900 and 9999 or defense_year_value is null or defense_year_value not between 1900 and deposit_year_value then raise exception 'valid_cataloging_years_required'; end if;
  if extent_count_value is null or extent_count_value < 1 then raise exception 'valid_physical_extent_required'; end if;
  if not (payload ? 'hasIllustrations') or jsonb_typeof(payload -> 'hasIllustrations') <> 'boolean' then raise exception 'illustrations_choice_required'; end if;
  illustrations_value := (payload ->> 'hasIllustrations')::boolean;
  if selected_program.code = 'mp-cecre-master' then
    if extent_unit_value <> 'volumes' or extent_count_value not in (2, 3) then raise exception 'mp_cecre_volume_extent_required'; end if;
  elsif extent_unit_value <> 'pages' then raise exception 'page_extent_required'; end if;
  if char_length(advisor_label_value) not between 3 and 60 or (coadvisor_label_value is not null and char_length(coadvisor_label_value) not between 3 and 60) then raise exception 'valid_orientation_labels_required'; end if;
  if nullif(btrim(payload #>> '{people,coadvisor}'), '') is not null and coadvisor_label_value is null then raise exception 'coadvisor_note_label_required'; end if;
  select opened.request_id, opened.generated_protocol into created_request_id, created_protocol from public.open_student_request(payload) opened;
  insert into public.request_card_details (request_id, deposit_year, defense_year, extent_unit, extent_count, has_illustrations, advisor_note_label, coadvisor_note_label) values (created_request_id, deposit_year_value, defense_year_value, extent_unit_value, extent_count_value, illustrations_value, advisor_label_value, case when nullif(btrim(payload #>> '{people,coadvisor}'), '') is null then null else coadvisor_label_value end);
  return query select created_request_id, created_protocol;
end;
$$;
