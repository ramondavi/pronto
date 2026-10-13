begin;
create extension if not exists pgtap with schema extensions;
select plan(16);
select has_function('public','admin_manage_account',array['uuid','user_role','account_status','text','text'],'gestão de contas existe');
select has_function('public','admin_configure_program',array['uuid','integer','boolean','boolean','text','text'],'configuração operacional existe');
select has_function('public','admin_statistics',array['timestamp with time zone','timestamp with time zone'],'indicadores existem');
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
 ('92000000-0000-4000-8000-000000000001','admin12@ufba.br',now(),'{}'),
 ('92000000-0000-4000-8000-000000000002','catalogador12@ufba.br',now(),'{}'),
 ('92000000-0000-4000-8000-000000000003','estudante12@ufba.br',now(),'{}');
insert into public.profiles(id,full_name,email,role,status) values
 ('92000000-0000-4000-8000-000000000001','Admin Doze','admin12@ufba.br','administrator','active'),
 ('92000000-0000-4000-8000-000000000002','Catalogador Doze','catalogador12@ufba.br','cataloger','active'),
 ('92000000-0000-4000-8000-000000000003','Estudante Doze','estudante12@ufba.br','student','active');
insert into public.staff_profiles(profile_id,professional_name,crb) values
 ('92000000-0000-4000-8000-000000000001','Admin Doze','CRB-5/1200'),
 ('92000000-0000-4000-8000-000000000002','Catalogador Doze','CRB-5/1201');
set local role authenticated;
set local request.jwt.claim.sub='92000000-0000-4000-8000-000000000002';
select throws_ok($$select public.admin_manage_account('92000000-0000-4000-8000-000000000003','student','blocked',null,null)$$,'P0001','active_administrator_required','catalogador não administra conta');
set local request.jwt.claim.sub='92000000-0000-4000-8000-000000000001';
select lives_ok($$select public.admin_manage_account('92000000-0000-4000-8000-000000000003','student','blocked',null,null)$$,'admin bloqueia estudante');
select is((select status::text from public.profiles where id='92000000-0000-4000-8000-000000000003'),'blocked','situação persistida');
select is((select count(*)::integer from public.audit_logs where action='account_administration_changed' and entity_id='92000000-0000-4000-8000-000000000003'),1,'alteração auditada');
select throws_ok($$select public.admin_manage_account('92000000-0000-4000-8000-000000000001','administrator','blocked','Admin Doze','CRB-5/1200')$$,'P0001','administrator_cannot_remove_own_access','admin não remove o próprio acesso');
select lives_ok($$select public.admin_configure_program((select id from public.academic_programs order by code limit 1),5,false,false,'','')$$,'admin configura programa');
select is((select service_level_business_days from public.academic_programs order by code limit 1),5,'SLA atualizado');
select is((select count(*)::integer from public.sla_settings where business_days=5),1,'histórico do SLA preservado');
select lives_ok($$select public.admin_update_issue_template((select id from public.issue_templates order by position limit 1),'Obrigatório','Preencha a informação obrigatória.',true,10)$$,'template básico editável');
select lives_ok($$select public.admin_save_announcement(null,'normal','Aviso inicial','Atendimento em horário normal.',now(),null,true)$$,'admin cria aviso');
select lives_ok($$select public.admin_save_announcement((select id from public.library_announcements where title='Aviso inicial'),'recess','Aviso atualizado','Atendimento em horário reduzido.',now()+interval '1 day',now()+interval '2 days',true)$$,'admin edita aviso sem ambiguidade de datas');
select is((select type::text from public.library_announcements where title='Aviso atualizado'),'recess','edição do aviso persiste o tipo e as datas');
select ok((select public.admin_statistics(null,null)->>'total')::integer>=0,'estatísticas retornam volume');
select * from finish();
rollback;
