-- A autorização da conta acompanha o autor indicado pelo solicitante, não a posição principal.
create function public.open_student_request_v11(payload jsonb)
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
    if program_code = 'athdc-specialization' and author_count > 1 then
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

-- A ficha homologada recebe o ano somente na entrada do autor validado.
create or replace function public.include_validated_birth_year_in_card_snapshot()
returns trigger language plpgsql security definer set search_path = '' as $$
declare validated_position integer; validated_year integer;
begin
  select rp.position, rp.birth_year into validated_position, validated_year
  from public.request_people rp
  where rp.request_id = new.request_id and rp.role = 'author' and rp.birth_year_validated_at is not null
  order by rp.position limit 1;
  if validated_year is not null then
    new.snapshot := jsonb_set(new.snapshot, '{people}', (
      select jsonb_agg(
        case when person ->> 'role' = 'author' and person ->> 'position' = validated_position::text
          then jsonb_set(jsonb_set(person, '{birthYear}', to_jsonb(validated_year)), '{birthYearValidated}', 'true'::jsonb)
          else person end order by ordinal
      )
      from jsonb_array_elements(coalesce(new.snapshot -> 'people', '[]'::jsonb)) with ordinality as items(person, ordinal)
    ));
  end if;
  return new;
end;
$$;
