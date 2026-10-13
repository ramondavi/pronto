create function public.admin_create_cdu_code_description(cdu_code_value text, description_value text, source_reference_value text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  clean_code text := public.sanitize_cataloging_text(cdu_code_value);
  clean_description text := public.sanitize_cataloging_text(description_value);
  clean_source text := nullif(btrim(source_reference_value), '');
begin
  if public.current_user_role() is distinct from 'administrator' then raise exception 'active_administrator_required'; end if;
  if clean_code is null or char_length(clean_code) not between 1 and 80
    or clean_description is null or char_length(clean_description) not between 3 and 1000
    or (clean_source is not null and char_length(clean_source) not between 3 and 1000)
  then raise exception 'valid_cdu_description_required'; end if;
  insert into public.cdu_code_descriptions (cdu_code, description, source_reference, submitted_by)
    values (clean_code, clean_description, clean_source, auth.uid());
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
    values (auth.uid(), 'cdu_code_description_created', 'cdu_code_description', clean_code, '{}'::jsonb);
end;
$$;

revoke all on function public.admin_create_cdu_code_description(text, text, text) from public, anon, authenticated;
grant execute on function public.admin_create_cdu_code_description(text, text, text) to authenticated;
