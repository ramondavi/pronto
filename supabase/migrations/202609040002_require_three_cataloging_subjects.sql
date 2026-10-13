-- A ficha somente pode ser homologada com, no mínimo, três assuntos controlados.
create or replace function public.enforce_minimum_cataloging_subjects()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.request_controlled_terms where request_id = new.request_id) < 3 then
    raise exception 'at_least_three_controlled_terms_required';
  end if;
  return new;
end;
$$;
