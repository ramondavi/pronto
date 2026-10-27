begin;
create extension if not exists pgtap with schema extensions;
select plan(18);
insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data)
values
  (
    '10000000-0000-4000-8000-000000000001',
    'teste.pgtap.estudante1@ufba.br',
    now(),
    '{"registration_source":"student","privacy_notice_version":"1.1","birth_date":"2000-01-01","full_name":"Estudante Sintético Um","cpf":"81000001156"}'::jsonb
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    'teste.pgtap.estudante2@ufba.br',
    now(),
    '{"registration_source":"student","privacy_notice_version":"1.1","birth_date":"2000-01-01","full_name":"Estudante Sintético Dois","cpf":"81000001237"}'::jsonb
  ),
  ('10000000-0000-4000-8000-000000000003', 'teste.pgtap.catalogador@ufba.br', now(), '{}'::jsonb),
  ('10000000-0000-4000-8000-000000000004', 'teste.pgtap.administrador@ufba.br', now(), '{}'::jsonb),
  ('10000000-0000-4000-8000-000000000005', 'teste.pgtap.bloqueado@ufba.br', now(), '{}'::jsonb),
  ('10000000-0000-4000-8000-000000000006', 'teste.pgtap.inativo@ufba.br', now(), '{}'::jsonb);

insert into public.profiles (id, full_name, email, role, status)
values
  ('10000000-0000-4000-8000-000000000003', 'Catalogador Sintético', 'teste.pgtap.catalogador@ufba.br', 'cataloger', 'active'),
  ('10000000-0000-4000-8000-000000000004', 'Administrador Sintético', 'teste.pgtap.administrador@ufba.br', 'administrator', 'active'),
  ('10000000-0000-4000-8000-000000000005', 'Administrador Bloqueado Sintético', 'teste.pgtap.bloqueado@ufba.br', 'administrator', 'blocked'),
  ('10000000-0000-4000-8000-000000000006', 'Catalogador Inativo Sintético', 'teste.pgtap.inativo@ufba.br', 'cataloger', 'inactive');

insert into public.staff_profiles (profile_id, professional_name, crb)
values
  ('10000000-0000-4000-8000-000000000003', 'Catalogador Sintético', 'CRB-TESTE-1'),
  ('10000000-0000-4000-8000-000000000004', 'Administrador Sintético', 'CRB-TESTE-2'),
  ('10000000-0000-4000-8000-000000000005', 'Administrador Bloqueado Sintético', 'CRB-TESTE-3'),
  ('10000000-0000-4000-8000-000000000006', 'Catalogador Inativo Sintético', 'CRB-TESTE-4');

insert into public.academic_programs (id, code, name, short_name, level, work_type)
values (
  '20000000-0000-4000-8000-000000000001',
  'PGTAP-TESTE',
  'Programa Sintético para pgTAP',
  'PGTAP',
  'undergraduate',
  'undergraduate_thesis'
);

insert into public.coordination_contacts (academic_program_id, name, email)
values (
  '20000000-0000-4000-8000-000000000001',
  'Coordenação Sintética',
  'teste.pgtap.coordenacao@ufba.br'
);

insert into public.audit_logs (actor_id, action, entity_type, entity_id)
values (
  '10000000-0000-4000-8000-000000000004',
  'pgtap_synthetic_action',
  'profile',
  '10000000-0000-4000-8000-000000000001'
);


set local role authenticated;
set local request.jwt.claim.sub='10000000-0000-4000-8000-000000000001';
select throws_ok($$select public.admin_create_cdu_entry('7','Artes','2ª edição (IBICT, 2007)','main','','','')$$,'P0001','permission_denied','estudante não cria taxonomia');
set local request.jwt.claim.sub='10000000-0000-4000-8000-000000000004';
select lives_ok($$select public.admin_create_cdu_entry('7','Artes','2ª edição (IBICT, 2007)','main','','','')$$,'cadastra classe principal sem importar base');
select lives_ok($$select public.admin_create_cdu_entry('72','Arquitetura','2ª edição (IBICT, 2007)','main','7','','')$$,'cadastra divisão com superior explícito');
select is((select parent_code from public.cdu_code_descriptions where cdu_code='72'),'7','hierarquia persistida');
select is((select source_reference from public.cdu_code_descriptions where cdu_code='72'),'2ª edição (IBICT, 2007)','edição persistida');
select lives_ok($$select public.admin_create_cdu_entry('(81)','Brasil','1ª edição (IBICT, 1997)','common_place','','','')$$,'auxiliar comum guarda sua edição');
select throws_ok($$select public.admin_create_cdu_entry('.01','Auxiliar especial','2ª edição (IBICT, 2007)','special_point_zero','','','')$$,'P0001','cdu_auxiliary_scope_required','auxiliar especial exige âmbito');
select is((select count(*) from public.cdu_code_descriptions where cdu_code='.01'),0::bigint,'erro desfaz cadastro inteiro');
select lives_ok($$select public.admin_create_cdu_entry('72.01','Auxiliar especial local','2ª edição (IBICT, 2007)','special_point_zero','','72','Aplicação conferida pela biblioteca')$$,'auxiliar especial aponta para classe de aplicação');
select throws_ok($$select public.admin_save_cdu_structure('7','main','72','','')$$,'P0001','cdu_hierarchy_cycle','rejeita ciclo na hierarquia');
select throws_ok($$select public.admin_save_cdu_structure('72','main','(81)','','')$$,'P0001','cdu_parent_table_mismatch','não confunde árvore principal e tabela auxiliar');
select throws_ok($$select public.admin_save_cdu_structure('72.01','special_point_zero','','(81)','')$$,'P0001','cdu_scope_main_class_required','âmbito deve ser classe principal');
select throws_ok($$select public.admin_merge_catalogue('cdu','7','72',(select updated_at from public.cdu_code_descriptions where cdu_code='7'),(select updated_at from public.cdu_code_descriptions where cdu_code='72'))$$,'P0001','cdu_merge_hierarchy_cycle','não mescla classe no próprio descendente');
select throws_ok($$select public.admin_merge_catalogue_without_structure('cdu','7','72',now(),now())$$,'42501',null,'não permite contornar proteção hierárquica');
select throws_ok($$select public.admin_merge_catalogue('cdu','72','(81)',(select updated_at from public.cdu_code_descriptions where cdu_code='72'),(select updated_at from public.cdu_code_descriptions where cdu_code='(81)'))$$,'P0001','cdu_merge_table_mismatch','não confunde classe principal e auxiliar na mesclagem');
select lives_ok($$select public.admin_create_cdu_entry('7.01','Auxiliar especial em outro âmbito','2ª edição (IBICT, 2007)','special_point_zero','','7','')$$,'cria auxiliar de outro âmbito');
select throws_ok($$select public.admin_merge_catalogue('cdu','72.01','7.01',(select updated_at from public.cdu_code_descriptions where cdu_code='72.01'),(select updated_at from public.cdu_code_descriptions where cdu_code='7.01'))$$,'P0001','cdu_merge_scope_mismatch','não confunde auxiliares de âmbitos diferentes');
select throws_ok($$select public.admin_save_cdu_structure('72.01','special_point_zero','7.01','72','')$$,'P0001','cdu_parent_scope_mismatch','hierarquia especial mantém o mesmo âmbito');
select * from finish();
rollback;
