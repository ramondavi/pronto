-- Incremento 8: Nada Consta privado, validação, liberação e retenção.

create type public.nada_consta_status as enum ('pending', 'approved', 'rejected', 'purged');

create table public.nada_consta_documents (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.cataloging_requests(id) on delete restrict,
  object_path text,
  original_name text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 5242880),
  mime_type text not null check (mime_type = 'application/pdf'),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  status public.nada_consta_status not null default 'pending',
  uploaded_by uuid not null references public.profiles(id) on delete restrict,
  uploaded_at timestamptz not null default now(),
  validated_by uuid references public.profiles(id) on delete restrict,
  validated_at timestamptz,
  rejection_reason text,
  released_at timestamptz,
  purge_after timestamptz,
  purged_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'purged') = (object_path is null)),
  check (status not in ('approved','rejected') or (validated_by is not null and validated_at is not null))
);
create unique index nada_consta_one_current_per_request on public.nada_consta_documents(request_id)
  where status in ('pending','approved');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('nada-consta', 'nada-consta', false, 5242880, array['application/pdf'])
on conflict (id) do update set public=false, file_size_limit=5242880, allowed_mime_types=array['application/pdf'];

alter table public.nada_consta_documents enable row level security;
create policy "nada_consta_student_read_own" on public.nada_consta_documents for select to authenticated using (
  exists (select 1 from public.cataloging_requests r join public.student_profiles s on s.id=r.student_profile_id
    where r.id=request_id and s.profile_id=auth.uid())
);
create policy "nada_consta_staff_read" on public.nada_consta_documents for select to authenticated using (
  public.current_user_role() in ('cataloger','administrator')
);
revoke all on public.nada_consta_documents from anon, authenticated;
grant select on public.nada_consta_documents to authenticated;

create policy "nada_consta_objects_student_insert" on storage.objects for insert to authenticated with check (
  bucket_id='nada-consta' and exists (
    select 1 from public.cataloging_requests r join public.student_profiles s on s.id=r.student_profile_id
    where name=r.id::text||'/nada-consta.pdf' and s.profile_id=auth.uid() and r.status='approved')
);
create policy "nada_consta_objects_authorized_read" on storage.objects for select to authenticated using (
  bucket_id='nada-consta' and (
    public.current_user_role() in ('cataloger','administrator') or exists (
      select 1 from public.cataloging_requests r join public.student_profiles s on s.id=r.student_profile_id
      where r.id::text=(storage.foldername(name))[1] and s.profile_id=auth.uid()))
);
create policy "nada_consta_objects_staff_delete" on storage.objects for delete to authenticated using (
  bucket_id='nada-consta' and public.current_user_role() in ('cataloger','administrator')
);
create policy "nada_consta_objects_student_cleanup" on storage.objects for delete to authenticated using (
  bucket_id='nada-consta' and exists (
    select 1 from public.cataloging_requests r join public.student_profiles s on s.id=r.student_profile_id
    where r.id::text=(storage.foldername(name))[1] and s.profile_id=auth.uid())
  and not exists (select 1 from public.nada_consta_documents d where d.object_path=name)
);

create or replace function public.register_nada_consta_upload(target_request_id uuid, target_path text, target_name text, target_size bigint, target_mime text, target_sha256 text)
returns uuid language plpgsql security definer set search_path='' as $$
declare student_profile uuid; document_id uuid;
begin
  select s.id into student_profile from public.student_profiles s where s.profile_id=auth.uid();
  if student_profile is null then raise exception 'active_student_required'; end if;
  if target_size <= 0 or target_size > 5242880 then raise exception 'nada_consta_size_invalid'; end if;
  if lower(target_mime) <> 'application/pdf' or lower(target_name) !~ '\.pdf$' or target_sha256 !~ '^[0-9a-f]{64}$' then raise exception 'nada_consta_pdf_invalid'; end if;
  if target_path <> target_request_id::text || '/nada-consta.pdf' then raise exception 'nada_consta_path_invalid'; end if;
  if not exists (select 1 from public.cataloging_requests where id=target_request_id and student_profile_id=student_profile and status='approved') then raise exception 'homologated_request_required'; end if;
  insert into public.nada_consta_documents(request_id,object_path,original_name,size_bytes,mime_type,sha256,uploaded_by)
  values(target_request_id,target_path,left(target_name,255),target_size,'application/pdf',lower(target_sha256),auth.uid()) returning id into document_id;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'nada_consta_uploaded','cataloging_request',target_request_id::text,jsonb_build_object('document_id',document_id,'size_bytes',target_size));
  return document_id;
end $$;

create or replace function public.validate_nada_consta(target_document_id uuid, approved boolean, reason text default null)
returns text language plpgsql security definer set search_path='' as $$
declare doc record;
begin
  if coalesce(public.current_user_role() in ('cataloger','administrator'),false) is not true then raise exception 'active_staff_required'; end if;
  select d.*,r.assigned_to,r.status as request_status into doc from public.nada_consta_documents d join public.cataloging_requests r on r.id=d.request_id where d.id=target_document_id for update of d;
  if not found or doc.status<>'pending' or doc.request_status<>'approved' or (public.current_user_role()='cataloger' and doc.assigned_to<>auth.uid()) then raise exception 'nada_consta_not_ready'; end if;
  if not approved and char_length(btrim(coalesce(reason,'')))<3 then raise exception 'rejection_reason_required'; end if;
  update public.nada_consta_documents set status=case when approved then 'approved'::public.nada_consta_status else 'rejected'::public.nada_consta_status end,
    validated_by=auth.uid(),validated_at=now(),rejection_reason=case when approved then null else left(btrim(reason),2000) end,
    released_at=case when approved then now() else null end,updated_at=now() where id=target_document_id;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),case when approved then 'nada_consta_approved' else 'nada_consta_rejected' end,'cataloging_request',doc.request_id::text,jsonb_build_object('document_id',target_document_id,'reason',case when approved then null else left(btrim(reason),2000) end));
  if approved then perform public.queue_request_release_notice(doc.request_id); end if;
  return doc.object_path;
end $$;

create or replace function public.schedule_nada_consta_purge_on_close()
returns trigger language plpgsql set search_path='' as $$ begin
  if new.status='completed' and old.status is distinct from 'completed' then update public.nada_consta_documents set purge_after=now()+interval '60 days',updated_at=now() where request_id=new.id and object_path is not null; end if;
  return new;
end $$;
create trigger schedule_nada_consta_purge after update of status on public.cataloging_requests for each row execute function public.schedule_nada_consta_purge_on_close();

create or replace function public.confirm_nada_consta_purge(target_document_id uuid)
returns void language plpgsql security definer set search_path='' as $$ begin
  if public.current_user_role() is distinct from 'administrator' then raise exception 'active_administrator_required'; end if;
  update public.nada_consta_documents set object_path=null,status='purged',purged_at=now(),updated_at=now() where id=target_document_id and purge_after<=now() and object_path is not null;
  if not found then raise exception 'document_not_ready_for_purge'; end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id) values(auth.uid(),'nada_consta_purged','nada_consta_document',target_document_id::text);
end $$;

revoke all on function public.register_nada_consta_upload(uuid,text,text,bigint,text,text) from public,anon,authenticated;
revoke all on function public.validate_nada_consta(uuid,boolean,text) from public,anon,authenticated;
revoke all on function public.confirm_nada_consta_purge(uuid) from public,anon,authenticated;
grant execute on function public.register_nada_consta_upload(uuid,text,text,bigint,text,text) to authenticated;
grant execute on function public.validate_nada_consta(uuid,boolean,text) to authenticated;
grant execute on function public.confirm_nada_consta_purge(uuid) to authenticated;
