-- Place categories are reviewed editorial data, never guessed from the heading.
alter table public.subject_authority_map_points
 add column place_type text not null default 'other'
 check (place_type in ('neighborhood','square','street','institution','other'));

create or replace function public.admin_set_subject_authority_place_type(
 target_authority_id uuid, part_position integer, place_type_value text, edit_reason text default null
) returns void language plpgsql security definer set search_path='' as $$
declare previous_type text;
begin
 if coalesce(public.has_permission('admin.subjects.manage'),false) is not true then raise exception 'permission_denied'; end if;
 if place_type_value not in ('neighborhood','square','street','institution','other') then raise exception 'invalid_place_type'; end if;
 select place_type into previous_type from public.subject_authority_map_points
 where authority_id=target_authority_id and component_position=part_position for update;
 if not found then raise exception 'map_point_not_found'; end if;
 if previous_type is distinct from place_type_value and exists (select 1 from public.subject_authority_publications where authority_id=target_authority_id)
  and char_length(btrim(coalesce(edit_reason,''))) not between 10 and 1000 then raise exception 'edit_reason_required'; end if;
 update public.subject_authority_map_points set place_type=place_type_value,reviewed_by=auth.uid(),reviewed_at=now()
 where authority_id=target_authority_id and component_position=part_position;
 if previous_type is distinct from place_type_value then
  delete from public.subject_authority_publications where authority_id=target_authority_id;
 end if;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
 values(auth.uid(),'subject_authority_place_type_reviewed','subject_authority',target_authority_id::text,
 jsonb_build_object('component_position',part_position,'place_type',place_type_value,'previous_type',previous_type,'reason',nullif(btrim(edit_reason),'')));
end $$;
revoke all on function public.admin_set_subject_authority_place_type(uuid,integer,text,text) from public,anon;
grant execute on function public.admin_set_subject_authority_place_type(uuid,integer,text,text) to authenticated;

create or replace function public.admin_list_subject_authority_map_points(target_authority_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if coalesce(public.has_permission('admin.subjects.manage'),false) is not true then raise exception 'permission_denied'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('component_position',p.component_position,'place_label',p.place_label,
  'latitude',p.latitude,'longitude',p.longitude,'in_brazil',p.in_brazil,'location_source',p.location_source,
  'place_type',p.place_type,'geography',public.subject_authority_geographic_path(p.geographic_unit_id))
  order by p.component_position),'[]'::jsonb) into result
 from public.subject_authority_map_points p where p.authority_id=target_authority_id;
 return result;
end $$;

create or replace function public.list_public_authority_map_points()
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('authority_id',listed.authority_id,'term_label',listed.term_label,
  'place_label',listed.place_label,'latitude',listed.latitude,'longitude',listed.longitude,
  'in_brazil',listed.in_brazil,'kind',listed.kind,'place_type',listed.place_type,'geography',listed.geography)
  order by listed.place_label,listed.term_label),'[]'::jsonb)
 from (
  select p.authority_id,t.preferred_label_pt term_label,p.place_label,p.latitude,p.longitude,p.in_brazil,p.place_type,
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
