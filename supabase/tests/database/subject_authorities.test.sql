begin;
create extension if not exists pgtap with schema extensions;
select plan(39);
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


create function pg_temp.authority_fixture(ident text default 'Br / TESTE-1') returns jsonb language sql as $$select jsonb_build_object('source','bn','identifier',ident,'original','150 __ |a Assunto sintético','variants',jsonb_build_array(jsonb_build_object('value','Variante sintética','language','pt')),'relations',jsonb_build_array(jsonb_build_object('kind','Mais amplo','value','Referência pendente')),'notes',jsonb_build_array(jsonb_build_object('value','Nota preservada')))$$;
insert into public.academic_enrollments(id,student_profile_id,academic_program_id,registration_number)
values('30000000-0000-4000-8000-000000000001',(select id from public.student_profiles where profile_id='10000000-0000-4000-8000-000000000001'),'20000000-0000-4000-8000-000000000001','SINTETICO'),('30000000-0000-4000-8000-000000000002',(select id from public.student_profiles where profile_id='10000000-0000-4000-8000-000000000002'),'20000000-0000-4000-8000-000000000001','SINTETICO2');
insert into public.cataloging_requests(id,student_profile_id,academic_enrollment_id,protocol,status,title,public_work_url,defended_and_approved,final_file_confirmed,approval_page_confirmed,assigned_to)
select rid,(select id from public.student_profiles where profile_id=case when protocol='FC2026-9998' then '10000000-0000-4000-8000-000000000001'::uuid else '10000000-0000-4000-8000-000000000002'::uuid end),case when protocol='FC2026-9998' then '30000000-0000-4000-8000-000000000001'::uuid else '30000000-0000-4000-8000-000000000002'::uuid end,protocol,status::public.request_status,'Ficha sintética','https://example.org/work.pdf',true,true,true,'10000000-0000-4000-8000-000000000003' from (values
 ('40000000-0000-4000-8000-000000000001'::uuid,'FC2026-9998','completed'),('40000000-0000-4000-8000-000000000002'::uuid,'FC2026-9999','in_review')) f(rid,protocol,status);
insert into public.controlled_terms(id,preferred_label_pt,normalized_label_pt,created_by,updated_by) values('50000000-0000-4000-8000-000000000001','Assunto anterior','assunto anterior','10000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000004');
insert into public.request_controlled_terms(request_id,controlled_term_id,label_pt_snapshot,is_primary,position,source_code) values('40000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','Texto histórico da ficha',true,0,'bn');
create temp table subject_snapshot_before as select to_jsonb(t) value from public.request_controlled_terms t;
grant select on subject_snapshot_before to authenticated;
set local role authenticated;
set local request.jwt.claim.sub='10000000-0000-4000-8000-000000000001';
select throws_ok($$select public.search_subject_catalogue('sintético')$$,'P0001','active_staff_required','estudante não pesquisa autoridades');
select throws_ok($$select public.import_subject_authority(pg_temp.authority_fixture(),'Assunto sintético')$$,'P0001','active_staff_required','estudante não importa');
set local request.jwt.claim.sub='10000000-0000-4000-8000-000000000005';
select throws_ok($$select public.import_subject_authority(pg_temp.authority_fixture(),'Assunto sintético')$$,'P0001','active_staff_required','bloqueado não importa');
set local request.jwt.claim.sub='10000000-0000-4000-8000-000000000006';
select throws_ok($$select public.search_subject_catalogue('sintético')$$,'P0001','active_staff_required','inativo não pesquisa');
set local request.jwt.claim.sub='10000000-0000-4000-8000-000000000003';
select throws_ok($$select public.import_subject_authority(pg_temp.authority_fixture(),'Assunto sintético')$$,'P0001','permission_denied','bibliotecário precisa de atendimento próprio');
set local request.jwt.claim.sub='10000000-0000-4000-8000-000000000004';
select lives_ok($$select public.import_subject_authority(pg_temp.authority_fixture(),'Assunto sintético')$$,'admin importa');
select is((select count(*) from public.subject_authorities),1::bigint,'uma identidade guardada');
select is((select record->'relations'->0->>'value' from public.subject_authorities),'Referência pendente','relação sem destino permanece pendente');
select is((select record->'notes'->0->>'value' from public.subject_authorities),'Nota preservada','nota preservada');
select is(public.search_subject_catalogue('Variante')->0->>'preferred_label_pt','Assunto sintético','variante encontra termo preferido');
select is(public.search_subject_catalogue('ausente'),'[]'::jsonb,'ausência confirmada');
select is((public.import_subject_authority(pg_temp.authority_fixture(),'Assunto sintético')->>'reused')::boolean,true,'reimportação reutiliza identidade');
select is((select count(*) from public.controlled_terms where preferred_label_pt='Assunto sintético'),1::bigint,'não duplica termo');
select throws_ok($$select public.import_subject_authority(pg_temp.authority_fixture()||'{"original":"mudou"}'::jsonb,'Assunto sintético')$$,'P0001','authority_version_conflict','não sobrescreve versão');
select throws_ok($$select public.import_subject_authority(pg_temp.authority_fixture(null),'Assunto sem identidade')$$,'P0001','invalid_authority_record','identificador obrigatório');
select throws_ok($$select public.import_subject_authority(pg_temp.authority_fixture('Br / OUTRO'),'Assunto sintético')$$,'P0001','authority_label_conflict','texto igual exige vínculo explícito');
select lives_ok($$select public.import_subject_authority(pg_temp.authority_fixture('Br / OUTRO'),'Assunto sintético',null,(select id from public.controlled_terms where preferred_label_pt='Assunto sintético'))$$,'confirmação explícita vincula ao cadastro');
select is((select count(*) from public.subject_authorities),2::bigint,'fontes e identidades independentes preservadas');
select is((select count(*) from public.audit_logs where action='subject_authority_imported'),2::bigint,'importações auditadas sem repetir reuso');
select throws_ok($$insert into public.subject_authority_variants(authority_id,label) select id,'Burlar' from public.subject_authorities limit 1$$,'42501',null,'escrita direta proibida');
set local request.jwt.claim.sub='10000000-0000-4000-8000-000000000001';
select is((select count(*) from public.subject_authorities),0::bigint,'RLS esconde autoridades do estudante');
set local request.jwt.claim.sub='10000000-0000-4000-8000-000000000005';
select is((select count(*) from public.subject_authority_variants),0::bigint,'RLS esconde variantes do bloqueado');
set local request.jwt.claim.sub='10000000-0000-4000-8000-000000000004';
select is((select count(*) from public.request_controlled_terms),1::bigint,'importação não cria vínculos de ficha');
select is((select count(*) from public.cataloging_card_homologations),0::bigint,'importação não homologa fichas');
select results_eq($$select to_jsonb(t) from public.request_controlled_terms t$$,$$select value from subject_snapshot_before$$,'texto, vínculo e histórico anteriores intactos');
select throws_ok($$update public.subject_authorities set source_identifier='adulterado'$$,'42501',null,'escrita direta na proveniência proibida');
set local request.jwt.claim.sub='10000000-0000-4000-8000-000000000003';
select lives_ok($$select public.import_subject_authority(pg_temp.authority_fixture('Br / ATENDIMENTO'),'Assunto do atendimento',null,null,'40000000-0000-4000-8000-000000000002')$$,'bibliotecário importa no próprio atendimento');
select throws_ok($$select public.import_subject_authority(pg_temp.authority_fixture('Br / FECHADO'),'Assunto fechado',null,null,'40000000-0000-4000-8000-000000000001')$$,'P0001','request_locked_by_another_staff','atendimento concluído bloqueia importação');
set local request.jwt.claim.sub='10000000-0000-4000-8000-000000000004';
select throws_ok($$select public.import_subject_authority(pg_temp.authority_fixture('Br / OUTRO-STAFF'),'Outro assunto',null,null,'40000000-0000-4000-8000-000000000002')$$,'P0001','request_locked_by_another_staff','admin não importa dentro de atendimento de outro responsável');
set local request.jwt.claim.sub='10000000-0000-4000-8000-000000000006';
select is((select count(*) from public.subject_authorities),0::bigint,'RLS esconde autoridades do inativo');
set local role anon;
select throws_ok($$select public.search_subject_catalogue('Assunto')$$,'42501',null,'público não executa busca operacional');
set local role authenticated;
set local request.jwt.claim.sub='10000000-0000-4000-8000-000000000004';
select is(jsonb_array_length(public.search_subject_catalogue(' . Variante  sintética. ')),2,'busca normalizada encontra ambos os termos que compartilham variante');
select lives_ok($$select public.admin_merge_catalogue('subject',(select id::text from public.controlled_terms where preferred_label_pt='Assunto sintético'),'50000000-0000-4000-8000-000000000001',(public.admin_catalogue_merge_preview('subject',(select id::text from public.controlled_terms where preferred_label_pt='Assunto sintético'),'50000000-0000-4000-8000-000000000001')->>'source_version')::timestamptz,(public.admin_catalogue_merge_preview('subject',(select id::text from public.controlled_terms where preferred_label_pt='Assunto sintético'),'50000000-0000-4000-8000-000000000001')->>'target_version')::timestamptz)$$,'autoridade acompanha mesclagem explícita');
select is(public.search_subject_catalogue('Variante')->0->>'preferred_label_pt','Assunto anterior','variante resolve para destino canônico');
select results_eq($$select to_jsonb(t) from public.request_controlled_terms t$$,$$select value from subject_snapshot_before$$,'mesclagem não altera o texto histórico');
select lives_ok($$select public.admin_delete_unused_controlled_term((select id from public.controlled_terms where preferred_label_pt='Assunto do atendimento'))$$,'admin continua podendo excluir cadastro sem uso');
select is((select count(*) from public.subject_authorities where source_identifier='Br / ATENDIMENTO'),0::bigint,'exclusão explícita sem uso remove a autoridade correspondente');
set local role authenticated;
set local request.jwt.claim.sub='10000000-0000-4000-8000-000000000003';
select throws_ok($$select public.save_assisted_cataloging_v2('40000000-0000-4000-8000-000000000002',jsonb_build_object('people',jsonb_build_array(jsonb_build_object('role','author','transcribedName','Ana Silva','authorizedName','Silva, Ana'),jsonb_build_object('role','advisor','transcribedName','Bruno Souza','authorizedName','Souza, Bruno')),'terms',jsonb_build_array(jsonb_build_object('labelPt','Variante sintética','sourceCode','bn')),'cduCode','72','cutterCode','S586'))$$,'P0001','subject_variant_requires_selection','autosave não cria assunto novo a partir de variante conhecida');
select is((select count(*) from public.controlled_terms where normalized_label_pt='variante sintética'),0::bigint,'nenhuma duplicata criada para variante');
select * from finish();
rollback;