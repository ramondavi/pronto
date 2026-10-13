-- Visão resumida de ações de atendimento para a equipe ativa.
-- Nunca retorna metadata do log, valores corrigidos, documentos ou dados de autenticação.
create or replace function public.list_staff_activity_feed(
  page_size integer default 10,
  before_occurred_at timestamptz default null,
  before_event_id uuid default null
)
returns table (
  event_id uuid, occurred_at timestamptz, action text,
  request_id uuid, protocol text, request_title text,
  actor_id uuid, actor_name text, actor_role text, avatar_choice integer
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if coalesce(public.current_user_role() in ('cataloger', 'administrator'), false) is not true then
    raise exception 'active_staff_required';
  end if;
  if page_size not between 1 and 20 then raise exception 'invalid_page_size'; end if;
  if (before_occurred_at is null) <> (before_event_id is null) then raise exception 'invalid_feed_cursor'; end if;

  return query
  select l.id, l.occurred_at, l.action, r.id, r.protocol, r.title,
    p.id, coalesce(p.full_name, 'Equipe Pronto!'), coalesce(p.role::text, 'system'), p.avatar_choice
  from public.audit_logs l
  join public.cataloging_requests r on r.id::text = l.entity_id
  left join public.profiles p on p.id = l.actor_id
  where l.entity_type = 'cataloging_request'
    and l.action in (
      'cataloging_request_assumed', 'cataloging_request_reassigned', 'cataloging_request_released',
      'request_changes_requested', 'request_corrections_submitted', 'request_analysis_completed',
      'request_citation_validated', 'cataloging_card_homologated', 'nada_consta_approved',
      'nada_consta_rejected', 'cataloging_request_completed'
    )
    and (before_occurred_at is null or (l.occurred_at, l.id) < (before_occurred_at, before_event_id))
  order by l.occurred_at desc, l.id desc
  limit page_size;
end;
$$;

revoke all on function public.list_staff_activity_feed(integer, timestamptz, uuid) from public, anon;
grant execute on function public.list_staff_activity_feed(integer, timestamptz, uuid) to authenticated;
