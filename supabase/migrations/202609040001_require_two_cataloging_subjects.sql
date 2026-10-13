-- A ficha somente pode ser homologada com, no mínimo, dois assuntos controlados.
create or replace function public.enforce_minimum_cataloging_subjects()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.request_controlled_terms where request_id = new.request_id) < 2 then
    raise exception 'at_least_two_controlled_terms_required';
  end if;
  return new;
end;
$$;

drop trigger if exists require_two_cataloging_subjects_before_homologation on public.cataloging_card_homologations;
create trigger require_two_cataloging_subjects_before_homologation
before insert on public.cataloging_card_homologations
for each row execute function public.enforce_minimum_cataloging_subjects();
