begin;
create extension if not exists pgtap with schema extensions;
select plan(23);
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
select throws_ok($$select public.admin_create_controlled_term('Origem','','bn')$$,'P0001','permission_denied','estudante não cria assunto');
set local request.jwt.claim.sub='10000000-0000-4000-8000-000000000005';
select throws_ok($$select public.admin_create_controlled_term('Origem','','bn')$$,'P0001','permission_denied','administrador bloqueado não cria assunto');
set local request.jwt.claim.sub='10000000-0000-4000-8000-000000000004';
select throws_ok($$select public.admin_create_controlled_term('Origem','','')$$,'P0001','controlled_term_source_required','fonte obrigatória');
select lives_ok($$select public.admin_create_controlled_term('Origem.','','bn')$$,'cria assunto e sanitiza pontuação');
select lives_ok($$select public.admin_create_controlled_term('Destino','Target','aat')$$,'cria destino');
select lives_ok($$select public.admin_create_controlled_term('Final','','ufba')$$,'cria terceiro destino');
select throws_ok($$select public.admin_create_controlled_term('ORIGEM','','bn')$$,'23505',null,'impede duplicata normalizada');
reset role;
insert into public.academic_enrollments(id,student_profile_id,academic_program_id,registration_number)
values('30000000-0000-4000-8000-000000000001',(select id from public.student_profiles where profile_id='10000000-0000-4000-8000-000000000001'),'20000000-0000-4000-8000-000000000001','SINTETICO');
insert into public.cataloging_requests(id,student_profile_id,academic_enrollment_id,protocol,status,title,public_work_url,defended_and_approved,final_file_confirmed,approval_page_confirmed)
values('40000000-0000-4000-8000-000000000001',(select id from public.student_profiles where profile_id='10000000-0000-4000-8000-000000000001'),'30000000-0000-4000-8000-000000000001','FC2026-9999','completed','Ficha sintética','https://example.org/work.pdf',true,true,true);
insert into public.request_controlled_terms(request_id,controlled_term_id,label_pt_snapshot,is_primary,position,source_code)
select '40000000-0000-4000-8000-000000000001',id,preferred_label_pt,preferred_label_pt='Origem',row_number() over()-1,'bn' from public.controlled_terms where preferred_label_pt in('Origem','Destino','Final');
insert into public.cdu_code_descriptions(cdu_code,description,submitted_by)
values('72','Descrição original','10000000-0000-4000-8000-000000000004'),('72.0','Descrição mantida','10000000-0000-4000-8000-000000000004');
insert into public.request_cataloging_metadata(request_id,cdu_code,last_edited_by)
values('40000000-0000-4000-8000-000000000001','72','10000000-0000-4000-8000-000000000004');
insert into public.request_card_details(request_id,deposit_year,defense_year,extent_unit,extent_count,advisor_note_label) values('40000000-0000-4000-8000-000000000001',2026,2026,'pages',100,'Orientador');
insert into public.request_analyses(request_id,last_edited_by,review_completed_at,citation_validated_at,citation_text,citation_source_signature) values('40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000004',now(),now(),'Referência sintética','temporary');
update public.request_analyses set citation_source_signature=public.request_citation_source_signature(request_id);
reset role;
insert into public.cataloging_card_homologations(request_id,snapshot,homologated_by,librarian_name_snapshot,librarian_crb_snapshot)
values('40000000-0000-4000-8000-000000000001','{"subjects":["Origem","Destino"],"cdu":"72"}','10000000-0000-4000-8000-000000000004','Administrador sintético','CRB-TESTE');
create temp table preserved as select 'card' kind,to_jsonb(c) value from public.cataloging_card_homologations c union all select 'term',to_jsonb(t) from public.request_controlled_terms t union all select 'metadata',to_jsonb(m) from public.request_cataloging_metadata m;
grant select on preserved to authenticated;
create function pg_temp.merge_test(kind text,src text,dst text) returns jsonb language sql as $$select public.admin_merge_catalogue(kind,src,dst,(public.admin_catalogue_merge_preview(kind,src,dst)->>'source_version')::timestamptz,(public.admin_catalogue_merge_preview(kind,src,dst)->>'target_version')::timestamptz)$$;
set local role authenticated;
set local request.jwt.claim.sub='10000000-0000-4000-8000-000000000004';
select throws_ok($$select pg_temp.merge_test('cdu','72','72')$$,'P0001','different_catalogue_records_required','não mescla consigo mesmo');
select throws_ok($$select public.admin_merge_catalogue('cdu','72','72.0',now()-interval '1 day',now())$$,'P0001','catalogue_merge_changed','rejeita confirmação desatualizada');
reset role;
update public.cataloging_requests set status='in_review';
set local role authenticated;
select throws_ok($$select pg_temp.merge_test('cdu','72','72.0')$$,'P0001','catalogue_merge_open_requests','impede mesclar CDU usada em atendimento aberto');
select throws_ok($$select pg_temp.merge_test('subject',(select id::text from public.controlled_terms where preferred_label_pt='Origem'),(select id::text from public.controlled_terms where preferred_label_pt='Destino'))$$,'P0001','catalogue_merge_open_requests','impede mesclar assunto usado em atendimento aberto');
reset role;
update public.cataloging_requests set status='completed';
set local role authenticated;
select lives_ok($$select pg_temp.merge_test('subject',(select id::text from public.controlled_terms where preferred_label_pt='Origem'),(select id::text from public.controlled_terms where preferred_label_pt='Destino'))$$,'mescla assunto com uso encerrado');
select lives_ok($$select pg_temp.merge_test('cdu','72','72.0')$$,'mescla CDU com uso encerrado');
select is((select score from public.suggest_cdu((select id from public.controlled_terms where preferred_label_pt='Destino'),array[(select id from public.controlled_terms where preferred_label_pt='Origem')])),2::bigint,'histórico aproveitado sem contar ficha duplicada');
select lives_ok($$select * from public.admin_subject_catalog('','all','all',0)$$,'catálogo canônico consultável');
select is((select count(*) from public.admin_subject_catalog('','merged','all',0)),1::bigint,'registro mesclado aparece no histórico');
select lives_ok($$select pg_temp.merge_test('subject',(select id::text from public.controlled_terms where preferred_label_pt='Destino'),(select id::text from public.controlled_terms where preferred_label_pt='Final'))$$,'segunda mesclagem resolve redirecionamentos');
select is((select public.canonical_controlled_term(id) from public.controlled_terms where preferred_label_pt='Origem'),(select id from public.controlled_terms where preferred_label_pt='Final'),'origem aponta diretamente ao destino final');
reset role;
select results_eq($$select 'card' kind,to_jsonb(c) value from public.cataloging_card_homologations c union all select 'term',to_jsonb(t) from public.request_controlled_terms t union all select 'metadata',to_jsonb(m) from public.request_cataloging_metadata m$$,$$select * from preserved$$,'ficha, token público, metadados e vínculos preservados integralmente');
select throws_ok($$update public.controlled_terms set active=true where preferred_label_pt='Origem'$$,'P0001','catalogue_record_merged','não reativa duplicata mesclada');
select throws_ok($$delete from public.cdu_code_descriptions where cdu_code='72'$$,'P0001','catalogue_record_merged','não apaga CDU histórica');
select throws_ok($$update public.request_cataloging_metadata set cdu_code='72.0'; update public.request_cataloging_metadata set cdu_code='72'$$,'P0001','cdu_code_merged','não permite novo uso de código mesclado');
select is((select count(*) from public.audit_logs where action='catalogue_records_merged'),3::bigint,'mesclagens auditadas');
select * from finish();
rollback;
