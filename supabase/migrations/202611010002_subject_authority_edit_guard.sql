-- Prevent a second imported record from the same source with the same heading,
-- even if the source supplied another identifier. Existing records are preserved.
create function public.reject_same_source_authority_heading() returns trigger
language plpgsql security definer set search_path = '' as $$
declare normalized_title text;
begin
 if new.origin <> 'imported' then return new; end if;
 normalized_title := lower(pg_catalog.regexp_replace(coalesce(public.sanitize_cataloging_text(new.record->>'title'),''),'[[:space:][:punct:]]+',' ','g'));
 if normalized_title = '' then return new; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('authority-heading:'||new.source_code||':'||normalized_title,0));
 if exists(select 1 from public.subject_authorities a
   where a.source_code = new.source_code and a.origin = 'imported' and a.id <> new.id
   and lower(pg_catalog.regexp_replace(coalesce(public.sanitize_cataloging_text(a.record->>'title'),''),'[[:space:][:punct:]]+',' ','g')) = normalized_title)
 then raise exception 'authority_same_source_heading_conflict'; end if;
 return new;
end;
$$;
create trigger subject_authority_heading_guard before insert or update of source_code,record,origin on public.subject_authorities
for each row execute function public.reject_same_source_authority_heading();

-- The previous four-argument editor remains available only to the definer of this
-- wrapper; direct authenticated calls must carry a reason.
revoke execute on function public.admin_save_controlled_term(uuid,text,text,boolean) from authenticated;
create function public.admin_save_controlled_term_reason(term_id uuid, label_pt text, label_en text, enabled boolean, edit_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare clean_reason text := nullif(btrim(edit_reason),'');
begin
 if not public.has_permission('admin.subjects.manage') then raise exception 'permission_denied'; end if;
 if clean_reason is null or char_length(clean_reason) not between 10 and 1000 then raise exception 'edit_reason_required'; end if;
 perform public.admin_save_controlled_term(term_id,label_pt,label_en,enabled);
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
 values(auth.uid(),'controlled_term_edit_reason','controlled_term',term_id::text,jsonb_build_object('reason',clean_reason));
end;
$$;
revoke all on function public.admin_save_controlled_term_reason(uuid,text,text,boolean,text) from public,anon,authenticated;
grant execute on function public.admin_save_controlled_term_reason(uuid,text,text,boolean,text) to authenticated;
