-- Ampliação das permissões administrativas: funções mantêm a validação no banco.

insert into public.permission_definitions
  (code,area,screen,action,description,default_roles,professional_only,delegable)
values
  ('admin.accounts.view','Administração','Contas','Consultar contas','Consultar perfis, situação das contas e dados necessários à gestão','{administrator}',true,true),
  ('admin.accounts.manage','Administração','Contas','Gerenciar contas','Alterar perfis, bloquear ou reativar contas e corrigir dados cadastrais','{administrator}',true,true),
  ('admin.accounts.provision','Administração','Contas','Provisionar equipe','Selecionar contas institucionais confirmadas e criar perfis da equipe','{administrator}',true,true),
  ('admin.programs.view','Administração','Programas e SLA','Consultar programas','Consultar programas, prazos e coordenações cadastradas','{administrator}',true,true),
  ('admin.programs.manage','Administração','Programas e SLA','Configurar programas','Alterar programas, SLA, autodepósito e contatos de coordenação','{administrator}',true,true),
  ('admin.service.view','Administração','Pendências','Consultar modelos','Consultar pendências e respostas padrão','{administrator}',true,true),
  ('admin.service.manage','Administração','Pendências','Editar modelos','Alterar pendências e respostas padrão','{administrator}',true,true),
  ('admin.stats.view','Administração','Indicadores','Consultar indicadores','Consultar e exportar indicadores operacionais','{administrator}',true,true),
  ('admin.retention.view','Administração','Arquivos e retenção','Consultar retenção','Consultar documentos prontos para limpeza','{administrator}',true,true),
  ('admin.retention.manage','Administração','Arquivos e retenção','Confirmar expurgo','Confirmar a limpeza de documentos após o prazo de retenção','{administrator}',true,true),
  ('admin.audit.view','Administração','Auditoria','Consultar auditoria','Consultar registros de ações administrativas e operacionais','{administrator}',true,true),
  ('admin.faq.view','Administração','Ajuda e FAQ','Consultar perguntas','Consultar perguntas frequentes em preparação','{administrator}',true,true),
  ('admin.faq.manage','Administração','Ajuda e FAQ','Editar perguntas','Criar, alterar, destacar e ordenar perguntas frequentes','{administrator}',true,true),
  ('admin.knowledge.view','Administração','Ajuda e FAQ','Consultar base de conhecimento','Consultar artigos e respostas em preparação','{administrator}',true,true),
  ('admin.knowledge.manage','Administração','Ajuda e FAQ','Editar base de conhecimento','Criar e alterar artigos e respostas, inclusive traduções e imagens','{administrator}',true,true),
  ('admin.subjects.view','Administração','Assuntos','Consultar assuntos','Consultar termos, fontes e usos na catalogação','{administrator}',true,true),
  ('admin.subjects.manage','Administração','Assuntos','Gerenciar assuntos','Alterar, ativar, desativar e excluir termos sem uso','{administrator}',true,true),
  ('admin.cdu.view','Administração','Catálogo CDU','Consultar catálogo','Consultar descrições técnicas da CDU','{administrator}',true,true),
  ('admin.cdu.manage','Administração','Catálogo CDU','Editar catálogo','Criar, revisar e validar descrições técnicas da CDU','{administrator}',true,true),
  ('admin.feedback.view','Administração','Avaliações','Consultar pesquisa','Consultar campanha, convites, respostas e indicadores protegidos','{administrator}',true,true),
  ('admin.feedback.export','Administração','Avaliações','Exportar pesquisa','Exportar resultados protegidos da pesquisa de experiência','{administrator}',true,true),
  ('admin.feedback.activate','Administração','Avaliações','Ativar pesquisa','Iniciar a campanha de avaliação após o lançamento','{administrator}',true,true);

create function public.list_effective_staff_permissions()
returns setof text language sql stable security definer set search_path = '' as $$
  select definition.code from public.permission_definitions definition
  where public.has_permission(definition.code)
$$;
revoke all on function public.list_effective_staff_permissions() from public, anon;
grant execute on function public.list_effective_staff_permissions() to authenticated;

-- admin_manage_account: admin.accounts.manage
create or replace function public.admin_manage_account(
  target_profile_id uuid,
  target_role public.user_role,
  target_status public.account_status,
  professional_name text default null,
  professional_crb text default null
)
returns void language plpgsql security definer set search_path='' as $$
declare previous_role public.user_role; previous_status public.account_status;
begin
  if not public.has_permission('admin.accounts.manage') then raise exception 'permission_denied'; end if;
  if target_profile_id=auth.uid() and (target_status<>'active' or target_role<>public.current_user_role()) then raise exception 'cannot_change_own_access'; end if;
  if target_role='administrator' or exists (select 1 from public.profiles where id=target_profile_id and role='administrator') then
    if public.current_user_role()<>'administrator' then raise exception 'administrator_role_requires_administrator'; end if;
  end if;
  select role,status into previous_role,previous_status from public.profiles where id=target_profile_id for update;
  if previous_role is null then raise exception 'profile_not_found'; end if;
  if previous_role='administrator' and previous_status='active' and (target_role<>'administrator' or target_status<>'active')
    and (select count(*) from public.profiles where role='administrator' and status='active') <= 1 then
    raise exception 'last_active_administrator_required';
  end if;
  if target_role in ('cataloger','administrator') then
    if length(trim(coalesce(professional_name,'')))<3 or length(trim(coalesce(professional_crb,'')))<3 then raise exception 'staff_data_required'; end if;
    insert into public.staff_profiles(profile_id,professional_name,crb)
      values(target_profile_id,trim(professional_name),trim(professional_crb))
      on conflict(profile_id) do update set professional_name=excluded.professional_name,crb=excluded.crb,updated_at=now();
  end if;
  update public.profiles set role=target_role,status=target_status,updated_at=now() where id=target_profile_id;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
    values(auth.uid(),'account_administration_changed','profile',target_profile_id::text,
      jsonb_build_object('previous_role',previous_role,'role',target_role,'previous_status',previous_status,'status',target_status));
end $$;

-- admin_correct_student_birth_date: admin.accounts.manage
create or replace function public.admin_correct_student_birth_date(target_profile_id uuid, target_birth_date date)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_permission('admin.accounts.manage') then raise exception 'permission_denied'; end if;
  if target_birth_date is null or target_birth_date not between date '1900-01-01' and current_date then
    raise exception 'valid_birth_date_required';
  end if;

  update public.student_profiles sp set birth_date = target_birth_date, updated_at = now()
    where sp.profile_id = target_profile_id and sp.birth_date is distinct from target_birth_date
      and exists (select 1 from public.profiles p where p.id = sp.profile_id and p.role = 'student');
  if not found then raise exception 'student_not_found_or_birth_date_unchanged'; end if;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id)
    values (auth.uid(), 'student_birth_date_corrected', 'student_profile', target_profile_id::text);
end;
$$;

-- provision_staff_account: admin.accounts.provision
create or replace function public.provision_staff_account(
  target_user_id uuid, staff_full_name text, staff_professional_name text, staff_crb text, staff_role public.user_role
)
returns void language plpgsql security definer set search_path='' as $$
declare target_email text;
begin
  if not public.has_permission('admin.accounts.provision') then raise exception 'permission_denied'; end if;
  if staff_role is null or staff_role not in ('cataloger', 'administrator') then raise exception 'staff_role_required'; end if;
  if staff_role='administrator' and public.current_user_role()<>'administrator' then raise exception 'administrator_role_requires_administrator'; end if;
  if char_length(btrim(staff_full_name)) < 3 or char_length(btrim(staff_professional_name)) < 3 or char_length(btrim(staff_crb)) < 3 then raise exception 'staff_data_required'; end if;
  select lower(email) into target_email from auth.users where id=target_user_id and email_confirmed_at is not null;
  if target_email is null or target_email !~ '^[^@]+@ufba\.br$' then raise exception 'confirmed_institutional_user_required'; end if;
  insert into public.profiles(id,full_name,email,role,status) values(target_user_id,btrim(staff_full_name),target_email,staff_role,'active');
  insert into public.staff_profiles(profile_id,professional_name,crb) values(target_user_id,btrim(staff_professional_name),btrim(staff_crb));
  update public.account_notification_outbox notification set status='cancelled',updated_at=now()
    where notification.target_user_id=$1 and notification.status in ('pending','failed');
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
    values(auth.uid(),'staff_account_provisioned','profile',target_user_id::text,jsonb_build_object('role',staff_role));
end $$;

-- list_confirmed_staff_candidates: admin.accounts.provision
create or replace function public.list_confirmed_staff_candidates()
returns table (user_id uuid, email text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_permission('admin.accounts.provision') then raise exception 'permission_denied'; end if;

  return query
  select users.id, lower(users.email)
  from auth.users users
  where users.email_confirmed_at is not null
    and lower(users.email) ~ '^[^@]+@ufba\.br$'
    and not exists (
      select 1 from public.profiles profiles where profiles.id = users.id
    )
  order by lower(users.email);
end;
$$;

-- admin_configure_program: admin.programs.manage
create or replace function public.admin_configure_program(
  target_program_id uuid, sla_business_days integer,
  repository_enabled boolean, coordination_enabled boolean,
  contact_name text, contact_email text
)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.has_permission('admin.programs.manage') then raise exception 'permission_denied'; end if;
  if sla_business_days not between 1 and 30 then raise exception 'invalid_sla'; end if;
  if coordination_enabled and (length(trim(coalesce(contact_name,'')))<2 or trim(coalesce(contact_email,'')) !~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$') then raise exception 'valid_coordination_contact_required'; end if;
  update public.academic_programs set service_level_business_days=sla_business_days,
    repository_deposit_enabled=repository_enabled,coordination_magic_link_enabled=coordination_enabled,updated_at=now()
    where id=target_program_id;
  if not found then raise exception 'academic_program_not_found'; end if;
  update public.coordination_contacts set active=false,updated_at=now() where academic_program_id=target_program_id and active;
  if coordination_enabled then insert into public.coordination_contacts(academic_program_id,name,email)
    values(target_program_id,trim(contact_name),lower(trim(contact_email))); end if;
  insert into public.sla_settings(academic_program_id,business_days) values(target_program_id,sla_business_days);
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
    values(auth.uid(),'program_operation_configuration_changed','academic_program',target_program_id::text,
      jsonb_build_object('sla_business_days',sla_business_days,'repository_deposit_enabled',repository_enabled,'coordination_magic_link_enabled',coordination_enabled));
end $$;

-- set_repository_deposit_enabled: admin.programs.manage
create or replace function public.set_repository_deposit_enabled(target_program_id uuid, enabled boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.has_permission('admin.programs.manage') then raise exception 'permission_denied'; end if;
  update public.academic_programs set repository_deposit_enabled=enabled,updated_at=now() where id=target_program_id;
  if not found then raise exception 'academic_program_not_found'; end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
  values(auth.uid(),'repository_deposit_configuration_changed','academic_program',target_program_id::text,jsonb_build_object('enabled',enabled));
end $$;

-- admin_update_issue_template: admin.service.manage
create or replace function public.admin_update_issue_template(target_template_id uuid, template_label text, template_message text, enabled boolean, template_position integer)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.has_permission('admin.service.manage') then raise exception 'permission_denied'; end if;
  if length(trim(coalesce(template_label,'')))<3 or length(trim(coalesce(template_message,'')))<3 then raise exception 'invalid_issue_template'; end if;
  update public.issue_templates set label=trim(template_label),message=trim(template_message),active=enabled,position=template_position,updated_at=now() where id=target_template_id;
  if not found then raise exception 'issue_template_not_found'; end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'issue_template_changed','issue_template',target_template_id::text,jsonb_build_object('active',enabled));
end $$;

-- admin_statistics: admin.stats.view
create or replace function public.admin_statistics(period_start timestamptz default null, period_end timestamptz default null)
returns jsonb language plpgsql security definer set search_path='' stable as $$
declare result jsonb;
begin
  if not public.has_permission('admin.stats.view') then raise exception 'permission_denied'; end if;
  with filtered as (
    select r.id,r.protocol,r.status,r.submitted_at,r.assigned_to,ap.id program_id,ap.name program_name,p.full_name staff_name
    from public.cataloging_requests r join public.academic_enrollments ae on ae.id=r.academic_enrollment_id
    join public.academic_programs ap on ap.id=ae.academic_program_id left join public.profiles p on p.id=r.assigned_to
    where (period_start is null or r.submitted_at>=period_start) and (period_end is null or r.submitted_at<period_end)
  ) select jsonb_build_object(
    'total',(select count(*) from filtered),
    'by_status',coalesce((select jsonb_agg(jsonb_build_object('label',status,'count',amount) order by status) from (select status,count(*) amount from filtered group by status)s),'[]'::jsonb),
    'by_program',coalesce((select jsonb_agg(jsonb_build_object('id',program_id,'label',program_name,'count',amount) order by program_name) from (select program_id,program_name,count(*) amount from filtered group by program_id,program_name)s),'[]'::jsonb),
    'by_staff',coalesce((select jsonb_agg(jsonb_build_object('id',assigned_to,'label',coalesce(staff_name,'Não atribuído'),'count',amount) order by coalesce(staff_name,'Não atribuído')) from (select assigned_to,staff_name,count(*) amount from filtered group by assigned_to,staff_name)s),'[]'::jsonb),
    'records',coalesce((select jsonb_agg(jsonb_build_object('protocol',protocol,'status',status,'submitted_at',submitted_at,'program',program_name,'staff',staff_name) order by submitted_at desc) from filtered),'[]'::jsonb)
  ) into result;
  return result;
end $$;

-- admin_confirm_nada_consta_purge: admin.retention.manage
create or replace function public.admin_confirm_nada_consta_purge(target_document_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.has_permission('admin.retention.manage') then raise exception 'permission_denied'; end if;
  update public.nada_consta_documents set object_path=null,status='purged',purged_at=now(),updated_at=now()
    where id=target_document_id and purge_after<=now() and object_path is not null;
  if not found then raise exception 'document_not_ready_for_purge'; end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id) values(auth.uid(),'nada_consta_purged','nada_consta_document',target_document_id::text);
end $$;

-- admin_save_frequently_asked_question: admin.faq.manage
create or replace function public.admin_save_frequently_asked_question(faq_id uuid, faq_question text, faq_answer text, faq_position integer, enabled boolean, home_featured_position integer)
returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
  if not public.has_permission('admin.faq.manage') then raise exception 'permission_denied'; end if;
  if home_featured_position is not null then update public.frequently_asked_questions set featured_position=null where featured_position=home_featured_position and id is distinct from faq_id; end if;
  if faq_id is null then insert into public.frequently_asked_questions(question,answer,position,active,featured_position,created_by,updated_by) values (btrim(faq_question),btrim(faq_answer),faq_position,enabled,home_featured_position,auth.uid(),auth.uid()) returning id into result;
  else update public.frequently_asked_questions set question=btrim(faq_question),answer=btrim(faq_answer),position=faq_position,active=enabled,featured_position=home_featured_position,updated_by=auth.uid(),updated_at=now() where id=faq_id returning id into result; end if;
  return result;
end $$;

-- admin_reorder_frequently_asked_questions: admin.faq.manage
create or replace function public.admin_reorder_frequently_asked_questions(faq_ids uuid[])
returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.has_permission('admin.faq.manage') then raise exception 'permission_denied'; end if;
  update public.frequently_asked_questions f set position=ordered.position*10,updated_by=auth.uid(),updated_at=now()
  from unnest(faq_ids) with ordinality as ordered(id,position) where f.id=ordered.id;
end $$;

-- admin_save_knowledge_base_entry: admin.knowledge.manage
create or replace function public.admin_save_knowledge_base_entry(
  entry_id uuid, entry_slug text, entry_kind text, entry_title text, entry_summary text,
  entry_body_html text, entry_category text, entry_audiences text[], entry_active boolean,
  entry_position integer, entry_featured_position integer
) returns uuid language plpgsql security definer set search_path = '' as $$
declare result uuid; clean_slug text := nullif(btrim(entry_slug), '');
begin
  if not public.has_permission('admin.knowledge.manage') then
    if not public.has_permission('admin.faq.manage') or entry_kind <> 'faq'
      or (entry_id is not null and not exists (select 1 from public.knowledge_base_entries where id=entry_id and kind='faq')) then
      raise exception 'permission_denied';
    end if;
  end if;
  if entry_kind not in ('faq', 'answer', 'article')
    or char_length(btrim(coalesce(entry_title, ''))) not between 5 and 300
    or char_length(btrim(coalesce(entry_summary, ''))) not between 5 and 1000
    or char_length(coalesce(entry_body_html, '')) > 50000
    or entry_category not in ('Geral', 'Solicitação', 'Análise', 'Ficha', 'Autodepósito', 'Atendimento', 'Administração')
    or coalesce(cardinality(entry_audiences), 0) = 0
    or not (entry_audiences <@ array['public','student','cataloger','administrator','panel']::text[])
    or entry_position not between 0 and 9999
    or (entry_kind = 'article' and (clean_slug is null or clean_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'))
    or (entry_kind <> 'article' and clean_slug is not null)
    or (entry_featured_position is not null and (entry_kind <> 'faq' or 'public' <> all(entry_audiences) or entry_featured_position not between 1 and 3))
  then raise exception 'invalid_knowledge_base_entry'; end if;
  if entry_featured_position is not null then
    update public.knowledge_base_entries set featured_position = null where featured_position = entry_featured_position and id is distinct from entry_id;
  end if;
  if entry_id is null then
    insert into public.knowledge_base_entries(slug,kind,title,summary,body_html,category,audiences,active,position,featured_position,published_at,created_by,updated_by)
    values(clean_slug,entry_kind,btrim(entry_title),btrim(entry_summary),coalesce(entry_body_html,''),entry_category,entry_audiences,entry_active,entry_position,entry_featured_position,case when entry_active then now() end,auth.uid(),auth.uid())
    returning id into result;
  else
    update public.knowledge_base_entries
    set slug=clean_slug,kind=entry_kind,title=btrim(entry_title),summary=btrim(entry_summary),body_html=coalesce(entry_body_html,''),category=entry_category,
        audiences=entry_audiences,active=entry_active,position=entry_position,featured_position=entry_featured_position,
        published_at=case when entry_active then coalesce(published_at, now()) else null end,updated_at=now(),updated_by=auth.uid()
    where id=entry_id returning id into result;
  end if;
  if result is null then raise exception 'knowledge_base_entry_not_found'; end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
  values(auth.uid(),'knowledge_base_entry_saved','knowledge_base_entry',result::text,jsonb_build_object('kind',entry_kind,'audiences',entry_audiences,'active',entry_active));
  return result;
end $$;

-- admin_save_knowledge_base_entry_localized: admin.knowledge.manage
create or replace function public.admin_save_knowledge_base_entry_localized(
  entry_id uuid, entry_slug text, entry_kind text, entry_title text, entry_summary text,
  entry_body_html text, entry_category text, entry_audiences text[], entry_active boolean,
  entry_position integer, entry_featured_position integer, entry_translations jsonb
) returns uuid language plpgsql security definer set search_path = '' as $$
declare result uuid; locale text; content jsonb;
begin
  if not (public.has_permission('admin.knowledge.manage') or
    (public.has_permission('admin.faq.manage') and entry_kind='faq' and
      (entry_id is null or exists (select 1 from public.knowledge_base_entries where id=entry_id and kind='faq')))) then
    raise exception 'permission_denied';
  end if;
  if jsonb_typeof(entry_translations) is distinct from 'object' then raise exception 'invalid_translations'; end if;
  for locale, content in select key, value from jsonb_each(entry_translations) loop
    if locale not in ('en','es','de','fr','it') or jsonb_typeof(content) is distinct from 'object'
      or char_length(btrim(coalesce(content->>'title',''))) > 300
      or char_length(btrim(coalesce(content->>'summary',''))) > 1000
      or char_length(coalesce(content->>'body_html','')) > 50000
    then raise exception 'invalid_translation'; end if;
  end loop;
  result := public.admin_save_knowledge_base_entry(entry_id,entry_slug,entry_kind,entry_title,entry_summary,
    entry_body_html,entry_category,entry_audiences,entry_active,entry_position,entry_featured_position);
  update public.knowledge_base_entries set translations = entry_translations where id = result;
  return result;
end $$;

-- admin_save_cdu_code_description: admin.cdu.manage
create or replace function public.admin_save_cdu_code_description(cdu_code_value text, description_value text, composition_notes_value text, auxiliary_codes_value text[], related_codes_value text[], source_reference_value text, validated_value boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare clean_code text := public.sanitize_cataloging_text(cdu_code_value); clean_description text := public.sanitize_cataloging_text(description_value);
begin
  if not public.has_permission('admin.cdu.manage') then raise exception 'permission_denied'; end if;
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

-- admin_create_cdu_code_description: admin.cdu.manage
create or replace function public.admin_create_cdu_code_description(cdu_code_value text, description_value text, source_reference_value text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  clean_code text := public.sanitize_cataloging_text(cdu_code_value);
  clean_description text := public.sanitize_cataloging_text(description_value);
  clean_source text := nullif(btrim(source_reference_value), '');
begin
  if not public.has_permission('admin.cdu.manage') then raise exception 'permission_denied'; end if;
  if clean_code is null or char_length(clean_code) not between 1 and 80
    or clean_description is null or char_length(clean_description) not between 3 and 1000
    or (clean_source is not null and char_length(clean_source) not between 3 and 1000)
  then raise exception 'valid_cdu_description_required'; end if;
  insert into public.cdu_code_descriptions (cdu_code, description, source_reference, submitted_by)
    values (clean_code, clean_description, clean_source, auth.uid());
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
    values (auth.uid(), 'cdu_code_description_created', 'cdu_code_description', clean_code, '{}'::jsonb);
end;
$$;

-- admin_list_controlled_terms: admin.subjects.view
create or replace function public.admin_list_controlled_terms(search_query text default '', status_filter text default 'all', page_offset integer default 0)
returns table (id uuid, preferred_label_pt text, preferred_label_en text, active boolean, usage_count bigint, sources text[], total_count bigint)
language plpgsql security definer set search_path = '' as $$
begin
  if not (public.has_permission('admin.subjects.view') or public.has_permission('admin.subjects.manage')) then raise exception 'permission_denied'; end if;
  return query
    select t.id, t.preferred_label_pt, t.preferred_label_en, t.active,
      (select count(*) from public.request_controlled_terms used where used.controlled_term_id = t.id),
      array(select distinct found.source_code from (
        select source.source_code from public.controlled_term_sources source
          where source.controlled_term_id = t.id
        union
        select used.source_code from public.request_controlled_terms used
          where used.controlled_term_id = t.id and used.source_code is not null
      ) found order by found.source_code),
      count(*) over ()
    from public.controlled_terms t
    where (nullif(btrim(search_query), '') is null
      or t.preferred_label_pt ilike '%' || btrim(search_query) || '%'
      or coalesce(t.preferred_label_en, '') ilike '%' || btrim(search_query) || '%')
      and (status_filter = 'all' or (status_filter = 'active' and t.active)
        or (status_filter = 'inactive' and not t.active))
    order by t.preferred_label_pt, t.id
    limit 40 offset greatest(page_offset, 0);
end;
$$;

-- admin_controlled_term_overview: admin.subjects.view
create or replace function public.admin_controlled_term_overview()
returns table (total_count bigint, active_count bigint, unused_count bigint, without_source_count bigint)
language plpgsql security definer set search_path = '' as $$
begin
  if not (public.has_permission('admin.subjects.view') or public.has_permission('admin.subjects.manage')) then raise exception 'permission_denied'; end if;
  return query
    select count(*), count(*) filter (where t.active),
      count(*) filter (where not exists (
        select 1 from public.request_controlled_terms used where used.controlled_term_id = t.id)),
      count(*) filter (where not exists (
        select 1 from public.controlled_term_sources source where source.controlled_term_id = t.id)
        and not exists (select 1 from public.request_controlled_terms used
          where used.controlled_term_id = t.id and used.source_code is not null))
    from public.controlled_terms t;
end;
$$;

-- admin_search_controlled_terms: admin.subjects.view
create or replace function public.admin_search_controlled_terms(search_query text, status_filter text, review_filter text, page_offset integer)
returns table (id uuid, preferred_label_pt text, preferred_label_en text, active boolean, usage_count bigint, sources text[], total_count bigint)
language plpgsql security definer set search_path = '' as $$
begin
  if not (public.has_permission('admin.subjects.view') or public.has_permission('admin.subjects.manage')) then raise exception 'permission_denied'; end if;
  return query
    select t.id, t.preferred_label_pt, t.preferred_label_en, t.active,
      (select count(*) from public.request_controlled_terms used where used.controlled_term_id = t.id),
      array(select distinct found.source_code from (
        select source.source_code from public.controlled_term_sources source
          where source.controlled_term_id = t.id
        union
        select used.source_code from public.request_controlled_terms used
          where used.controlled_term_id = t.id and used.source_code is not null
      ) found order by found.source_code),
      count(*) over ()
    from public.controlled_terms t
    where (nullif(btrim(search_query), '') is null
      or t.preferred_label_pt ilike '%' || btrim(search_query) || '%'
      or coalesce(t.preferred_label_en, '') ilike '%' || btrim(search_query) || '%')
      and (status_filter = 'all' or (status_filter = 'active' and t.active)
        or (status_filter = 'inactive' and not t.active))
      and (review_filter = 'all'
        or (review_filter = 'unused' and not exists (
          select 1 from public.request_controlled_terms used where used.controlled_term_id = t.id))
        or (review_filter = 'used' and exists (
          select 1 from public.request_controlled_terms used where used.controlled_term_id = t.id))
        or (review_filter = 'without_source' and not exists (
          select 1 from public.controlled_term_sources source where source.controlled_term_id = t.id)
          and not exists (select 1 from public.request_controlled_terms used
            where used.controlled_term_id = t.id and used.source_code is not null)))
    order by t.preferred_label_pt, t.id
    limit 40 offset greatest(page_offset, 0);
end;
$$;

-- admin_controlled_term_usage: admin.subjects.view
create or replace function public.admin_controlled_term_usage(target_term_id uuid)
returns table (request_id uuid, protocol text, request_status text, source_code text, is_primary boolean)
language plpgsql security definer set search_path = '' as $$
begin
  if not (public.has_permission('admin.subjects.view') or public.has_permission('admin.subjects.manage')) then raise exception 'permission_denied'; end if;
  return query
    select r.id, r.protocol, r.status::text, used.source_code, used.is_primary
    from public.request_controlled_terms used
    join public.cataloging_requests r on r.id = used.request_id
    where used.controlled_term_id = target_term_id
    order by r.submitted_at desc nulls last
    limit 30;
end;
$$;

-- admin_save_controlled_term: admin.subjects.manage
create or replace function public.admin_save_controlled_term(term_id uuid, label_pt text, label_en text, enabled boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare clean_pt text := public.sanitize_cataloging_text(label_pt);
  clean_en text := public.sanitize_cataloging_text(label_en);
  previous public.controlled_terms%rowtype;
begin
  if not public.has_permission('admin.subjects.manage') then raise exception 'permission_denied'; end if;
  select * into previous from public.controlled_terms where id = term_id for update;
  if not found then raise exception 'controlled_term_not_found'; end if;
  if clean_pt is null or char_length(clean_pt) not between 2 and 120
    or (clean_en is not null and char_length(clean_en) not between 2 and 120) then
    raise exception 'invalid_controlled_term';
  end if;
  if (clean_pt is distinct from previous.preferred_label_pt
    or clean_en is distinct from previous.preferred_label_en or enabled is distinct from previous.active)
    and exists (select 1 from public.request_controlled_terms selected
      join public.cataloging_requests request on request.id = selected.request_id
      where selected.controlled_term_id = term_id
        and request.status in ('submitted', 'in_review', 'changes_requested', 'approved')) then
    raise exception 'controlled_term_used_by_open_request';
  end if;
  update public.controlled_terms set preferred_label_pt = clean_pt,
    normalized_label_pt = lower(clean_pt), preferred_label_en = clean_en,
    normalized_label_en = lower(clean_en), active = enabled,
    updated_by = auth.uid(), updated_at = now()
    where id = term_id;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
    values (auth.uid(), 'controlled_term_admin_changed', 'controlled_term', term_id::text,
      jsonb_build_object('previous_pt', previous.preferred_label_pt, 'previous_en', previous.preferred_label_en,
        'previous_active', previous.active, 'current_pt', clean_pt, 'current_en', clean_en, 'current_active', enabled));
end;
$$;

-- admin_delete_unused_controlled_term: admin.subjects.manage
create or replace function public.admin_delete_unused_controlled_term(term_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare previous public.controlled_terms%rowtype;
begin
  if not public.has_permission('admin.subjects.manage') then raise exception 'permission_denied'; end if;
  select * into previous from public.controlled_terms where id = term_id for update;
  if not found then raise exception 'controlled_term_not_found'; end if;
  if exists (select 1 from public.request_controlled_terms where controlled_term_id = term_id) then
    raise exception 'controlled_term_in_use';
  end if;
  delete from public.controlled_terms where id = term_id;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
    values (auth.uid(), 'unused_controlled_term_deleted', 'controlled_term', term_id::text,
      jsonb_build_object('label_pt', previous.preferred_label_pt, 'label_en', previous.preferred_label_en));
end;
$$;

-- activate_feedback_campaign: admin.feedback.activate
create or replace function public.activate_feedback_campaign(target_site_url text)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare activation_time timestamptz;
begin
  if not public.has_permission('admin.feedback.activate') then raise exception 'permission_denied'; end if;
  if target_site_url is null or target_site_url !~ '^https://[^/[:space:]]+/?$' then raise exception 'invalid_site_url'; end if;
  update public.feedback_campaign set activated_at = now(), site_url = rtrim(target_site_url, '/')
    where id and activated_at is null returning activated_at into activation_time;
  if activation_time is null then raise exception 'feedback_campaign_already_active'; end if;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id)
    values(auth.uid(), 'feedback_campaign_activated', 'feedback_campaign', 'launch');
  return activation_time;
end $$;

-- feedback_campaign_stats: admin.feedback.view
create or replace function public.feedback_campaign_stats()
returns jsonb language sql security definer set search_path = '' stable as $$
  select case when public.has_permission('admin.feedback.view') or public.has_permission('admin.feedback.export') then
    jsonb_build_object(
      'invited', (select count(*) from public.feedback_invitations),
      'responded', (select count(*) from public.feedback_invitations where responded),
      'invitations_close_at', least(c.activated_at + interval '60 days', coalesce(c.invitations_closed_at, 'infinity'::timestamptz)),
      'report_ready_at', least(c.activated_at + interval '60 days', coalesce(c.invitations_closed_at, 'infinity'::timestamptz)) + interval '30 days',
      'responses_purged_at', c.responses_purged_at,
      'aggregate_report', c.aggregate_report
    ) else null end
  from public.feedback_campaign c where c.id
$$;

-- As políticas de leitura e escrita usam os mesmos códigos que as funções.
drop policy if exists "staff_profiles_read_own_or_administrator" on public.staff_profiles;
create policy staff_profiles_read_for_account_management on public.staff_profiles for select to authenticated
  using (public.is_active_user() and (profile_id = auth.uid() or public.has_permission('admin.accounts.view') or public.has_permission('admin.accounts.manage')));
drop policy if exists "academic_programs_manage_by_administrator" on public.academic_programs;
create policy academic_programs_manage_by_permission on public.academic_programs for all to authenticated
  using (public.has_permission('admin.programs.manage')) with check (public.has_permission('admin.programs.manage'));
drop policy if exists "coordination_contacts_manage_by_administrator" on public.coordination_contacts;
create policy coordination_contacts_manage_by_permission on public.coordination_contacts for all to authenticated
  using (public.has_permission('admin.programs.manage')) with check (public.has_permission('admin.programs.manage'));
drop policy if exists "sla_settings_manage_by_administrator" on public.sla_settings;
create policy sla_settings_manage_by_permission on public.sla_settings for all to authenticated
  using (public.has_permission('admin.programs.manage')) with check (public.has_permission('admin.programs.manage'));
drop policy if exists "audit_logs_read_by_administrator" on public.audit_logs;
create policy audit_logs_read_by_permission on public.audit_logs for select to authenticated
  using (public.has_permission('admin.audit.view'));
drop policy if exists "issue_templates_manage_by_administrator" on public.issue_templates;
create policy issue_templates_manage_by_permission on public.issue_templates for update to authenticated
  using (public.has_permission('admin.service.manage')) with check (public.has_permission('admin.service.manage'));
drop policy if exists "frequently_asked_questions_public_read" on public.frequently_asked_questions;
create policy frequently_asked_questions_read_by_permission on public.frequently_asked_questions for select to anon, authenticated
  using (active or public.has_permission('admin.faq.view') or public.has_permission('admin.faq.manage'));
drop policy if exists knowledge_base_role_read on public.knowledge_base_entries;
create policy knowledge_base_role_read on public.knowledge_base_entries for select to authenticated
  using (public.has_permission('admin.knowledge.view') or public.has_permission('admin.knowledge.manage')
    or (kind='faq' and (public.has_permission('admin.faq.view') or public.has_permission('admin.faq.manage')))
    or (active and public.current_user_role() is not null and ('panel' = any(audiences) or
      (public.current_user_role() = 'student' and 'student' = any(audiences)) or
      (public.current_user_role() = 'cataloger' and 'cataloger' = any(audiences)))));
drop policy if exists knowledge_images_admin_insert on storage.objects;
create policy knowledge_images_manage_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'knowledge-images' and (public.has_permission('admin.knowledge.manage') or public.has_permission('admin.faq.manage')));
drop policy if exists knowledge_images_admin_delete on storage.objects;
create policy knowledge_images_manage_delete on storage.objects for delete to authenticated
  using (bucket_id = 'knowledge-images' and (public.has_permission('admin.knowledge.manage') or public.has_permission('admin.faq.manage')));
drop policy if exists feedback_campaign_admin_read on public.feedback_campaign;
create policy feedback_campaign_read_by_permission on public.feedback_campaign for select to authenticated
  using (public.has_permission('admin.feedback.view') or public.has_permission('admin.feedback.activate') or public.has_permission('admin.feedback.export'));
drop policy if exists feedback_responses_admin_read on public.feedback_responses;
create policy feedback_responses_read_by_permission on public.feedback_responses for select to authenticated
  using (public.has_permission('admin.feedback.view') or public.has_permission('admin.feedback.export'));
drop policy if exists "account_notification_outbox_read_by_administrator" on public.account_notification_outbox;
create policy account_notification_outbox_read_by_permission on public.account_notification_outbox for select to authenticated
  using (public.has_permission('admin.accounts.view') or public.has_permission('admin.accounts.provision'));
