-- TFG admite de um a três autores; representante da RAU+E permanece solicitante.
create or replace function public.open_student_request_v6(payload jsonb)
returns table (request_id uuid, generated_protocol text) language plpgsql security definer set search_path = '' as $$
declare
  created_id uuid; created_protocol text; program_code text; representative_name text;
  extra_author text;
begin
  select p.code into program_code from public.academic_programs p where p.id = (payload ->> 'academicProgramId')::uuid;
  if program_code not in ('athdc-specialization','architecture-urbanism-undergraduate') and jsonb_array_length(coalesce(payload #> '{people,additionalAuthors}', '[]'::jsonb)) > 0 then raise exception 'shared_authorship_not_allowed'; end if;
  if program_code='architecture-urbanism-undergraduate' and jsonb_array_length(coalesce(payload #> '{people,additionalAuthors}', '[]'::jsonb)) > 2 then
    raise exception 'tfg_author_limit_exceeded';
  end if;
  if public.has_retrospective_access() then
    select regexp_replace(translate(lower(p.full_name),'áàâãäéèêëíìîïóòôõöúùûüç','aaaaaeeeeiiiiooooouuuuc'),'[^a-z0-9]','','g')
      into representative_name from public.profiles p where p.id=auth.uid();
    if exists(select 1 from jsonb_array_elements_text(jsonb_build_array(payload #>> '{people,author}') || coalesce(payload #> '{people,additionalAuthors}', '[]'::jsonb)) names(value)
      where regexp_replace(translate(lower(value),'áàâãäéèêëíìîïóòôõöúùûüç','aaaaaeeeeiiiiooooouuuuc'),'[^a-z0-9]','','g')=representative_name) then
      raise exception 'representative_is_not_author';
    end if;
  end if;
  if exists (select 1 from jsonb_array_elements_text(coalesce(payload #> '{people,additionalAuthors}', '[]'::jsonb)) value where char_length(btrim(value)) not between 3 and 300) then raise exception 'valid_shared_authors_required'; end if;
  select opened.request_id, opened.generated_protocol into created_id, created_protocol from public.open_student_request_v5(payload) opened;
  for extra_author in select btrim(value) from jsonb_array_elements_text(coalesce(payload #> '{people,additionalAuthors}', '[]'::jsonb)) loop
    insert into public.request_people (request_id, role, transcribed_name) values (created_id, 'author', extra_author);
  end loop;
  return query select created_id, created_protocol;
end;
$$;
revoke all on function public.open_student_request_v6(jsonb) from public;
grant execute on function public.open_student_request_v6(jsonb) to authenticated;

-- Ano de nascimento acompanha somente o coautor solicitante também no TFG.
-- A autorização da conta acompanha o autor indicado pelo solicitante, não a posição principal.
create or replace function public.open_student_request_v11(payload jsonb)
returns table (request_id uuid, generated_protocol text) language plpgsql security definer set search_path = '' as $$
declare
  created_id uuid; created_protocol text; saved_birth_date date; program_code text;
  use_birth_year boolean := coalesce((payload #>> '{people,birthYearAcknowledged}')::boolean, false);
  selected_index_text text := payload #>> '{people,birthYearAuthorIndex}';
  selected_index integer;
  author_count integer := 1 + jsonb_array_length(coalesce(payload #> '{people,additionalAuthors}', '[]'::jsonb));
  safe_payload jsonb := jsonb_set(payload, '{people,birthYearAcknowledged}', 'false'::jsonb, true);
begin
  select p.code into program_code from public.academic_programs p where p.id = (payload ->> 'academicProgramId')::uuid;
  if use_birth_year then
    if program_code in ('athdc-specialization','architecture-urbanism-undergraduate') and author_count > 1 then
      if selected_index_text is null or selected_index_text !~ '^(0|[1-9][0-9]*)$' then raise exception 'requesting_author_required'; end if;
      selected_index := selected_index_text::integer;
    else
      selected_index := 0;
    end if;
    if selected_index < 0 or selected_index >= author_count then raise exception 'requesting_author_required'; end if;
    select sp.birth_date into saved_birth_date from public.student_profiles sp where sp.profile_id = auth.uid();
    if saved_birth_date is null then raise exception 'student_birth_date_required'; end if;
  end if;

  select opened.request_id, opened.generated_protocol into created_id, created_protocol
    from public.open_student_request_v10(safe_payload) opened;
  if use_birth_year then
    update public.request_people rp
      set birth_year = extract(year from saved_birth_date)::integer, birth_year_acknowledged_at = now()
      where rp.request_id = created_id and rp.role = 'author' and rp.position = selected_index;
    if not found then raise exception 'requesting_author_required'; end if;
  end if;
  return query select created_id, created_protocol;
end;
$$;
revoke all on function public.open_student_request_v10(jsonb), public.open_student_request_v11(jsonb) from public, anon, authenticated;
grant execute on function public.open_student_request_v11(jsonb) to authenticated;

