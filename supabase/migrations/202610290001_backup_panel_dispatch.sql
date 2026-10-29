-- Preview-approved: server-triggered requests, not backup contents or credentials.
insert into public.permission_definitions(code,area,screen,action,description,default_roles,professional_only,delegable)
values ('admin.backups.execute','Administração','Backup e restauro','Acionar backup pelo painel','Solicitar ao executor aprovado a verificação e preservação de produção, com confirmação e auditoria. Não permite restaurar dados, alterar a agenda ou consultar credenciais.','{administrator}',true,false);

create table public.backup_panel_requests (
 id uuid primary key,
 actor_id uuid not null references public.profiles(id),
 status text not null default 'reserved' check(status in ('reserved','accepted','rejected','unknown')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.backup_panel_requests enable row level security;
revoke all on public.backup_panel_requests from anon, authenticated;
create policy backup_panel_requests_read on public.backup_panel_requests for select to authenticated
 using(public.current_user_role()='administrator' and public.has_permission('admin.backups.execute'));
grant select on public.backup_panel_requests to authenticated;

create function public.backup_panel_dispatch_state()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare until_at timestamptz;
begin
 if public.current_user_role() is distinct from 'administrator' or not public.has_permission('admin.backups.execute') then
  return jsonb_build_object('allowed',false,'blocked_until',null);
 end if;
 select max(created_at + case when status in ('reserved','unknown') then interval '1 hour' else interval '5 minutes' end)
 into until_at from public.backup_panel_requests;
 return jsonb_build_object('allowed',true,'blocked_until',case when until_at > now() then until_at else null end);
end $$;

create function public.reserve_backup_panel_request(request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare existing public.backup_panel_requests%rowtype; until_at timestamptz;
begin
 if public.current_user_role() is distinct from 'administrator' or not public.has_permission('admin.backups.execute') then raise exception 'backup_permission_denied'; end if;
 if request_id is null then raise exception 'backup_invalid_request'; end if;
 perform pg_catalog.pg_advisory_xact_lock(20261029,1);
 select * into existing from public.backup_panel_requests where id=request_id;
 if found then
  if existing.actor_id<>auth.uid() then raise exception 'backup_permission_denied'; end if;
  return jsonb_build_object('created',false,'status',existing.status);
 end if;
 select max(created_at + case when status in ('reserved','unknown') then interval '1 hour' else interval '5 minutes' end)
 into until_at from public.backup_panel_requests;
 if until_at > now() then raise exception 'backup_request_cooldown'; end if;
 insert into public.backup_panel_requests(id,actor_id) values(request_id,auth.uid());
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
 values(auth.uid(),'backup_panel_requested','backup_panel_request',request_id::text,jsonb_build_object('source','pronto-production','workflow','backup.yml','first_copy',false));
 return jsonb_build_object('created',true,'status','reserved');
end $$;

create function public.finish_backup_panel_request(request_id uuid, reported_status text)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 if public.current_user_role() is distinct from 'administrator' or not public.has_permission('admin.backups.execute') then raise exception 'backup_permission_denied'; end if;
 if reported_status not in ('accepted','rejected','unknown') or reported_status is null then raise exception 'backup_invalid_status'; end if;
 update public.backup_panel_requests set status=reported_status,updated_at=now()
 where id=request_id and actor_id=auth.uid() and status='reserved';
 if not found then return false; end if;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
 values(auth.uid(),'backup_panel_dispatch_reported','backup_panel_request',request_id::text,jsonb_build_object('reported_status',reported_status));
 return true;
end $$;
revoke all on function public.backup_panel_dispatch_state() from public,anon;
revoke all on function public.reserve_backup_panel_request(uuid) from public,anon;
revoke all on function public.finish_backup_panel_request(uuid,text) from public,anon;
grant execute on function public.backup_panel_dispatch_state(),public.reserve_backup_panel_request(uuid),public.finish_backup_panel_request(uuid,text) to authenticated;
