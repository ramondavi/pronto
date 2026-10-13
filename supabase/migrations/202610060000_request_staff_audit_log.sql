-- Registro operacional por protocolo, sem expor metadata ou valores da auditoria.
create function public.list_request_staff_audit_log(
  target_request_id uuid,
  page_size integer default 20,
  before_occurred_at timestamptz default null,
  before_event_id uuid default null
)
returns table (
  event_id uuid, occurred_at timestamptz, action text,
  actor_name text, actor_role text
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if coalesce(public.current_user_role() in ('cataloger', 'administrator'), false) is not true then
    raise exception 'active_staff_required';
  end if;
  if page_size not between 1 and 50 then raise exception 'invalid_page_size'; end if;
  if (before_occurred_at is null) <> (before_event_id is null) then raise exception 'invalid_audit_cursor'; end if;

  return query
  select l.id, l.occurred_at, l.action,
    coalesce(p.full_name, 'Sistema')::text,
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
    and (before_occurred_at is null or (l.occurred_at, l.id) < (before_occurred_at, before_event_id))
  order by l.occurred_at desc, l.id desc
  limit page_size;
end;
$$;

revoke all on function public.list_request_staff_audit_log(uuid, integer, timestamptz, uuid) from public, anon;
grant execute on function public.list_request_staff_audit_log(uuid, integer, timestamptz, uuid) to authenticated;
