-- Prepared only. Apply in production only with publication/storage authorization.
-- Holds operator tools, never backup archives or recovery credentials.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('backup-tools','backup-tools',false,52428800,array['application/zip'])
on conflict(id) do nothing;
do $$ begin
 if exists(select 1 from storage.buckets where id='backup-tools' and public is distinct from false) then
  raise exception 'backup_tools_bucket_must_be_private';
 end if;
end $$;
create policy backup_tools_active_administrator_read on storage.objects
for select to authenticated
using(bucket_id='backup-tools' and public.current_user_role()='administrator');
-- No browser write/delete policies. Upload the approved immutable package separately.
