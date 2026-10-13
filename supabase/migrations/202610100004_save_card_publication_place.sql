create or replace function public.save_request_card_details(target_request_id uuid, payload jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  selected_program_code text; has_coadvisor boolean;
  deposit_year_value integer := nullif(payload ->> 'depositYear', '')::integer;
  defense_year_value integer := nullif(payload ->> 'defenseYear', '')::integer;
  deposit_date_value date := nullif(payload ->> 'depositDate', '')::date;
  defense_date_value date := nullif(payload ->> 'defenseDate', '')::date;
  publication_place_value text := coalesce(nullif(btrim(payload ->> 'publicationPlace'), ''), 'Salvador');
  extent_unit_value public.physical_extent_unit := nullif(payload ->> 'extentUnit', '')::public.physical_extent_unit;
  extent_count_value integer := nullif(payload ->> 'extentCount', '')::integer;
  dimensions_value text := nullif(btrim(payload ->> 'dimensions'), '');
  accompanying_material_value text := nullif(btrim(payload ->> 'accompanyingMaterial'), '');
  advisor_label_value text := btrim(payload ->> 'advisorNoteLabel');
  coadvisor_label_value text := nullif(btrim(payload ->> 'coadvisorNoteLabel'), '');
begin
  if coalesce(public.current_user_role() in ('cataloger', 'administrator'), false) is not true then raise exception 'active_staff_required'; end if;
  select p.code, exists (select 1 from public.request_cataloging_people people where people.request_id = r.id and people.role = 'coadvisor')
    into selected_program_code, has_coadvisor
    from public.cataloging_requests r
    join public.academic_enrollments e on e.id = r.academic_enrollment_id
    join public.academic_programs p on p.id = e.academic_program_id
    where r.id = target_request_id and r.assigned_to = auth.uid() and r.status in ('in_review', 'changes_requested') for update of r;
  if not found then raise exception 'request_locked_by_another_staff'; end if;
  if deposit_year_value is null or deposit_year_value not between 1900 and 9999
    or defense_year_value is null or defense_year_value not between 1900 and deposit_year_value
    or extent_count_value is null or extent_count_value < 1 then raise exception 'valid_card_details_required'; end if;
  if (deposit_date_value is null) <> (defense_date_value is null)
    or (deposit_date_value is not null and (defense_date_value > deposit_date_value
      or extract(year from deposit_date_value)::integer <> deposit_year_value
      or extract(year from defense_date_value)::integer <> defense_year_value)) then
    raise exception 'valid_cataloging_dates_required';
  end if;
  if selected_program_code = 'mp-cecre-master' then
    if extent_unit_value <> 'volumes' or extent_count_value not in (2, 3) then raise exception 'mp_cecre_volume_extent_required'; end if;
  elsif extent_unit_value <> 'pages' then raise exception 'page_extent_required'; end if;
  if char_length(publication_place_value) not between 2 and 120 then raise exception 'valid_publication_place_required'; end if;
  if char_length(advisor_label_value) not between 3 and 60 or (coadvisor_label_value is not null and char_length(coadvisor_label_value) not between 3 and 60) then raise exception 'valid_orientation_labels_required'; end if;
  if has_coadvisor and coadvisor_label_value is null then raise exception 'coadvisor_note_label_required'; end if;
  if (dimensions_value is not null and (char_length(dimensions_value) > 120 or dimensions_value ~ '^[;+]')) or (accompanying_material_value is not null and (char_length(accompanying_material_value) > 240 or accompanying_material_value ~ '^[;+]')) then raise exception 'valid_physical_details_required'; end if;
  insert into public.request_card_details (request_id, deposit_year, defense_year, deposit_date, defense_date, publication_place, extent_unit, extent_count, has_illustrations, dimensions, accompanying_material, advisor_note_label, coadvisor_note_label)
    values (target_request_id, deposit_year_value, defense_year_value, deposit_date_value, defense_date_value, publication_place_value, extent_unit_value, extent_count_value, coalesce((payload ->> 'hasIllustrations')::boolean, false), dimensions_value, accompanying_material_value, advisor_label_value, coadvisor_label_value)
    on conflict (request_id) do update set
      deposit_year = excluded.deposit_year, defense_year = excluded.defense_year,
      deposit_date = excluded.deposit_date, defense_date = excluded.defense_date, publication_place = excluded.publication_place,
      extent_unit = excluded.extent_unit, extent_count = excluded.extent_count,
      has_illustrations = excluded.has_illustrations,
      dimensions = excluded.dimensions, accompanying_material = excluded.accompanying_material,
      advisor_note_label = excluded.advisor_note_label, coadvisor_note_label = excluded.coadvisor_note_label,
      updated_at = now();
end;
$$;
