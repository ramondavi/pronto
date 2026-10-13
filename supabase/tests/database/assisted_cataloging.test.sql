begin;
create extension if not exists pgtap with schema extensions;
select plan(26);

insert into auth.users (id,email,email_confirmed_at,raw_user_meta_data) values
 ('90000000-0000-4000-8000-000000000001','catalogacao.estudante@ufba.br',now(),'{"registration_source":"student","privacy_notice_version":"1.1","birth_date":"2000-01-01","full_name":"Estudante Catalogação","cpf":"81000000265"}'::jsonb),
 ('90000000-0000-4000-8000-000000000002','catalogacao.catalogador@ufba.br',now(),'{}'::jsonb),
 ('90000000-0000-4000-8000-000000000003','catalogacao.outro@ufba.br',now(),'{}'::jsonb);
insert into public.profiles (id,full_name,email,role,status) values
 ('90000000-0000-4000-8000-000000000002','Catalogador Assistido','catalogacao.catalogador@ufba.br','cataloger','active'),
 ('90000000-0000-4000-8000-000000000003','Outro Catalogador','catalogacao.outro@ufba.br','cataloger','active');
insert into public.staff_profiles (profile_id,professional_name,crb) values
 ('90000000-0000-4000-8000-000000000002','Catalogador Assistido','CRB-AS-1'),
 ('90000000-0000-4000-8000-000000000003','Outro Catalogador','CRB-AS-2');

set local role authenticated;
set local request.jwt.claim.sub='90000000-0000-4000-8000-000000000001';
select lives_ok($$select * from public.open_student_request_v12(jsonb_build_object(
 'academicProgramId',(select id from public.academic_programs where code='architecture-urbanism-undergraduate'),
 'registrationNumber','CAT2026','title','Catalogação assistida',
 'publicWorkUrl','https://example.org/catalogacao.pdf','depositDate','2026-10-01','defenseDate','2025-10-01','depositYear',2026,'defenseYear',2025,'extentUnit','pages','extentCount',204,
 'people',jsonb_build_object('author','Ana  Silva','advisor','Bruno Souza','advisorNoteLabel','Orientador'),
 'keywordsPt',jsonb_build_array('Arquitetura','Habitação','Urbanismo'),'keywordsEn',jsonb_build_array('Architecture','Housing','Urbanism'),
 'equivalentTitles',jsonb_build_array(jsonb_build_object('language','en','title','Assisted cataloging')),
 'hasIllustrations',false,'specialCases',jsonb_build_array(),'originalLanguage','pt','cancellationAcknowledged',true,'sharedFileUnchangedConfirmed',true,'defendedAndApproved',true,'finalFileConfirmed',true,'approvalPageConfirmed',true))$$,'estudante abre solicitação para catalogação');

set local request.jwt.claim.sub='90000000-0000-4000-8000-000000000002';
select lives_ok($$select public.assume_cataloging_request((select id from public.cataloging_requests limit 1))$$,'catalogador assume o ticket');
select lives_ok($$select public.save_assisted_cataloging_v2((select id from public.cataloging_requests limit 1), jsonb_build_object(
 'people',jsonb_build_array(
  jsonb_build_object('role','author','transcribedName','Ana  Silva','authorizedName','Silva, Ana.'),
  jsonb_build_object('role','advisor','transcribedName','Bruno Souza','authorizedName','Souza, Bruno'),
  jsonb_build_object('role','committee_member','transcribedName','Carla Lima','authorizedName','Lima, Carla')),
 'terms',jsonb_build_array(
  jsonb_build_object('labelPt','Arquitetura.','labelEn','Architecture','sourceCode','bn','isPrimary',true),
  jsonb_build_object('labelPt','Habitação','labelEn','Housing','sourceCode','bn','isPrimary',false)),
 'cduCode','72','cutterCode','S586'))$$,'responsável salva a catalogação assistida');
select is((select count(*)::integer from public.person_authorities),3,'três autoridades reutilizáveis são criadas');
select is((select authorized_name from public.person_authorities where normalized_name='silva, ana'),'Silva, Ana','nome autorizado é sanitizado');
select is((select transcribed_name from public.request_cataloging_people where role='author'),'Ana Silva','forma transcrita é sanitizada separadamente');
select is((select authorized_name_snapshot from public.request_cataloging_people where role='author'),'Silva, Ana','solicitação preserva retrato autorizado');
select is((select count(*)::integer from public.controlled_terms),2,'dois termos controlados são criados');
select is((select preferred_label_pt from public.controlled_terms where normalized_label_pt='arquitetura'),'Arquitetura','pontuação final é removida do termo');
select is((select preferred_label_en from public.controlled_terms where normalized_label_pt='habitação'),'Housing','equivalente em inglês é preservado');
select is((select count(*)::integer from public.request_controlled_terms where is_primary),1,'há exatamente um termo principal');
select is((select cdu_code from public.request_cataloging_metadata),'72','CDU manual é armazenada');
select is((select cutter_code from public.request_cataloging_metadata),'S586','Cutter manual é armazenado');
select is(jsonb_array_length((select marc21_preparation -> 'people' from public.request_cataloging_metadata)),3,'preparação MARC mantém pessoas estruturadas');
select is(jsonb_array_length((select marc21_preparation -> 'subjects' from public.request_cataloging_metadata)),2,'preparação MARC mantém assuntos estruturados');

select lives_ok($$select public.save_assisted_cataloging_v2((select id from public.cataloging_requests limit 1), jsonb_build_object(
 'people',(select jsonb_agg(jsonb_build_object('authorityId',authority_person_id,'role',role,'transcribedName',transcribed_name,'authorizedName',authorized_name_snapshot) order by position) from public.request_cataloging_people),
 'terms',(select jsonb_agg(jsonb_build_object('termId',controlled_term_id,'labelPt',label_pt_snapshot,'labelEn',label_en_snapshot,'sourceCode',source_code,'isPrimary',is_primary) order by position) from public.request_controlled_terms),
 'cduCode','72','cutterCode','S586'))$$,'autocomplete reutiliza cadastros existentes');
select is((select count(*)::integer from public.person_authorities),3,'reutilização não duplica pessoas');
select is((select count(*)::integer from public.controlled_terms),2,'reutilização não duplica termos');

reset role;
update public.person_authorities set authorized_name='Silva, Ana Maria', normalized_name='silva, ana maria' where normalized_name='silva, ana';
select is((select authorized_name_snapshot from public.request_cataloging_people where role='author'),'Silva, Ana','alteração da autoridade não sobrescreve o histórico');
update public.cataloging_requests set status='approved';

set local role authenticated;
set local request.jwt.claim.sub='90000000-0000-4000-8000-000000000002';
select is((select score from public.suggest_cdu(
 (select id from public.controlled_terms where normalized_label_pt='arquitetura'),
 array[(select id from public.controlled_terms where normalized_label_pt='habitação')]
)),3::bigint,'CDU soma peso dois do principal e peso um do secundário');
select is((select primary_count from public.suggest_cdu(
 (select id from public.controlled_terms where normalized_label_pt='arquitetura'),
 array[(select id from public.controlled_terms where normalized_label_pt='habitação')]
)),1::bigint,'explicação informa contagem do termo principal');
select is((select secondary_count from public.suggest_cdu(
 (select id from public.controlled_terms where normalized_label_pt='arquitetura'),
 array[(select id from public.controlled_terms where normalized_label_pt='habitação')]
)),1::bigint,'explicação informa ocorrências secundárias');

set local request.jwt.claim.sub='90000000-0000-4000-8000-000000000003';
select throws_ok($$select public.save_assisted_cataloging_v2((select id from public.cataloging_requests limit 1),jsonb_build_object('people',jsonb_build_array(jsonb_build_object('role','author','transcribedName','Ana Silva','authorizedName','Silva, Ana'),jsonb_build_object('role','advisor','transcribedName','Bruno Souza','authorizedName','Souza, Bruno')),'terms',jsonb_build_array(),'cduCode','72','cutterCode','S586'))$$,'P0001','request_locked_by_another_staff','outro catalogador não altera o ticket');

set local request.jwt.claim.sub='90000000-0000-4000-8000-000000000001';
select is((select count(*)::integer from public.person_authorities),0,'estudante não lê autoridades');
select is((select count(*)::integer from public.controlled_terms),0,'estudante não lê vocabulário controlado');
select throws_ok($$select * from public.suggest_cdu(null,'{}'::uuid[])$$,'P0001','active_staff_required','estudante não consulta histórico CDU');

select * from finish();
rollback;
