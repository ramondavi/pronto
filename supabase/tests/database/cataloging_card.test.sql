begin;
create extension if not exists pgtap with schema extensions;
select plan(26);

insert into auth.users (id,email,email_confirmed_at,raw_user_meta_data) values
 ('92000000-0000-4000-8000-000000000001','ficha.estudante@ufba.br',now(),'{"registration_source":"student","privacy_notice_version":"1.1","birth_date":"2000-01-01","full_name":"Estudante Ficha","cpf":"81000000850"}'::jsonb),
 ('92000000-0000-4000-8000-000000000002','ficha.catalogador@ufba.br',now(),'{}'::jsonb),
 ('92000000-0000-4000-8000-000000000003','ficha.outro@ufba.br',now(),'{}'::jsonb);
insert into public.profiles (id,full_name,email,role,status) values
 ('92000000-0000-4000-8000-000000000002','Catalogador da Ficha','ficha.catalogador@ufba.br','cataloger','active'),
 ('92000000-0000-4000-8000-000000000003','Outro Catalogador da Ficha','ficha.outro@ufba.br','cataloger','active');
insert into public.staff_profiles (profile_id,professional_name,crb) values
 ('92000000-0000-4000-8000-000000000002','Bibliotecário Responsável','CRB-5/1234'),
 ('92000000-0000-4000-8000-000000000003','Outro Bibliotecário','CRB-5/9999');

set local role authenticated;
set local request.jwt.claim.sub='92000000-0000-4000-8000-000000000001';
select lives_ok($$select * from public.open_student_request_v12(jsonb_build_object(
 'academicProgramId',(select id from public.academic_programs where code='architecture-urbanism-undergraduate'),
 'registrationNumber','FICHA2026','title','Arquitetura social','subtitle','Um estudo aplicado','equivalentTitle','Social architecture',
 'publicWorkUrl','https://example.org/ficha.pdf',
 'depositDate','2026-10-01','defenseDate','2025-10-01','depositYear',2026,'defenseYear',2025,'extentUnit','pages','extentCount',204,'hasIllustrations',true,
 'people',jsonb_build_object('author','Ana Silva','advisor','Bruno Souza','advisorNoteLabel','Orientador'),
 'keywordsPt',jsonb_build_array('Arquitetura','Habitação','Urbanismo'),'keywordsEn',jsonb_build_array('Architecture','Housing','Urbanism'),
 'equivalentTitles',jsonb_build_array(jsonb_build_object('language','en','title','Social architecture')),
 'specialCases',jsonb_build_array(),'originalLanguage','pt','cancellationAcknowledged',true,'sharedFileUnchangedConfirmed',true,'defendedAndApproved',true,'finalFileConfirmed',true,'approvalPageConfirmed',true))$$,'estudante abre a solicitação');

set local request.jwt.claim.sub='92000000-0000-4000-8000-000000000002';
select lives_ok($$select public.assume_cataloging_request((select id from public.cataloging_requests limit 1))$$,'catalogador assume a solicitação');
select lives_ok($$select public.save_assisted_cataloging_v2((select id from public.cataloging_requests limit 1),jsonb_build_object(
 'people',jsonb_build_array(
  jsonb_build_object('role','author','transcribedName','Ana Silva','authorizedName','Silva, Ana'),
  jsonb_build_object('role','advisor','transcribedName','Bruno Souza','authorizedName','Souza, Bruno')),
 'terms',jsonb_build_array(
  jsonb_build_object('labelPt','Arquitetura','labelEn','Architecture','sourceCode','bn','isPrimary',true),
  jsonb_build_object('labelPt','Habitação','labelEn','Housing','sourceCode','bn','isPrimary',false),
  jsonb_build_object('labelPt','Urbanismo','labelEn','Urbanism','sourceCode','bn','isPrimary',false)),
 'cduCode','72','cutterCode',''))$$,'catalogação incompleta é salva como rascunho');
select throws_ok($$select * from public.homologate_cataloging_card((select id from public.cataloging_requests limit 1))$$,'P0001','classification_required','homologação exige CDU e Cutter');
select lives_ok($$select public.save_assisted_cataloging_v2((select id from public.cataloging_requests limit 1),jsonb_build_object(
 'people',(select jsonb_agg(jsonb_build_object('authorityId',authority_person_id,'role',role,'transcribedName',transcribed_name,'authorizedName',authorized_name_snapshot) order by position) from public.request_cataloging_people),
 'terms',(select jsonb_agg(jsonb_build_object('termId',controlled_term_id,'labelPt',label_pt_snapshot,'labelEn',label_en_snapshot,'sourceCode',source_code,'isPrimary',is_primary) order by position) from public.request_controlled_terms),
 'cduCode','72','cutterCode','S586'))$$,'classificação completa é salva');
select public.save_cdu_code_description('72','Arquitetura e urbanismo');

set local request.jwt.claim.sub='92000000-0000-4000-8000-000000000003';
select throws_ok($$select * from public.homologate_cataloging_card((select id from public.cataloging_requests limit 1))$$,'P0001','request_not_ready_for_homologation','outro catalogador não homologa o ticket');
set local request.jwt.claim.sub='92000000-0000-4000-8000-000000000002';
select public.validate_request_citation((select id from public.cataloging_requests limit 1),'SILVA, Ana. Arquitetura social. 2026. Trabalho Final de Graduação.');
select public.confirm_public_work_link((select id from public.cataloging_requests limit 1));
select public.confirm_request_declarations((select id from public.cataloging_requests limit 1));
select public.complete_request_analysis((select id from public.cataloging_requests limit 1));
select lives_ok($$select * from public.homologate_cataloging_card((select id from public.cataloging_requests limit 1))$$,'responsável homologa a ficha');
select is((select status from public.cataloging_requests limit 1),'approved'::public.request_status,'solicitação fica homologada');
select is((select count(*)::integer from public.cataloging_card_homologations),1,'homologação cria um snapshot único');
select is((select snapshot #>> '{institution,university}' from public.cataloging_card_homologations),'Universidade Federal da Bahia (UFBA)','snapshot identifica a UFBA');
select is((select snapshot #>> '{institution,librarySystem}' from public.cataloging_card_homologations),'Sistema Universitário de Bibliotecas (SIBI)','snapshot identifica o SIBI');
select is((select snapshot #>> '{institution,library}' from public.cataloging_card_homologations),'Biblioteca da Faculdade de Arquitetura (BIB/FA)','snapshot identifica a BIB/FA');
select is((select snapshot #>> '{people,0,authorizedName}' from public.cataloging_card_homologations),'Silva, Ana','forma autorizada do autor é congelada');
select is((select snapshot #>> '{people,0,transcribedName}' from public.cataloging_card_homologations),'Ana Silva','forma transcrita do autor é congelada');
select is((select snapshot #>> '{people,1,authorizedName}' from public.cataloging_card_homologations),'Souza, Bruno','forma autorizada do orientador é congelada');
select is((select snapshot #>> '{classification,cdu}' from public.cataloging_card_homologations),'72','CDU é congelada');
select is((select snapshot #>> '{classification,cutter}' from public.cataloging_card_homologations),'S586','Cutter é congelado');
select is((select librarian_name_snapshot from public.cataloging_card_homologations),'Catalogador da Ficha','responsável técnico usa o nome cadastrado na conta');
select is((select librarian_crb_snapshot from public.cataloging_card_homologations),'CRB-5/1234','CRB é registrado');
select ok((select homologated_at is not null from public.cataloging_card_homologations),'data e horário são registrados');
select is((select layout_version from public.cataloging_card_homologations),'institutional-v2','layout institucional validado é congelado');
reset role;
select is((select count(*)::integer from public.audit_logs where action='cataloging_card_homologated'),1,'homologação gera log');
set local role authenticated;
set local request.jwt.claim.sub='92000000-0000-4000-8000-000000000002';
select is((select count(*)::integer from public.email_outbox where event_type='request_released'),0,'homologação não libera antes do Nada Consta');

reset role;
select throws_ok($$update public.cataloging_card_homologations set layout_version='alterado'$$,'P0001','cataloging_card_homologation_is_immutable','snapshot homologado não pode ser alterado');
update public.person_authorities set authorized_name='Silva, Ana Maria' where normalized_name='silva, ana';
select is((select snapshot #>> '{people,0,authorizedName}' from public.cataloging_card_homologations),'Silva, Ana','mudança futura da autoridade não altera a ficha');

set local role authenticated;
set local request.jwt.claim.sub='92000000-0000-4000-8000-000000000001';
select is((select count(*)::integer from public.cataloging_card_homologations),0,'estudante ainda não acessa a ficha antes do fluxo de Nada Consta');

select * from finish();
rollback;
