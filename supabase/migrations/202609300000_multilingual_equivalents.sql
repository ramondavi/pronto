-- Preserve every language supplied for a new request while keeping older protocols intact.
alter table public.request_keywords drop constraint if exists request_keywords_language_check;
alter table public.request_keywords add constraint request_keywords_language_check
  check (language in ('pt', 'en', 'es', 'de', 'fr', 'it'));

create or replace function public.open_student_request_v8(payload jsonb)
returns table (request_id uuid, generated_protocol text)
language plpgsql security definer set search_path = '' as $$
declare
  original_language text := payload ->> 'originalLanguage';
  titles jsonb := coalesce(payload -> 'equivalentTitles', '[]'::jsonb);
  keywords_pt jsonb := coalesce(payload -> 'keywordsPt', '[]'::jsonb);
  keywords_en jsonb := coalesce(payload -> 'keywordsEn', '[]'::jsonb);
  keywords_original jsonb := coalesce(payload -> 'keywordsOriginal', '[]'::jsonb);
  additional_language text := coalesce(payload ->> 'additionalLanguage', '');
  additional_keywords jsonb := coalesce(payload -> 'additionalKeywords', '[]'::jsonb);
  required_titles integer;
  created_id uuid;
  created_protocol text;
  term_value text;
  term_position integer;
begin
  if original_language is null or original_language not in ('pt', 'en', 'es', 'de', 'fr', 'it')
    or jsonb_typeof(titles) <> 'array'
    or jsonb_typeof(keywords_pt) <> 'array'
    or jsonb_typeof(keywords_en) <> 'array'
    or jsonb_typeof(keywords_original) <> 'array'
    or jsonb_typeof(additional_keywords) <> 'array' then
    raise exception 'multilingual_equivalents_required';
  end if;

  required_titles := case when original_language in ('pt', 'en') then 1 else 2 end;
  if jsonb_array_length(titles) < required_titles or jsonb_array_length(titles) > required_titles + 1
    or (original_language <> 'en' and not exists (select 1 from jsonb_array_elements(titles) title where title ->> 'language' = 'en'))
    or (original_language <> 'pt' and not exists (select 1 from jsonb_array_elements(titles) title where title ->> 'language' = 'pt'))
    or (select count(distinct title ->> 'language') from jsonb_array_elements(titles) title) <> jsonb_array_length(titles)
    or exists (select 1 from jsonb_array_elements(titles) title where title ->> 'language' = original_language) then
    raise exception 'multilingual_equivalents_required';
  end if;

  if additional_language <> '' then
    if additional_language not in ('es', 'de', 'fr', 'it') or additional_language = original_language
      or not exists (select 1 from jsonb_array_elements(titles) title where title ->> 'language' = additional_language)
      or jsonb_array_length(titles) <> required_titles + 1 then
      raise exception 'multilingual_equivalents_required';
    end if;
  elsif jsonb_array_length(titles) <> required_titles or jsonb_array_length(additional_keywords) <> 0 then
    raise exception 'multilingual_equivalents_required';
  end if;
  if exists (select 1 from jsonb_array_elements(titles) title
    where title ->> 'language' is null or title ->> 'language' not in ('pt', 'en', additional_language)
      or title ->> 'title' is null or char_length(btrim(title ->> 'title')) not between 3 and 500) then
    raise exception 'multilingual_equivalents_required';
  end if;

  if jsonb_array_length(keywords_pt) < 3 or jsonb_array_length(keywords_pt) > 10
    or jsonb_array_length(keywords_en) <> jsonb_array_length(keywords_pt)
    or (original_language in ('pt', 'en') and jsonb_array_length(keywords_original) <> 0)
    or (original_language not in ('pt', 'en') and jsonb_array_length(keywords_original) <> jsonb_array_length(keywords_pt))
    or (additional_language <> '' and jsonb_array_length(additional_keywords) <> jsonb_array_length(keywords_pt))
    or exists (select 1 from jsonb_array_elements_text(keywords_pt) term where char_length(btrim(term)) not between 2 and 100)
    or exists (select 1 from jsonb_array_elements_text(keywords_en) term where char_length(btrim(term)) not between 2 and 100)
    or exists (select 1 from jsonb_array_elements_text(keywords_original) term where char_length(btrim(term)) not between 2 and 100)
    or exists (select 1 from jsonb_array_elements_text(additional_keywords) term where char_length(btrim(term)) not between 2 and 100) then
    raise exception 'multilingual_keywords_required';
  end if;

  select opened.request_id, opened.generated_protocol into created_id, created_protocol
    from public.open_student_request_v7(payload) opened;

  if original_language not in ('pt', 'en') then
    term_position := 0;
    for term_value in select btrim(value) from jsonb_array_elements_text(keywords_original) loop
      insert into public.request_keywords (request_id, language, term, position)
        values (created_id, original_language, term_value, term_position);
      term_position := term_position + 1;
    end loop;
  end if;

  if additional_language <> '' then
    term_position := 0;
    for term_value in select btrim(value) from jsonb_array_elements_text(additional_keywords) loop
      insert into public.request_keywords (request_id, language, term, position)
        values (created_id, additional_language, term_value, term_position);
      term_position := term_position + 1;
    end loop;
  end if;

  return query select created_id, created_protocol;
end;
$$;

revoke all on function public.open_student_request(jsonb), public.open_student_request_v2(jsonb),
  public.open_student_request_v3(jsonb), public.open_student_request_v4(jsonb),
  public.open_student_request_v5(jsonb), public.open_student_request_v6(jsonb),
  public.open_student_request_v7(jsonb) from public, anon, authenticated;
revoke all on function public.open_student_request_v8(jsonb) from public, anon, authenticated;
grant execute on function public.open_student_request_v8(jsonb) to authenticated;
