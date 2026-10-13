create or replace function public.add_business_days(start_at timestamptz, business_days integer)
returns timestamptz language plpgsql stable set search_path='' as $$
declare result timestamptz:=start_at; remaining integer:=greatest(business_days,0);
begin
  while remaining>0 loop
    result:=result+interval '1 day';
    if extract(isodow from result)<6 and not exists (
      select 1 from public.library_announcements a
      where a.active and a.type in ('holiday','optional_day','recess','strike')
        and a.starts_at::date<=result::date and (a.ends_at is null or a.ends_at::date>=result::date)
    ) then remaining:=remaining-1; end if;
  end loop;
  return result;
end $$;
