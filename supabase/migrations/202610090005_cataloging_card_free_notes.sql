alter table public.request_card_details
  add column free_notes jsonb not null default '[]'::jsonb
  constraint request_card_details_free_notes_array check (jsonb_typeof(free_notes) = 'array');

create function public.save_request_card_notes(target_request_id uuid, notes_value jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare note_value jsonb;
begin
  if coalesce(public.current_user_role() in ('cataloger', 'administrator'), false) is not true then raise exception 'active_staff_required'; end if;
  if notes_value is null or jsonb_typeof(notes_value) <> 'array' or jsonb_array_length(notes_value) > 12 then raise exception 'invalid_card_notes'; end if;
  for note_value in select value from jsonb_array_elements(notes_value) loop
    if jsonb_typeof(note_value) <> 'string' or char_length(btrim(note_value #>> '{}')) not between 3 and 500 then
      raise exception 'invalid_card_note';
    end if;
  end loop;
  perform 1 from public.cataloging_requests
    where id = target_request_id and assigned_to = auth.uid() and status in ('in_review', 'changes_requested')
    for update;
  if not found then raise exception 'request_locked_by_another_staff'; end if;
  if not exists (select 1 from public.request_card_details where request_id = target_request_id) then raise exception 'card_details_required'; end if;
  update public.request_card_details set free_notes = notes_value, updated_at = now()
    where request_id = target_request_id and free_notes is distinct from notes_value;
  if not found then return; end if;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
    values (auth.uid(), 'card_notes_saved', 'cataloging_request', target_request_id::text,
      jsonb_build_object('count', jsonb_array_length(notes_value)));
end;
$$;

create function public.include_card_free_notes_in_snapshot()
returns trigger language plpgsql security definer set search_path = '' as $$
declare notes_value jsonb;
begin
  select free_notes into notes_value from public.request_card_details where request_id = new.request_id;
  new.snapshot := jsonb_set(new.snapshot, '{freeNotes}', coalesce(notes_value, '[]'::jsonb), true);
  return new;
end;
$$;

create trigger include_card_free_notes_before_homologation
  before insert on public.cataloging_card_homologations
  for each row execute function public.include_card_free_notes_in_snapshot();

revoke all on function public.save_request_card_notes(uuid, jsonb), public.include_card_free_notes_in_snapshot() from public, anon, authenticated;
grant execute on function public.save_request_card_notes(uuid, jsonb) to authenticated;
