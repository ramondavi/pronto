drop policy if exists "nada_consta_objects_student_insert" on storage.objects;
create policy "nada_consta_objects_student_insert" on storage.objects for insert to authenticated with check (
  bucket_id = 'nada-consta' and exists (
    select 1 from public.cataloging_requests r join public.student_profiles s on s.id = r.student_profile_id
    where name = r.id::text || '/nada-consta.pdf' and s.profile_id = auth.uid()
      and r.status in ('submitted', 'in_review', 'changes_requested', 'approved')
  )
);

create or replace function public.register_nada_consta_upload(target_request_id uuid, target_path text, target_name text, target_size bigint, target_mime text, target_sha256 text)
returns uuid language plpgsql security definer set search_path='' as $$
declare student_profile uuid; document_id uuid;
begin
  select s.id into student_profile from public.student_profiles s where s.profile_id = auth.uid();
  if student_profile is null then raise exception 'active_student_required'; end if;
  if target_size <= 0 or target_size > 5242880 then raise exception 'nada_consta_size_invalid'; end if;
  if lower(target_mime) <> 'application/pdf' or lower(target_name) !~ '\.pdf$' or target_sha256 !~ '^[0-9a-f]{64}$' then raise exception 'nada_consta_pdf_invalid'; end if;
  if target_path <> target_request_id::text || '/nada-consta.pdf' then raise exception 'nada_consta_path_invalid'; end if;
  if not exists (select 1 from public.cataloging_requests where id = target_request_id and student_profile_id = student_profile and status in ('submitted', 'in_review', 'changes_requested', 'approved')) then raise exception 'active_request_required'; end if;
  insert into public.nada_consta_documents(request_id, object_path, original_name, size_bytes, mime_type, sha256, uploaded_by)
  values(target_request_id, target_path, left(target_name,255), target_size, 'application/pdf', lower(target_sha256), auth.uid()) returning id into document_id;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata) values(auth.uid(), 'nada_consta_uploaded', 'cataloging_request', target_request_id::text, jsonb_build_object('document_id', document_id, 'size_bytes', target_size));
  return document_id;
end $$;

create or replace function public.validate_nada_consta(target_document_id uuid, approved boolean, reason text default null)
returns text language plpgsql security definer set search_path='' as $$
declare doc record;
begin
  if coalesce(public.current_user_role() in ('cataloger','administrator'),false) is not true then raise exception 'active_staff_required'; end if;
  select d.*, r.assigned_to, r.status as request_status into doc from public.nada_consta_documents d join public.cataloging_requests r on r.id = d.request_id where d.id = target_document_id for update of d;
  if not found or doc.status <> 'pending' or doc.request_status not in ('in_review', 'approved') or (public.current_user_role() = 'cataloger' and doc.assigned_to <> auth.uid()) then raise exception 'nada_consta_not_ready'; end if;
  if not approved and char_length(btrim(coalesce(reason,''))) < 3 then raise exception 'rejection_reason_required'; end if;
  update public.nada_consta_documents set status = case when approved then 'approved'::public.nada_consta_status else 'rejected'::public.nada_consta_status end, validated_by = auth.uid(), validated_at = now(), rejection_reason = case when approved then null else left(btrim(reason),2000) end, released_at = case when approved then now() else null end, updated_at = now() where id = target_document_id;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata) values(auth.uid(), case when approved then 'nada_consta_approved' else 'nada_consta_rejected' end, 'cataloging_request', doc.request_id::text, jsonb_build_object('document_id', target_document_id));
  if approved and exists (select 1 from public.cataloging_card_homologations where request_id = doc.request_id) then perform public.queue_request_release_notice(doc.request_id); end if;
  return doc.object_path;
end $$;

create or replace function public.release_when_card_and_document_are_ready()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.status = 'approved' and exists (select 1 from public.cataloging_card_homologations where request_id = new.id) and exists (select 1 from public.nada_consta_documents where request_id = new.id and status = 'approved') then perform public.queue_request_release_notice(new.id); end if;
  return new;
end $$;
create trigger release_when_card_and_document_are_ready after update of status on public.cataloging_requests for each row execute function public.release_when_card_and_document_are_ready();
