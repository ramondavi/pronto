-- Geographic markers are individually reviewed and never inferred from a heading alone.
create table public.subject_authority_map_points (
 authority_id uuid not null references public.subject_authorities(id) on delete cascade,
 component_position integer not null check (component_position between 0 and 16),
 place_label text not null check (char_length(btrim(place_label)) between 2 and 250),
 latitude double precision not null check (latitude between -90 and 90),
 longitude double precision not null check (longitude between -180 and 180),
 in_brazil boolean not null,
 location_source text not null check (char_length(btrim(location_source)) between 5 and 500),
 reviewed_by uuid not null references public.profiles(id),
 reviewed_at timestamptz not null default now(),
 primary key (authority_id, component_position)
);
create index subject_authority_map_points_brazil_idx on public.subject_authority_map_points(in_brazil, place_label);
alter table public.subject_authority_map_points enable row level security;
revoke all on public.subject_authority_map_points from public, anon, authenticated;

create function public.subject_authority_geographic_part(authority_record jsonb, part_position integer)
returns text language plpgsql immutable set search_path = '' as $$
declare part jsonb; heading_is_place boolean;
begin
 if part_position not between 0 and 16 or jsonb_typeof(authority_record->'components') is distinct from 'array'
  or part_position >= jsonb_array_length(authority_record->'components') then return null; end if;
 part := authority_record->'components'->part_position;
 heading_is_place := authority_record->>'heading_type' = 'geographic' or exists (
  select 1 from jsonb_array_elements(case when jsonb_typeof(authority_record->'fields') = 'array'
   then authority_record->'fields' else '[]'::jsonb end) field where field->>'tag' = '151');
 if (part_position = 0 and heading_is_place)
  or (part_position > 0 and part->>'kind' in ('z','geographic','Subdivisão geográfica'))
 then return nullif(btrim(part->>'value'), ''); end if;
 return null;
end $$;
revoke all on function public.subject_authority_geographic_part(jsonb,integer) from public, anon, authenticated;

create function public.admin_list_subject_authority_map_points(target_authority_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
 if coalesce(public.has_permission('admin.subjects.manage'),false) is not true then raise exception 'permission_denied'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('component_position',p.component_position,'place_label',p.place_label,
  'latitude',p.latitude,'longitude',p.longitude,'in_brazil',p.in_brazil,'location_source',p.location_source)
  order by p.component_position),'[]'::jsonb) into result
 from public.subject_authority_map_points p where p.authority_id=target_authority_id;
 return result;
end $$;
revoke all on function public.admin_list_subject_authority_map_points(uuid) from public, anon;
grant execute on function public.admin_list_subject_authority_map_points(uuid) to authenticated;

create function public.admin_set_subject_authority_map_point(
 target_authority_id uuid, part_position integer, latitude_value double precision default null,
 longitude_value double precision default null, in_brazil_value boolean default null,
 location_source_value text default null, remove_value boolean default false
) returns void language plpgsql security definer set search_path = '' as $$
declare authority_record jsonb; place text; clean_source text := nullif(btrim(location_source_value),'');
begin
 if coalesce(public.has_permission('admin.subjects.manage'),false) is not true then raise exception 'permission_denied'; end if;
 select a.record into authority_record from public.subject_authorities a where a.id=target_authority_id for update;
 if not found then raise exception 'authority_not_found'; end if;
 place := public.subject_authority_geographic_part(authority_record,part_position);
 if place is null then raise exception 'geographic_part_required'; end if;
 if remove_value then
  delete from public.subject_authority_map_points where authority_id=target_authority_id and component_position=part_position;
 else
  if latitude_value is null or longitude_value is null or in_brazil_value is null
   or latitude_value not between -90 and 90 or longitude_value not between -180 and 180
   or clean_source is null or char_length(clean_source) not between 5 and 500
   or (in_brazil_value and (latitude_value not between -35 and 6 or longitude_value not between -75 and -32))
  then raise exception 'invalid_map_point'; end if;
  insert into public.subject_authority_map_points(authority_id,component_position,place_label,latitude,longitude,in_brazil,location_source,reviewed_by)
   values(target_authority_id,part_position,place,latitude_value,longitude_value,in_brazil_value,clean_source,auth.uid())
   on conflict(authority_id,component_position) do update set place_label=excluded.place_label,latitude=excluded.latitude,
    longitude=excluded.longitude,in_brazil=excluded.in_brazil,location_source=excluded.location_source,
    reviewed_by=excluded.reviewed_by,reviewed_at=now();
 end if;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
  values(auth.uid(),case when remove_value then 'subject_authority_map_point_removed' else 'subject_authority_map_point_reviewed' end,
   'subject_authority',target_authority_id::text,jsonb_build_object('component_position',part_position,'place',place));
end $$;
revoke all on function public.admin_set_subject_authority_map_point(uuid,integer,double precision,double precision,boolean,text,boolean) from public, anon;
grant execute on function public.admin_set_subject_authority_map_point(uuid,integer,double precision,double precision,boolean,text,boolean) to authenticated;

create function public.list_public_authority_map_points()
returns jsonb language sql stable security definer set search_path = '' as $$
 select coalesce(jsonb_agg(jsonb_build_object('authority_id',listed.authority_id,'term_label',listed.term_label,
  'place_label',listed.place_label,'latitude',listed.latitude,'longitude',listed.longitude,
  'in_brazil',listed.in_brazil,'kind',listed.kind) order by listed.place_label,listed.term_label),'[]'::jsonb)
 from (
  select p.authority_id,t.preferred_label_pt term_label,p.place_label,p.latitude,p.longitude,p.in_brazil,
   case when p.component_position=0 then 'heading' else 'subdivision' end kind
  from public.subject_authority_map_points p
  join public.subject_authorities a on a.id=p.authority_id
  join public.subject_authority_publications publication on publication.authority_id=a.id
  join public.controlled_terms t on t.id=a.controlled_term_id
  where t.active and t.merged_into_id is null and a.record->>'status' is distinct from 'local_proposal'
   and public.subject_authority_has_work(a.id)
   and public.subject_authority_geographic_part(a.record,p.component_position)=p.place_label
  order by p.place_label,t.preferred_label_pt,a.id
  limit 2000
 ) listed;
$$;
revoke all on function public.list_public_authority_map_points() from public, anon, authenticated;
grant execute on function public.list_public_authority_map_points() to anon, authenticated;
