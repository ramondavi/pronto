begin;

create extension if not exists pgtap with schema extensions;
select plan(20);

select throws_ok(
  $$insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data)
    values (
      '30000000-0000-4000-8000-000000000001',
      'teste.pgtap.dominio-invalido@example.invalid',
      now(),
      '{}'::jsonb
    )$$,
  'P0001',
  'institutional_email_required',
  'o trigger recusa usuário Auth fora do domínio @ufba.br'
);

insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data)
values
  ('30000000-0000-4000-8000-000000000002', 'teste.pgtap.admin-ativo@ufba.br', now(), '{}'::jsonb),
  ('30000000-0000-4000-8000-000000000003', 'teste.pgtap.catalogador-ativo@ufba.br', now(), '{}'::jsonb),
  ('30000000-0000-4000-8000-000000000004', 'teste.pgtap.admin-bloqueado@ufba.br', now(), '{}'::jsonb),
  ('30000000-0000-4000-8000-000000000005', 'teste.pgtap.admin-inativo@ufba.br', now(), '{}'::jsonb),
  ('30000000-0000-4000-8000-000000000006', 'teste.pgtap.alvo-catalogador@ufba.br', now(), '{}'::jsonb),
  ('30000000-0000-4000-8000-000000000007', 'teste.pgtap.alvo-administrador@ufba.br', now(), '{}'::jsonb),
  ('30000000-0000-4000-8000-000000000008', 'teste.pgtap.alvo-nao-confirmado@ufba.br', null, '{}'::jsonb),
  ('30000000-0000-4000-8000-000000000009', 'teste.pgtap.alvo-papel-invalido@ufba.br', now(), '{}'::jsonb),
  ('30000000-0000-4000-8000-000000000010', 'teste.pgtap.aviso-pendente@ufba.br', null, '{}'::jsonb);

insert into public.profiles (id, full_name, email, role, status)
values
  ('30000000-0000-4000-8000-000000000002', 'Administrador Ativo Sintético', 'teste.pgtap.admin-ativo@ufba.br', 'administrator', 'active'),
  ('30000000-0000-4000-8000-000000000003', 'Catalogador Ativo Sintético', 'teste.pgtap.catalogador-ativo@ufba.br', 'cataloger', 'active'),
  ('30000000-0000-4000-8000-000000000004', 'Administrador Bloqueado Sintético', 'teste.pgtap.admin-bloqueado@ufba.br', 'administrator', 'blocked'),
  ('30000000-0000-4000-8000-000000000005', 'Administrador Inativo Sintético', 'teste.pgtap.admin-inativo@ufba.br', 'administrator', 'inactive');

insert into public.staff_profiles (profile_id, professional_name, crb)
values
  ('30000000-0000-4000-8000-000000000002', 'Administrador Ativo Sintético', 'CRB-TESTE-10'),
  ('30000000-0000-4000-8000-000000000003', 'Catalogador Ativo Sintético', 'CRB-TESTE-11'),
  ('30000000-0000-4000-8000-000000000004', 'Administrador Bloqueado Sintético', 'CRB-TESTE-12'),
  ('30000000-0000-4000-8000-000000000005', 'Administrador Inativo Sintético', 'CRB-TESTE-13');

update auth.users set email_confirmed_at=now() where id='30000000-0000-4000-8000-000000000010';

select is((select count(*)::integer from public.account_notification_outbox where target_user_id='30000000-0000-4000-8000-000000000010'),1,'conta interna confirmada gera aviso para administrador ativo');
select is((select recipient from public.account_notification_outbox where target_user_id='30000000-0000-4000-8000-000000000010'),'teste.pgtap.admin-ativo@ufba.br','aviso é destinado somente ao administrador ativo');
select is((select status from public.account_notification_outbox where target_user_id='30000000-0000-4000-8000-000000000010'),'pending','aviso começa pendente para entrega local');

set local role authenticated;
set local request.jwt.claim.sub = '30000000-0000-4000-8000-000000000002';

select results_eq(
  $$select count(*)::bigint from public.list_confirmed_staff_candidates()
    where user_id = '30000000-0000-4000-8000-000000000006'$$,
  array[1::bigint],
  'Administrador vê conta confirmada ainda não provisionada'
);
select results_eq(
  $$select count(*)::bigint from public.list_confirmed_staff_candidates()
    where user_id = '30000000-0000-4000-8000-000000000008'$$,
  array[0::bigint],
  'lista não inclui conta sem confirmação de e-mail'
);
select results_eq(
  $$select count(*)::bigint from public.list_confirmed_staff_candidates()
    where user_id = '30000000-0000-4000-8000-000000000002'$$,
  array[0::bigint],
  'lista não inclui conta que já possui perfil'
);

select lives_ok(
  $$select public.provision_staff_account(
      '30000000-0000-4000-8000-000000000006',
      'Novo Catalogador Sintético',
      'Catalogador Sintético',
      'CRB-TESTE-20',
      'cataloger'
    )$$,
  'Administrador ativo provisiona Catalogador confirmado'
);
select results_eq(
  $$select role from public.profiles where id = '30000000-0000-4000-8000-000000000006'$$,
  array['cataloger'::public.user_role],
  'provisionamento cria o perfil com papel cataloger'
);
select results_eq(
  $$select count(*)::bigint from public.staff_profiles where profile_id = '30000000-0000-4000-8000-000000000006'$$,
  array[1::bigint],
  'provisionamento cria o perfil profissional do Catalogador'
);
select results_eq(
  $$select count(*)::bigint
    from public.audit_logs
    where actor_id = '30000000-0000-4000-8000-000000000002'
      and action = 'staff_account_provisioned'
      and entity_id = '30000000-0000-4000-8000-000000000006'
      and metadata ->> 'role' = 'cataloger'$$,
  array[1::bigint],
  'provisionamento de Catalogador gera audit log'
);

select lives_ok(
  $$select public.provision_staff_account(
      '30000000-0000-4000-8000-000000000007',
      'Novo Administrador Sintético',
      'Administrador Sintético',
      'CRB-TESTE-21',
      'administrator'
    )$$,
  'Administrador ativo provisiona Administrador confirmado'
);
select results_eq(
  $$select role from public.profiles where id = '30000000-0000-4000-8000-000000000007'$$,
  array['administrator'::public.user_role],
  'provisionamento cria o perfil com papel administrator'
);
select results_eq(
  $$select count(*)::bigint
    from public.audit_logs
    where actor_id = '30000000-0000-4000-8000-000000000002'
      and entity_id = '30000000-0000-4000-8000-000000000007'
      and metadata ->> 'role' = 'administrator'$$,
  array[1::bigint],
  'provisionamento de Administrador gera audit log'
);

select throws_ok(
  $$select public.provision_staff_account(
      '30000000-0000-4000-8000-000000000009',
      'Papel Inválido Sintético',
      'Papel Inválido Sintético',
      'CRB-TESTE-22',
      'student'
    )$$,
  'P0001',
  'staff_role_required',
  'provisionamento recusa o papel student'
);
select throws_ok(
  $$select public.provision_staff_account(
      '30000000-0000-4000-8000-000000000008',
      'Usuário Não Confirmado Sintético',
      'Não Confirmado Sintético',
      'CRB-TESTE-23',
      'cataloger'
    )$$,
  'P0001',
  'confirmed_institutional_user_required',
  'provisionamento recusa usuário Auth não confirmado'
);

set local request.jwt.claim.sub = '30000000-0000-4000-8000-000000000003';
select throws_ok(
  $$select * from public.list_confirmed_staff_candidates()$$,
  'P0001',
  'active_administrator_required',
  'Catalogador não consulta candidatos ao provisionamento'
);
select throws_ok(
  $$select public.provision_staff_account(
      '30000000-0000-4000-8000-000000000009',
      'Alvo Sintético',
      'Alvo Sintético',
      'CRB-TESTE-24',
      'cataloger'
    )$$,
  'P0001',
  'active_administrator_required',
  'Catalogador ativo não provisiona equipe'
);

set local request.jwt.claim.sub = '30000000-0000-4000-8000-000000000004';
select throws_ok(
  $$select public.provision_staff_account(
      '30000000-0000-4000-8000-000000000009',
      'Alvo Sintético',
      'Alvo Sintético',
      'CRB-TESTE-25',
      'cataloger'
    )$$,
  'P0001',
  'active_administrator_required',
  'Administrador blocked não provisiona equipe'
);

set local request.jwt.claim.sub = '30000000-0000-4000-8000-000000000005';
select throws_ok(
  $$select public.provision_staff_account(
      '30000000-0000-4000-8000-000000000009',
      'Alvo Sintético',
      'Alvo Sintético',
      'CRB-TESTE-26',
      'administrator'
    )$$,
  'P0001',
  'active_administrator_required',
  'Administrador inactive não provisiona equipe'
);

select * from finish();
rollback;
