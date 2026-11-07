-- Reusable reviewed geographic paths. Existing map points remain intact and unclassified.
create table public.subject_authority_geographic_units (
 id uuid primary key default gen_random_uuid(),
 parent_id uuid references public.subject_authority_geographic_units(id) on delete restrict,
 level integer not null check (level between 1 and 5),
 name text not null check (char_length(btrim(name)) between 2 and 120),
 reviewed_by uuid not null references public.profiles(id),
 reviewed_at timestamptz not null default now()
);
create unique index subject_authority_geo_roots_unique on public.subject_authority_geographic_units(lower(btrim(name))) where parent_id is null;
create unique index subject_authority_geo_children_unique on public.subject_authority_geographic_units(parent_id,lower(btrim(name))) where parent_id is not null;
alter table public.subject_authority_geographic_units enable row level security;
revoke all on public.subject_authority_geographic_units from public,anon,authenticated;
alter table public.subject_authority_map_points add column geographic_unit_id uuid references public.subject_authority_geographic_units(id) on delete restrict;
create index subject_authority_map_points_geographic_unit_idx on public.subject_authority_map_points(geographic_unit_id);

create function public.subject_authority_geographic_path(unit_id uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 with recursive path as (
  select u.id,u.parent_id,u.level,u.name from public.subject_authority_geographic_units u where u.id=unit_id
  union all
  select parent.id,parent.parent_id,parent.level,parent.name from public.subject_authority_geographic_units parent join path child on child.parent_id=parent.id
 )
 select coalesce(jsonb_object_agg(case level when 1 then 'continent' when 2 then 'country' when 3 then 'macroregion' when 4 then 'state' else 'municipality' end,name),'{}'::jsonb) from path;
$$;
revoke all on function public.subject_authority_geographic_path(uuid) from public,anon,authenticated;

create function public.admin_search_geographic_paths(search_value text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if coalesce(public.has_permission('admin.subjects.manage'),false) is not true then raise exception 'permission_denied'; end if;
 if char_length(btrim(search_value))<2 then return '[]'::jsonb; end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',items.id,'name',items.name,'level',items.level,'path',public.subject_authority_geographic_path(items.id)) order by items.level desc,items.name),'[]'::jsonb) into result
 from (select id,name,level from public.subject_authority_geographic_units where name ilike '%'||left(btrim(search_value),100)||'%' order by level desc,name limit 20) items;
 return result;
end $$;
revoke all on function public.admin_search_geographic_paths(text) from public,anon;
grant execute on function public.admin_search_geographic_paths(text) to authenticated;

create function public.admin_rename_geographic_unit(target_unit_id uuid,new_name text,edit_reason text)
returns void language plpgsql security definer set search_path='' as $$
declare old_name text; old_level integer; linked_brazil boolean; clean_name text:=nullif(btrim(new_name),'');
begin
 if coalesce(public.has_permission('admin.subjects.manage'),false) is not true then raise exception 'permission_denied'; end if;
 if clean_name is null or char_length(clean_name) not between 2 and 120 or char_length(btrim(edit_reason)) not between 10 and 1000
 then raise exception 'invalid_geographic_correction'; end if;
 select name,level into old_name,old_level from public.subject_authority_geographic_units where id=target_unit_id for update;
 if not found then raise exception 'geographic_unit_not_found'; end if;
 if old_level in (1,2) then
  with recursive descendants as (
   select id from public.subject_authority_geographic_units where id=target_unit_id
   union all
   select child.id from public.subject_authority_geographic_units child join descendants parent on child.parent_id=parent.id
  )
  select exists(select 1 from public.subject_authority_map_points point join descendants unit on unit.id=point.geographic_unit_id where point.in_brazil) into linked_brazil;
  if linked_brazil and ((old_level=1 and lower(clean_name)<>'américa do sul') or (old_level=2 and lower(clean_name)<>'brasil'))
  then raise exception 'brazil_geographic_path_locked'; end if;
 end if;
 update public.subject_authority_geographic_units set name=clean_name,reviewed_by=auth.uid(),reviewed_at=now() where id=target_unit_id;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
 values(auth.uid(),'subject_authority_geographic_unit_renamed','geographic_unit',target_unit_id::text,
 jsonb_build_object('old_name',old_name,'new_name',clean_name,'reason',btrim(edit_reason)));
end $$;
revoke all on function public.admin_rename_geographic_unit(uuid,text,text) from public,anon;
grant execute on function public.admin_rename_geographic_unit(uuid,text,text) to authenticated;

create function public.admin_review_subject_authority_map_point(
 target_authority_id uuid,part_position integer,latitude_value double precision,longitude_value double precision,
 in_brazil_value boolean,location_source_value text,continent_value text,country_value text,
 macroregion_value text default null,state_value text default null,municipality_value text default null,
 edit_reason text default null
) returns void language plpgsql security definer set search_path='' as $$
declare names text[]; unit_level integer; parent uuid; unit uuid; previous_unit uuid; previous_path jsonb; new_path jsonb;
begin
 if coalesce(public.has_permission('admin.subjects.manage'),false) is not true then raise exception 'permission_denied'; end if;
 if nullif(btrim(continent_value),'') is null or nullif(btrim(country_value),'') is null
  or (in_brazil_value and (lower(btrim(country_value))<>'brasil' or lower(btrim(continent_value))<>'américa do sul'))
 then raise exception 'geographic_path_required'; end if;
 names:=array[nullif(btrim(continent_value),''),nullif(btrim(country_value),''),nullif(btrim(macroregion_value),''),nullif(btrim(state_value),''),nullif(btrim(municipality_value),'')];
 if exists(select 1 from unnest(names) item where item is not null and char_length(item) not between 2 and 120)
  or (names[3] is not null and names[4] is null) or (names[5] is not null and names[4] is null)
 then raise exception 'invalid_geographic_path'; end if;
 select p.geographic_unit_id into previous_unit from public.subject_authority_map_points p where p.authority_id=target_authority_id and p.component_position=part_position;
 if previous_unit is not null then previous_path:=public.subject_authority_geographic_path(previous_unit); end if;
 new_path:=jsonb_build_object('continent',names[1],'country',names[2]);
 if names[3] is not null then new_path:=new_path||jsonb_build_object('macroregion',names[3]); end if;
 if names[4] is not null then new_path:=new_path||jsonb_build_object('state',names[4]); end if;
 if names[5] is not null then new_path:=new_path||jsonb_build_object('municipality',names[5]); end if;
 if previous_path is not null and previous_path<>new_path and char_length(btrim(coalesce(edit_reason,''))) not between 10 and 1000
 then raise exception 'edit_reason_required'; end if;
 perform public.admin_set_subject_authority_map_point(target_authority_id,part_position,latitude_value,longitude_value,in_brazil_value,location_source_value,false);
 parent:=null;
 for unit_level in 1..5 loop
  if names[unit_level] is null then continue; end if;
  select id into unit from public.subject_authority_geographic_units where parent_id is not distinct from parent and lower(btrim(name))=lower(names[unit_level]);
  if unit is null then
   insert into public.subject_authority_geographic_units(parent_id,level,name,reviewed_by)
   values(parent,unit_level,names[unit_level],auth.uid()) on conflict do nothing returning id into unit;
   if unit is null then select id into unit from public.subject_authority_geographic_units where parent_id is not distinct from parent and lower(btrim(name))=lower(names[unit_level]); end if;
  end if;
  parent:=unit; unit:=null;
 end loop;
 update public.subject_authority_map_points set geographic_unit_id=parent where authority_id=target_authority_id and component_position=part_position;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
 values(auth.uid(),'subject_authority_geographic_path_reviewed','subject_authority',target_authority_id::text,
 jsonb_build_object('component_position',part_position,'path',new_path,'reason',nullif(btrim(edit_reason),'')));
end $$;
revoke all on function public.admin_review_subject_authority_map_point(uuid,integer,double precision,double precision,boolean,text,text,text,text,text,text,text) from public,anon;
grant execute on function public.admin_review_subject_authority_map_point(uuid,integer,double precision,double precision,boolean,text,text,text,text,text,text,text) to authenticated;

create or replace function public.admin_list_subject_authority_map_points(target_authority_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if coalesce(public.has_permission('admin.subjects.manage'),false) is not true then raise exception 'permission_denied'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('component_position',p.component_position,'place_label',p.place_label,
  'latitude',p.latitude,'longitude',p.longitude,'in_brazil',p.in_brazil,'location_source',p.location_source,
  'geography',public.subject_authority_geographic_path(p.geographic_unit_id)) order by p.component_position),'[]'::jsonb) into result
 from public.subject_authority_map_points p where p.authority_id=target_authority_id;
 return result;
end $$;

create or replace function public.list_public_authority_map_points()
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('authority_id',listed.authority_id,'term_label',listed.term_label,
  'place_label',listed.place_label,'latitude',listed.latitude,'longitude',listed.longitude,
  'in_brazil',listed.in_brazil,'kind',listed.kind,'geography',listed.geography)
  order by listed.place_label,listed.term_label),'[]'::jsonb)
 from (
  select p.authority_id,t.preferred_label_pt term_label,p.place_label,p.latitude,p.longitude,p.in_brazil,
   public.subject_authority_geographic_path(p.geographic_unit_id) geography,
   case when p.component_position=-1 then 'associated' when p.component_position=0 then 'heading' else 'subdivision' end kind
  from public.subject_authority_map_points p
  join public.subject_authorities a on a.id=p.authority_id
  join public.subject_authority_publications publication on publication.authority_id=a.id
  join public.controlled_terms t on t.id=a.controlled_term_id
  where t.active and t.merged_into_id is null and a.record->>'status' is distinct from 'local_proposal'
   and public.subject_authority_has_work(a.id)
   and public.subject_authority_geographic_part(a.record,p.component_position)=p.place_label
  order by p.place_label,t.preferred_label_pt,a.id limit 2000
 ) listed;
$$;
