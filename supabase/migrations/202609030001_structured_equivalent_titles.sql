alter table public.cataloging_requests
  add column original_language text not null default 'pt' check (original_language in ('pt', 'en', 'es', 'de', 'fr', 'it')),
  add column equivalent_titles jsonb not null default '[]'::jsonb check (jsonb_typeof(equivalent_titles) = 'array');

update public.cataloging_requests
set equivalent_titles = case when equivalent_title is null then '[]'::jsonb else jsonb_build_array(jsonb_build_object('language', 'en', 'title', equivalent_title)) end;

create or replace function public.open_student_request_v4(payload jsonb)
returns table (request_id uuid, generated_protocol text) language plpgsql security definer set search_path = '' as $$
declare created_request_id uuid; created_protocol text; original_language_value text := coalesce(nullif(payload ->> 'originalLanguage', ''), 'pt'); titles jsonb := coalesce(payload -> 'equivalentTitles', '[]'::jsonb);
begin
  if original_language_value not in ('pt', 'en', 'es', 'de', 'fr', 'it') or jsonb_typeof(titles) <> 'array' or jsonb_array_length(titles) < 1 then raise exception 'valid_equivalent_titles_required'; end if;
  if exists (select 1 from jsonb_array_elements(titles) item where item ->> 'language' not in ('pt', 'en', 'es', 'de', 'fr', 'it') or char_length(btrim(item ->> 'title')) not between 3 and 500) then raise exception 'valid_equivalent_titles_required'; end if;
  if exists (select 1 from jsonb_array_elements(titles) item where item ->> 'language' = original_language_value) or (original_language_value <> 'pt' and not exists (select 1 from jsonb_array_elements(titles) item where item ->> 'language' = 'pt')) then raise exception 'valid_equivalent_titles_required'; end if;
  select opened.request_id, opened.generated_protocol into created_request_id, created_protocol from public.open_student_request_v3(payload) opened;
  update public.cataloging_requests set original_language = original_language_value, equivalent_titles = titles, equivalent_title = (select item ->> 'title' from jsonb_array_elements(titles) item order by case item ->> 'language' when 'en' then 1 when 'es' then 2 when 'de' then 3 when 'fr' then 4 when 'it' then 5 when 'pt' then 6 end limit 1) where id = created_request_id;
  return query select created_request_id, created_protocol;
end;
$$;

revoke all on function public.open_student_request_v4(jsonb) from public;
grant execute on function public.open_student_request_v4(jsonb) to authenticated;
