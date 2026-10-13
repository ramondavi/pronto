-- Prioridade operacional visível apenas à equipe; a justificativa não integra o registro legível pelo estudante.
create table public.request_priorities (
  request_id uuid primary key references public.cataloging_requests(id) on delete cascade,
  reason_code text not null check (reason_code in ('institutional_deadline', 'urgent_correction', 'coordination_request', 'other_documented')),
  reason_detail text check (reason_detail is null or char_length(btrim(reason_detail)) between 10 and 500),
  marked_by uuid not null references public.profiles(id) on delete restrict,
  marked_at timestamptz not null default now(),
  constraint priority_other_requires_detail check ((reason_code = 'other_documented') = (reason_detail is not null))
);
alter table public.request_priorities enable row level security;
create policy request_priorities_staff_read on public.request_priorities for select to authenticated
  using (public.current_user_role() in ('cataloger', 'administrator'));
revoke all on public.request_priorities from anon, authenticated;
grant select on public.request_priorities to authenticated;

create or replace function public.set_request_priority(
  target_request_id uuid, selected_reason_code text, selected_reason_detail text default null
) returns void language plpgsql security definer set search_path = '' as $$
declare request_status public.request_status; previous_code text; previous_detail text;
begin
  if coalesce(public.current_user_role() in ('cataloger', 'administrator'), false) is not true then
    raise exception 'active_staff_required';
  end if;
  select status into request_status from public.cataloging_requests where id = target_request_id for update;
  if not found then raise exception 'request_not_found'; end if;
  if request_status in ('completed', 'canceled') then raise exception 'request_not_open'; end if;
  select reason_code, reason_detail into previous_code, previous_detail
    from public.request_priorities where request_id = target_request_id;
  if selected_reason_code is null then
    if previous_code is null then return; end if;
    delete from public.request_priorities where request_id = target_request_id;
    insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
      values(auth.uid(), 'request_priority_removed', 'cataloging_request', target_request_id::text,
        jsonb_build_object('previous_reason_code', previous_code));
    return;
  end if;
  if selected_reason_code not in ('institutional_deadline', 'urgent_correction', 'coordination_request', 'other_documented') then
    raise exception 'invalid_priority_reason';
  end if;
  if selected_reason_code = 'other_documented' then
    if char_length(btrim(coalesce(selected_reason_detail, ''))) not between 10 and 500 then
      raise exception 'priority_detail_required';
    end if;
    selected_reason_detail := btrim(selected_reason_detail);
  else
    selected_reason_detail := null;
  end if;
  if previous_code is not distinct from selected_reason_code and previous_detail is not distinct from selected_reason_detail then return; end if;
  insert into public.request_priorities(request_id, reason_code, reason_detail, marked_by, marked_at)
    values(target_request_id, selected_reason_code, selected_reason_detail, auth.uid(), now())
    on conflict(request_id) do update set reason_code = excluded.reason_code,
      reason_detail = excluded.reason_detail, marked_by = excluded.marked_by, marked_at = excluded.marked_at;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
    values(auth.uid(), 'request_priority_set', 'cataloging_request', target_request_id::text,
      jsonb_build_object('reason_code', selected_reason_code, 'reason_detail', selected_reason_detail));
end;
$$;
revoke all on function public.set_request_priority(uuid, text, text) from public, anon;
grant execute on function public.set_request_priority(uuid, text, text) to authenticated;

create or replace function public.publish_staff_activity_event()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.entity_type = 'cataloging_request' and new.action in (
    'cataloging_request_assumed', 'cataloging_request_reassigned', 'cataloging_request_released',
    'request_changes_requested', 'request_corrections_submitted', 'request_analysis_completed',
    'request_citation_validated', 'cataloging_card_homologated', 'nada_consta_approved',
    'nada_consta_rejected', 'cataloging_request_completed', 'request_priority_set', 'request_priority_removed'
  ) then
    insert into public.staff_activity_events(event_id, request_id, occurred_at)
      select new.id, r.id, new.occurred_at from public.cataloging_requests r where r.id::text = new.entity_id;
  end if;
  return new;
end;
$$;

drop function public.list_staff_activity_feed(integer, timestamptz, uuid);
create function public.list_staff_activity_feed(
  page_size integer default 10,
  before_occurred_at timestamptz default null,
  before_event_id uuid default null
) returns table (
  event_id uuid, occurred_at timestamptz, action text,
  request_id uuid, protocol text, request_title text,
  actor_id uuid, actor_name text, actor_role text, avatar_choice integer,
  is_priority boolean
) language plpgsql stable security definer set search_path = '' as $$
begin
  if coalesce(public.current_user_role() in ('cataloger', 'administrator'), false) is not true then raise exception 'active_staff_required'; end if;
  if page_size not between 1 and 20 then raise exception 'invalid_page_size'; end if;
  if (before_occurred_at is null) <> (before_event_id is null) then raise exception 'invalid_feed_cursor'; end if;
  return query
  select l.id, l.occurred_at, l.action, r.id, r.protocol, r.title,
    p.id, coalesce(p.full_name, 'Equipe Pronto!'), coalesce(p.role::text, 'system'), p.avatar_choice,
    (priority.request_id is not null)
  from public.audit_logs l
  join public.cataloging_requests r on r.id::text = l.entity_id
  left join public.profiles p on p.id = l.actor_id
  left join public.request_priorities priority on priority.request_id = r.id
  where l.entity_type = 'cataloging_request'
    and l.action in (
      'cataloging_request_assumed', 'cataloging_request_reassigned', 'cataloging_request_released',
      'request_changes_requested', 'request_corrections_submitted', 'request_analysis_completed',
      'request_citation_validated', 'cataloging_card_homologated', 'nada_consta_approved',
      'nada_consta_rejected', 'cataloging_request_completed', 'request_priority_set', 'request_priority_removed'
    )
    and (before_occurred_at is null or (l.occurred_at, l.id) < (before_occurred_at, before_event_id))
  order by l.occurred_at desc, l.id desc limit page_size;
end;
$$;
revoke all on function public.list_staff_activity_feed(integer, timestamptz, uuid) from public, anon;
grant execute on function public.list_staff_activity_feed(integer, timestamptz, uuid) to authenticated;

alter publication supabase_realtime add table public.request_priorities;
