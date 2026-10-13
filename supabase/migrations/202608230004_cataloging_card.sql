-- Incremento 7: revisão, snapshot e homologação da ficha catalográfica.

create table public.cataloging_card_homologations (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.cataloging_requests(id) on delete restrict,
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  layout_version text not null default 'provisional-v1',
  homologated_by uuid not null references public.profiles(id) on delete restrict,
  librarian_name_snapshot text not null,
  librarian_crb_snapshot text not null,
  homologated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.cataloging_card_homologations enable row level security;
create policy "cataloging_card_homologations_staff_read" on public.cataloging_card_homologations
  for select to authenticated using (public.current_user_role() in ('cataloger', 'administrator'));
revoke all on table public.cataloging_card_homologations from anon, authenticated;
grant select on table public.cataloging_card_homologations to authenticated;

create or replace function public.prevent_cataloging_card_homologation_change()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'cataloging_card_homologation_is_immutable';
end;
$$;
create trigger cataloging_card_homologation_immutable
  before update or delete on public.cataloging_card_homologations
  for each row execute function public.prevent_cataloging_card_homologation_change();

create or replace function public.homologate_cataloging_card(target_request_id uuid)
returns table (homologation_id uuid, homologated_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare
  request_record record;
  metadata_record record;
  staff_record record;
  people_snapshot jsonb;
  subjects_snapshot jsonb;
  card_snapshot jsonb;
  created_id uuid;
  created_at_value timestamptz := now();
begin
  if coalesce(public.current_user_role() in ('cataloger', 'administrator'), false) is not true then
    raise exception 'active_staff_required';
  end if;
  select requests.*, programs.name as program_name, programs.level as academic_level
    into request_record
  from public.cataloging_requests requests
  join public.academic_enrollments enrollments on enrollments.id = requests.academic_enrollment_id
  join public.academic_programs programs on programs.id = enrollments.academic_program_id
  where requests.id = target_request_id and requests.assigned_to = auth.uid()
    and requests.status = 'in_review' for update of requests;
  if not found then raise exception 'request_not_ready_for_homologation'; end if;
  if exists (select 1 from public.cataloging_card_homologations where request_id = target_request_id) then
    raise exception 'cataloging_card_already_homologated';
  end if;

  select * into metadata_record from public.request_cataloging_metadata
    where request_id = target_request_id and cdu_code is not null and cutter_code is not null;
  if not found then raise exception 'classification_required'; end if;
  if not exists (select 1 from public.request_cataloging_people where request_id = target_request_id and role = 'author')
    or not exists (select 1 from public.request_cataloging_people where request_id = target_request_id and role = 'advisor') then
    raise exception 'author_and_advisor_authorities_required';
  end if;
  if not exists (select 1 from public.request_controlled_terms where request_id = target_request_id and is_primary) then
    raise exception 'primary_controlled_term_required';
  end if;
  select staff.professional_name, staff.crb into staff_record
    from public.staff_profiles staff where staff.profile_id = auth.uid();
  if not found then raise exception 'staff_professional_identification_required'; end if;

  select jsonb_agg(jsonb_build_object(
    'role', role, 'transcribedName', transcribed_name,
    'authorizedName', authorized_name_snapshot, 'position', position
  ) order by position) into people_snapshot
  from public.request_cataloging_people where request_id = target_request_id;
  select jsonb_agg(jsonb_build_object(
    'labelPt', label_pt_snapshot, 'labelEn', label_en_snapshot,
    'isPrimary', is_primary, 'position', position
  ) order by position) into subjects_snapshot
  from public.request_controlled_terms where request_id = target_request_id;

  card_snapshot := jsonb_build_object(
    'institution', jsonb_build_object(
      'university', 'Universidade Federal da Bahia — UFBA',
      'librarySystem', 'Sistema Universitário de Bibliotecas — SIBI',
      'library', 'Biblioteca da Faculdade de Arquitetura — BIB/FA'),
    'request', jsonb_build_object(
      'protocol', request_record.protocol, 'title', request_record.title,
      'subtitle', request_record.subtitle, 'equivalentTitle', request_record.equivalent_title,
      'otherTitles', request_record.other_titles, 'volumeInformation', request_record.volume_information,
      'specialCases', request_record.special_cases, 'programName', request_record.program_name,
      'academicLevel', request_record.academic_level),
    'people', people_snapshot,
    'subjects', subjects_snapshot,
    'classification', jsonb_build_object('cdu', metadata_record.cdu_code, 'cutter', metadata_record.cutter_code),
    'technicalResponsibility', jsonb_build_object('name', staff_record.professional_name, 'crb', staff_record.crb),
    'catalogingConventions', jsonb_build_object('electronicResourceLabel', '[recurso eletrônico]', 'physicalDescriptionAbbreviation', 'p.', 'tracingsLabel', 'Traçados'),
    'layoutStatus', 'provisional_pending_institutional_examples'
  );

  insert into public.cataloging_card_homologations (
    request_id, snapshot, homologated_by, librarian_name_snapshot,
    librarian_crb_snapshot, homologated_at
  ) values (
    target_request_id, card_snapshot, auth.uid(), staff_record.professional_name,
    staff_record.crb, created_at_value
  ) returning id into created_id;
  update public.cataloging_requests set status = 'approved', updated_at = created_at_value
    where id = target_request_id;
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'cataloging_card_homologated', 'cataloging_request', target_request_id::text,
    jsonb_build_object('homologation_id', created_id, 'layout_version', 'provisional-v1'));
  return query select created_id, created_at_value;
end;
$$;

revoke all on function public.prevent_cataloging_card_homologation_change() from public, anon, authenticated;
revoke all on function public.homologate_cataloging_card(uuid) from public, anon, authenticated;
grant execute on function public.homologate_cataloging_card(uuid) to authenticated;
