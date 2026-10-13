-- Modelos institucionais validados para TCC, dissertação e tese.

create type public.physical_extent_unit as enum ('pages', 'volumes');

alter table public.academic_programs
  add column cataloging_program_tracing text;

update public.academic_programs
set cataloging_program_tracing = 'Programa de Pós-Graduação em Arquitetura e Urbanismo'
where code in ('ppgau-academic-master', 'ppgau-doctorate');

create table public.request_card_details (
  request_id uuid primary key references public.cataloging_requests(id) on delete cascade,
  deposit_year integer not null check (deposit_year between 1900 and 9999),
  defense_year integer not null check (defense_year between 1900 and deposit_year),
  extent_unit public.physical_extent_unit not null,
  extent_count integer not null check (extent_count > 0),
  has_illustrations boolean not null default false,
  publication_place text not null default 'Salvador' check (char_length(btrim(publication_place)) between 2 and 120),
  advisor_note_label text not null check (advisor_note_label in ('Orientador', 'Orientadora')),
  coadvisor_note_label text check (coadvisor_note_label in ('Coorientador', 'Coorientadora')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.request_card_details enable row level security;
create policy "request_card_details_read_with_request"
on public.request_card_details for select to authenticated
using (exists (select 1 from public.cataloging_requests where id = request_id));
revoke all on public.request_card_details from anon, authenticated;
grant select on public.request_card_details to authenticated;

create or replace function public.open_student_request_v2(payload jsonb)
returns table (request_id uuid, generated_protocol text)
language plpgsql security definer set search_path = '' as $$
declare
  created_request_id uuid;
  created_protocol text;
  selected_program record;
  deposit_year_value integer;
  defense_year_value integer;
  extent_unit_value public.physical_extent_unit;
  extent_count_value integer;
  advisor_label_value text;
  coadvisor_label_value text;
begin
  select p.code, p.work_type into selected_program
  from public.academic_programs p
  where p.id = nullif(payload ->> 'academicProgramId', '')::uuid and p.active;
  if not found then raise exception 'active_academic_program_required'; end if;

  deposit_year_value := nullif(payload ->> 'depositYear', '')::integer;
  defense_year_value := nullif(payload ->> 'defenseYear', '')::integer;
  extent_unit_value := nullif(payload ->> 'extentUnit', '')::public.physical_extent_unit;
  extent_count_value := nullif(payload ->> 'extentCount', '')::integer;
  advisor_label_value := payload #>> '{people,advisorNoteLabel}';
  coadvisor_label_value := nullif(payload #>> '{people,coadvisorNoteLabel}', '');

  if deposit_year_value is null or deposit_year_value not between 1900 and 9999
    or defense_year_value is null or defense_year_value not between 1900 and deposit_year_value then
    raise exception 'valid_cataloging_years_required';
  end if;
  if extent_count_value is null or extent_count_value < 1 then
    raise exception 'valid_physical_extent_required';
  end if;
  if selected_program.code = 'mp-cecre-master' then
    if extent_unit_value <> 'volumes' or extent_count_value not in (2, 3) then
      raise exception 'mp_cecre_volume_extent_required';
    end if;
  elsif extent_unit_value <> 'pages' then
    raise exception 'page_extent_required';
  end if;
  if advisor_label_value not in ('Orientador', 'Orientadora')
    or (coadvisor_label_value is not null and coadvisor_label_value not in ('Coorientador', 'Coorientadora')) then
    raise exception 'valid_orientation_labels_required';
  end if;
  if nullif(btrim(payload #>> '{people,coadvisor}'), '') is not null and coadvisor_label_value is null then
    raise exception 'coadvisor_note_label_required';
  end if;

  select opened.request_id, opened.generated_protocol
  into created_request_id, created_protocol
  from public.open_student_request(payload) opened;

  insert into public.request_card_details (
    request_id, deposit_year, defense_year, extent_unit, extent_count,
    has_illustrations, advisor_note_label, coadvisor_note_label
  ) values (
    created_request_id, deposit_year_value, defense_year_value, extent_unit_value,
    extent_count_value, coalesce((payload ->> 'hasIllustrations')::boolean, false),
    advisor_label_value,
    case when nullif(btrim(payload #>> '{people,coadvisor}'), '') is null then null else coadvisor_label_value end
  );

  return query select created_request_id, created_protocol;
end;
$$;

create or replace function public.save_request_card_details(target_request_id uuid, payload jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  selected_program_code text;
  has_coadvisor boolean;
  deposit_year_value integer := nullif(payload ->> 'depositYear', '')::integer;
  defense_year_value integer := nullif(payload ->> 'defenseYear', '')::integer;
  extent_unit_value public.physical_extent_unit := nullif(payload ->> 'extentUnit', '')::public.physical_extent_unit;
  extent_count_value integer := nullif(payload ->> 'extentCount', '')::integer;
  advisor_label_value text := payload ->> 'advisorNoteLabel';
  coadvisor_label_value text := nullif(payload ->> 'coadvisorNoteLabel', '');
begin
  if coalesce(public.current_user_role() in ('cataloger', 'administrator'), false) is not true then
    raise exception 'active_staff_required';
  end if;
  select p.code, exists (
    select 1 from public.request_cataloging_people people
    where people.request_id = r.id and people.role = 'coadvisor'
  ) into selected_program_code, has_coadvisor
  from public.cataloging_requests r
  join public.academic_enrollments e on e.id = r.academic_enrollment_id
  join public.academic_programs p on p.id = e.academic_program_id
  where r.id = target_request_id and r.assigned_to = auth.uid() and r.status = 'in_review'
  for update of r;
  if not found then raise exception 'request_locked_by_another_staff'; end if;
  if deposit_year_value is null or deposit_year_value not between 1900 and 9999
    or defense_year_value is null or defense_year_value not between 1900 and deposit_year_value
    or extent_count_value is null or extent_count_value < 1 then
    raise exception 'valid_card_details_required';
  end if;
  if selected_program_code = 'mp-cecre-master' then
    if extent_unit_value <> 'volumes' or extent_count_value not in (2, 3) then raise exception 'mp_cecre_volume_extent_required'; end if;
  elsif extent_unit_value <> 'pages' then raise exception 'page_extent_required'; end if;
  if advisor_label_value not in ('Orientador', 'Orientadora')
    or (coadvisor_label_value is not null and coadvisor_label_value not in ('Coorientador', 'Coorientadora')) then
    raise exception 'valid_orientation_labels_required';
  end if;
  if has_coadvisor and coadvisor_label_value is null then raise exception 'coadvisor_note_label_required'; end if;
  insert into public.request_card_details (
    request_id, deposit_year, defense_year, extent_unit, extent_count,
    has_illustrations, advisor_note_label, coadvisor_note_label
  ) values (
    target_request_id, deposit_year_value, defense_year_value, extent_unit_value,
    extent_count_value, coalesce((payload ->> 'hasIllustrations')::boolean, false),
    advisor_label_value, coadvisor_label_value
  ) on conflict (request_id) do update set
    deposit_year = excluded.deposit_year, defense_year = excluded.defense_year,
    extent_unit = excluded.extent_unit, extent_count = excluded.extent_count,
    has_illustrations = excluded.has_illustrations,
    advisor_note_label = excluded.advisor_note_label,
    coadvisor_note_label = excluded.coadvisor_note_label, updated_at = now();
end;
$$;

create or replace function public.homologate_cataloging_card(target_request_id uuid)
returns table (homologation_id uuid, homologated_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare
  request_record record;
  metadata_record record;
  details_record record;
  staff_record record;
  people_snapshot jsonb;
  subjects_snapshot jsonb;
  card_snapshot jsonb;
  created_id uuid;
  created_at_value timestamptz := now();
  work_nature text;
begin
  if coalesce(public.current_user_role() in ('cataloger', 'administrator'), false) is not true then raise exception 'active_staff_required'; end if;
  select requests.*, programs.code as program_code, programs.name as program_name, programs.level as academic_level,
    programs.work_type, programs.cataloging_program_tracing
  into request_record
  from public.cataloging_requests requests
  join public.academic_enrollments enrollments on enrollments.id = requests.academic_enrollment_id
  join public.academic_programs programs on programs.id = enrollments.academic_program_id
  where requests.id = target_request_id and requests.assigned_to = auth.uid()
    and requests.status = 'in_review' for update of requests;
  if not found then raise exception 'request_not_ready_for_homologation'; end if;
  if exists (select 1 from public.cataloging_card_homologations where request_id = target_request_id) then raise exception 'cataloging_card_already_homologated'; end if;

  select * into metadata_record from public.request_cataloging_metadata
    where request_id = target_request_id and cdu_code is not null and cutter_code is not null;
  if not found then raise exception 'classification_required'; end if;
  select * into details_record from public.request_card_details where request_id = target_request_id;
  if not found then raise exception 'card_details_required'; end if;
  if not exists (select 1 from public.request_cataloging_people where request_id = target_request_id and role = 'author')
    or not exists (select 1 from public.request_cataloging_people where request_id = target_request_id and role = 'advisor') then
    raise exception 'author_and_advisor_authorities_required';
  end if;
  if not exists (select 1 from public.request_controlled_terms where request_id = target_request_id and is_primary) then raise exception 'primary_controlled_term_required'; end if;
  select professional_name, crb into staff_record from public.staff_profiles where profile_id = auth.uid();
  if not found then raise exception 'staff_professional_identification_required'; end if;

  select jsonb_agg(jsonb_build_object(
    'role', role, 'transcribedName', transcribed_name,
    'authorizedName', authorized_name_snapshot, 'position', position,
    'noteLabel', case role
      when 'advisor' then details_record.advisor_note_label
      when 'coadvisor' then details_record.coadvisor_note_label
      else null end
  ) order by position) into people_snapshot
  from public.request_cataloging_people where request_id = target_request_id;
  select jsonb_agg(jsonb_build_object(
    'labelPt', label_pt_snapshot, 'labelEn', label_en_snapshot,
    'isPrimary', is_primary, 'position', position
  ) order by position) into subjects_snapshot
  from public.request_controlled_terms where request_id = target_request_id;

  work_nature := case
    when request_record.program_code = 'mp-cecre-master' then 'Trabalho de Conclusão de Curso'
    else case request_record.work_type
    when 'undergraduate_thesis' then 'Trabalho de Conclusão de Curso'
    when 'specialization_thesis' then 'Trabalho de Conclusão de Curso'
    when 'dissertation' then 'Dissertação'
    when 'thesis' then 'Tese'
    end
  end;
  card_snapshot := jsonb_build_object(
    'institution', jsonb_build_object(
      'university', 'Universidade Federal da Bahia (UFBA)',
      'librarySystem', 'Sistema Universitário de Bibliotecas (SIBI)',
      'library', 'Biblioteca da Faculdade de Arquitetura (BIB/FA)'),
    'request', jsonb_build_object(
      'protocol', request_record.protocol, 'title', request_record.title,
      'subtitle', request_record.subtitle, 'equivalentTitle', request_record.equivalent_title,
      'otherTitles', request_record.other_titles, 'programName', request_record.program_name,
      'academicLevel', request_record.academic_level, 'workNature', work_nature,
      'programTracing', request_record.cataloging_program_tracing,
      'depositYear', details_record.deposit_year, 'defenseYear', details_record.defense_year,
      'extentUnit', details_record.extent_unit, 'extentCount', details_record.extent_count,
      'hasIllustrations', details_record.has_illustrations,
      'publicationPlace', details_record.publication_place),
    'people', people_snapshot, 'subjects', subjects_snapshot,
    'classification', jsonb_build_object('cdu', metadata_record.cdu_code, 'cutter', metadata_record.cutter_code),
    'technicalResponsibility', jsonb_build_object('name', staff_record.professional_name, 'crb', staff_record.crb),
    'catalogingConventions', jsonb_build_object(
      'electronicResourceLabel', '[recurso eletrônico]', 'pageAbbreviation', 'p.',
      'volumeAbbreviation', 'v.', 'illustrationAbbreviation', 'il.',
      'statementSeparator', '—', 'academicNoteSeparator', '–', 'subdivisionSeparator', '-'),
    'layoutStatus', 'institutional_models_validated'
  );

  insert into public.cataloging_card_homologations (
    request_id, snapshot, layout_version, homologated_by,
    librarian_name_snapshot, librarian_crb_snapshot, homologated_at
  ) values (
    target_request_id, card_snapshot, 'institutional-v2', auth.uid(),
    staff_record.professional_name, staff_record.crb, created_at_value
  ) returning id into created_id;
  update public.cataloging_requests set status = 'approved', updated_at = created_at_value where id = target_request_id;
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'cataloging_card_homologated', 'cataloging_request', target_request_id::text,
    jsonb_build_object('homologation_id', created_id, 'layout_version', 'institutional-v2'));
  return query select created_id, created_at_value;
end;
$$;

revoke all on function public.open_student_request_v2(jsonb) from public, anon, authenticated;
revoke all on function public.save_request_card_details(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.open_student_request_v2(jsonb) to authenticated;
grant execute on function public.save_request_card_details(uuid, jsonb) to authenticated;
