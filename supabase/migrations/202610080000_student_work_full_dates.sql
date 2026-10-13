-- Mantém os anos da ficha e guarda as datas completas para o RI/UFBA.
alter table public.request_card_details
  add column deposit_date date,
  add column defense_date date,
  add constraint request_card_details_full_dates_order_check
    check (deposit_date is null or defense_date is null or defense_date <= deposit_date),
  add constraint request_card_details_deposit_date_year_check
    check (deposit_date is null or extract(year from deposit_date)::integer = deposit_year),
  add constraint request_card_details_defense_date_year_check
    check (defense_date is null or extract(year from defense_date)::integer = defense_year);

create function public.open_student_request_v12(payload jsonb)
returns table (request_id uuid, generated_protocol text)
language plpgsql security definer set search_path = '' as $$
declare
  deposit_text text := payload ->> 'depositDate';
  defense_text text := payload ->> 'defenseDate';
  deposit_value date;
  defense_value date;
  safe_payload jsonb;
  created_id uuid;
  created_protocol text;
begin
  if deposit_text is null or defense_text is null
    or deposit_text !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
    or defense_text !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    raise exception 'valid_cataloging_dates_required';
  end if;
  begin
    deposit_value := deposit_text::date;
    defense_value := defense_text::date;
  exception when datetime_field_overflow or invalid_datetime_format then
    raise exception 'valid_cataloging_dates_required';
  end;
  if extract(year from deposit_value) < 1900 or defense_value > deposit_value
    or extract(year from defense_value) < 1900 then
    raise exception 'valid_cataloging_dates_required';
  end if;

  safe_payload := jsonb_set(payload, '{depositYear}', to_jsonb(extract(year from deposit_value)::integer), true);
  safe_payload := jsonb_set(safe_payload, '{defenseYear}', to_jsonb(extract(year from defense_value)::integer), true);
  select opened.request_id, opened.generated_protocol into created_id, created_protocol
    from public.open_student_request_v11(safe_payload) opened;
  update public.request_card_details
    set deposit_date = deposit_value, defense_date = defense_value
    where request_card_details.request_id = created_id;
  return query select created_id, created_protocol;
end;
$$;

revoke all on function public.open_student_request_v11(jsonb), public.open_student_request_v12(jsonb) from public, anon, authenticated;
grant execute on function public.open_student_request_v12(jsonb) to authenticated;

-- A conferência bibliotecária pode corrigir as datas completas; os anos continuam derivados delas.
create or replace function public.save_request_card_details(target_request_id uuid, payload jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  selected_program_code text; has_coadvisor boolean;
  deposit_year_value integer := nullif(payload ->> 'depositYear', '')::integer;
  defense_year_value integer := nullif(payload ->> 'defenseYear', '')::integer;
  deposit_date_value date := nullif(payload ->> 'depositDate', '')::date;
  defense_date_value date := nullif(payload ->> 'defenseDate', '')::date;
  extent_unit_value public.physical_extent_unit := nullif(payload ->> 'extentUnit', '')::public.physical_extent_unit;
  extent_count_value integer := nullif(payload ->> 'extentCount', '')::integer;
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
  if char_length(advisor_label_value) not between 3 and 60 or (coadvisor_label_value is not null and char_length(coadvisor_label_value) not between 3 and 60) then raise exception 'valid_orientation_labels_required'; end if;
  if has_coadvisor and coadvisor_label_value is null then raise exception 'coadvisor_note_label_required'; end if;
  insert into public.request_card_details (request_id, deposit_year, defense_year, deposit_date, defense_date, extent_unit, extent_count, has_illustrations, advisor_note_label, coadvisor_note_label)
    values (target_request_id, deposit_year_value, defense_year_value, deposit_date_value, defense_date_value, extent_unit_value, extent_count_value, coalesce((payload ->> 'hasIllustrations')::boolean, false), advisor_label_value, coadvisor_label_value)
    on conflict (request_id) do update set
      deposit_year = excluded.deposit_year, defense_year = excluded.defense_year,
      deposit_date = excluded.deposit_date, defense_date = excluded.defense_date,
      extent_unit = excluded.extent_unit, extent_count = excluded.extent_count,
      has_illustrations = excluded.has_illustrations,
      advisor_note_label = excluded.advisor_note_label, coadvisor_note_label = excluded.coadvisor_note_label,
      updated_at = now();
end;
$$;
