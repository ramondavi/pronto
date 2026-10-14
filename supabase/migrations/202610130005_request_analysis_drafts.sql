create table public.request_analysis_drafts (
  request_id uuid primary key references public.cataloging_requests(id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.request_analysis_drafts enable row level security;
revoke all on public.request_analysis_drafts from public, anon, authenticated;
grant select on public.request_analysis_drafts to authenticated;

create policy "assigned_staff_read_analysis_draft" on public.request_analysis_drafts
  for select to authenticated using (
    public.has_permission('staff.case.view')
    and exists (select 1 from public.cataloging_requests r where r.id = request_id and r.assigned_to = auth.uid())
  );

create function public.save_request_analysis_draft(target_request_id uuid, draft_payload jsonb)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare saved_at timestamptz := now();
begin
  if not public.has_permission('staff.case.view') then
    raise exception 'active_staff_required';
  end if;
  perform 1 from public.cataloging_requests
    where id = target_request_id and assigned_to = auth.uid()
      and status in ('in_review', 'changes_requested') for update;
  if not found then raise exception 'request_locked_by_another_staff'; end if;
  if jsonb_typeof(draft_payload) <> 'object'
    or jsonb_typeof(draft_payload -> 'validated') <> 'array'
    or jsonb_typeof(draft_payload -> 'selectedFields') <> 'array'
    or jsonb_typeof(draft_payload -> 'issueDetails') <> 'object'
    or jsonb_typeof(draft_payload -> 'values') <> 'object'
    or octet_length(draft_payload::text) > 65536 then
    raise exception 'invalid_analysis_draft';
  end if;
  insert into public.request_analysis_drafts (request_id, payload, updated_at)
    values (target_request_id, draft_payload, saved_at)
    on conflict (request_id) do update set payload = excluded.payload, updated_at = excluded.updated_at;
  return saved_at;
end; $$;
revoke all on function public.save_request_analysis_draft(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.save_request_analysis_draft(uuid, jsonb) to authenticated;

drop policy if exists "assigned_staff_read_cataloging_draft" on public.request_cataloging_drafts;
create policy "assigned_staff_read_cataloging_draft" on public.request_cataloging_drafts
  for select to authenticated using (
    public.has_permission('staff.case.view')
    and exists (select 1 from public.cataloging_requests r where r.id = request_id and r.assigned_to = auth.uid())
  );

create or replace function public.save_cataloging_draft(target_request_id uuid, draft_payload jsonb)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare saved_at timestamptz := now();
begin
  if not public.has_permission('staff.case.view') then raise exception 'permission_denied'; end if;
  perform 1 from public.cataloging_requests
    where id = target_request_id and assigned_to = auth.uid()
      and status in ('in_review', 'changes_requested') for update;
  if not found then raise exception 'request_locked_by_another_staff'; end if;
  if jsonb_typeof(draft_payload) <> 'object'
    or jsonb_typeof(draft_payload -> 'people') <> 'array'
    or jsonb_typeof(draft_payload -> 'terms') <> 'array'
    or jsonb_typeof(draft_payload -> 'cardDetails') <> 'object'
    or octet_length(draft_payload::text) > 65536 then
    raise exception 'invalid_cataloging_draft';
  end if;
  insert into public.request_cataloging_drafts (request_id, payload, updated_at)
    values (target_request_id, draft_payload, saved_at)
    on conflict (request_id) do update set payload = excluded.payload, updated_at = excluded.updated_at;
  return saved_at;
end; $$;
