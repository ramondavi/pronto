begin;

create extension if not exists pgtap with schema extensions;
select plan(23);

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

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000001';

select is(public.current_user_role(), 'student'::public.user_role, 'estudante ativo recebe o papel student');
select ok(public.is_active_user(), 'estudante ativo recebe autorização');
select results_eq(
  $$select id from public.profiles order by id$$,
  array['10000000-0000-4000-8000-000000000001'::uuid],
  'estudante ativo lê somente o próprio perfil'
);
select results_eq(
  $$select profile_id from public.student_profiles order by profile_id$$,
  array['10000000-0000-4000-8000-000000000001'::uuid],
  'estudante ativo lê somente o próprio perfil estudantil'
);

set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000003';

select is(public.current_user_role(), 'cataloger'::public.user_role, 'Catalogador ativo recebe o papel cataloger');
select results_eq(
  $$select count(*)::bigint from public.profiles where id::text like '10000000-%'$$,
  array[6::bigint],
  'Catalogador ativo lê os perfis operacionais autorizados'
);
select results_eq(
  $$select count(*)::bigint from public.student_profiles where profile_id::text like '10000000-%'$$,
  array[2::bigint],
  'Catalogador ativo lê os perfis estudantis autorizados'
);
select results_eq(
  $$select count(*)::bigint from public.staff_profiles where profile_id::text like '10000000-%'$$,
  array[1::bigint],
  'Catalogador ativo lê somente o próprio perfil de equipe'
);
select results_eq(
  $$select count(*)::bigint from public.coordination_contacts$$,
  array[1::bigint],
  'Catalogador ativo lê contatos de coordenação'
);
select results_eq(
  $$with changed as (
      update public.profiles
      set role = 'administrator'
      where id = '10000000-0000-4000-8000-000000000001'
      returning 1
    )
    select count(*)::bigint from changed$$,
  array[0::bigint],
  'Catalogador ativo não administra papéis de usuários'
);

set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000004';

select is(public.current_user_role(), 'administrator'::public.user_role, 'Administrador ativo recebe o papel administrator');
select results_eq(
  $$select count(*)::bigint from public.staff_profiles where profile_id::text like '10000000-%'$$,
  array[4::bigint],
  'Administrador ativo lê os perfis de equipe'
);
select results_eq(
  $$select count(*)::bigint from public.audit_logs$$,
  array[1::bigint],
  'Administrador ativo lê logs de auditoria'
);
select results_eq(
  $$with changed as (
      update public.profiles
      set full_name = 'Estudante Sintético Atualizado'
      where id = '10000000-0000-4000-8000-000000000001'
      returning 1
    )
    select count(*)::bigint from changed$$,
  array[1::bigint],
  'Administrador ativo atualiza dados administrativos previstos'
);
select results_eq(
  $$with changed as (
      update public.academic_programs
      set short_name = 'PGTAP-ATUALIZADO'
      where id = '20000000-0000-4000-8000-000000000001'
      returning 1
    )
    select count(*)::bigint from changed$$,
  array[1::bigint],
  'Administrador ativo administra programas acadêmicos'
);

set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000005';

select ok(not public.is_active_user(), 'conta blocked não recebe autorização ativa');
select is(public.current_user_role(), null::public.user_role, 'conta blocked não recebe papel operacional');
select results_eq(
  $$select count(*)::bigint from public.profiles$$,
  array[0::bigint],
  'conta blocked não lê perfis protegidos'
);
select results_eq(
  $$select count(*)::bigint from public.academic_programs$$,
  array[0::bigint],
  'conta blocked não lê dados operacionais protegidos'
);

set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000006';

select ok(not public.is_active_user(), 'conta inactive não recebe autorização ativa');
select is(public.current_user_role(), null::public.user_role, 'conta inactive não recebe papel operacional');
select results_eq(
  $$select count(*)::bigint from public.profiles$$,
  array[0::bigint],
  'conta inactive não lê perfis protegidos'
);
select results_eq(
  $$select count(*)::bigint from public.academic_programs$$,
  array[0::bigint],
  'conta inactive não lê dados operacionais protegidos'
);

select * from finish();
rollback;
