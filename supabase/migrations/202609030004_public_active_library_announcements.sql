grant select on table public.library_announcements to anon;

create policy "library_announcements_read_public_when_current" on public.library_announcements for select to anon
  using (active and starts_at <= now() and (ends_at is null or ends_at >= now()));
