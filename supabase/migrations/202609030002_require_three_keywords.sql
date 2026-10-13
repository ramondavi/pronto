create or replace function public.open_student_request_v5(payload jsonb)
returns table (request_id uuid, generated_protocol text) language plpgsql security definer set search_path = '' as $$
declare
  keywords_pt jsonb := coalesce(payload -> 'keywordsPt', '[]'::jsonb);
  keywords_other jsonb := coalesce(payload -> 'keywordsEn', '[]'::jsonb);
begin
  if jsonb_typeof(keywords_pt) <> 'array' or jsonb_typeof(keywords_other) <> 'array'
    or jsonb_array_length(keywords_pt) < 3 or jsonb_array_length(keywords_other) < 3
    or exists (select 1 from jsonb_array_elements_text(keywords_pt) term where char_length(btrim(term)) not between 2 and 100)
    or exists (select 1 from jsonb_array_elements_text(keywords_other) term where char_length(btrim(term)) not between 2 and 100) then
    raise exception 'three_keywords_required';
  end if;

  return query select * from public.open_student_request_v4(payload);
end;
$$;

revoke all on function public.open_student_request_v5(jsonb) from public;
grant execute on function public.open_student_request_v5(jsonb) to authenticated;
