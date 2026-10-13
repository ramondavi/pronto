-- The assigned cataloger may prepare cataloging and the citation while student corrections are pending.

-- Final validation and release remain restricted to in_review.

create or replace function public.save_request_card_details(target_request_id uuid, payload jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  selected_program_code text; has_coadvisor boolean;
  deposit_year_value integer := nullif(payload ->> 'depositYear', '')::integer;
  defense_year_value integer := nullif(payload ->> 'defenseYear', '')::integer;
  extent_unit_value public.physical_extent_unit := nullif(payload ->> 'extentUnit', '')::public.physical_extent_unit;
  extent_count_value integer := nullif(payload ->> 'extentCount', '')::integer;
  advisor_label_value text := btrim(payload ->> 'advisorNoteLabel');
  coadvisor_label_value text := nullif(btrim(payload ->> 'coadvisorNoteLabel'), '');
begin
  if coalesce(public.current_user_role() in ('cataloger', 'administrator'), false) is not true then raise exception 'active_staff_required'; end if;
  select p.code, exists (select 1 from public.request_cataloging_people people where people.request_id = r.id and people.role = 'coadvisor') into selected_program_code, has_coadvisor from public.cataloging_requests r join public.academic_enrollments e on e.id = r.academic_enrollment_id join public.academic_programs p on p.id = e.academic_program_id where r.id = target_request_id and r.assigned_to = auth.uid() and r.status in ('in_review', 'changes_requested') for update of r;
  if not found then raise exception 'request_locked_by_another_staff'; end if;
  if deposit_year_value is null or deposit_year_value not between 1900 and 9999 or defense_year_value is null or defense_year_value not between 1900 and deposit_year_value or extent_count_value is null or extent_count_value < 1 then raise exception 'valid_card_details_required'; end if;
  if selected_program_code = 'mp-cecre-master' then if extent_unit_value <> 'volumes' or extent_count_value not in (2, 3) then raise exception 'mp_cecre_volume_extent_required'; end if; elsif extent_unit_value <> 'pages' then raise exception 'page_extent_required'; end if;
  if char_length(advisor_label_value) not between 3 and 60 or (coadvisor_label_value is not null and char_length(coadvisor_label_value) not between 3 and 60) then raise exception 'valid_orientation_labels_required'; end if;
  if has_coadvisor and coadvisor_label_value is null then raise exception 'coadvisor_note_label_required'; end if;
  insert into public.request_card_details (request_id, deposit_year, defense_year, extent_unit, extent_count, has_illustrations, advisor_note_label, coadvisor_note_label) values (target_request_id, deposit_year_value, defense_year_value, extent_unit_value, extent_count_value, coalesce((payload ->> 'hasIllustrations')::boolean, false), advisor_label_value, coadvisor_label_value) on conflict (request_id) do update set deposit_year = excluded.deposit_year, defense_year = excluded.defense_year, extent_unit = excluded.extent_unit, extent_count = excluded.extent_count, has_illustrations = excluded.has_illustrations, advisor_note_label = excluded.advisor_note_label, coadvisor_note_label = excluded.coadvisor_note_label, updated_at = now();
end;
$$;

create or replace function public.set_card_equivalent_title(target_request_id uuid, include_title boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(public.current_user_role() in ('cataloger', 'administrator'), false) is not true then raise exception 'active_staff_required'; end if;
  perform 1 from public.cataloging_requests where id = target_request_id and assigned_to = auth.uid() and status in ('in_review', 'changes_requested') for update;
  if not found then raise exception 'request_locked_by_another_staff'; end if;
  if include_title and not exists (select 1 from public.cataloging_requests where id = target_request_id and nullif(btrim(equivalent_title), '') is not null) then raise exception 'equivalent_title_missing'; end if;
  update public.request_card_details set include_equivalent_title = include_title, updated_at = now() where request_id = target_request_id;
  if not found then raise exception 'card_details_required'; end if;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
    values (auth.uid(), 'card_equivalent_title_decided', 'cataloging_request', target_request_id::text, jsonb_build_object('included', include_title));
end;
$$;

create or replace function public.revoke_author_birth_year_validation(target_request_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(public.current_user_role() in ('cataloger', 'administrator'), false) is not true then raise exception 'active_staff_required'; end if;
  perform 1 from public.cataloging_requests where id = target_request_id and assigned_to = auth.uid() and status in ('in_review', 'changes_requested') for update;
  if not found then raise exception 'request_locked_by_another_staff'; end if;
  update public.request_people set birth_year_validated_at = null, birth_year_validated_by = null, updated_at = now()
    where request_id = target_request_id and role = 'author' and birth_year_validated_at is not null;
  if not found then raise exception 'birth_year_validation_not_found'; end if;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
    values (auth.uid(), 'author_birth_year_validation_revoked', 'cataloging_request', target_request_id::text, '{}'::jsonb);
end;
$$;

create or replace function public.validate_request_citation(target_request_id uuid, citation_value text)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare validated_at_value timestamptz := now(); source_signature text;
begin
  if coalesce(public.current_user_role() in ('cataloger', 'administrator'), false) is not true then raise exception 'active_staff_required'; end if;
  perform 1 from public.cataloging_requests where id = target_request_id and assigned_to = auth.uid() and status in ('in_review', 'changes_requested') for update;
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
