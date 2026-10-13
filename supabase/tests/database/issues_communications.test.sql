begin;
create extension if not exists pgtap with schema extensions;
select plan(29);

insert into auth.users (id,email,email_confirmed_at,raw_user_meta_data) values
 ('70000000-0000-4000-8000-000000000001','pendencia.estudante1@ufba.br',now(),'{"registration_source":"student","privacy_notice_version":"1.1","birth_date":"2000-01-01","full_name":"Estudante Pendência Um","cpf":"81000000508"}'::jsonb),
 ('70000000-0000-4000-8000-000000000002','pendencia.estudante2@ufba.br',now(),'{"registration_source":"student","privacy_notice_version":"1.1","birth_date":"2000-01-01","full_name":"Estudante Pendência Dois","cpf":"81000000699"}'::jsonb),
 ('70000000-0000-4000-8000-000000000003','pendencia.catalogador@ufba.br',now(),'{}'::jsonb),
 ('70000000-0000-4000-8000-000000000004','pendencia.admin@ufba.br',now(),'{}'::jsonb);
insert into public.profiles (id,full_name,email,role,status) values
 ('70000000-0000-4000-8000-000000000003','Catalogador de Pendências','pendencia.catalogador@ufba.br','cataloger','active'),
 ('70000000-0000-4000-8000-000000000004','Administrador de Pendências','pendencia.admin@ufba.br','administrator','active');
insert into public.staff_profiles (profile_id,professional_name,crb) values
 ('70000000-0000-4000-8000-000000000003','Catalogador de Pendências','CRB-PEND-1'),
 ('70000000-0000-4000-8000-000000000004','Administrador de Pendências','CRB-PEND-2');

set local role authenticated;
set local request.jwt.claim.sub='70000000-0000-4000-8000-000000000001';
select lives_ok($$select * from public.open_student_request_v12(jsonb_build_object(
 'academicProgramId',(select id from public.academic_programs where code='architecture-urbanism-undergraduate'),
 'registrationNumber','PEND2026','title','Título original','subtitle','Subtítulo aprovado',
 'publicWorkUrl','https://example.org/original.pdf','depositDate','2026-10-01','defenseDate','2025-10-01','depositYear',2026,'defenseYear',2025,'extentUnit','pages','extentCount',204,
 'people',jsonb_build_object('author','Estudante Pendência Um','advisor','Orientador Correto','advisorNoteLabel','Orientador'),
 'keywordsPt',jsonb_build_array('Arquitetura','Habitação','Urbanismo'),'keywordsEn',jsonb_build_array('Architecture','Housing','Urbanism'),
 'equivalentTitles',jsonb_build_array(jsonb_build_object('language','en','title','Original title')),'hasIllustrations',false,'specialCases',jsonb_build_array(),
 'originalLanguage','pt','cancellationAcknowledged',true,'sharedFileUnchangedConfirmed',true,'defendedAndApproved',true,'finalFileConfirmed',true,'approvalPageConfirmed',true))$$,'estudante abre solicitação');
reset role;
select is((select count(*)::integer from public.email_outbox where event_type='request_opened'),1,'abertura gera um e-mail na outbox');
select is((select recipient from public.email_outbox where event_type='request_opened'),'pendencia.estudante1@ufba.br','e-mail de abertura usa o destinatário correto');

set local role authenticated;
set local request.jwt.claim.sub='70000000-0000-4000-8000-000000000003';
select lives_ok($$select public.assume_cataloging_request((select id from public.cataloging_requests limit 1))$$,'Catalogador assume atendimento');
select lives_ok($$select public.return_request_for_corrections(
 (select id from public.cataloging_requests limit 1),
 jsonb_build_array(
  jsonb_build_object('fieldKey','title','templateId',(select id from public.issue_templates where code='work_mismatch'),'freeJustification','Use o título da folha de rosto.'),
  jsonb_build_object('fieldKey','public_work_url','templateId',(select id from public.issue_templates where code='public_link_unavailable'),'freeJustification','')
 ))$$,'responsável devolve campos específicos');
select is((select status from public.cataloging_requests limit 1),'changes_requested'::public.request_status,'solicitação aguarda correções');
select is((select count(*)::integer from public.request_revision_rounds),1,'devolução cria uma rodada');
select is((select count(*)::integer from public.request_field_issues),2,'rodada contém apenas os dois campos marcados');
select ok((select justification like '%Use o título da folha de rosto.%' from public.request_field_issues where field_key='title'),'template aceita complemento livre');
select is((select original_value #>> '{}' from public.request_field_issues where field_key='title'),'Título original','valor anterior é preservado');
reset role;
select is((select count(*)::integer from public.email_outbox where event_type='changes_requested'),1,'devolução gera e-mail de pendência');
select ok((select text_body like '%Título:%' from public.email_outbox where event_type='changes_requested'),'e-mail lista o campo pendente');
select is((select count(*)::integer from public.audit_logs where action='request_changes_requested'),1,'devolução gera log relevante');

set local role authenticated;
set local request.jwt.claim.sub='70000000-0000-4000-8000-000000000004';
select throws_ok($$select public.return_request_for_corrections((select id from public.cataloging_requests limit 1),jsonb_build_array(jsonb_build_object('fieldKey','subtitle','freeJustification','Tentativa')))$$,'P0001','request_locked_by_another_staff','outro profissional não devolve ticket alheio');

set local request.jwt.claim.sub='70000000-0000-4000-8000-000000000002';
select is((select count(*)::integer from public.request_revision_rounds),0,'outro estudante não lê histórico alheio');

set local request.jwt.claim.sub='70000000-0000-4000-8000-000000000001';
select is((select count(*)::integer from public.request_revision_rounds),1,'estudante responsável lê a própria rodada');
select is((select count(*)::integer from public.request_field_issues),2,'estudante lê as próprias justificativas');
select is((select count(*)::integer from public.email_outbox),0,'estudante não lê a outbox');
select throws_ok($$select public.submit_request_corrections((select id from public.cataloging_requests limit 1),jsonb_build_array(jsonb_build_object('fieldKey','title','value','Título corrigido')))$$,'P0001','only_pending_fields_required','reenvio incompleto é recusado');
select throws_ok($$select public.submit_request_corrections((select id from public.cataloging_requests limit 1),jsonb_build_array(jsonb_build_object('fieldKey','title','value','Título corrigido'),jsonb_build_object('fieldKey','subtitle','value','Alteração indevida')))$$,'P0001','only_pending_fields_required','campo já aprovado não pode ser alterado');
select lives_ok($$select public.submit_request_corrections((select id from public.cataloging_requests limit 1),jsonb_build_array(jsonb_build_object('fieldKey','title','value','Título corrigido'),jsonb_build_object('fieldKey','public_work_url','value','https://example.org/corrigido.pdf')))$$,'estudante reenvia exatamente as correções solicitadas');
select is((select title from public.cataloging_requests limit 1),'Título corrigido','título pendente é atualizado');
select is((select subtitle from public.cataloging_requests limit 1),'Subtítulo aprovado','campo aprovado permanece intacto');
select is((select status from public.cataloging_requests limit 1),'in_review'::public.request_status,'solicitação retorna à análise');
select is((select count(*)::integer from public.request_corrections),2,'histórico registra os dois valores corrigidos');
select ok((select responded_at is not null from public.request_revision_rounds limit 1),'rodada registra a resposta do estudante');

reset role;
update public.cataloging_requests set status='approved' where true;
set local role authenticated;
set local request.jwt.claim.sub='70000000-0000-4000-8000-000000000004';
select lives_ok($$select public.queue_request_release_notice((select id from public.cataloging_requests limit 1))$$,'aviso de liberação fica preparado para solicitação aprovada');
select is((select count(*)::integer from public.email_outbox where event_type='request_released'),1,'liberação gera e-mail idempotente');
select throws_ok($$select public.claim_production_email_outbox(20)$$,'42501',null,'conta autenticada não pode reclamar e-mails da fila de produção');

select * from finish();
rollback;
