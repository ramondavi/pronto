begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
 ('91000000-0000-4000-8000-000000000001','teste.backup.admin@ufba.br',now(),'{}'),
 ('91000000-0000-4000-8000-000000000002','teste.backup.cataloger@ufba.br',now(),'{}'),
 ('91000000-0000-4000-8000-000000000003','teste.backup.blocked@ufba.br',now(),'{}');
insert into public.profiles(id,full_name,email,role,status) values
 ('91000000-0000-4000-8000-000000000001','Administrador Sintético Backup','teste.backup.admin@ufba.br','administrator','active'),
 ('91000000-0000-4000-8000-000000000002','Catalogador Sintético Backup','teste.backup.cataloger@ufba.br','cataloger','active'),
 ('91000000-0000-4000-8000-000000000003','Bloqueado Sintético Backup','teste.backup.blocked@ufba.br','administrator','blocked');
insert into public.staff_inherited_roles(profile_id,inherited_role,granted_by) values
 ('91000000-0000-4000-8000-000000000002','administrator','91000000-0000-4000-8000-000000000001');
select is((select public from storage.buckets where id='backup-tools'),false,'operator tools bucket stays private');
insert into storage.objects(bucket_id,name,metadata) values('backup-tools','synthetic-tool.zip','{"size":1}');
set local role authenticated;
set local request.jwt.claim.sub='91000000-0000-4000-8000-000000000001';
select is((public.backup_panel_dispatch_state()->>'allowed')::boolean,true,'active administrator has dedicated permission');
select is((public.reserve_backup_panel_request('92000000-0000-4000-8000-000000000001')->>'created')::boolean,true,'first request atomically reserved');
select is((public.reserve_backup_panel_request('92000000-0000-4000-8000-000000000001')->>'created')::boolean,false,'same request id is never dispatched twice');
select throws_ok($$select public.reserve_backup_panel_request('92000000-0000-4000-8000-000000000002')$$,'P0001','backup_request_cooldown','another person or tab cannot reserve during cooldown');
select is((select count(*)::int from public.audit_logs where entity_id='92000000-0000-4000-8000-000000000001' and action='backup_panel_requested'),1,'one audit event for idempotent request');
select ok(public.finish_backup_panel_request('92000000-0000-4000-8000-000000000001','accepted'),'server response can be recorded');
select is(public.finish_backup_panel_request('92000000-0000-4000-8000-000000000001','unknown'),false,'finalized request cannot be rewritten');
select throws_ok($$insert into public.backup_panel_requests(id,actor_id) values('92000000-0000-4000-8000-000000000009',auth.uid())$$,'42501',null,'direct inserts cannot bypass reservation');
select is((select count(*)::int from storage.objects where bucket_id='backup-tools'),1,'active administrator can read operator tools');
reset role;
update public.backup_panel_requests set created_at=now()-interval '6 minutes' where id='92000000-0000-4000-8000-000000000001';
set local role authenticated;
select is((public.reserve_backup_panel_request('92000000-0000-4000-8000-000000000002')->>'created')::boolean,true,'new request is allowed after accepted cooldown');
select ok(public.finish_backup_panel_request('92000000-0000-4000-8000-000000000002','unknown'),'uncertain response is recorded without claiming success');
reset role;
update public.backup_panel_requests set created_at=now()-interval '6 minutes' where id='92000000-0000-4000-8000-000000000002';
set local role authenticated;
select throws_ok($$select public.reserve_backup_panel_request('92000000-0000-4000-8000-000000000003')$$,'P0001','backup_request_cooldown','uncertain request retains one-hour protection');
set local request.jwt.claim.sub='91000000-0000-4000-8000-000000000002';
select is((public.backup_panel_dispatch_state()->>'allowed')::boolean,false,'inherited administrator access does not grant backup execution');
select throws_ok($$select public.reserve_backup_panel_request('92000000-0000-4000-8000-000000000003')$$,'P0001','backup_permission_denied','cataloger cannot trigger production backup');
select is((select count(*)::int from public.backup_panel_requests),0,'cataloger cannot read dispatch records');
select is((select count(*)::int from storage.objects where bucket_id='backup-tools'),0,'cataloger cannot download operator tools');
set local request.jwt.claim.sub='91000000-0000-4000-8000-000000000003';
select is((public.backup_panel_dispatch_state()->>'allowed')::boolean,false,'blocked administrator loses operational access');
select throws_ok($$select public.finish_backup_panel_request('92000000-0000-4000-8000-000000000002','accepted')$$,'P0001','backup_permission_denied','blocked administrator cannot report dispatch');
select is((select count(*)::int from storage.objects where bucket_id='backup-tools'),0,'blocked administrator cannot download tools');
reset role;
insert into public.staff_permission_overrides(profile_id,permission_code,effect,granted_by) values
 ('91000000-0000-4000-8000-000000000001','admin.backups.execute','deny','91000000-0000-4000-8000-000000000001');
set local role authenticated;
set local request.jwt.claim.sub='91000000-0000-4000-8000-000000000001';
select is((public.backup_panel_dispatch_state()->>'allowed')::boolean,false,'explicit deny blocks administrator backup execution');
select throws_ok($$select public.reserve_backup_panel_request('92000000-0000-4000-8000-000000000003')$$,'P0001','backup_permission_denied','explicit deny is enforced in database');
reset role;
set local role anon;
select throws_ok($$select public.reserve_backup_panel_request('92000000-0000-4000-8000-000000000003')$$,'42501',null,'anonymous caller has no dispatch function access');
reset role;
select * from finish();
rollback;
