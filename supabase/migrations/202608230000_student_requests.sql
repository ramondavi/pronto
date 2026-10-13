-- Incremento 3: vínculos acadêmicos e abertura segura de solicitações pelo estudante.

create type public.request_status as enum (
  'submitted', 'in_review', 'changes_requested', 'approved', 'completed', 'canceled'
);
create type public.person_role as enum ('author', 'advisor', 'coadvisor');

-- Mantém os programas aprovados reproduzíveis também pelo fluxo do Supabase CLI.
insert into public.academic_programs (
  code, name, short_name, level, work_type, repository_deposit_enabled,
  repository_document_type_label, repository_academic_degree_label,
  repository_collection_label, repository_program_label
) values
  (
    'architecture-urbanism-undergraduate', 'Bacharelado em Arquitetura e Urbanismo',
    'Arquitetura e Urbanismo', 'undergraduate', 'undergraduate_thesis', false,
    'Trabalho de Conclusão de Curso', 'Bacharelado',
    'Faculdade de Arquitetura > Trabalho de Conclusão de Curso (Graduação) - Arquitetura (Faculdade de Arquitetura)',
    'Bacharelado em Arquitetura e Urbanismo'
  ),
  (
    'athdc-specialization', 'Especialização em Assistência Técnica, Habitação e Direito à Cidade',
    'Especialização ATHDC', 'specialization', 'specialization_thesis', true,
    'Trabalho de Conclusão de Curso', 'Especialização',
    'Faculdade de Arquitetura > Programa de Pós-Graduação em Arquitetura e Urbanismo (AUE) > Trabalho de Conclusão de Curso (Especialização) - Assistência Técnica, Habitação e Direito à Cidade (AUE)',
    'Especialização em Assistência Técnica, Habitação e Direito à Cidade'
  ),
  (
    'mp-cecre-master', 'Mestrado Profissional em Conservação e Restauração de Monumentos e Núcleos Históricos',
    'MP/CECRE', 'master', 'dissertation', true, 'Dissertação', 'Mestrado Profissional',
    'Faculdade de Arquitetura > Mestrado Profissional em Conservação e Restauração de Monumentos e Núcleos Históricos (MP/CECRE) > Dissertação (MP/CECRE)',
    'Mestrado Profissional em Conservação e Restauração de Monumentos e Núcleos Históricos'
  ),
  (
    'ppgau-academic-master', 'Mestrado em Arquitetura e Urbanismo', 'Mestrado PPGAU',
    'master', 'dissertation', true, 'Dissertação', 'Mestrado Acadêmico',
    'Faculdade de Arquitetura > Programa de Pós-Graduação em Arquitetura e Urbanismo (PPGAU) > Dissertação (PPGAU)',
    'Mestrado em Arquitetura e Urbanismo'
  ),
  (
    'ppgau-doctorate', 'Doutorado em Arquitetura e Urbanismo', 'Doutorado PPGAU',
    'doctorate', 'thesis', true, 'Tese', 'Doutorado',
    'Faculdade de Arquitetura > Programa de Pós-Graduação em Arquitetura e Urbanismo (PPGAU) > Tese (PPGAU)',
    'Doutorado em Arquitetura e Urbanismo'
  )
on conflict (code) do nothing;

create table public.academic_enrollments (
  id uuid primary key default gen_random_uuid(),
  student_profile_id uuid not null references public.student_profiles(id) on delete cascade,
  academic_program_id uuid not null references public.academic_programs(id),
  registration_number text not null check (registration_number ~ '^[[:alnum:]./-]{3,30}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_profile_id, academic_program_id, registration_number)
);

create table public.cataloging_requests (
  id uuid primary key default gen_random_uuid(),
  student_profile_id uuid not null references public.student_profiles(id) on delete restrict,
  academic_enrollment_id uuid not null references public.academic_enrollments(id) on delete restrict,
  protocol text not null unique check (protocol ~ '^FC[0-9]{4}-[0-9]{4}$'),
  status public.request_status not null default 'submitted',
  title text not null check (char_length(btrim(title)) between 3 and 500),
  subtitle text,
  equivalent_title text,
  other_titles jsonb not null default '[]'::jsonb check (jsonb_typeof(other_titles) = 'array'),
  public_work_url text not null,
  special_cases jsonb not null default '[]'::jsonb check (jsonb_typeof(special_cases) = 'array'),
  volume_information text,
  library_note text,
  defended_and_approved boolean not null check (defended_and_approved),
  final_file_confirmed boolean not null check (final_file_confirmed),
  approval_page_confirmed boolean not null check (approval_page_confirmed),
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index cataloging_requests_one_active_per_student
  on public.cataloging_requests (student_profile_id)
  where status in ('submitted', 'in_review', 'changes_requested', 'approved');

create table public.request_people (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.cataloging_requests(id) on delete cascade,
  role public.person_role not null,
  transcribed_name text not null check (char_length(btrim(transcribed_name)) between 3 and 300),
  authorized_name text,
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index request_people_one_author on public.request_people (request_id)
  where role = 'author';

create table public.request_keywords (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.cataloging_requests(id) on delete cascade,
  language text not null check (language in ('pt', 'en')),
  term text not null check (char_length(btrim(term)) between 2 and 100),
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_id, language, term)
);

create table public.protocol_counters (
  year integer primary key check (year between 2020 and 9999),
  last_number integer not null check (last_number between 1 and 9999)
);

alter table public.academic_enrollments enable row level security;
alter table public.cataloging_requests enable row level security;
alter table public.request_people enable row level security;
alter table public.request_keywords enable row level security;
alter table public.protocol_counters enable row level security;

create policy "academic_enrollments_read_own_or_staff" on public.academic_enrollments
  for select to authenticated using (
    public.is_active_user() and (
      student_profile_id = (select id from public.student_profiles where profile_id = auth.uid())
      or public.current_user_role() in ('cataloger', 'administrator')
    )
  );
create policy "cataloging_requests_read_own_or_staff" on public.cataloging_requests
  for select to authenticated using (
    public.is_active_user() and (
      student_profile_id = (select id from public.student_profiles where profile_id = auth.uid())
      or public.current_user_role() in ('cataloger', 'administrator')
    )
  );
create policy "request_people_read_with_request" on public.request_people
  for select to authenticated using (
    exists (select 1 from public.cataloging_requests where id = request_id)
  );
create policy "request_keywords_read_with_request" on public.request_keywords
  for select to authenticated using (
    exists (select 1 from public.cataloging_requests where id = request_id)
  );

revoke all on table public.academic_enrollments, public.cataloging_requests,
  public.request_people, public.request_keywords, public.protocol_counters from anon, authenticated;
grant select on table public.academic_enrollments, public.cataloging_requests,
  public.request_people, public.request_keywords to authenticated;

create or replace function public.open_student_request(payload jsonb)
returns table (request_id uuid, generated_protocol text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  student_id uuid;
  enrollment_id uuid;
  request_uuid uuid;
  program_id uuid;
  protocol_year integer := extract(year from current_date)::integer;
  protocol_number integer;
  protocol_value text;
  keyword_value text;
  keyword_position integer;
  special_case text;
begin
  if public.current_user_role() is distinct from 'student'::public.user_role then
    raise exception 'active_student_required';
  end if;

  select id into student_id from public.student_profiles where profile_id = auth.uid();
  program_id := nullif(payload ->> 'academicProgramId', '')::uuid;
  if not exists (select 1 from public.academic_programs where id = program_id and active) then
    raise exception 'active_academic_program_required';
  end if;
  if exists (select 1 from public.cataloging_requests where student_profile_id = student_id
    and status in ('submitted', 'in_review', 'changes_requested', 'approved')) then
    raise exception 'active_request_already_exists';
  end if;
  if coalesce(payload ->> 'registrationNumber', '') !~ '^[[:alnum:]./-]{3,30}$' then
    raise exception 'valid_registration_required';
  end if;
  if char_length(btrim(coalesce(payload ->> 'title', ''))) not between 3 and 500 then
    raise exception 'valid_title_required';
  end if;
  if coalesce(payload ->> 'publicWorkUrl', '') !~ '^https://[^[:space:]]+$' then
    raise exception 'public_https_url_required';
  end if;
  if coalesce((payload ->> 'defendedAndApproved')::boolean, false) is not true
    or coalesce((payload ->> 'finalFileConfirmed')::boolean, false) is not true
    or coalesce((payload ->> 'approvalPageConfirmed')::boolean, false) is not true then
    raise exception 'required_declarations_missing';
  end if;
  if char_length(btrim(coalesce(payload #>> '{people,author}', ''))) < 3
    or char_length(btrim(coalesce(payload #>> '{people,advisor}', ''))) < 3 then
    raise exception 'author_and_advisor_required';
  end if;
  if jsonb_array_length(coalesce(payload -> 'keywordsPt', '[]'::jsonb)) = 0 then
    raise exception 'portuguese_keyword_required';
  end if;
  for special_case in select jsonb_array_elements_text(coalesce(payload -> 'specialCases', '[]'::jsonb)) loop
    if special_case not in ('coadvisor', 'cotutelle', 'double_degree', 'multiple_volumes') then
      raise exception 'invalid_special_case';
    end if;
  end loop;

  insert into public.academic_enrollments (student_profile_id, academic_program_id, registration_number)
  values (student_id, program_id, btrim(payload ->> 'registrationNumber'))
  on conflict (student_profile_id, academic_program_id, registration_number)
  do update set updated_at = now()
  returning id into enrollment_id;

  insert into public.protocol_counters (year, last_number) values (protocol_year, 1)
  on conflict (year) do update set last_number = public.protocol_counters.last_number + 1
  returning last_number into protocol_number;
  if protocol_number > 9999 then raise exception 'annual_protocol_limit_reached'; end if;
  protocol_value := 'FC' || protocol_year::text || '-' || lpad(protocol_number::text, 4, '0');

  insert into public.cataloging_requests (
    student_profile_id, academic_enrollment_id, protocol, title, subtitle,
    equivalent_title, other_titles, public_work_url, special_cases, volume_information,
    library_note, defended_and_approved, final_file_confirmed, approval_page_confirmed
  ) values (
    student_id, enrollment_id, protocol_value, btrim(payload ->> 'title'),
    nullif(btrim(payload ->> 'subtitle'), ''), nullif(btrim(payload ->> 'equivalentTitle'), ''),
    coalesce(payload -> 'otherTitles', '[]'::jsonb), payload ->> 'publicWorkUrl',
    coalesce(payload -> 'specialCases', '[]'::jsonb), nullif(btrim(payload ->> 'volumeInformation'), ''),
    nullif(btrim(payload ->> 'libraryNote'), ''), true, true, true
  ) returning id into request_uuid;

  insert into public.request_people (request_id, role, transcribed_name, position)
  values (request_uuid, 'author', btrim(payload #>> '{people,author}'), 0),
         (request_uuid, 'advisor', btrim(payload #>> '{people,advisor}'), 0);
  if char_length(btrim(coalesce(payload #>> '{people,coadvisor}', ''))) >= 3 then
    insert into public.request_people (request_id, role, transcribed_name, position)
    values (request_uuid, 'coadvisor', btrim(payload #>> '{people,coadvisor}'), 0);
  end if;

  keyword_position := 0;
  for keyword_value in select btrim(value) from jsonb_array_elements_text(coalesce(payload -> 'keywordsPt', '[]'::jsonb)) loop
    if char_length(keyword_value) not between 2 and 100 then raise exception 'invalid_keyword'; end if;
    insert into public.request_keywords (request_id, language, term, position)
    values (request_uuid, 'pt', keyword_value, keyword_position);
    keyword_position := keyword_position + 1;
  end loop;
  keyword_position := 0;
  for keyword_value in select btrim(value) from jsonb_array_elements_text(coalesce(payload -> 'keywordsEn', '[]'::jsonb)) loop
    if char_length(keyword_value) not between 2 and 100 then raise exception 'invalid_keyword'; end if;
    insert into public.request_keywords (request_id, language, term, position)
    values (request_uuid, 'en', keyword_value, keyword_position);
    keyword_position := keyword_position + 1;
  end loop;

  return query select request_uuid, protocol_value;
end;
$$;

revoke all on function public.open_student_request(jsonb) from public, anon, authenticated;
grant execute on function public.open_student_request(jsonb) to authenticated;
