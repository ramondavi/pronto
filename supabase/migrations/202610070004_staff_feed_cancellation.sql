-- Cancelamentos por declaração descumprida passam a integrar o feed interno.
create or replace function public.publish_staff_activity_event()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.entity_type = 'cataloging_request' and new.action in (
    'cataloging_request_assumed', 'cataloging_request_reassigned', 'cataloging_request_released',
    'request_changes_requested', 'request_corrections_submitted', 'request_analysis_completed',
    'request_citation_validated', 'cataloging_card_homologated', 'nada_consta_approved',
    'nada_consta_rejected', 'cataloging_request_completed', 'request_priority_set',
    'request_priority_removed', 'request_canceled_failed_declaration'
  ) then
    insert into public.staff_activity_events(event_id, request_id, occurred_at)
      select new.id, r.id, new.occurred_at from public.cataloging_requests r where r.id::text = new.entity_id;
  end if;
  return new;
end;
$$;

insert into public.staff_activity_events(event_id, request_id, occurred_at)
select l.id, r.id, l.occurred_at
from public.audit_logs l
join public.cataloging_requests r on r.id::text = l.entity_id
where l.entity_type = 'cataloging_request'
  and l.action = 'request_canceled_failed_declaration'
on conflict (event_id) do nothing;

drop function public.list_staff_activity_feed(integer, timestamptz, uuid);
create function public.list_staff_activity_feed(
  page_size integer default 10,
  before_occurred_at timestamptz default null,
  before_event_id uuid default null
) returns table (
  event_id uuid, occurred_at timestamptz, action text,
  request_id uuid, protocol text, request_title text,
  actor_id uuid, actor_name text, actor_role text, avatar_choice integer,
  is_priority boolean, cancellation_reason text
) language plpgsql stable security definer set search_path = '' as $$
begin
  if coalesce(public.current_user_role() in ('cataloger', 'administrator'), false) is not true then raise exception 'active_staff_required'; end if;
  if page_size not between 1 and 20 then raise exception 'invalid_page_size'; end if;
  if (before_occurred_at is null) <> (before_event_id is null) then raise exception 'invalid_feed_cursor'; end if;
  return query
  select l.id, l.occurred_at, l.action, r.id, r.protocol, r.title || case when nullif(btrim(r.subtitle), '') is not null then ': ' || btrim(r.subtitle) else '' end,
    p.id, coalesce(p.full_name, 'Equipe Pronto!'), coalesce(p.role::text, 'system'), p.avatar_choice,
    (priority.request_id is not null),
    case when l.action = 'request_canceled_failed_declaration' then r.cancellation_reason else null end
  from public.audit_logs l
  join public.cataloging_requests r on r.id::text = l.entity_id
  left join public.profiles p on p.id = l.actor_id
  left join public.request_priorities priority on priority.request_id = r.id
  where l.entity_type = 'cataloging_request'
    and l.action in (
      'cataloging_request_assumed', 'cataloging_request_reassigned', 'cataloging_request_released',
      'request_changes_requested', 'request_corrections_submitted', 'request_analysis_completed',
      'request_citation_validated', 'cataloging_card_homologated', 'nada_consta_approved',
      'nada_consta_rejected', 'cataloging_request_completed', 'request_priority_set',
      'request_priority_removed', 'request_canceled_failed_declaration'
    )
    and (before_occurred_at is null or (l.occurred_at, l.id) < (before_occurred_at, before_event_id))
  order by l.occurred_at desc, l.id desc limit page_size;
end;
$$;
revoke all on function public.list_staff_activity_feed(integer, timestamptz, uuid) from public, anon;
grant execute on function public.list_staff_activity_feed(integer, timestamptz, uuid) to authenticated;
