-- Local repertoire curated by the library; no external CDU schedules are imported.
begin;
alter table public.cdu_code_descriptions
 add column parent_code text references public.cdu_code_descriptions(cdu_code) on delete restrict,
 add column notation_kind text not null default 'unclassified',
 add column auxiliary_scope_code text references public.cdu_code_descriptions(cdu_code) on delete restrict,
 add column usage_notes text check (char_length(usage_notes) <= 4000),
 add constraint cdu_notation_kind check (notation_kind in ('unclassified','main','compound','common_language','common_form','common_place','common_ancestry','common_time','common_properties','common_materials','common_processes','common_persons','special_point_zero','special_hyphen','special_apostrophe')),
 add constraint cdu_not_self_parent check (parent_code is distinct from cdu_code),
 add constraint cdu_not_self_scope check (auxiliary_scope_code is distinct from cdu_code);
create index cdu_parent_code_idx on public.cdu_code_descriptions(parent_code);

create function public.admin_save_cdu_structure(code_value text, kind_value text, parent_value text, scope_value text, notes_value text)
returns void language plpgsql security definer set search_path='' as $$
declare ancestor text; visited text[]; target text; current_key text;
begin
 if not public.has_permission('admin.cdu.manage') then raise exception 'permission_denied'; end if;
 perform pg_advisory_xact_lock(hashtextextended('pronto.catalogue.merge',0));
 perform 1 from public.cdu_code_descriptions where cdu_code=code_value and merged_into_code is null for update;
 if not found then raise exception 'current_cdu_record_required'; end if;
 if kind_value is null or kind_value not in ('unclassified','main','compound','common_language','common_form','common_place','common_ancestry','common_time','common_properties','common_materials','common_processes','common_persons','special_point_zero','special_hyphen','special_apostrophe') then raise exception 'invalid_cdu_kind'; end if;
 if (kind_value like 'special_%') is distinct from (nullif(scope_value,'') is not null) then raise exception 'cdu_auxiliary_scope_required'; end if;
 if nullif(scope_value,'') is not null and not exists(select 1 from public.cdu_code_descriptions where cdu_code=scope_value and notation_kind='main' and merged_into_code is null) then raise exception 'cdu_scope_main_class_required'; end if;
 if nullif(parent_value,'') is not null and not exists(select 1 from public.cdu_code_descriptions where cdu_code=parent_value and (notation_kind=kind_value or (kind_value='compound' and notation_kind='main'))) then raise exception 'cdu_parent_table_mismatch'; end if;
 if kind_value like 'special_%' and nullif(parent_value,'') is not null and exists(select 1 from public.cdu_code_descriptions where cdu_code=parent_value and public.canonical_cdu_code(auxiliary_scope_code) is distinct from public.canonical_cdu_code(scope_value)) then raise exception 'cdu_parent_scope_mismatch'; end if;
 foreach target in array array[nullif(parent_value,''),nullif(scope_value,'')] loop
   ancestor:=target; visited:=array[code_value];
   while ancestor is not null loop
     if ancestor=any(visited) then raise exception 'cdu_hierarchy_cycle'; end if;
     visited:=array_append(visited,ancestor);
     select cdu_code,parent_code into current_key,ancestor from public.cdu_code_descriptions where cdu_code=ancestor and merged_into_code is null;
     if current_key is null then raise exception 'current_cdu_reference_required'; end if;
   end loop;
 end loop;
 update public.cdu_code_descriptions set notation_kind=kind_value,parent_code=nullif(parent_value,''),auxiliary_scope_code=nullif(scope_value,''),usage_notes=nullif(btrim(notes_value),''),updated_at=now() where cdu_code=code_value;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'cdu_structure_saved','cdu_code_description',code_value,jsonb_build_object('kind',kind_value,'parent',nullif(parent_value,''),'scope',nullif(scope_value,'')));
end;
$$;

create function public.admin_create_cdu_entry(cdu_code_value text,description_value text,source_reference_value text,kind_value text,parent_value text,scope_value text,notes_value text)
returns void language plpgsql security definer set search_path='' as $$
begin
 perform public.admin_create_cdu_code_description(cdu_code_value,description_value,source_reference_value);
 perform public.admin_save_cdu_structure(public.sanitize_cataloging_text(cdu_code_value),kind_value,parent_value,scope_value,notes_value);
end;
$$;
create function public.admin_save_cdu_entry(cdu_code_value text,description_value text,composition_notes_value text,auxiliary_codes_value text[],related_codes_value text[],source_reference_value text,validated_value boolean,kind_value text,parent_value text,scope_value text,notes_value text)
returns void language plpgsql security definer set search_path='' as $$
begin
 perform public.admin_save_cdu_structure(cdu_code_value,kind_value,parent_value,scope_value,notes_value);
 perform public.admin_save_cdu_code_description(cdu_code_value,description_value,composition_notes_value,auxiliary_codes_value,related_codes_value,source_reference_value,validated_value);
end;
$$;

-- The original merge remains inaccessible to clients; the wrapper protects the taxonomy.
alter function public.admin_merge_catalogue(text,text,text,timestamptz,timestamptz) rename to admin_merge_catalogue_without_structure;
revoke all on function public.admin_merge_catalogue_without_structure(text,text,text,timestamptz,timestamptz) from public,anon,authenticated;
create function public.admin_merge_catalogue(catalogue_kind text,source_key text,target_key text,expected_source_version timestamptz,expected_target_version timestamptz)
returns jsonb language plpgsql security definer set search_path='' as $$
declare ancestor text; visited text[]:=array[]::text[];
begin
 if not public.has_permission(case when catalogue_kind='subject' then 'admin.subjects.manage' else 'admin.cdu.manage' end) then raise exception 'permission_denied'; end if;
 perform pg_advisory_xact_lock(hashtextextended('pronto.catalogue.merge',0));
 if catalogue_kind='cdu' then
  if exists(select 1 from public.cdu_code_descriptions src join public.cdu_code_descriptions dst on dst.cdu_code=target_key where src.cdu_code=source_key and src.notation_kind<>'unclassified' and src.notation_kind<>dst.notation_kind) then raise exception 'cdu_merge_table_mismatch'; end if;
  if exists(select 1 from public.cdu_code_descriptions src join public.cdu_code_descriptions dst on dst.cdu_code=target_key where src.cdu_code=source_key and src.notation_kind like 'special_%' and public.canonical_cdu_code(src.auxiliary_scope_code) is distinct from public.canonical_cdu_code(dst.auxiliary_scope_code)) then raise exception 'cdu_merge_scope_mismatch'; end if;
  ancestor:=target_key;
  while ancestor is not null loop
   if ancestor=source_key or ancestor=any(visited) then raise exception 'cdu_merge_hierarchy_cycle'; end if;
   visited:=array_append(visited,ancestor);
   select public.canonical_cdu_code(parent_code) into ancestor from public.cdu_code_descriptions where cdu_code=ancestor;
  end loop;
  if exists(select 1 from public.cdu_code_descriptions where cdu_code=target_key and public.canonical_cdu_code(auxiliary_scope_code)=source_key) then raise exception 'cdu_merge_hierarchy_cycle'; end if;
 end if;
 return public.admin_merge_catalogue_without_structure(catalogue_kind,source_key,target_key,expected_source_version,expected_target_version);
end;
$$;
revoke all on function public.admin_save_cdu_structure(text,text,text,text,text),public.admin_create_cdu_entry(text,text,text,text,text,text,text),public.admin_save_cdu_entry(text,text,text,text[],text[],text,boolean,text,text,text,text),public.admin_merge_catalogue(text,text,text,timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.admin_save_cdu_structure(text,text,text,text,text),public.admin_create_cdu_entry(text,text,text,text,text,text,text),public.admin_save_cdu_entry(text,text,text,text[],text[],text,boolean,text,text,text,text),public.admin_merge_catalogue(text,text,text,timestamptz,timestamptz) to authenticated;
commit;
