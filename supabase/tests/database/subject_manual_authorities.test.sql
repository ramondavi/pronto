begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
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


insert into public.academic_enrollments(id,student_profile_id,academic_program_id,registration_number)
values('30000000-0000-4000-8000-000000000001',(select id from public.student_profiles where profile_id='10000000-0000-4000-8000-000000000001'),'20000000-0000-4000-8000-000000000001','SINTETICO'),('30000000-0000-4000-8000-000000000002',(select id from public.student_profiles where profile_id='10000000-0000-4000-8000-000000000002'),'20000000-0000-4000-8000-000000000001','SINTETICO2');
insert into public.cataloging_requests(id,student_profile_id,academic_enrollment_id,protocol,status,title,public_work_url,defended_and_approved,final_file_confirmed,approval_page_confirmed,assigned_to)
select rid,(select id from public.student_profiles where profile_id=case when protocol='FC2026-9998' then '10000000-0000-4000-8000-000000000001'::uuid else '10000000-0000-4000-8000-000000000002'::uuid end),case when protocol='FC2026-9998' then '30000000-0000-4000-8000-000000000001'::uuid else '30000000-0000-4000-8000-000000000002'::uuid end,protocol,status::public.request_status,'Ficha sintética','https://example.org/work.pdf',true,true,true,'10000000-0000-4000-8000-000000000003' from (values
 ('40000000-0000-4000-8000-000000000001'::uuid,'FC2026-9998','completed'),('40000000-0000-4000-8000-000000000002'::uuid,'FC2026-9999','in_review')) f(rid,protocol,status);
insert into public.controlled_terms(id,preferred_label_pt,normalized_label_pt,created_by,updated_by) values('50000000-0000-4000-8000-000000000001','Assunto anterior','assunto anterior','10000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000004');
insert into public.request_controlled_terms(request_id,controlled_term_id,label_pt_snapshot,is_primary,position,source_code) values('40000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','Texto histórico da ficha',true,0,'bn');

create function pg_temp.manual_fixture(label text, status_value text default 'existing') returns jsonb language sql as $$
 select jsonb_build_object('draft_id',gen_random_uuid(),'source','bn','status',status_value,'heading_type','topic',
 'components',jsonb_build_array(jsonb_build_object('kind','Assunto-base','value',label),jsonb_build_object('kind','Subdivisão geográfica','value','Bahia')),
 'variants',jsonb_build_array(jsonb_build_object('value','Variante '||label)),'note','Nota sintética'); $$;
set local role anon;
select throws_ok($$select public.create_manual_subject_authority(pg_temp.manual_fixture('Teste público'))$$,'42501',null,'público não cria autoridade manual');
set local role authenticated;
set local request.jwt.claim.sub='10000000-0000-4000-8000-000000000003';
select throws_ok($$select public.create_manual_subject_authority(pg_temp.manual_fixture('Teste catalogador'))$$,'P0001','permission_denied','catalogador sem gestão não cria autoridade geral');
set local request.jwt.claim.sub='10000000-0000-4000-8000-000000000004';
select lives_ok($$select public.create_manual_subject_authority(pg_temp.manual_fixture('Manual existente'))$$,'admin cria cabeçalho estruturado');
select is((select origin from public.subject_authorities where record->>'title'='Manual existente - Bahia'),'manual','origem manual identificada');
select ok((select source_identifier is null from public.subject_authorities where record->>'title'='Manual existente - Bahia'),'identificador externo não é inventado');
select is(jsonb_array_length(public.search_subject_catalogue('Variante Manual existente')),1,'variante local encontra termo preferido');
select throws_ok($$select public.create_manual_subject_authority(pg_temp.manual_fixture('Manual existente'))$$,'P0001','authority_label_conflict','duplicata exige vínculo explícito');
select lives_ok($$select public.create_manual_subject_authority(pg_temp.manual_fixture('Proposta administrativa','local_proposal'))$$,'admin cria proposta inativa');
select is((select active from public.controlled_terms where preferred_label_pt='Proposta administrativa - Bahia'),false,'proposta aguarda revisão');
select is(jsonb_array_length(public.search_subject_catalogue('Proposta administrativa')),0,'proposta não aparece em sugestões gerais');
select throws_ok($$select public.create_manual_subject_authority(pg_temp.manual_fixture('Manual existente','local_proposal'))$$,'P0001','local_proposal_existing_term','proposta não duplica autoridade existente');
set local request.jwt.claim.sub='10000000-0000-4000-8000-000000000005';
select throws_ok($$select public.create_manual_subject_authority(pg_temp.manual_fixture('Bloqueado'))$$,'P0001','active_staff_required','bloqueado perde acesso');
set local request.jwt.claim.sub='10000000-0000-4000-8000-000000000006';
select throws_ok($$select public.create_manual_subject_authority(pg_temp.manual_fixture('Inativo'))$$,'P0001','active_staff_required','inativo perde acesso');
set local request.jwt.claim.sub='10000000-0000-4000-8000-000000000001';
select throws_ok($$select public.create_manual_subject_authority(pg_temp.manual_fixture('Estudante'))$$,'P0001','active_staff_required','estudante não cria proposta');
set local request.jwt.claim.sub='10000000-0000-4000-8000-000000000003';
select lives_ok($$select public.create_manual_subject_authority(pg_temp.manual_fixture('Proposta atendimento','local_proposal'),null,'40000000-0000-4000-8000-000000000002')$$,'responsável propõe no atendimento aberto');
select is(jsonb_array_length(public.get_request_subject_proposals('40000000-0000-4000-8000-000000000002')),1,'responsável recupera proposta do rascunho');
select throws_ok($$select public.create_manual_subject_authority(pg_temp.manual_fixture('Não proposta'),null,'40000000-0000-4000-8000-000000000002')$$,'P0001','request_local_proposal_required','análise não pode criar termo já ativo');
select throws_ok($$select public.create_manual_subject_authority(pg_temp.manual_fixture('Fechado','local_proposal'),null,'40000000-0000-4000-8000-000000000001')$$,'P0001','request_locked_by_another_staff','atendimento fechado não admite proposta');
set local request.jwt.claim.sub='10000000-0000-4000-8000-000000000004';
select throws_ok($$select public.get_request_subject_proposals('40000000-0000-4000-8000-000000000002')$$,'P0001','request_locked_by_another_staff','outro responsável não lê propostas');
select throws_ok($$insert into public.request_subject_proposals select * from public.request_subject_proposals$$,'42501',null,'sem escrita direta nos vínculos');
reset role;
select throws_ok($$insert into public.request_controlled_terms(request_id,controlled_term_id,label_pt_snapshot,is_primary,position,source_code) select '40000000-0000-4000-8000-000000000002',id,preferred_label_pt,false,1,'bn' from public.controlled_terms where preferred_label_pt='Proposta atendimento - Bahia'$$,'P0001','local_subject_proposal_pending','trigger impede vínculo definitivo antes da revisão');
select lives_ok($$insert into public.request_cataloging_drafts(request_id,payload) values('40000000-0000-4000-8000-000000000002',jsonb_build_object('terms',jsonb_build_array(jsonb_build_object('labelPt','Proposta atendimento - Bahia'))))$$,'rascunho de origem admite proposta');
select throws_ok($$insert into public.request_cataloging_drafts(request_id,payload) values('40000000-0000-4000-8000-000000000001',jsonb_build_object('terms',jsonb_build_array(jsonb_build_object('labelPt','Proposta atendimento - Bahia'))))$$,'P0001','local_subject_proposal_wrong_request','outro rascunho não pode reutilizar proposta');
select throws_ok($$insert into public.cataloging_card_homologations(request_id,snapshot,homologated_by,librarian_name_snapshot,librarian_crb_snapshot) values('40000000-0000-4000-8000-000000000002','{}','10000000-0000-4000-8000-000000000004','Bibliotecário sintético','CRB-TESTE')$$,'P0001','local_subject_proposal_pending','banco impede homologação da proposta pendente');
update public.controlled_terms set active=true where preferred_label_pt='Proposta atendimento - Bahia';
set local role authenticated;
set local request.jwt.claim.sub='10000000-0000-4000-8000-000000000003';
select is(public.get_request_subject_proposals('40000000-0000-4000-8000-000000000002')->0->>'active','true','retorno ao atendimento identifica revisão aprovada');
select * from finish();
rollback;
