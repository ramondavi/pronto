-- Optional, reviewed explanatory content for an authority. No internal work title is exposed.
create table public.subject_authority_public_profiles (
 authority_id uuid primary key references public.subject_authorities(id) on delete cascade,
 plain_definition text not null default '',
 academic_context text not null default '',
 public_examples text not null default '',
 use_when text not null default '',
 avoid_when text not null default '',
 preferred_form_reason text not null default '',
 relationship_explanation text not null default '',
 evidence_sources text not null default '',
 reviewed_by uuid not null references public.profiles(id),
 reviewed_at timestamptz not null default now(),
 constraint authority_profile_lengths check (
  char_length(plain_definition)<=2000 and char_length(academic_context)<=2000 and
  char_length(public_examples)<=3000 and char_length(use_when)<=2000 and
  char_length(avoid_when)<=2000 and char_length(preferred_form_reason)<=2000 and
  char_length(relationship_explanation)<=2000 and char_length(evidence_sources)<=3000)
);
alter table public.subject_authority_public_profiles enable row level security;
revoke all on public.subject_authority_public_profiles from public,anon,authenticated;

create function public.admin_get_subject_authority_public_profile(target_authority_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not (coalesce(public.has_permission('admin.subjects.view'),false) or coalesce(public.has_permission('admin.subjects.manage'),false)) then raise exception 'permission_denied'; end if;
 select to_jsonb(p) - 'reviewed_by' into result from public.subject_authority_public_profiles p where p.authority_id=target_authority_id;
 return result;
end $$;
revoke all on function public.admin_get_subject_authority_public_profile(uuid) from public,anon;
grant execute on function public.admin_get_subject_authority_public_profile(uuid) to authenticated;

create function public.admin_save_subject_authority_public_profile(target_authority_id uuid, profile_value jsonb, edit_reason text)
returns void language plpgsql security definer set search_path='' as $$
declare existing public.subject_authority_public_profiles%rowtype;
begin
 if coalesce(public.has_permission('admin.subjects.manage'),false) is not true then raise exception 'permission_denied'; end if;
 if not exists(select 1 from public.subject_authorities where id=target_authority_id) then raise exception 'authority_not_found'; end if;
 if profile_value is null or jsonb_typeof(profile_value)<>'object' or char_length(btrim(coalesce(edit_reason,''))) not between 10 and 1000
 then raise exception 'invalid_profile_or_reason'; end if;
 select * into existing from public.subject_authority_public_profiles where authority_id=target_authority_id for update;
 insert into public.subject_authority_public_profiles(authority_id,plain_definition,academic_context,public_examples,use_when,avoid_when,preferred_form_reason,relationship_explanation,evidence_sources,reviewed_by,reviewed_at)
 values(target_authority_id,btrim(coalesce(profile_value->>'plain_definition','')),btrim(coalesce(profile_value->>'academic_context','')),
  btrim(coalesce(profile_value->>'public_examples','')),btrim(coalesce(profile_value->>'use_when','')),
  btrim(coalesce(profile_value->>'avoid_when','')),btrim(coalesce(profile_value->>'preferred_form_reason','')),
  btrim(coalesce(profile_value->>'relationship_explanation','')),btrim(coalesce(profile_value->>'evidence_sources','')),auth.uid(),now())
 on conflict(authority_id) do update set plain_definition=excluded.plain_definition,academic_context=excluded.academic_context,
  public_examples=excluded.public_examples,use_when=excluded.use_when,avoid_when=excluded.avoid_when,
  preferred_form_reason=excluded.preferred_form_reason,relationship_explanation=excluded.relationship_explanation,
  evidence_sources=excluded.evidence_sources,reviewed_by=excluded.reviewed_by,reviewed_at=excluded.reviewed_at;
 if found then delete from public.subject_authority_publications where authority_id=target_authority_id; end if;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
 values(auth.uid(),'subject_authority_public_profile_saved','subject_authority',target_authority_id::text,
  jsonb_build_object('reason',btrim(edit_reason),'previous_review',existing.reviewed_at));
end $$;
revoke all on function public.admin_save_subject_authority_public_profile(uuid,jsonb,text) from public,anon;
grant execute on function public.admin_save_subject_authority_public_profile(uuid,jsonb,text) to authenticated;

create function public.get_public_subject_authority_profile(target_authority_id uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select to_jsonb(p) - 'reviewed_by'
 from public.subject_authority_public_profiles p
 join public.subject_authority_publications publication on publication.authority_id=p.authority_id
 join public.subject_authorities a on a.id=p.authority_id
 join public.controlled_terms t on t.id=a.controlled_term_id
 where p.authority_id=target_authority_id and t.active and t.merged_into_id is null
  and a.record->>'status' is distinct from 'local_proposal' and public.subject_authority_has_work(a.id)
 limit 1;
$$;
revoke all on function public.get_public_subject_authority_profile(uuid) from public,authenticated;
grant execute on function public.get_public_subject_authority_profile(uuid) to anon,authenticated;
