-- Cada gatilho recebe um enum de status diferente. Compare seus valores como texto.
create or replace function public.enforce_staff_action_permission()
returns trigger language plpgsql security definer set search_path = '' as $$
declare requested_code text;
begin
  if auth.uid() is null then return new; end if;

  if tg_table_name = 'cataloging_card_homologations' then
    requested_code := 'staff.card.homologate';
  elsif tg_table_name = 'nada_consta_documents' then
    if new.status::text in ('approved','rejected')
      and new.status::text is distinct from old.status::text then
      requested_code := 'staff.nada_consta.validate';
    end if;
  elsif tg_table_name = 'cataloging_requests' then
    if new.status::text = 'completed'
      and new.status::text is distinct from old.status::text then
      requested_code := 'staff.request.close';
    end if;
  end if;

  if requested_code is not null and not public.has_permission(requested_code) then
    raise exception 'permission_denied';
  end if;
  return new;
end $$;
