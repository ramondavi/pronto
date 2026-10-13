-- Referência do trabalho proposta pelo Pronto! e validada na revisão dos metadados.
alter table public.request_analyses
  add column citation_text text check (char_length(citation_text) between 20 and 4000),
  add column citation_source_signature text,
  add column citation_validated_at timestamptz,
  add column citation_validated_by uuid references public.profiles(id) on delete restrict;

create or replace function public.request_citation_source_signature(target_request_id uuid)
returns text language sql stable security definer set search_path = '' as $$
  select md5(jsonb_build_object(
    'title', r.title, 'subtitle', r.subtitle, 'program', p.code,
    'deposit_year', d.deposit_year, 'defense_year', d.defense_year,
    'place', d.publication_place,
    'authors', (select coalesce(jsonb_agg(jsonb_build_array(a.position, a.transcribed_name) order by a.position, a.id), '[]'::jsonb)
      from public.request_people a where a.request_id = r.id and a.role = 'author')
  )::text)
  from public.cataloging_requests r
  join public.academic_enrollments e on e.id = r.academic_enrollment_id
  join public.academic_programs p on p.id = e.academic_program_id
  join public.request_card_details d on d.request_id = r.id
  where r.id = target_request_id
    and public.current_user_role() in ('cataloger', 'administrator')
$$;

create or replace function public.validate_request_citation(target_request_id uuid, citation_value text)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare validated_at_value timestamptz := now(); source_signature text;
begin
  if coalesce(public.current_user_role() in ('cataloger', 'administrator'), false) is not true then raise exception 'active_staff_required'; end if;
  perform 1 from public.cataloging_requests where id = target_request_id and assigned_to = auth.uid() and status = 'in_review' for update;
  if not found then raise exception 'request_locked_by_another_staff'; end if;
  if char_length(btrim(coalesce(citation_value, ''))) not between 20 and 4000 then raise exception 'valid_citation_required'; end if;
  source_signature := public.request_citation_source_signature(target_request_id);
  if source_signature is null then raise exception 'citation_source_incomplete'; end if;
  insert into public.request_analyses (request_id, analysis_notes, internal_note, last_edited_by, citation_text, citation_source_signature, citation_validated_at, citation_validated_by, updated_at)
  values (target_request_id, '', '', auth.uid(), btrim(citation_value), source_signature, validated_at_value, auth.uid(), validated_at_value)
  on conflict (request_id) do update set citation_text = excluded.citation_text, citation_source_signature = excluded.citation_source_signature,
    citation_validated_at = validated_at_value, citation_validated_by = auth.uid(), last_edited_by = auth.uid(), updated_at = validated_at_value;
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'request_citation_validated', 'cataloging_request', target_request_id::text, jsonb_build_object('source_signature', source_signature));
  return validated_at_value;
end;
$$;

create or replace function public.complete_request_analysis(target_request_id uuid)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare completed_at_value timestamptz := now();
begin
  if coalesce(public.current_user_role() in ('cataloger', 'administrator'), false) is not true then raise exception 'active_staff_required'; end if;
  perform 1 from public.cataloging_requests where id = target_request_id and assigned_to = auth.uid() and status = 'in_review' for update;
  if not found then raise exception 'request_locked_by_another_staff'; end if;
  if not exists (select 1 from public.request_analyses a where a.request_id = target_request_id
    and a.citation_validated_at is not null and a.citation_source_signature = public.request_citation_source_signature(target_request_id))
    then raise exception 'citation_validation_required'; end if;
  insert into public.request_analyses (request_id, analysis_notes, internal_note, last_edited_by, review_completed_at, review_completed_by, updated_at)
  values (target_request_id, '', '', auth.uid(), completed_at_value, auth.uid(), completed_at_value)
  on conflict (request_id) do update set review_completed_at = completed_at_value, review_completed_by = auth.uid(), updated_at = completed_at_value;
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata) values (auth.uid(), 'request_analysis_completed', 'cataloging_request', target_request_id::text, '{}'::jsonb);
  return completed_at_value;
end;
$$;

revoke all on function public.request_citation_source_signature(uuid) from public, anon;
revoke all on function public.validate_request_citation(uuid, text) from public, anon;
revoke all on function public.complete_request_analysis(uuid) from public, anon;
grant execute on function public.request_citation_source_signature(uuid) to authenticated;
grant execute on function public.validate_request_citation(uuid, text) to authenticated;
grant execute on function public.complete_request_analysis(uuid) to authenticated;

create or replace function public.require_validated_citation_for_homologation()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.request_analyses a where a.request_id = new.request_id
    and a.review_completed_at is not null and a.citation_validated_at is not null
    and a.citation_source_signature = public.request_citation_source_signature(new.request_id))
    then raise exception 'citation_validation_required'; end if;
  return new;
end;
$$;
create trigger cataloging_card_requires_validated_citation
  before insert on public.cataloging_card_homologations
  for each row execute function public.require_validated_citation_for_homologation();
revoke all on function public.require_validated_citation_for_homologation() from public, anon, authenticated;

create or replace function public.get_validated_request_citation(target_request_id uuid)
returns text language sql stable security definer set search_path = '' as $$
  select a.citation_text from public.request_analyses a
  join public.cataloging_requests r on r.id = a.request_id
  join public.student_profiles s on s.id = r.student_profile_id
  where r.id = target_request_id and s.profile_id = auth.uid()
    and public.current_user_role() = 'student'
    and r.status in ('approved', 'completed')
    and a.review_completed_at is not null and a.citation_validated_at is not null
$$;
revoke all on function public.get_validated_request_citation(uuid) from public, anon;
grant execute on function public.get_validated_request_citation(uuid) to authenticated;
