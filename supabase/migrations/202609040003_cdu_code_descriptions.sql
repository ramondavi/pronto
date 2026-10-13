-- Catálogo reutilizável de descrições de códigos CDU, submetido pela equipe e validado pela Administração.

create table public.cdu_code_descriptions (
  cdu_code text primary key check (char_length(btrim(cdu_code)) between 1 and 80),
  description text not null check (char_length(btrim(description)) between 3 and 1000),
  composition_notes text check (composition_notes is null or char_length(btrim(composition_notes)) between 3 and 4000),
  auxiliary_codes text[] not null default '{}',
  related_codes text[] not null default '{}',
  source_reference text check (source_reference is null or char_length(btrim(source_reference)) between 3 and 1000),
  validated boolean not null default false,
  submitted_by uuid not null references public.profiles(id),
  submitted_at timestamptz not null default now(),
  validated_by uuid references public.profiles(id),
  validated_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint cdu_code_descriptions_validation_audit check (
    (validated = false and validated_by is null and validated_at is null)
    or (validated = true and validated_by is not null and validated_at is not null)
  )
);

alter table public.cdu_code_descriptions enable row level security;
create policy "cdu_code_descriptions_staff_read" on public.cdu_code_descriptions for select to authenticated
  using (public.current_user_role() in ('cataloger', 'administrator'));
grant select on public.cdu_code_descriptions to authenticated;

create or replace function public.save_cdu_code_description(cdu_code_value text, description_value text, composition_notes_value text default null, auxiliary_codes_value text[] default '{}', related_codes_value text[] default '{}', source_reference_value text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare clean_code text := public.sanitize_cataloging_text(cdu_code_value); clean_description text := public.sanitize_cataloging_text(description_value);
begin
  if coalesce(public.current_user_role() in ('cataloger', 'administrator'), false) is not true then raise exception 'active_staff_required'; end if;
  if clean_code is null or clean_description is null or char_length(clean_description) not between 3 and 1000 then raise exception 'valid_cdu_description_required'; end if;
  insert into public.cdu_code_descriptions (cdu_code, description, composition_notes, auxiliary_codes, related_codes, source_reference, submitted_by)
    values (clean_code, clean_description, nullif(btrim(composition_notes_value), ''), coalesce(auxiliary_codes_value, '{}'), coalesce(related_codes_value, '{}'), nullif(btrim(source_reference_value), ''), auth.uid())
    on conflict (cdu_code) do nothing;
end;
$$;

create or replace function public.admin_save_cdu_code_description(cdu_code_value text, description_value text, composition_notes_value text, auxiliary_codes_value text[], related_codes_value text[], source_reference_value text, validated_value boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare clean_code text := public.sanitize_cataloging_text(cdu_code_value); clean_description text := public.sanitize_cataloging_text(description_value);
begin
  if public.current_user_role() is distinct from 'administrator' then raise exception 'active_administrator_required'; end if;
  if clean_code is null or clean_description is null or char_length(clean_description) not between 3 and 1000 then raise exception 'valid_cdu_description_required'; end if;
  update public.cdu_code_descriptions set description = clean_description, composition_notes = nullif(btrim(composition_notes_value), ''), auxiliary_codes = coalesce(auxiliary_codes_value, '{}'), related_codes = coalesce(related_codes_value, '{}'), source_reference = nullif(btrim(source_reference_value), ''), validated = validated_value,
    validated_by = case when validated_value then auth.uid() else null end,
    validated_at = case when validated_value then now() else null end, updated_at = now()
    where cdu_code = clean_code;
  if not found then raise exception 'cdu_code_description_not_found'; end if;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
    values (auth.uid(), 'cdu_code_description_saved', 'cdu_code_description', clean_code, jsonb_build_object('validated', validated_value));
end;
$$;

revoke all on function public.save_cdu_code_description(text, text, text, text[], text[], text) from public, anon, authenticated;
revoke all on function public.admin_save_cdu_code_description(text, text, text, text[], text[], text, boolean) from public, anon, authenticated;
grant execute on function public.save_cdu_code_description(text, text, text, text[], text[], text) to authenticated;
grant execute on function public.admin_save_cdu_code_description(text, text, text, text[], text[], text, boolean) to authenticated;
