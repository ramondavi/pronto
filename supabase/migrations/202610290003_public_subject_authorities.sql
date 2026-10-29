-- Public authority publication is opt-in; existing records remain private.
create table public.subject_authority_publications (
 authority_id uuid primary key references public.subject_authorities(id) on delete cascade,
 rights_statement text not null check (char_length(rights_statement) between 10 and 1000),
 marc_mapping jsonb not null check (jsonb_typeof(marc_mapping)='object'),
 approved_by uuid not null references public.profiles(id),
 approved_at timestamptz not null default now()
);
alter table public.subject_authority_publications enable row level security;
revoke all on public.subject_authority_publications from public, anon, authenticated;

create function public.invalidate_subject_publication_for_term()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if old.preferred_label_pt is distinct from new.preferred_label_pt
  or old.preferred_label_en is distinct from new.preferred_label_en
  or old.active is distinct from new.active
  or old.merged_into_id is distinct from new.merged_into_id then
  delete from public.subject_authority_publications p using public.subject_authorities a
   where p.authority_id=a.id and a.controlled_term_id=new.id;
 end if;
 return new;
end;
$$;
create trigger subject_publication_term_changed after update on public.controlled_terms
 for each row execute function public.invalidate_subject_publication_for_term();

create function public.invalidate_subject_publication_for_authority()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if old.record is distinct from new.record or old.source_code is distinct from new.source_code
  or old.source_identifier is distinct from new.source_identifier
  or old.controlled_term_id is distinct from new.controlled_term_id then
  delete from public.subject_authority_publications where authority_id=new.id;
 end if;
 return new;
end;
$$;
create trigger subject_publication_authority_changed after update on public.subject_authorities
 for each row execute function public.invalidate_subject_publication_for_authority();

create function public.invalidate_subject_publication_for_variant()
returns trigger language plpgsql security definer set search_path='' as $$
declare affected_id uuid;
begin
 if tg_op='DELETE' then affected_id:=old.authority_id; else affected_id:=new.authority_id; end if;
 delete from public.subject_authority_publications where authority_id=affected_id;
 if tg_op='DELETE' then return old; end if;
 return new;
end;
$$;
create trigger subject_publication_variant_changed after insert or update or delete on public.subject_authority_variants
 for each row execute function public.invalidate_subject_publication_for_variant();
revoke all on function public.invalidate_subject_publication_for_term(), public.invalidate_subject_publication_for_authority() from public,anon,authenticated;
revoke all on function public.invalidate_subject_publication_for_variant() from public,anon,authenticated;

create function public.admin_subject_publication_status(target_authority_id uuid)
returns table (published boolean, rights_statement text, marc_mapping jsonb, approved_at timestamptz)
language plpgsql stable security definer set search_path='' as $$
begin
 if coalesce(public.has_permission('admin.subjects.manage'),false) is not true then raise exception 'permission_denied'; end if;
 return query select p.authority_id is not null, p.rights_statement, p.marc_mapping, p.approved_at
 from public.subject_authorities a left join public.subject_authority_publications p on p.authority_id=a.id
 where a.id=target_authority_id;
end;
$$;

create function public.admin_set_subject_publication(target_authority_id uuid, publish_value boolean, rights_value text default null, mapping_value jsonb default null)
returns void language plpgsql security definer set search_path='' as $$
declare authority_row public.subject_authorities%rowtype; term_row public.controlled_terms%rowtype; clean_rights text:=nullif(btrim(rights_value),'');
 heading_tag text; allowed text[]; indicator text; item jsonb;
begin
 if coalesce(public.has_permission('admin.subjects.manage'),false) is not true then raise exception 'permission_denied'; end if;
 select * into authority_row from public.subject_authorities where id=target_authority_id for update;
 if not found then raise exception 'authority_not_found'; end if;
 if publish_value then
  select * into term_row from public.controlled_terms where id=authority_row.controlled_term_id;
  if not term_row.active or term_row.merged_into_id is not null or authority_row.record->>'status'='local_proposal' then raise exception 'authority_not_publishable'; end if;
  if clean_rights is null or char_length(clean_rights) not between 10 and 1000 then raise exception 'publication_rights_required'; end if;
  heading_tag:=case authority_row.record->>'heading_type' when 'topic' then '150' when 'geographic' then '151'
   when 'personal' then '100' when 'corporate' then '110' when 'title' then '130' end;
  if heading_tag is null then
   select f->>'tag' into heading_tag from jsonb_array_elements(coalesce(authority_row.record->'fields','[]'::jsonb)) f
    where f->>'tag' in ('100','110','130','150','151') limit 1;
  end if;
  if heading_tag is null then raise exception 'heading_type_required'; end if;
  allowed:=case heading_tag when '100' then array['0','1','3'] when '110' then array['0','1','2']
   when '130' then array['0','1','2','3','4','5','6','7','8','9'] else array[' '] end;
  if mapping_value is null or jsonb_typeof(mapping_value)<>'object'
   or mapping_value->>'heading_ind1' is null or mapping_value->>'heading_ind1'<>all(allowed)
   or jsonb_typeof(mapping_value->'variant_ind1') is distinct from 'array'
   or jsonb_typeof(mapping_value->'relation_ind1') is distinct from 'array'
   then raise exception 'invalid_marc_mapping'; end if;
  if jsonb_array_length(mapping_value->'variant_ind1')<>(select count(*) from public.subject_authority_variants where authority_id=target_authority_id)
   or jsonb_array_length(mapping_value->'relation_ind1')<>jsonb_array_length(coalesce(authority_row.record->'relations','[]'::jsonb))
   then raise exception 'incomplete_marc_mapping'; end if;
  for item in select value from jsonb_array_elements(mapping_value->'variant_ind1') loop
   indicator:=item#>>'{}'; if indicator is null or indicator<>all(allowed) then raise exception 'invalid_marc_mapping'; end if;
  end loop;
  for item in select value from jsonb_array_elements(mapping_value->'relation_ind1') loop
   indicator:=item#>>'{}'; if indicator is null or indicator<>all(allowed) then raise exception 'invalid_marc_mapping'; end if;
  end loop;
  insert into public.subject_authority_publications(authority_id,rights_statement,marc_mapping,approved_by)
   values(target_authority_id,clean_rights,mapping_value,auth.uid())
   on conflict(authority_id) do update set rights_statement=excluded.rights_statement,marc_mapping=excluded.marc_mapping,approved_by=excluded.approved_by,approved_at=now();
 else
  delete from public.subject_authority_publications where authority_id=target_authority_id;
 end if;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
  values(auth.uid(),case when publish_value then 'subject_authority_published' else 'subject_authority_unpublished' end,
   'subject_authority',target_authority_id::text,jsonb_build_object('rights_statement',case when publish_value then clean_rights else null end));
end;
$$;

-- Return only reviewed bibliographic fields, never the raw import or private foundation.
create function public.list_public_subject_authorities(search_value text default '', page_value integer default 0, target_id uuid default null)
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(item order by item->>'label'), '[]'::jsonb) from (
  select jsonb_build_object('id',a.id,'label',t.preferred_label_pt,'label_en',t.preferred_label_en,
   'source',a.source_code,'source_identifier',a.source_identifier,'source_url',a.record->>'source_url',
   'origin',a.origin,'heading_type',coalesce(a.record->>'heading_type',
    (select case f->>'tag' when '100' then 'personal' when '110' then 'corporate' when '130' then 'title'
      when '151' then 'geographic' when '150' then 'topic' end
     from jsonb_array_elements(coalesce(a.record->'fields','[]'::jsonb)) f
     where f->>'tag' in ('100','110','130','150','151') limit 1)),
   'components',coalesce(a.record->'components','[]'::jsonb),
   'variants',coalesce((select jsonb_agg(jsonb_build_object('value',v.label,'language',v.language) order by v.label,v.id)
     from public.subject_authority_variants v where v.authority_id=a.id),'[]'::jsonb),
   'notes',coalesce(a.record->'notes','[]'::jsonb),'relations',coalesce(a.record->'relations','[]'::jsonb),
   'rights_statement',p.rights_statement,'published_at',p.approved_at,'marc_mapping',p.marc_mapping) item
  from public.subject_authority_publications p
  join public.subject_authorities a on a.id=p.authority_id
  join public.controlled_terms t on t.id=a.controlled_term_id
  where t.active and t.merged_into_id is null and a.record->>'status' is distinct from 'local_proposal'
   and (target_id is null or a.id=target_id)
   and (nullif(btrim(search_value),'') is null or t.preferred_label_pt ilike '%'||left(btrim(search_value),100)||'%'
    or coalesce(t.preferred_label_en,'') ilike '%'||left(btrim(search_value),100)||'%'
    or exists(select 1 from public.subject_authority_variants v where v.authority_id=a.id and v.label ilike '%'||left(btrim(search_value),100)||'%'))
  order by t.preferred_label_pt,a.id limit 40 offset least(greatest(page_value,0),10000)*40
 ) selected;
$$;

create function public.get_public_subject_authority(target_authority_id uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select item from jsonb_array_elements(public.list_public_subject_authorities('',0,target_authority_id)) item
 where item->>'id'=target_authority_id::text limit 1;
$$;

revoke all on function public.admin_subject_publication_status(uuid), public.admin_set_subject_publication(uuid,boolean,text,jsonb),
 public.list_public_subject_authorities(text,integer,uuid), public.get_public_subject_authority(uuid) from public,anon,authenticated;
grant execute on function public.admin_subject_publication_status(uuid), public.admin_set_subject_publication(uuid,boolean,text,jsonb) to authenticated;
grant execute on function public.list_public_subject_authorities(text,integer,uuid), public.get_public_subject_authority(uuid) to anon,authenticated;
