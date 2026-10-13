-- Incremento 5: pendências por campo, correções restritas, histórico e outbox.

create table public.issue_templates (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text not null,
  message text not null,
  active boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.issue_templates (code, label, message, position) values
  ('required_missing', 'Campo obrigatório não preenchido', 'Preencha este campo obrigatório.', 10),
  ('work_mismatch', 'Informação divergente do trabalho', 'A informação não corresponde ao documento apresentado. Confira e corrija.', 20),
  ('title_page_name', 'Nome divergente da folha de rosto', 'Informe o nome exatamente como aparece na folha de rosto.', 30),
  ('public_link_unavailable', 'Link público indisponível', 'O link não está acessível publicamente. Ajuste a permissão e teste em uma janela anônima.', 40),
  ('incomplete_information', 'Informação incompleta', 'Complete a informação conforme a orientação deste campo.', 50),
  ('format_standardization', 'Formatação ou padronização', 'Ajuste a formatação ou padronização deste campo.', 60);

create table public.request_revision_rounds (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.cataloging_requests(id) on delete cascade,
  round_number integer not null check (round_number > 0),
  returned_by uuid not null references public.profiles(id) on delete restrict,
  returned_at timestamptz not null default now(),
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_id, round_number)
);

create table public.request_field_issues (
  id uuid primary key default gen_random_uuid(),
  revision_round_id uuid not null references public.request_revision_rounds(id) on delete cascade,
  field_key text not null,
  field_label text not null,
  template_id uuid references public.issue_templates(id) on delete restrict,
  justification text not null check (char_length(btrim(justification)) between 3 and 2000),
  original_value jsonb,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (revision_round_id, field_key)
);

create table public.request_corrections (
  id uuid primary key default gen_random_uuid(),
  revision_round_id uuid not null references public.request_revision_rounds(id) on delete cascade,
  field_key text not null,
  previous_value jsonb,
  corrected_value jsonb,
  submitted_at timestamptz not null default now(),
  unique (revision_round_id, field_key)
);

create table public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.cataloging_requests(id) on delete cascade,
  event_type text not null check (event_type in ('request_opened', 'changes_requested', 'request_released')),
  idempotency_key text not null unique,
  recipient text not null,
  subject text not null,
  text_body text not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'delivered', 'failed')),
  attempts integer not null default 0,
  delivered_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.issue_templates enable row level security;
alter table public.request_revision_rounds enable row level security;
alter table public.request_field_issues enable row level security;
alter table public.request_corrections enable row level security;
alter table public.email_outbox enable row level security;

create policy "issue_templates_read_by_staff" on public.issue_templates for select to authenticated
  using (public.current_user_role() in ('cataloger', 'administrator'));
create policy "revision_rounds_read_own_or_staff" on public.request_revision_rounds for select to authenticated
  using (exists (select 1 from public.cataloging_requests where id = request_id));
create policy "field_issues_read_with_round" on public.request_field_issues for select to authenticated
  using (exists (select 1 from public.request_revision_rounds where id = revision_round_id));
create policy "corrections_read_with_round" on public.request_corrections for select to authenticated
  using (exists (select 1 from public.request_revision_rounds where id = revision_round_id));
create policy "email_outbox_read_by_administrator" on public.email_outbox for select to authenticated
  using (public.current_user_role() = 'administrator');

revoke all on table public.issue_templates, public.request_revision_rounds,
  public.request_field_issues, public.request_corrections, public.email_outbox from anon, authenticated;
grant select on table public.issue_templates, public.request_revision_rounds,
  public.request_field_issues, public.request_corrections, public.email_outbox to authenticated;

create or replace function public.request_field_label(field_key_value text)
returns text language sql immutable set search_path = '' as $$
  select case field_key_value
    when 'registration_number' then 'Matrícula'
    when 'academic_program_id' then 'Curso ou programa'
    when 'author' then 'Autor'
    when 'title' then 'Título'
    when 'subtitle' then 'Subtítulo'
    when 'equivalent_title' then 'Título equivalente'
    when 'other_titles' then 'Outros títulos'
    when 'advisor' then 'Orientador'
    when 'coadvisor' then 'Coorientador'
    when 'keywords_pt' then 'Palavras-chave em português'
    when 'keywords_en' then 'Palavras-chave em inglês'
    when 'public_work_url' then 'Link público do trabalho'
    when 'volume_information' then 'Informações dos volumes'
    when 'library_note' then 'Observação para a biblioteca'
  end
$$;

create or replace function public.request_field_value(target_request_id uuid, field_key_value text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select case field_key_value
    when 'registration_number' then to_jsonb(e.registration_number)
    when 'academic_program_id' then to_jsonb(e.academic_program_id)
    when 'author' then (select to_jsonb(p.transcribed_name) from public.request_people p where p.request_id = r.id and p.role = 'author')
    when 'title' then to_jsonb(r.title)
    when 'subtitle' then to_jsonb(r.subtitle)
    when 'equivalent_title' then to_jsonb(r.equivalent_title)
    when 'other_titles' then r.other_titles
    when 'advisor' then (select to_jsonb(p.transcribed_name) from public.request_people p where p.request_id = r.id and p.role = 'advisor')
    when 'coadvisor' then (select to_jsonb(p.transcribed_name) from public.request_people p where p.request_id = r.id and p.role = 'coadvisor')
    when 'keywords_pt' then (select coalesce(jsonb_agg(k.term order by k.position), '[]'::jsonb) from public.request_keywords k where k.request_id = r.id and k.language = 'pt')
    when 'keywords_en' then (select coalesce(jsonb_agg(k.term order by k.position), '[]'::jsonb) from public.request_keywords k where k.request_id = r.id and k.language = 'en')
    when 'public_work_url' then to_jsonb(r.public_work_url)
    when 'volume_information' then to_jsonb(r.volume_information)
    when 'library_note' then to_jsonb(r.library_note)
  end
  from public.cataloging_requests r
  join public.academic_enrollments e on e.id = r.academic_enrollment_id
  where r.id = target_request_id
$$;

create or replace function public.enqueue_opening_email()
returns trigger language plpgsql security definer set search_path = '' as $$
declare recipient_email text;
begin
  select p.email into recipient_email from public.student_profiles sp
  join public.profiles p on p.id = sp.profile_id where sp.id = new.student_profile_id;
  insert into public.email_outbox (request_id, event_type, idempotency_key, recipient, subject, text_body)
  values (new.id, 'request_opened', 'request_opened:' || new.id::text, recipient_email,
    'Pronto! — Solicitação ' || new.protocol || ' recebida',
    'Recebemos sua solicitação ' || new.protocol || '. Você pode acompanhar o andamento no Pronto!.');
  return new;
end;
$$;
create trigger cataloging_request_opening_email after insert on public.cataloging_requests
  for each row execute function public.enqueue_opening_email();

create or replace function public.return_request_for_corrections(target_request_id uuid, issues jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  round_id uuid;
  next_round integer;
  issue jsonb;
  key_value text;
  label_value text;
  template_uuid uuid;
  template_message text;
  free_message text;
  final_message text;
  recipient_email text;
  protocol_value text;
  email_lines text;
begin
  if coalesce(public.current_user_role() in ('cataloger', 'administrator'), false) is not true then raise exception 'active_staff_required'; end if;
  if jsonb_typeof(issues) <> 'array' or jsonb_array_length(issues) = 0 then raise exception 'at_least_one_issue_required'; end if;
  perform 1 from public.cataloging_requests where id = target_request_id and assigned_to = auth.uid()
    and status = 'in_review' for update;
  if not found then raise exception 'request_locked_by_another_staff'; end if;
  if (select count(*) from jsonb_array_elements(issues)) <> (select count(distinct value ->> 'fieldKey') from jsonb_array_elements(issues)) then raise exception 'duplicate_issue_field'; end if;

  select coalesce(max(round_number), 0) + 1 into next_round from public.request_revision_rounds where request_id = target_request_id;
  insert into public.request_revision_rounds (request_id, round_number, returned_by)
  values (target_request_id, next_round, auth.uid()) returning id into round_id;

  for issue in select value from jsonb_array_elements(issues) loop
    key_value := issue ->> 'fieldKey';
    label_value := public.request_field_label(key_value);
    if label_value is null then raise exception 'invalid_issue_field'; end if;
    template_uuid := nullif(issue ->> 'templateId', '')::uuid;
    free_message := btrim(coalesce(issue ->> 'freeJustification', ''));
    template_message := null;
    if template_uuid is not null then select message into template_message from public.issue_templates where id = template_uuid and active;
      if template_message is null then raise exception 'active_issue_template_required'; end if;
    end if;
    final_message := concat_ws(' ', template_message, nullif(free_message, ''));
    if char_length(final_message) < 3 then raise exception 'issue_justification_required'; end if;
    insert into public.request_field_issues (revision_round_id, field_key, field_label, template_id, justification, original_value)
    values (round_id, key_value, label_value, template_uuid, final_message, public.request_field_value(target_request_id, key_value));
  end loop;

  update public.cataloging_requests set status = 'changes_requested', updated_at = now() where id = target_request_id;
  select p.email, r.protocol into recipient_email, protocol_value from public.cataloging_requests r
    join public.student_profiles sp on sp.id = r.student_profile_id join public.profiles p on p.id = sp.profile_id where r.id = target_request_id;
  select string_agg('• ' || field_label || ': ' || justification, E'\n' order by field_label) into email_lines
    from public.request_field_issues where revision_round_id = round_id;
  insert into public.email_outbox (request_id, event_type, idempotency_key, recipient, subject, text_body)
  values (target_request_id, 'changes_requested', 'changes_requested:' || round_id::text, recipient_email,
    'Pronto! — Correções necessárias em ' || protocol_value,
    'A biblioteca solicitou correções nos campos abaixo:' || E'\n\n' || email_lines || E'\n\nAcesse o Pronto! para corrigir somente esses campos.');
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'request_changes_requested', 'cataloging_request', target_request_id::text,
    jsonb_build_object('revision_round_id', round_id, 'issue_count', jsonb_array_length(issues)));
  return round_id;
end;
$$;

create or replace function public.submit_request_corrections(target_request_id uuid, corrections jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  student_id uuid;
  round_id uuid;
  correction jsonb;
  key_value text;
  value_json jsonb;
  value_text text;
  item text;
  item_position integer;
begin
  if public.current_user_role() is distinct from 'student'::public.user_role then raise exception 'active_student_required'; end if;
  select id into student_id from public.student_profiles where profile_id = auth.uid();
  perform 1 from public.cataloging_requests where id = target_request_id and student_profile_id = student_id and status = 'changes_requested' for update;
  if not found then raise exception 'request_not_awaiting_corrections'; end if;
  select id into round_id from public.request_revision_rounds where request_id = target_request_id and responded_at is null order by round_number desc limit 1;
  if round_id is null then raise exception 'open_revision_round_required'; end if;
  if jsonb_typeof(corrections) <> 'array'
    or (select count(*) from jsonb_array_elements(corrections)) <> (select count(*) from public.request_field_issues where revision_round_id = round_id)
    or (select count(distinct value ->> 'fieldKey') from jsonb_array_elements(corrections)) <> (select count(*) from public.request_field_issues where revision_round_id = round_id)
    or exists (select 1 from jsonb_array_elements(corrections) c where not exists (select 1 from public.request_field_issues i where i.revision_round_id = round_id and i.field_key = c.value ->> 'fieldKey'))
  then raise exception 'only_pending_fields_required'; end if;

  for correction in select value from jsonb_array_elements(corrections) loop
    key_value := correction ->> 'fieldKey'; value_json := correction -> 'value'; value_text := btrim(coalesce(value_json #>> '{}', ''));
    if key_value in ('title', 'author', 'advisor') and char_length(value_text) < 3 then raise exception 'required_corrected_value'; end if;
    if key_value = 'public_work_url' and value_text !~ '^https://[^[:space:]]+$' then raise exception 'public_https_url_required'; end if;
    if key_value = 'title' then update public.cataloging_requests set title = value_text where id = target_request_id;
    elsif key_value = 'subtitle' then update public.cataloging_requests set subtitle = nullif(value_text, '') where id = target_request_id;
    elsif key_value = 'equivalent_title' then update public.cataloging_requests set equivalent_title = nullif(value_text, '') where id = target_request_id;
    elsif key_value = 'other_titles' then update public.cataloging_requests set other_titles = value_json where id = target_request_id;
    elsif key_value = 'public_work_url' then update public.cataloging_requests set public_work_url = value_text where id = target_request_id;
    elsif key_value = 'volume_information' then update public.cataloging_requests set volume_information = nullif(value_text, '') where id = target_request_id;
    elsif key_value = 'library_note' then update public.cataloging_requests set library_note = nullif(value_text, '') where id = target_request_id;
    elsif key_value = 'registration_number' then update public.academic_enrollments set registration_number = value_text, updated_at = now() where id = (select academic_enrollment_id from public.cataloging_requests where id = target_request_id);
    elsif key_value = 'academic_program_id' then update public.academic_enrollments set academic_program_id = value_text::uuid, updated_at = now() where id = (select academic_enrollment_id from public.cataloging_requests where id = target_request_id) and exists (select 1 from public.academic_programs where id = value_text::uuid and active);
    elsif key_value in ('author', 'advisor') then update public.request_people set transcribed_name = value_text, updated_at = now() where request_id = target_request_id and role::text = key_value;
    elsif key_value = 'coadvisor' then
      if value_text = '' then delete from public.request_people where request_id = target_request_id and role = 'coadvisor';
      elsif exists (select 1 from public.request_people where request_id = target_request_id and role = 'coadvisor') then
        update public.request_people set transcribed_name = value_text, updated_at = now() where request_id = target_request_id and role = 'coadvisor';
      else insert into public.request_people (request_id, role, transcribed_name) values (target_request_id, 'coadvisor', value_text);
      end if;
    elsif key_value in ('keywords_pt', 'keywords_en') then
      if jsonb_typeof(value_json) <> 'array' or (key_value = 'keywords_pt' and jsonb_array_length(value_json) = 0) then raise exception 'valid_keywords_required'; end if;
      delete from public.request_keywords where request_id = target_request_id and language = case when key_value = 'keywords_pt' then 'pt' else 'en' end;
      item_position := 0;
      for item in select btrim(value) from jsonb_array_elements_text(value_json) loop
        if char_length(item) not between 2 and 100 then raise exception 'invalid_keyword'; end if;
        insert into public.request_keywords (request_id, language, term, position) values (target_request_id, case when key_value = 'keywords_pt' then 'pt' else 'en' end, item, item_position);
        item_position := item_position + 1;
      end loop;
    else raise exception 'invalid_correction_field'; end if;
    insert into public.request_corrections (revision_round_id, field_key, previous_value, corrected_value)
      select round_id, key_value, original_value, value_json from public.request_field_issues where revision_round_id = round_id and field_key = key_value;
  end loop;
  update public.request_field_issues set resolved_at = now(), updated_at = now() where revision_round_id = round_id;
  update public.request_revision_rounds set responded_at = now(), updated_at = now() where id = round_id;
  update public.cataloging_requests set status = 'in_review', updated_at = now() where id = target_request_id;
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'request_corrections_submitted', 'cataloging_request', target_request_id::text, jsonb_build_object('revision_round_id', round_id));
end;
$$;

create or replace function public.queue_request_release_notice(target_request_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare recipient_email text; protocol_value text;
begin
  if coalesce(public.current_user_role() in ('cataloger', 'administrator'), false) is not true then raise exception 'active_staff_required'; end if;
  select p.email, r.protocol into recipient_email, protocol_value from public.cataloging_requests r
    join public.student_profiles sp on sp.id = r.student_profile_id join public.profiles p on p.id = sp.profile_id
    where r.id = target_request_id and r.status = 'approved';
  if recipient_email is null then raise exception 'approved_request_required'; end if;
  insert into public.email_outbox (request_id, event_type, idempotency_key, recipient, subject, text_body)
  values (target_request_id, 'request_released', 'request_released:' || target_request_id::text, recipient_email,
    'Pronto! — Solicitação ' || protocol_value || ' liberada',
    'Sua solicitação foi liberada. Acesse o Pronto! para consultar a próxima etapa.') on conflict (idempotency_key) do nothing;
end;
$$;

create or replace function public.claim_local_email_outbox(batch_limit integer default 20)
returns table (email_id uuid, recipient text, subject text, text_body text)
language plpgsql security definer set search_path = '' as $$
begin
  if public.current_user_role() is distinct from 'administrator'::public.user_role then raise exception 'active_administrator_required'; end if;
  return query
  with claimed as (
    select id from public.email_outbox where status in ('pending', 'failed') order by created_at
    limit greatest(1, least(batch_limit, 50)) for update skip locked
  ), updated as (
    update public.email_outbox e set status = 'processing', attempts = attempts + 1, last_error = null, updated_at = now()
    from claimed where e.id = claimed.id returning e.id, e.recipient, e.subject, e.text_body
  ) select updated.id, updated.recipient, updated.subject, updated.text_body from updated;
end;
$$;

create or replace function public.complete_local_email_delivery(target_email_id uuid, succeeded boolean, error_message text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if public.current_user_role() is distinct from 'administrator'::public.user_role then raise exception 'active_administrator_required'; end if;
  update public.email_outbox set status = case when succeeded then 'delivered' else 'failed' end,
    delivered_at = case when succeeded then now() else null end,
    last_error = case when succeeded then null else left(coalesce(error_message, 'delivery_failed'), 1000) end,
    updated_at = now() where id = target_email_id and status = 'processing';
end;
$$;

revoke all on function public.request_field_label(text) from public, anon, authenticated;
revoke all on function public.request_field_value(uuid, text) from public, anon, authenticated;
revoke all on function public.enqueue_opening_email() from public, anon, authenticated;
revoke all on function public.return_request_for_corrections(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.submit_request_corrections(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.queue_request_release_notice(uuid) from public, anon, authenticated;
revoke all on function public.claim_local_email_outbox(integer) from public, anon, authenticated;
revoke all on function public.complete_local_email_delivery(uuid, boolean, text) from public, anon, authenticated;
grant execute on function public.return_request_for_corrections(uuid, jsonb) to authenticated;
grant execute on function public.submit_request_corrections(uuid, jsonb) to authenticated;
grant execute on function public.queue_request_release_notice(uuid) to authenticated;
grant execute on function public.claim_local_email_outbox(integer) to authenticated;
grant execute on function public.complete_local_email_delivery(uuid, boolean, text) to authenticated;
