create table public.student_request_drafts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.student_request_drafts enable row level security;
revoke all on public.student_request_drafts from public, anon, authenticated;
grant select, delete on public.student_request_drafts to authenticated;

create policy "student_read_own_draft" on public.student_request_drafts
  for select to authenticated using (user_id = auth.uid() and exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.status = 'active' and p.role = 'student'
  ));

create policy "student_delete_own_draft" on public.student_request_drafts
  for delete to authenticated using (user_id = auth.uid() and exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.status = 'active' and p.role = 'student'
  ));

create function public.save_student_request_draft(draft_payload jsonb)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare saved_at timestamptz := now();
begin
  if auth.uid() is null or not exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.status = 'active' and p.role = 'student'
  ) then raise exception 'not_authorized'; end if;
  if jsonb_typeof(draft_payload) <> 'object'
    or jsonb_typeof(draft_payload -> 'draft') <> 'object'
    or octet_length(draft_payload::text) > 131072 then
    raise exception 'invalid_student_draft';
  end if;
  insert into public.student_request_drafts (user_id, payload, updated_at)
    values (auth.uid(), draft_payload, saved_at)
    on conflict (user_id) do update set payload = excluded.payload, updated_at = excluded.updated_at;
  return saved_at;
end; $$;

revoke all on function public.save_student_request_draft(jsonb) from public, anon, authenticated;
grant execute on function public.save_student_request_draft(jsonb) to authenticated;

create index student_request_drafts_updated_at_idx on public.student_request_drafts (updated_at);

create function public.purge_expired_student_request_drafts()
returns void language sql security definer set search_path = public as $$
  delete from public.student_request_drafts where updated_at < now() - interval '60 days';
$$;
revoke all on function public.purge_expired_student_request_drafts() from public, anon, authenticated;
select cron.schedule('pronto-student-request-drafts-purge', '20 3 * * *', $$select public.purge_expired_student_request_drafts()$$);
