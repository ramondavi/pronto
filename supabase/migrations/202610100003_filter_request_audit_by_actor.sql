-- Consulta por pessoa sem expor os dados brutos da auditoria.
create function public.list_request_audit_actors(target_request_id uuid)
returns table (actor_key text, actor_name text, actor_role text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if coalesce(public.current_user_role() in ('cataloger', 'administrator'), false) is not true then
    raise exception 'active_staff_required';
  end if;
  return query
  select coalesce(l.actor_id::text, 'system'), coalesce(p.full_name, 'Sistema')::text,
    coalesce(p.role::text, 'system')::text
  from public.audit_logs l
  left join public.profiles p on p.id = l.actor_id
  where l.entity_type = 'cataloging_request'
    and l.entity_id = target_request_id::text
    and exists (select 1 from public.cataloging_requests r where r.id = target_request_id)
    and l.action in (
      'cataloging_request_assumed', 'cataloging_request_reassigned', 'cataloging_request_released',
      'request_changes_requested', 'request_corrections_submitted', 'request_analysis_completed',
      'request_field_corrected_by_staff', 'request_direct_corrections_reset', 'request_direct_correction_restored',
      'request_citation_validated', 'cataloging_card_homologated', 'nada_consta_uploaded',
      'nada_consta_approved', 'nada_consta_rejected', 'repository_deposit_started',
      'repository_publication_verified', 'cataloging_request_completed', 'request_canceled_failed_declaration',
      'request_priority_set', 'request_priority_removed', 'public_work_link_checked',
      'card_equivalent_title_decided', 'author_birth_year_validation_revoked',
      'coordination_magic_link_issued', 'coordination_magic_link_invalidated'
    )
  group by l.actor_id, p.full_name, p.role
  order by coalesce(p.full_name, 'Sistema'), coalesce(l.actor_id::text, 'system');
end;
$$;

create function public.list_request_staff_audit_log_filtered(
  target_request_id uuid,
  page_size integer default 20,
  before_occurred_at timestamptz default null,
  before_event_id uuid default null,
  filter_actor_key text default null
)
returns table (
  event_id uuid, occurred_at timestamptz, action text,
  actor_key text, actor_name text, actor_role text, field_changes jsonb
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if coalesce(public.current_user_role() in ('cataloger', 'administrator'), false) is not true then
    raise exception 'active_staff_required';
  end if;
  if page_size not between 1 and 50 then raise exception 'invalid_page_size'; end if;
  if (before_occurred_at is null) <> (before_event_id is null) then raise exception 'invalid_audit_cursor'; end if;
  if filter_actor_key is not null and filter_actor_key <> 'system'
    and filter_actor_key !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  then raise exception 'invalid_actor_filter'; end if;

  return query
  select l.id, l.occurred_at, l.action,
    coalesce(l.actor_id::text, 'system'), coalesce(p.full_name, 'Sistema')::text,
    coalesce(p.role::text, 'system')::text,
    case
      when l.action = 'request_field_corrected_by_staff' then jsonb_build_array(jsonb_build_object(
        'field_key', l.metadata ->> 'field_key',
        'field_label', case l.metadata ->> 'field_key'
          when 'title' then 'Título' when 'subtitle' then 'Subtítulo'
          when 'equivalent_title' then 'Título em outro idioma' when 'other_titles' then 'Outros títulos'
          when 'public_work_url' then 'Link público do trabalho'
          when 'volume_information' then 'Informações de volume'
          when 'library_note' then 'Mensagem do estudante'
          when 'registration_number' then 'Matrícula'
          when 'academic_program_id' then 'Curso ou programa'
          when 'author' then 'Autor' when 'advisor' then 'Orientador'
          when 'coadvisor' then 'Coorientador'
          when 'keywords_pt' then 'Palavras-chave em português'
          when 'keywords_en' then 'Palavras-chave em inglês'
          else coalesce(l.metadata ->> 'field_key', 'Campo') end,
        'previous_value', l.metadata -> 'previous_value',
        'new_value', l.metadata -> 'corrected_value'
      ))
      when l.action = 'request_direct_correction_restored' then jsonb_build_array(jsonb_build_object(
        'field_key', l.metadata ->> 'field_key',
        'field_label', case l.metadata ->> 'field_key'
          when 'title' then 'Título' when 'subtitle' then 'Subtítulo'
          when 'equivalent_title' then 'Título em outro idioma'
          when 'public_work_url' then 'Link público do trabalho'
          when 'author' then 'Autor' when 'advisor' then 'Orientador'
          when 'coadvisor' then 'Coorientador'
          when 'keywords_pt' then 'Palavras-chave em português'
          when 'keywords_en' then 'Palavras-chave em inglês'
          else coalesce(l.metadata ->> 'field_key', 'Campo') end,
        'new_value', l.metadata -> 'restored_value'
      ))
      when l.action = 'request_changes_requested' then (
        select coalesce(jsonb_agg(jsonb_build_object(
          'field_key', i.field_key, 'field_label', i.field_label
        ) order by i.created_at, i.id), '[]'::jsonb)
        from public.request_field_issues i
        join public.request_revision_rounds rr on rr.id = i.revision_round_id and rr.request_id = target_request_id
        where i.revision_round_id = case when l.metadata ->> 'revision_round_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then (l.metadata ->> 'revision_round_id')::uuid else null end
      )
      when l.action = 'request_corrections_submitted' then (
        select coalesce(jsonb_agg(jsonb_build_object(
          'field_key', c.field_key, 'field_label', coalesce(i.field_label, c.field_key),
          'previous_value', c.previous_value, 'new_value', c.corrected_value
        ) order by c.submitted_at, c.id), '[]'::jsonb)
        from public.request_corrections c
        join public.request_revision_rounds rr on rr.id = c.revision_round_id and rr.request_id = target_request_id
        left join public.request_field_issues i on i.revision_round_id = c.revision_round_id and i.field_key = c.field_key
        where c.revision_round_id = case when l.metadata ->> 'revision_round_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then (l.metadata ->> 'revision_round_id')::uuid else null end
      )
      else '[]'::jsonb
    end
  from public.audit_logs l
  left join public.profiles p on p.id = l.actor_id
  where l.entity_type = 'cataloging_request'
    and l.entity_id = target_request_id::text
    and exists (select 1 from public.cataloging_requests r where r.id = target_request_id)
    and l.action in (
      'cataloging_request_assumed', 'cataloging_request_reassigned', 'cataloging_request_released',
      'request_changes_requested', 'request_corrections_submitted', 'request_analysis_completed',
      'request_field_corrected_by_staff', 'request_direct_corrections_reset', 'request_direct_correction_restored',
      'request_citation_validated', 'cataloging_card_homologated', 'nada_consta_uploaded',
      'nada_consta_approved', 'nada_consta_rejected', 'repository_deposit_started',
      'repository_publication_verified', 'cataloging_request_completed', 'request_canceled_failed_declaration',
      'request_priority_set', 'request_priority_removed', 'public_work_link_checked',
      'card_equivalent_title_decided', 'author_birth_year_validation_revoked',
      'coordination_magic_link_issued', 'coordination_magic_link_invalidated'
    )
    and (filter_actor_key is null or coalesce(l.actor_id::text, 'system') = filter_actor_key)
    and (before_occurred_at is null or (l.occurred_at, l.id) < (before_occurred_at, before_event_id))
  order by l.occurred_at desc, l.id desc
  limit page_size;
end;
$$;

revoke all on function public.list_request_audit_actors(uuid) from public, anon;
grant execute on function public.list_request_audit_actors(uuid) to authenticated;
revoke all on function public.list_request_staff_audit_log_filtered(uuid, integer, timestamptz, uuid, text) from public, anon;
grant execute on function public.list_request_staff_audit_log_filtered(uuid, integer, timestamptz, uuid, text) to authenticated;
