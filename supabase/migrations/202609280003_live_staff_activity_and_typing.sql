-- Eventos resumidos para atualizar o feed sem expor o conteúdo da auditoria.
create table public.staff_activity_events (
  event_id uuid primary key references public.audit_logs(id) on delete cascade,
  request_id uuid not null references public.cataloging_requests(id) on delete cascade,
  occurred_at timestamptz not null
);
alter table public.staff_activity_events enable row level security;
create policy staff_activity_events_read on public.staff_activity_events for select to authenticated
  using (public.current_user_role() in ('cataloger', 'administrator'));
revoke all on public.staff_activity_events from anon, authenticated;
grant select on public.staff_activity_events to authenticated;

create or replace function public.publish_staff_activity_event()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.entity_type = 'cataloging_request' and new.action in (
    'cataloging_request_assumed', 'cataloging_request_reassigned', 'cataloging_request_released',
    'request_changes_requested', 'request_corrections_submitted', 'request_analysis_completed',
    'request_citation_validated', 'cataloging_card_homologated', 'nada_consta_approved',
    'nada_consta_rejected', 'cataloging_request_completed'
  ) then
    insert into public.staff_activity_events(event_id, request_id, occurred_at)
      select new.id, r.id, new.occurred_at from public.cataloging_requests r where r.id::text = new.entity_id;
  end if;
  return new;
end;
$$;
create trigger audit_log_staff_activity after insert on public.audit_logs
  for each row execute function public.publish_staff_activity_event();
revoke all on function public.publish_staff_activity_event() from public, anon, authenticated;

insert into public.staff_activity_events(event_id, request_id, occurred_at)
select l.id, r.id, l.occurred_at from public.audit_logs l
join public.cataloging_requests r on r.id::text = l.entity_id
where l.entity_type = 'cataloging_request' and l.action in (
  'cataloging_request_assumed', 'cataloging_request_reassigned', 'cataloging_request_released',
  'request_changes_requested', 'request_corrections_submitted', 'request_analysis_completed',
  'request_citation_validated', 'cataloging_card_homologated', 'nada_consta_approved',
  'nada_consta_rejected', 'cataloging_request_completed'
);
alter publication supabase_realtime add table public.staff_activity_events;

-- Presença efêmera: somente participantes de uma conversa veem quem está digitando.
create table public.staff_typing_indicators (
  sender_id uuid not null references public.profiles(id) on delete cascade,
  conversation_key text not null,
  recipient_id uuid references public.profiles(id) on delete cascade,
  group_id uuid references public.staff_message_groups(id) on delete cascade,
  expires_at timestamptz not null,
  primary key(sender_id, conversation_key),
  constraint staff_typing_one_target check ((recipient_id is not null) <> (group_id is not null))
);
create index staff_typing_by_recipient on public.staff_typing_indicators(recipient_id, expires_at);
create index staff_typing_by_group on public.staff_typing_indicators(group_id, expires_at);
alter table public.staff_typing_indicators enable row level security;
create policy staff_typing_read_participants on public.staff_typing_indicators for select to authenticated
  using (public.current_user_role() in ('cataloger', 'administrator') and
    (sender_id = auth.uid() or recipient_id = auth.uid() or
      (group_id is not null and public.is_staff_message_group_member(group_id))));
revoke all on public.staff_typing_indicators from anon, authenticated;
grant select on public.staff_typing_indicators to authenticated;

create or replace function public.set_staff_typing(
  target_recipient_id uuid default null,
  target_group_id uuid default null,
  is_typing boolean default true
)
returns void language plpgsql security definer set search_path = '' as $$
declare target_key text;
begin
  if coalesce(public.current_user_role() in ('cataloger', 'administrator'), false) is not true then raise exception 'active_staff_required'; end if;
  if (target_recipient_id is null) = (target_group_id is null) then raise exception 'typing_target_required'; end if;
  if target_recipient_id is not null then
    if target_recipient_id = auth.uid() or not exists (
      select 1 from public.profiles where id = target_recipient_id and role in ('cataloger', 'administrator') and status = 'active'
    ) then raise exception 'active_staff_recipient_required'; end if;
    target_key := 'direct:' || target_recipient_id::text;
  else
    if not public.is_staff_message_group_member(target_group_id) then raise exception 'group_membership_required'; end if;
    target_key := 'group:' || target_group_id::text;
  end if;
  if is_typing then
    insert into public.staff_typing_indicators(sender_id, conversation_key, recipient_id, group_id, expires_at)
    values(auth.uid(), target_key, target_recipient_id, target_group_id, now() + interval '5 seconds')
    on conflict(sender_id, conversation_key) do update set expires_at = excluded.expires_at;
  else
    update public.staff_typing_indicators set expires_at = now()
    where sender_id = auth.uid() and conversation_key = target_key;
  end if;
end;
$$;
revoke all on function public.set_staff_typing(uuid, uuid, boolean) from public, anon;
grant execute on function public.set_staff_typing(uuid, uuid, boolean) to authenticated;
alter publication supabase_realtime add table public.staff_typing_indicators;
