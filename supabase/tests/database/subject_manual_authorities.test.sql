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
 select jsonb_build_object('draft_id',gen_random_uuid(),'source',case when status_value='existing' then 'bn' else 'pronto' end,'status',status_value,'heading_type','topic',
 'components',jsonb_build_array(jsonb_build_object('kind','Assunto-base','value',label),jsonb_build_object('kind','Subdivisão geográfica','value','Bahia')),
 'variants',jsonb_build_array(jsonb_build_object('value','Variante '||label)),'note','Nota sintética','foundation',case when status_value='existing' then null else jsonb_build_object('rationale','Necessidade conceitual sintética documentada','references',jsonb_build_array(jsonb_build_object('kind','bibliographic','citation','Obra sintética, 2026','evidence','Discussão sintética do conceito'))) end); $$;
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

select throws_ok($$select public.create_manual_subject_authority(pg_temp.manual_fixture('Validação negada','local_validated'),null,'40000000-0000-4000-8000-000000000002')$$,'P0001','permission_denied','catalogador não valida nem no próprio atendimento');
set local request.jwt.claim.sub='10000000-0000-4000-8000-000000000004';
select lives_ok($$select public.create_manual_subject_authority(pg_temp.manual_fixture('Local validado','local_validated'))$$,'gestor valida e ativa no cadastro');
select is((select active from public.controlled_terms where preferred_label_pt='Local validado - Bahia'),true,'termo validado nasce ativo');
select is((select record->>'status' from public.subject_authorities where record->>'title'='Local validado - Bahia'),'local_validated','não representa validação como autorização externa');
select ok((select source_identifier is null and origin='manual' and record->>'locally_validated_by'='10000000-0000-4000-8000-000000000004' and record->>'locally_validated_at' is not null from public.subject_authorities where record->>'title'='Local validado - Bahia'),'origem local e responsável da validação preservados');
select is(jsonb_array_length(public.search_subject_catalogue('Local validado')),1,'termo validado disponível para novas fichas');
select is((select active from public.controlled_terms where preferred_label_pt='Proposta administrativa - Bahia'),false,'outras propostas não são ativadas');
reset role;
update public.cataloging_requests set assigned_to='10000000-0000-4000-8000-000000000004' where id='40000000-0000-4000-8000-000000000002';
set local role authenticated;
set local request.jwt.claim.sub='10000000-0000-4000-8000-000000000004';
select lives_ok($$select public.create_manual_subject_authority(pg_temp.manual_fixture('Validado na análise','local_validated'),null,'40000000-0000-4000-8000-000000000002')$$,'gestor valida no atendimento próprio');
reset role;
select lives_ok($$insert into public.request_controlled_terms(request_id,controlled_term_id,label_pt_snapshot,is_primary,position,source_code) select '40000000-0000-4000-8000-000000000002',id,preferred_label_pt,false,1,'bn' from public.controlled_terms where preferred_label_pt='Validado na análise - Bahia'$$,'termo validado pode integrar ficha definitiva');
select is(public.can_validate_local_subject(),true,'gestor vê capacidade de ativação imediata');
set local role authenticated;
set local request.jwt.claim.sub='10000000-0000-4000-8000-000000000003';
select is(public.can_validate_local_subject(),false,'catalogador sem gestão não recebe opção de ativação');
set local request.jwt.claim.sub='10000000-0000-4000-8000-000000000005';
select is(public.can_validate_local_subject(),false,'bloqueado não recebe capacidade');
set local role anon;
select throws_ok($$select public.can_validate_local_subject()$$,'42501',null,'capacidade não é pública');

set local role authenticated;
set local request.jwt.claim.sub='10000000-0000-4000-8000-000000000004';
select throws_ok($$select public.create_manual_subject_authority(pg_temp.manual_fixture('Sem base','local_validated')-'foundation')$$,'P0001','local_authority_foundation_required','termo local exige fundamentação no banco');
select throws_ok($$select public.create_manual_subject_authority(pg_temp.manual_fixture('Origem falsa','local_validated')||'{"source":"bn"}'::jsonb)$$,'P0001','manual_authority_origin_mismatch','termo local não é atribuído a fonte externa');
select throws_ok($$select public.create_manual_subject_authority(pg_temp.manual_fixture('Transcrição falsa')||'{"source":"pronto"}'::jsonb)$$,'P0001','manual_authority_origin_mismatch','Pronto não é fonte externa de transcrição');
select is((select source_code from public.subject_authorities where record->>'title'='Local validado - Bahia'),'pronto','origem local preservada no catálogo');
select is(public.search_subject_catalogue('Local validado')->0->>'source_code','pronto','busca identifica origem local para reutilização');
select is((select count(*) from public.subject_authority_foundations f join public.subject_authorities a on a.id=f.authority_id where a.record->>'title'='Local validado - Bahia'),1::bigint,'gestor consulta fundamentação');
select ok((select not (record->'manual_input' ? 'foundation') and position('Obra sintética' in record::text)=0 from public.subject_authorities where record->>'title'='Local validado - Bahia'),'referências não ficam na leitura geral das autoridades');
select throws_ok($$insert into public.subject_authority_foundations(authority_id,rationale,references_data,created_by) values(gen_random_uuid(),'Fundamentação sintética','[{}]','10000000-0000-4000-8000-000000000004')$$,'42501',null,'sem escrita direta na fundamentação');
select throws_ok($$select public.create_manual_subject_authority(pg_temp.manual_fixture('Protocolo inacessível','local_validated')||jsonb_build_object('foundation',jsonb_build_object('rationale','Justificativa sintética suficiente','references',jsonb_build_array(jsonb_build_object('kind','request','protocol','FC-INEXISTENTE','evidence','Discussão do conceito')))))$$,'P0001','authority_reference_not_accessible','protocolo inexistente não vincula trabalho');
set local request.jwt.claim.sub='10000000-0000-4000-8000-000000000003';
select is((select count(*) from public.subject_authority_foundations f join public.subject_authorities a on a.id=f.authority_id where a.record->>'title'='Local validado - Bahia'),0::bigint,'outro catalogador não lê referências restritas');
reset role;
update public.cataloging_requests set assigned_to='10000000-0000-4000-8000-000000000003' where id='40000000-0000-4000-8000-000000000002';
update public.cataloging_requests set assigned_to='10000000-0000-4000-8000-000000000004' where id='40000000-0000-4000-8000-000000000001';
set local role authenticated;
set local request.jwt.claim.sub='10000000-0000-4000-8000-000000000003';
select throws_ok($$select public.create_manual_subject_authority(pg_temp.manual_fixture('Referência alheia','local_proposal')||jsonb_build_object('foundation',jsonb_build_object('rationale','Justificativa sintética suficiente','references',jsonb_build_array(jsonb_build_object('kind','request','request_id','40000000-0000-4000-8000-000000000001','evidence','Discussão do conceito')))),null,'40000000-0000-4000-8000-000000000002')$$,'P0001','authority_reference_not_accessible','catalogador não referencia trabalho alheio');
select lives_ok($$select public.create_manual_subject_authority(pg_temp.manual_fixture('Referência própria','local_proposal')||jsonb_build_object('foundation',jsonb_build_object('rationale','Justificativa sintética suficiente','references',jsonb_build_array(jsonb_build_object('kind','request','request_id','40000000-0000-4000-8000-000000000002','evidence','Discussão do conceito','location','p. 42')))),null,'40000000-0000-4000-8000-000000000002')$$,'catalogador referencia trabalho próprio na proposta');
select is((select f.references_data->0->>'request_id' from public.subject_authority_foundations f join public.subject_authorities a on a.id=f.authority_id where a.record->>'title'='Referência própria - Bahia'),'40000000-0000-4000-8000-000000000002','referência interna guarda vínculo explícito');
select ok((select f.references_data->0->>'protocol' is null and f.references_data->0->>'title' is null from public.subject_authority_foundations f join public.subject_authorities a on a.id=f.authority_id where a.record->>'title'='Referência própria - Bahia'),'não copia protocolo nem título para referência');
select throws_ok($$select public.save_assisted_cataloging_v2('40000000-0000-4000-8000-000000000002',jsonb_build_object('people',jsonb_build_array(jsonb_build_object('role','author'),jsonb_build_object('role','advisor')),'terms',jsonb_build_array(jsonb_build_object('labelPt','Termo inventado sem registro','sourceCode','pronto'))))$$,'P0001','local_subject_requires_registration','salvamento não cria termo local ativo por atalho');
select lives_ok($$select public.save_assisted_cataloging_v2('40000000-0000-4000-8000-000000000002',jsonb_build_object('people',jsonb_build_array(jsonb_build_object('role','author','transcribedName','Ana Silva','authorizedName','Silva, Ana'),jsonb_build_object('role','advisor','transcribedName','Bruno Souza','authorizedName','Souza, Bruno')),'terms',jsonb_build_array(jsonb_build_object('labelPt','Local validado - Bahia','sourceCode','pronto','isPrimary',true),jsonb_build_object('labelPt','Manual existente - Bahia','sourceCode','bn'),jsonb_build_object('labelPt','Assunto anterior','sourceCode','bn')),'cduCode','72','cutterCode','S586'))$$,'salvamento aceita autoridade local validada e preserva origem');
set local request.jwt.claim.sub='10000000-0000-4000-8000-000000000005';
select is((select count(*) from public.subject_authority_foundations),0::bigint,'bloqueado não lê fundamentação');
set local role anon;
select throws_ok($$select * from public.subject_authority_foundations$$,'42501',null,'fundamentação não é pública');
select * from finish();
rollback;
