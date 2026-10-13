-- Incremento 4: fila, ticket locking e análise bibliotecária.

alter table public.cataloging_requests
  add column assigned_to uuid references public.profiles(id) on delete restrict,
  add column assigned_at timestamptz,
  add column locked_at timestamptz;

create index cataloging_requests_queue_index
  on public.cataloging_requests (status, submitted_at);
create index cataloging_requests_assigned_to_index
  on public.cataloging_requests (assigned_to, status);

create table public.request_analyses (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.cataloging_requests(id) on delete cascade,
  analysis_notes text not null default '' check (char_length(analysis_notes) <= 20000),
  internal_note text not null default '' check (char_length(internal_note) <= 10000),
  last_edited_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.request_analyses enable row level security;

create policy "request_analyses_read_by_staff" on public.request_analyses
  for select to authenticated using (
    public.current_user_role() in ('cataloger', 'administrator')
  );

revoke all on table public.request_analyses from anon, authenticated;
grant select on table public.request_analyses to authenticated;

create or replace function public.assume_cataloging_request(target_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed_count integer;
begin
  if coalesce(public.current_user_role() in ('cataloger', 'administrator'), false) is not true then
    raise exception 'active_staff_required';
  end if;

  update public.cataloging_requests
  set assigned_to = auth.uid(), assigned_at = now(), locked_at = now(),
      status = 'in_review', updated_at = now()
  where id = target_request_id
    and assigned_to is null
    and status in ('submitted', 'in_review', 'changes_requested');
  get diagnostics changed_count = row_count;

  if changed_count = 0 then
    if exists (select 1 from public.cataloging_requests where id = target_request_id and assigned_to is not null) then
      raise exception 'request_already_assigned';
    end if;
    raise exception 'request_not_available';
  end if;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id)
  values (auth.uid(), 'cataloging_request_assumed', 'cataloging_request', target_request_id::text);
end;
$$;

create or replace function public.release_cataloging_request(target_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  previous_assignee uuid;
begin
  if coalesce(public.current_user_role() in ('cataloger', 'administrator'), false) is not true then
    raise exception 'active_staff_required';
  end if;

  select assigned_to into previous_assignee
  from public.cataloging_requests where id = target_request_id for update;
  if previous_assignee is null then raise exception 'request_not_assigned'; end if;
  if previous_assignee <> auth.uid() and public.current_user_role() <> 'administrator' then
    raise exception 'request_owned_by_another_staff';
  end if;

  update public.cataloging_requests
  set assigned_to = null, assigned_at = null, locked_at = null,
      status = 'submitted', updated_at = now()
  where id = target_request_id;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'cataloging_request_released', 'cataloging_request', target_request_id::text,
    jsonb_build_object('previous_assignee', previous_assignee));
end;
$$;

create or replace function public.reassign_cataloging_request(target_request_id uuid, target_staff_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  previous_assignee uuid;
begin
  if public.current_user_role() is distinct from 'administrator'::public.user_role then
    raise exception 'active_administrator_required';
  end if;
  if not exists (
    select 1 from public.profiles
    where id = target_staff_id and status = 'active' and role in ('cataloger', 'administrator')
  ) then raise exception 'active_staff_target_required'; end if;

  select assigned_to into previous_assignee
  from public.cataloging_requests where id = target_request_id for update;
  if not found then raise exception 'request_not_found'; end if;

  update public.cataloging_requests
  set assigned_to = target_staff_id, assigned_at = now(), locked_at = now(),
      status = 'in_review', updated_at = now()
  where id = target_request_id and status not in ('completed', 'canceled');
  if not found then raise exception 'request_not_available'; end if;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'cataloging_request_reassigned', 'cataloging_request', target_request_id::text,
    jsonb_build_object('previous_assignee', previous_assignee, 'new_assignee', target_staff_id));
end;
$$;

create or replace function public.save_request_analysis(
  target_request_id uuid,
  analysis_notes_value text,
  internal_note_value text
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_at timestamptz := now();
begin
  if coalesce(public.current_user_role() in ('cataloger', 'administrator'), false) is not true then
    raise exception 'active_staff_required';
  end if;
  if not exists (
    select 1 from public.cataloging_requests
    where id = target_request_id and assigned_to = auth.uid()
      and status in ('in_review', 'changes_requested')
  ) then raise exception 'request_locked_by_another_staff'; end if;
  if char_length(coalesce(analysis_notes_value, '')) > 20000
    or char_length(coalesce(internal_note_value, '')) > 10000 then
    raise exception 'analysis_content_too_long';
  end if;

  insert into public.request_analyses (
    request_id, analysis_notes, internal_note, last_edited_by, updated_at
  ) values (
    target_request_id, coalesce(analysis_notes_value, ''),
    coalesce(internal_note_value, ''), auth.uid(), saved_at
  )
  on conflict (request_id) do update
  set analysis_notes = excluded.analysis_notes,
      internal_note = excluded.internal_note,
      last_edited_by = excluded.last_edited_by,
      updated_at = saved_at;

  update public.cataloging_requests set locked_at = saved_at, updated_at = saved_at
  where id = target_request_id;
  return saved_at;
end;
$$;

revoke all on function public.assume_cataloging_request(uuid) from public, anon, authenticated;
revoke all on function public.release_cataloging_request(uuid) from public, anon, authenticated;
revoke all on function public.reassign_cataloging_request(uuid, uuid) from public, anon, authenticated;
revoke all on function public.save_request_analysis(uuid, text, text) from public, anon, authenticated;
grant execute on function public.assume_cataloging_request(uuid) to authenticated;
grant execute on function public.release_cataloging_request(uuid) to authenticated;
grant execute on function public.reassign_cataloging_request(uuid, uuid) to authenticated;
grant execute on function public.save_request_analysis(uuid, text, text) to authenticated;
