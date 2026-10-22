begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
 ('97000000-0000-4000-8000-000000000001','pdf.estudante@ufba.br',now(),'{"registration_source":"student","privacy_notice_version":"1.1","birth_date":"2000-01-01","full_name":"Estudante PDF","cpf":"81000000931"}'),
 ('97000000-0000-4000-8000-000000000002','pdf.outro@ufba.br',now(),'{"registration_source":"student","privacy_notice_version":"1.1","birth_date":"2000-01-01","full_name":"Outro PDF","cpf":"81000001075"}'),
 ('97000000-0000-4000-8000-000000000003','pdf.catalogador@ufba.br',now(),'{}');
insert into public.profiles(id,full_name,email,role,status) values('97000000-0000-4000-8000-000000000003','Catalogador PDF','pdf.catalogador@ufba.br','cataloger','active');
insert into public.staff_profiles(profile_id,professional_name,crb) values('97000000-0000-4000-8000-000000000003','Catalogador PDF','CRB-5/3333');

set local role authenticated; set local request.jwt.claim.sub='97000000-0000-4000-8000-000000000001';
select lives_ok($$select * from public.open_student_request_v12(jsonb_build_object('academicProgramId',(select id from public.academic_programs where code='architecture-urbanism-undergraduate'),'registrationNumber','PDF2026','title','Trabalho PDF','publicWorkUrl','https://example.org/work.pdf','depositDate','2026-10-01','defenseDate','2025-10-01','depositYear',2026,'defenseYear',2025,'extentUnit','pages','extentCount',204,'people',jsonb_build_object('author','Ana','advisor','Bia','advisorNoteLabel','Orientador'),'keywordsPt',jsonb_build_array('Arquitetura','Habitação','Urbanismo'),'keywordsEn',jsonb_build_array('Architecture','Housing','Urbanism'),'equivalentTitles',jsonb_build_array(jsonb_build_object('language','en','title','PDF work')),'hasIllustrations',false,'specialCases',jsonb_build_array(),'originalLanguage','pt','cancellationAcknowledged',true,'sharedFileUnchangedConfirmed',true,'defendedAndApproved',true,'finalFileConfirmed',true,'approvalPageConfirmed',true))$$,'solicitação criada');
reset role;
with created_terms as (
  insert into public.controlled_terms(preferred_label_pt,normalized_label_pt,preferred_label_en,normalized_label_en,created_by,updated_by)
  values ('arquitetura','arquitetura','architecture','architecture','97000000-0000-4000-8000-000000000003','97000000-0000-4000-8000-000000000003'),('habitação','habitação','housing','housing','97000000-0000-4000-8000-000000000003','97000000-0000-4000-8000-000000000003'),('urbanismo','urbanismo','urbanism','urbanism','97000000-0000-4000-8000-000000000003','97000000-0000-4000-8000-000000000003') returning id,preferred_label_pt,preferred_label_en
) insert into public.request_controlled_terms(request_id,controlled_term_id,label_pt_snapshot,label_en_snapshot,is_primary,position) select (select id from public.cataloging_requests),id,preferred_label_pt,preferred_label_en,preferred_label_pt='arquitetura',row_number() over(order by preferred_label_pt)-1 from created_terms;
update public.cataloging_requests set status='in_review',assigned_to='97000000-0000-4000-8000-000000000003';
set local role authenticated; set local request.jwt.claim.sub='97000000-0000-4000-8000-000000000003';
select public.validate_request_citation((select id from public.cataloging_requests limit 1),'ANA. Trabalho PDF. 2026. Trabalho Final de Graduação.');
select public.confirm_public_work_link((select id from public.cataloging_requests limit 1));
select public.confirm_request_declarations((select id from public.cataloging_requests limit 1));
select public.complete_request_analysis((select id from public.cataloging_requests limit 1));
reset role;
update public.cataloging_requests set status='approved';
insert into public.request_cataloging_metadata(request_id,cdu_code,cutter_code,last_edited_by)
  select id,'72','S586','97000000-0000-4000-8000-000000000003' from public.cataloging_requests;
insert into public.cdu_code_descriptions(cdu_code,description,submitted_by)
  values ('72','Arquitetura e urbanismo','97000000-0000-4000-8000-000000000003');
insert into public.cataloging_card_homologations(request_id,snapshot,homologated_by,librarian_name_snapshot,librarian_crb_snapshot) select id,'{}','97000000-0000-4000-8000-000000000003','Catalogador PDF','CRB-5/3333' from public.cataloging_requests;

set local role authenticated; set local request.jwt.claim.sub='97000000-0000-4000-8000-000000000001';
select is((select count(*)::integer from public.cataloging_card_homologations),0,'ficha fica bloqueada antes do Nada Consta');
reset role;
insert into public.nada_consta_documents(request_id,object_path,original_name,size_bytes,mime_type,sha256,status,uploaded_by,validated_by,validated_at,released_at) select id,id::text||'/nada-consta.pdf','nada.pdf',100,'application/pdf',repeat('a',64),'approved','97000000-0000-4000-8000-000000000001','97000000-0000-4000-8000-000000000003',now(),now() from public.cataloging_requests;
set local role authenticated; set local request.jwt.claim.sub='97000000-0000-4000-8000-000000000001';
select is((select count(*)::integer from public.cataloging_card_homologations),1,'estudante liberado lê sua ficha homologada');
set local request.jwt.claim.sub='97000000-0000-4000-8000-000000000002';
select is((select count(*)::integer from public.cataloging_card_homologations),0,'outro estudante não lê a ficha');
reset role; reset request.jwt.claim.sub; update public.nada_consta_documents set status='rejected',released_at=null;
set local role authenticated; set local request.jwt.claim.sub='97000000-0000-4000-8000-000000000001';
select is((select count(*)::integer from public.cataloging_card_homologations),0,'revogação do Nada Consta bloqueia novamente');
reset role; reset request.jwt.claim.sub; update public.nada_consta_documents set status='approved',released_at=now(); update public.cataloging_requests set status='completed';
set local role authenticated; set local request.jwt.claim.sub='97000000-0000-4000-8000-000000000001';
select is((select count(*)::integer from public.cataloging_card_homologations),1,'conclusão com guia desativado preserva acesso à própria ficha');

select * from finish();
rollback;
