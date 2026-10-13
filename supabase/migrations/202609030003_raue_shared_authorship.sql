drop index if exists public.request_people_one_author;

create or replace function public.open_student_request_v6(payload jsonb)
returns table (request_id uuid, generated_protocol text) language plpgsql security definer set search_path = '' as $$
declare
  created_id uuid; created_protocol text; program_code text;
  extra_author text;
begin
  select p.code into program_code from public.academic_programs p where p.id = (payload ->> 'academicProgramId')::uuid;
  if program_code <> 'athdc-specialization' and jsonb_array_length(coalesce(payload #> '{people,additionalAuthors}', '[]'::jsonb)) > 0 then raise exception 'shared_authorship_not_allowed'; end if;
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
