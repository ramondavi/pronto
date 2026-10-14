begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
 ('98000000-0000-4000-8000-000000000001','teste.permissoes.admin@ufba.br',now(),'{}'),
 ('98000000-0000-4000-8000-000000000002','teste.permissoes.catalogador@ufba.br',now(),'{}'),
 ('98000000-0000-4000-8000-000000000003','teste.permissoes.bloqueado@ufba.br',now(),'{}');
insert into public.profiles(id,full_name,email,role,status) values
 ('98000000-0000-4000-8000-000000000001','Admin Permissões','teste.permissoes.admin@ufba.br','administrator','active'),
 ('98000000-0000-4000-8000-000000000002','Catalogador Permissões','teste.permissoes.catalogador@ufba.br','cataloger','active'),
 ('98000000-0000-4000-8000-000000000003','Admin Bloqueado','teste.permissoes.bloqueado@ufba.br','administrator','blocked');

select has_function('public','has_permission',array['text'],'resolução de permissões existe no banco');
select has_function('public','save_student_request_draft',array['jsonb'],'salvamento do rascunho estudantil existe');
select has_function('public','save_request_analysis_draft',array['uuid','jsonb'],'salvamento do rascunho da análise existe');

set local role authenticated;
set local request.jwt.claim.sub='98000000-0000-4000-8000-000000000002';
select ok(public.has_permission('staff.queue.view'),'catalogador vê a fila por padrão');
select is(public.has_permission('library.hours.change'),false,'catalogador não altera horários por padrão');
select is(public.has_permission('student.preview'),false,'visão de estudante exige concessão');
select throws_ok($$select public.admin_set_staff_permission('98000000-0000-4000-8000-000000000002','library.hours.change','allow')$$,
 'P0001','active_administrator_required','catalogador não concede permissões');

set local request.jwt.claim.sub='98000000-0000-4000-8000-000000000001';
select lives_ok($$select public.admin_set_staff_permission('98000000-0000-4000-8000-000000000002','library.hours.change','allow')$$,
 'admin concede alteração de horário');
set local request.jwt.claim.sub='98000000-0000-4000-8000-000000000002';
select ok(public.has_permission('library.hours.change'),'concessão individual entra em vigor');

set local request.jwt.claim.sub='98000000-0000-4000-8000-000000000001';
select lives_ok($$select public.admin_set_staff_permission('98000000-0000-4000-8000-000000000002','library.hours.change','deny')$$,
 'admin bloqueia uma permissão concedida');
set local request.jwt.claim.sub='98000000-0000-4000-8000-000000000002';
select is(public.has_permission('library.hours.change'),false,'bloqueio mais recente prevalece');

set local request.jwt.claim.sub='98000000-0000-4000-8000-000000000001';
select is(public.has_permission('admin.permissions.manage'),true,'admin mantém acesso essencial');
select throws_ok($$select public.admin_set_staff_permission('98000000-0000-4000-8000-000000000001','admin.permissions.manage','deny')$$,
 'P0001','permission_not_delegable','acesso essencial não pode ser bloqueado');
select lives_ok($$select public.admin_set_staff_inherited_role('98000000-0000-4000-8000-000000000002','student')$$,
 'admin concede visão de estudante');
set local request.jwt.claim.sub='98000000-0000-4000-8000-000000000002';
select ok(public.has_permission('student.preview'),'herança libera apenas a visualização');

set local request.jwt.claim.sub='98000000-0000-4000-8000-000000000001';
select lives_ok($$select public.admin_revoke_staff_access((select id from public.staff_inherited_roles
 where profile_id='98000000-0000-4000-8000-000000000002' and revoked_at is null),'role')$$,
 'admin revoga papel herdado');
set local request.jwt.claim.sub='98000000-0000-4000-8000-000000000002';
select is(public.has_permission('student.preview'),false,'revogação interrompe a visualização');

select * from finish();
rollback;
