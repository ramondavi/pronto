begin;

create extension if not exists pgtap with schema extensions;
select plan(21);

insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data)
values
  ('50000000-0000-4000-8000-000000000001', 'fila.estudante@ufba.br', now(), '{"registration_source":"student","privacy_notice_version":"1.1","birth_date":"2000-01-01","full_name":"Estudante da Fila","cpf":"81000000427"}'::jsonb),
  ('50000000-0000-4000-8000-000000000002', 'fila.catalogador1@ufba.br', now(), '{}'::jsonb),
  ('50000000-0000-4000-8000-000000000003', 'fila.catalogador2@ufba.br', now(), '{}'::jsonb),
  ('50000000-0000-4000-8000-000000000004', 'fila.administrador@ufba.br', now(), '{}'::jsonb),
  ('50000000-0000-4000-8000-000000000005', 'fila.bloqueado@ufba.br', now(), '{}'::jsonb);

insert into public.profiles (id, full_name, email, role, status)
values
  ('50000000-0000-4000-8000-000000000002', 'Catalogador Um', 'fila.catalogador1@ufba.br', 'cataloger', 'active'),
  ('50000000-0000-4000-8000-000000000003', 'Catalogador Dois', 'fila.catalogador2@ufba.br', 'cataloger', 'active'),
  ('50000000-0000-4000-8000-000000000004', 'Administrador da Fila', 'fila.administrador@ufba.br', 'administrator', 'active'),
  ('50000000-0000-4000-8000-000000000005', 'Catalogador Bloqueado', 'fila.bloqueado@ufba.br', 'cataloger', 'blocked');
insert into public.staff_profiles (profile_id, professional_name, crb)
values
  ('50000000-0000-4000-8000-000000000002', 'Catalogador Um', 'CRB-FILA-1'),
  ('50000000-0000-4000-8000-000000000003', 'Catalogador Dois', 'CRB-FILA-2'),
  ('50000000-0000-4000-8000-000000000004', 'Administrador da Fila', 'CRB-FILA-3'),
  ('50000000-0000-4000-8000-000000000005', 'Catalogador Bloqueado', 'CRB-FILA-4');

set local role authenticated;
set local request.jwt.claim.sub = '50000000-0000-4000-8000-000000000001';
select lives_ok(
  $$select * from public.open_student_request_v12(jsonb_build_object(
    'academicProgramId', (select id from public.academic_programs where code = 'architecture-urbanism-undergraduate'),
    'registrationNumber', 'FILA2026', 'title', 'Trabalho para a fila',
    'publicWorkUrl', 'https://example.org/fila.pdf',
    'depositDate','2026-10-01','defenseDate','2025-10-01','depositYear', 2026, 'defenseYear', 2025, 'extentUnit', 'pages', 'extentCount', 204,
    'people', jsonb_build_object('author', 'Estudante da Fila', 'advisor', 'Orientador da Fila', 'advisorNoteLabel', 'Orientador'),
    'keywordsPt', jsonb_build_array('Arquitetura','Habitação','Urbanismo'), 'keywordsEn', jsonb_build_array('Architecture','Housing','Urbanism'),
    'equivalentTitles', jsonb_build_array(jsonb_build_object('language','en','title','Queue work')), 'hasIllustrations',false,'specialCases', jsonb_build_array(),
    'originalLanguage','pt','cancellationAcknowledged',true,'sharedFileUnchangedConfirmed',true,'defendedAndApproved', true, 'finalFileConfirmed', true, 'approvalPageConfirmed', true
  ))$$,
  'estudante cria solicitação para a fila'
);
select is((select count(*)::integer from public.request_analyses), 0, 'estudante não lê análises internas');

set local request.jwt.claim.sub = '50000000-0000-4000-8000-000000000002';
select lives_ok(
  $$select public.assume_cataloging_request((select id from public.cataloging_requests limit 1))$$,
  'Catalogador assume solicitação disponível'
);
select is((select assigned_to from public.cataloging_requests limit 1), '50000000-0000-4000-8000-000000000002'::uuid, 'ticket fica atribuído ao Catalogador');
select is((select status from public.cataloging_requests limit 1), 'in_review'::public.request_status, 'ticket assumido entra em análise');
select lives_ok(
  $$select public.save_request_analysis((select id from public.cataloging_requests limit 1), 'Análise inicial', 'Dúvida interna')$$,
  'responsável salva análise e observação interna'
);
select is((select analysis_notes from public.request_analyses limit 1), 'Análise inicial', 'texto da análise é persistido');
select is((select internal_note from public.request_analyses limit 1), 'Dúvida interna', 'observação interna é persistida');

set local request.jwt.claim.sub = '50000000-0000-4000-8000-000000000003';
select throws_ok(
  $$select public.assume_cataloging_request((select id from public.cataloging_requests limit 1))$$,
  'P0001', 'request_already_assigned', 'segundo Catalogador não assume ticket bloqueado'
);
select throws_ok(
  $$select public.save_request_analysis((select id from public.cataloging_requests limit 1), 'Tentativa indevida', '')$$,
  'P0001', 'request_locked_by_another_staff', 'outro Catalogador não edita ticket bloqueado'
);
select throws_ok(
  $$select public.release_cataloging_request((select id from public.cataloging_requests limit 1))$$,
  'P0001', 'request_owned_by_another_staff', 'outro Catalogador não devolve ticket bloqueado'
);
select throws_ok(
  $$select public.reassign_cataloging_request((select id from public.cataloging_requests limit 1), '50000000-0000-4000-8000-000000000003')$$,
  'P0001', 'permission_denied', 'Catalogador não reatribui atendimento'
);

set local request.jwt.claim.sub = '50000000-0000-4000-8000-000000000004';
select lives_ok(
  $$select public.reassign_cataloging_request((select id from public.cataloging_requests limit 1), '50000000-0000-4000-8000-000000000003')$$,
  'Administrador reatribui atendimento'
);
select is((select assigned_to from public.cataloging_requests limit 1), '50000000-0000-4000-8000-000000000003'::uuid, 'ticket passa ao novo responsável');

set local request.jwt.claim.sub = '50000000-0000-4000-8000-000000000002';
select throws_ok(
  $$select public.save_request_analysis((select id from public.cataloging_requests limit 1), 'Antigo responsável', '')$$,
  'P0001', 'request_locked_by_another_staff', 'antigo responsável perde permissão de edição'
);

set local request.jwt.claim.sub = '50000000-0000-4000-8000-000000000003';
select lives_ok(
  $$select public.save_request_analysis((select id from public.cataloging_requests limit 1), 'Análise reatribuída', 'Nova nota')$$,
  'novo responsável salva a análise'
);

set local request.jwt.claim.sub = '50000000-0000-4000-8000-000000000004';
select lives_ok(
  $$select public.release_cataloging_request((select id from public.cataloging_requests limit 1))$$,
  'Administrador devolve atendimento à fila'
);
select is((select assigned_to from public.cataloging_requests limit 1), null::uuid, 'ticket devolvido fica sem responsável');
select is((select status from public.cataloging_requests limit 1), 'submitted'::public.request_status, 'ticket devolvido retorna ao status da fila');
select is(
  (select count(*)::integer from public.audit_logs where action in ('cataloging_request_assumed', 'cataloging_request_reassigned', 'cataloging_request_released')),
  3,
  'ciclo de atribuição gera logs relevantes'
);

set local request.jwt.claim.sub = '50000000-0000-4000-8000-000000000005';
select throws_ok(
  $$select public.assume_cataloging_request((select id from public.cataloging_requests limit 1))$$,
  'P0001', 'permission_denied', 'conta bloqueada não assume atendimento'
);

select * from finish();
rollback;
