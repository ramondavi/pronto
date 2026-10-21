begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
 ('a1000000-0000-4000-8000-000000000001','teste.retrospectiva.admin@ufba.br',now(),'{}'),
 ('a1000000-0000-4000-8000-000000000002','teste.retrospectiva.secretaria@ufba.br',now(),'{}'),
 ('a1000000-0000-4000-8000-000000000003','teste.retrospectiva.estudante@ufba.br',now(),'{"registration_source":"student","privacy_notice_version":"1.1","birth_date":"2000-01-01","full_name":"Estudante Teste","cpf":"81000000001"}');
insert into public.profiles(id,full_name,email,role,status) values
 ('a1000000-0000-4000-8000-000000000001','Admin Teste','teste.retrospectiva.admin@ufba.br','administrator','active');

create function pg_temp.retrospective_payload(registration text, work_title text) returns jsonb language sql as $$
 select jsonb_build_object('academicProgramId',(select id from public.academic_programs where code='athdc-specialization'),
 'registrationNumber',registration,'title',work_title,'publicWorkUrl','https://example.org/trabalho.pdf',
 'people',jsonb_build_object('author','Autora do trabalho','advisor','Orientador Teste','advisorNoteLabel','Orientador'),
 'keywordsPt','["Arquitetura","Cidade","Urbanismo"]'::jsonb,'keywordsEn','["Architecture","City","Urbanism"]'::jsonb,
 'equivalentTitles','[{"language":"en","title":"Academic test work"}]'::jsonb,'specialCases','[]'::jsonb,
 'depositDate','2026-10-01','defenseDate','2020-10-01','depositYear',2026,'defenseYear',2020,
 'extentUnit','pages','extentCount',100,'hasIllustrations',true,'originalLanguage','pt',
 'cancellationAcknowledged',true,'sharedFileUnchangedConfirmed',true,'defendedAndApproved',true,'finalFileConfirmed',true,'approvalPageConfirmed',true);
$$;

set local role authenticated;
set local request.jwt.claim.sub='a1000000-0000-4000-8000-000000000003';
select ok(not public.has_retrospective_access(),'estudante comum não recebe exceção');
select throws_ok($$select public.grant_retrospective_access('teste.retrospectiva.secretaria@ufba.br','Secretaria Teste')$$,'P0001','active_administrator_required','estudante não concede acesso');
set local request.jwt.claim.sub='a1000000-0000-4000-8000-000000000001';
select lives_ok($$select public.grant_retrospective_access('teste.retrospectiva.secretaria@ufba.br','Secretaria Teste')$$,'administrador concede acesso dedicado');
set local request.jwt.claim.sub='a1000000-0000-4000-8000-000000000002';
select ok(public.has_retrospective_access(),'secretaria recebe acesso provisório');
select ok((select cpf is null and birth_date is null from public.student_profiles where profile_id=auth.uid()),'representante não recebe identidade acadêmica fictícia');
select lives_ok($$select * from public.open_student_request_v12(pg_temp.retrospective_payload('20200001','Retrospectivo primeiro'))$$,'abre primeiro retrospectivo sem nascimento próprio');
select lives_ok($$select * from public.open_student_request_v12(pg_temp.retrospective_payload('20200002','Retrospectivo segundo'))$$,'abre outro retrospectivo simultâneo');
select ok((select count(*)=2 and bool_and(retrospective) from public.cataloging_requests),'dois protocolos recebem exceção persistida');
select ok(not exists(select 1 from public.request_people where role='author' and birth_year is not null),'nascimento da secretária não entra na autoria');
select throws_ok($$select * from public.open_student_request_v12(jsonb_set(pg_temp.retrospective_payload('20200003','Retrospectivo inválido'),'{people,birthYearAcknowledged}','true'))$$,'P0001','representative_is_not_author','não permite autorizar nascimento de representante');
select throws_ok($$select * from public.open_student_request_v12(jsonb_set(pg_temp.retrospective_payload('20200003','Outro programa'),'{academicProgramId}',to_jsonb((select id::text from public.academic_programs where code='ppgau-doctorate'))))$$,'P0001','retrospective_raue_only','restringe o programa também no banco');
select throws_ok($$select public.report_retrospective_deposit((select id from public.cataloging_requests where title='Retrospectivo primeiro'),'https://repositorio.ufba.br/handle/ri/1')$$,'P0001','released_retrospective_request_required','depósito não libera ficha ainda não homologada');
set local request.jwt.claim.sub='a1000000-0000-4000-8000-000000000003';
select ok((select count(*)=0 from public.cataloging_requests),'outro estudante não lê protocolos da secretária');
select lives_ok($$select * from public.open_student_request_v12(pg_temp.retrospective_payload('20200010','Estudante comum primeiro'))$$,'estudante comum mantém solicitação normal');
select throws_ok($$select * from public.open_student_request_v12(pg_temp.retrospective_payload('20200011','Estudante comum segundo'))$$,'P0001','active_request_already_exists','estudante comum continua limitado a um protocolo ativo');

-- Somente a preparação da ficha já homologada ignora os gatilhos catalográficos,
-- cobertos pela suíte própria; os testes abaixo exercitam liberação, RLS e encerramento.
reset role;
alter table public.cataloging_card_homologations disable trigger user;
insert into public.cataloging_card_homologations(request_id,snapshot,homologated_by,librarian_name_snapshot,librarian_crb_snapshot)
 select id,'{}','a1000000-0000-4000-8000-000000000001','Biblioteca Teste','5/0000' from public.cataloging_requests where title='Retrospectivo primeiro';
alter table public.cataloging_card_homologations enable trigger user;
set local request.jwt.claim.sub='a1000000-0000-4000-8000-000000000001';
update public.cataloging_requests set status='approved' where title='Retrospectivo primeiro';
update public.cataloging_requests set status='canceled' where title='Retrospectivo segundo';
set local role authenticated;
select throws_ok($$select public.end_retrospective_access('a1000000-0000-4000-8000-000000000002')$$,'P0001','retrospective_batch_not_finished','administrador não encerra lote com protocolo aberto');
set local request.jwt.claim.sub='a1000000-0000-4000-8000-000000000002';
select ok((select count(*)=1 from public.cataloging_card_homologations),'ficha homologada é liberada sem Nada Consta');
select throws_ok($$select public.report_retrospective_deposit((select id from public.cataloging_requests where title='Retrospectivo primeiro'),'https://example.org/falso')$$,'P0001','ri_ufba_url_required','rejeita URL fora do RI/UFBA');
select lives_ok($$select public.report_retrospective_deposit((select id from public.cataloging_requests where title='Retrospectivo primeiro'),'https://repositorio.ufba.br/handle/ri/1')$$,'secretaria informa URL de cada depósito');
select ok((select status='approved' from public.cataloging_requests where title='Retrospectivo primeiro'),'URL informada aguarda conferência profissional');
set local request.jwt.claim.sub='a1000000-0000-4000-8000-000000000001';
select lives_ok($$select public.close_cataloging_request((select id from public.cataloging_requests where title='Retrospectivo primeiro'),'https://repositorio.ufba.br/handle/ri/1')$$,'biblioteca confirma publicação e conclui sem Nada Consta');
select lives_ok($$select public.end_retrospective_access('a1000000-0000-4000-8000-000000000002')$$,'administrador encerra lote terminado');
set local request.jwt.claim.sub='a1000000-0000-4000-8000-000000000002';
select ok(not public.has_retrospective_access(),'conta inativa perde exceção imediatamente');
select ok((select count(*)=0 from public.cataloging_requests),'RLS retira acesso operacional após inativação');
select * from finish();
rollback;
