create or replace function public.coordination_request_snapshot(access_token text)
returns jsonb language plpgsql security definer set search_path='' stable as $$
declare result jsonb;
begin
  if access_token is null or length(access_token)<>64 then return null; end if;
  select jsonb_build_object(
    'protocol',r.protocol,'title',r.title,'subtitle',r.subtitle,'student_name',pr.full_name,
    'program_name',ap.name,'level',ap.level,'status',r.status,
    'submitted_at',r.submitted_at,
    'sla_business_days',ap.service_level_business_days,
    'sla_due_at',public.add_business_days(r.submitted_at,ap.service_level_business_days),
    'timeline',coalesce((select jsonb_agg(jsonb_build_object('key',x.event_key,'label',x.label,'occurred_at',x.occurred_at) order by x.occurred_at) from (
      select 'request_submitted'::text event_key,'Solicitação aberta'::text label,r.submitted_at occurred_at
      union all select 'service_started','Atendimento iniciado',r.assigned_at where r.assigned_at is not null
      union all select 'changes_requested_'||rr.round_number,'Correções solicitadas — rodada '||rr.round_number,rr.returned_at from public.request_revision_rounds rr where rr.request_id=r.id
      union all select 'corrections_sent_'||rr.round_number,'Correções reenviadas — rodada '||rr.round_number,rr.responded_at from public.request_revision_rounds rr where rr.request_id=r.id and rr.responded_at is not null
      union all select 'card_homologated','Ficha catalográfica homologada',h.homologated_at from public.cataloging_card_homologations h where h.request_id=r.id
      union all select 'nada_approved','Nada Consta validado',n.validated_at from public.nada_consta_documents n where n.request_id=r.id and n.status in ('approved','purged') and n.validated_at is not null
      union all select 'repository_started','Autodepósito no RI/UFBA iniciado',p.started_at from public.repository_deposit_progress p where p.request_id=r.id
      union all select 'repository_verified','Publicação no RI/UFBA verificada',p.verified_at from public.repository_publications p where p.request_id=r.id
      union all select 'request_completed','Protocolo encerrado',r.updated_at where r.status='completed'
    ) x),'[]'::jsonb)
  ) into result
  from public.coordination_magic_links ml
  join public.cataloging_requests r on r.id=ml.request_id
  join public.student_profiles sp on sp.id=r.student_profile_id
  join public.profiles pr on pr.id=sp.profile_id
  join public.academic_enrollments ae on ae.id=r.academic_enrollment_id
  join public.academic_programs ap on ap.id=ae.academic_program_id
  where ml.token_hash=encode(extensions.digest(access_token,'sha256'),'hex')
    and ml.invalidated_at is null;
  return result;
end $$;
