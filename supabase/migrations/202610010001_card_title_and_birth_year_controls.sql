alter table public.request_card_details
  add column include_equivalent_title boolean not null default false;

create function public.set_card_equivalent_title(target_request_id uuid, include_title boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(public.current_user_role() in ('cataloger', 'administrator'), false) is not true then raise exception 'active_staff_required'; end if;
  perform 1 from public.cataloging_requests where id = target_request_id and assigned_to = auth.uid() and status = 'in_review' for update;
  if not found then raise exception 'request_locked_by_another_staff'; end if;
  if include_title and not exists (select 1 from public.cataloging_requests where id = target_request_id and nullif(btrim(equivalent_title), '') is not null) then raise exception 'equivalent_title_missing'; end if;
  update public.request_card_details set include_equivalent_title = include_title, updated_at = now() where request_id = target_request_id;
  if not found then raise exception 'card_details_required'; end if;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
    values (auth.uid(), 'card_equivalent_title_decided', 'cataloging_request', target_request_id::text, jsonb_build_object('included', include_title));
end;
$$;

create function public.revoke_author_birth_year_validation(target_request_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(public.current_user_role() in ('cataloger', 'administrator'), false) is not true then raise exception 'active_staff_required'; end if;
  perform 1 from public.cataloging_requests where id = target_request_id and assigned_to = auth.uid() and status = 'in_review' for update;
  if not found then raise exception 'request_locked_by_another_staff'; end if;
  update public.request_people set birth_year_validated_at = null, birth_year_validated_by = null, updated_at = now()
    where request_id = target_request_id and role = 'author' and birth_year_validated_at is not null;
  if not found then raise exception 'birth_year_validation_not_found'; end if;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
    values (auth.uid(), 'author_birth_year_validation_revoked', 'cataloging_request', target_request_id::text, '{}'::jsonb);
end;
$$;

create function public.apply_card_equivalent_title_decision()
returns trigger language plpgsql security definer set search_path = '' as $$
declare include_title boolean;
begin
  select d.include_equivalent_title into include_title from public.request_card_details d where d.request_id = new.request_id;
  new.snapshot := jsonb_set(new.snapshot, '{request,includeEquivalentTitle}', to_jsonb(coalesce(include_title, false)), true);
  return new;
end;
$$;

create trigger apply_card_equivalent_title_decision_before_homologation
  before insert on public.cataloging_card_homologations
  for each row execute function public.apply_card_equivalent_title_decision();

revoke all on function public.set_card_equivalent_title(uuid, boolean), public.revoke_author_birth_year_validation(uuid), public.apply_card_equivalent_title_decision() from public, anon, authenticated;
grant execute on function public.set_card_equivalent_title(uuid, boolean), public.revoke_author_birth_year_validation(uuid) to authenticated;
