begin;

create extension if not exists pgtap with schema extensions;
select plan(14);

insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data)
values
  ('30000000-0000-4000-8000-000000000001', 'teste.solicitacao1@ufba.br', now(), '{"registration_source":"student","privacy_notice_version":"1.1","birth_date":"2000-01-01","full_name":"Estudante Solicitação Um","cpf":"81000000001"}'::jsonb),
  ('30000000-0000-4000-8000-000000000002', 'teste.solicitacao2@ufba.br', now(), '{"registration_source":"student","privacy_notice_version":"1.1","birth_date":"2000-01-01","full_name":"Estudante Solicitação Dois","cpf":"81000000184"}'::jsonb);

insert into public.academic_programs (id, code, name, short_name, level, work_type)
values ('30000000-0000-4000-8000-000000000010', 'PGTAP-SOLICITACAO', 'Programa para Solicitações', 'PS', 'master', 'dissertation');

set local role authenticated;
set local request.jwt.claim.sub = '30000000-0000-4000-8000-000000000001';

select lives_ok(
  $$select * from public.open_student_request_v12('{"academicProgramId":"30000000-0000-4000-8000-000000000010","registrationNumber":"20260001","title":"Arquitetura e cidade","publicWorkUrl":"https://example.org/trabalho.pdf","people":{"author":"Estudante Solicitação Um","advisor":"Orientador Sintético","advisorNoteLabel":"Orientador"},"keywordsPt":["Arquitetura","Cidade","Urbanismo"],"keywordsEn":["Architecture","City","Urbanism"],"equivalentTitles":[{"language":"en","title":"Architecture and city"}],"specialCases":[],"depositDate":"2026-10-01","defenseDate":"2025-10-01","depositYear":2026,"defenseYear":2025,"extentUnit":"pages","extentCount":204,"hasIllustrations":true,"originalLanguage":"pt","cancellationAcknowledged":true,"sharedFileUnchangedConfirmed":true,"defendedAndApproved":true,"finalFileConfirmed":true,"approvalPageConfirmed":true}'::jsonb)$$,
  'estudante ativo abre uma solicitação válida'
);
select matches((select protocol from public.cataloging_requests), '^FC[0-9]{4}-0001$', 'protocolo segue FCANO-XXXX');
select is((select registration_number from public.academic_enrollments), '20260001', 'matrícula fica no vínculo acadêmico');
select is((select count(*)::integer from public.request_people), 2, 'autor e orientador ficam estruturados');
select is((select count(*)::integer from public.request_keywords), 6, 'palavras-chave individuais e por idioma são persistidas');
select is((select extent_count from public.request_card_details), 204, 'extensão física estruturada é persistida');
select is((select advisor_note_label from public.request_card_details), 'Orientador', 'designação transcrita da orientação é persistida');
select throws_ok(
  $$select * from public.open_student_request_v12('{"academicProgramId":"30000000-0000-4000-8000-000000000010","registrationNumber":"20260001","title":"Outro trabalho","publicWorkUrl":"https://example.org/outro.pdf","people":{"author":"Estudante Solicitação Um","advisor":"Orientador Sintético","advisorNoteLabel":"Orientador"},"keywordsPt":["Teste","Cidade","Urbanismo"],"keywordsEn":["Test","City","Urbanism"],"equivalentTitles":[{"language":"en","title":"Academic test work"}],"depositDate":"2026-10-01","defenseDate":"2025-10-01","depositYear":2026,"defenseYear":2025,"extentUnit":"pages","extentCount":204,"hasIllustrations":false,"originalLanguage":"pt","cancellationAcknowledged":true,"sharedFileUnchangedConfirmed":true,"defendedAndApproved":true,"finalFileConfirmed":true,"approvalPageConfirmed":true}'::jsonb)$$,
  'P0001', 'active_request_already_exists', 'segundo protocolo ativo é recusado'
);

set local request.jwt.claim.sub = '30000000-0000-4000-8000-000000000002';
select is((select count(*)::integer from public.cataloging_requests), 0, 'outro estudante não lê a solicitação');
select is((select count(*)::integer from public.academic_enrollments), 0, 'outro estudante não lê o vínculo');
select is((select count(*)::integer from public.request_people), 0, 'outro estudante não lê as pessoas da solicitação');
select is((select count(*)::integer from public.request_keywords), 0, 'outro estudante não lê as palavras-chave');
select throws_ok(
  $$select * from public.open_student_request_v12('{"academicProgramId":"30000000-0000-4000-8000-000000000010","registrationNumber":"20260002","title":"Trabalho incompleto","publicWorkUrl":"https://example.org/trabalho.pdf","people":{"author":"Estudante Solicitação Dois","advisor":"Orientador Sintético","advisorNoteLabel":"Orientador"},"keywordsPt":["Teste","Cidade","Urbanismo"],"keywordsEn":["Test","City","Urbanism"],"equivalentTitles":[{"language":"en","title":"Academic test work"}],"depositDate":"2026-10-01","defenseDate":"2025-10-01","depositYear":2026,"defenseYear":2025,"extentUnit":"pages","extentCount":204,"hasIllustrations":false,"originalLanguage":"pt","cancellationAcknowledged":true,"sharedFileUnchangedConfirmed":true,"defendedAndApproved":false,"finalFileConfirmed":true,"approvalPageConfirmed":true}'::jsonb)$$,
  'P0001', 'required_declarations_missing', 'declarações obrigatórias são impostas no banco'
);
select throws_ok(
  $$insert into public.cataloging_requests (student_profile_id, academic_enrollment_id, protocol, title, public_work_url, defended_and_approved, final_file_confirmed, approval_page_confirmed) values ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'FC2026-9999', 'Invasão', 'https://example.org', true, true, true)$$,
  '42501', 'permission denied for table cataloging_requests', 'cliente não insere diretamente ignorando a RPC'
);

select * from finish();
rollback;
