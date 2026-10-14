-- Horário de fechamento excepcional por data, sem alterar o cálculo do SLA.
create table public.library_daily_hours (
  service_date date primary key,
  closing_time time without time zone not null,
  updated_by uuid not null references public.profiles(id),
  updated_at timestamptz not null default now(),
  constraint library_daily_hours_closing_time_check
    check (closing_time > time '08:00' and closing_time <= time '23:59')
);

alter table public.library_daily_hours enable row level security;

create policy "library_daily_hours_public_read" on public.library_daily_hours
  for select to anon using (true);
create policy "library_daily_hours_active_read" on public.library_daily_hours
  for select to authenticated using (public.is_active_user());

revoke all on table public.library_daily_hours from public, anon, authenticated;
grant select on table public.library_daily_hours to anon, authenticated;

create function public.admin_set_daily_closing(
  target_date date,
  target_closing_time time without time zone
)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if public.current_user_role() is distinct from 'administrator' then
    raise exception 'active_administrator_required';
  end if;
  if target_date is null or (target_closing_time is not null and
    (extract(isodow from target_date) > 5 or target_closing_time <= time '08:00' or target_closing_time > time '23:59')) then
    raise exception 'invalid_daily_closing';
  end if;

  if target_closing_time is null then
    delete from public.library_daily_hours where service_date = target_date;
  else
    insert into public.library_daily_hours(service_date, closing_time, updated_by)
      values (target_date, target_closing_time, auth.uid())
      on conflict (service_date) do update set
        closing_time = excluded.closing_time,
        updated_by = excluded.updated_by,
        updated_at = now();
  end if;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id)
    values (auth.uid(), 'library_daily_closing_changed', 'library_daily_hours', target_date::text);
end $$;

revoke all on function public.admin_set_daily_closing(date,time without time zone) from public, anon, authenticated;
grant execute on function public.admin_set_daily_closing(date,time without time zone) to authenticated;
