create function public.require_cdu_description_for_card()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  selected_cdu text;
  physical_details record;
begin
  select btrim(cdu_code) into selected_cdu
    from public.request_cataloging_metadata where request_id = new.request_id;
  if selected_cdu is null or not exists (
    select 1 from public.cdu_code_descriptions
    where cdu_code = selected_cdu and char_length(btrim(description)) >= 3
  ) then
    raise exception 'cdu_description_required';
  end if;

  select dimensions, accompanying_material into physical_details
    from public.request_card_details where request_id = new.request_id;
  new.snapshot := jsonb_set(new.snapshot, '{request,dimensions}',
    coalesce(to_jsonb(physical_details.dimensions), 'null'::jsonb), true);
  new.snapshot := jsonb_set(new.snapshot, '{request,accompanyingMaterial}',
    coalesce(to_jsonb(physical_details.accompanying_material), 'null'::jsonb), true);
  return new;
end;
$$;

create trigger require_cdu_description_before_card_homologation
  before insert on public.cataloging_card_homologations
  for each row execute function public.require_cdu_description_for_card();

revoke all on function public.require_cdu_description_for_card() from public, anon, authenticated;
