-- Incremento 9: libera somente o snapshot homologado ao estudante apto à entrega local.

create policy "cataloging_card_homologations_released_student_read"
on public.cataloging_card_homologations for select to authenticated using (
  exists (
    select 1 from public.cataloging_requests r
    join public.student_profiles s on s.id=r.student_profile_id
    join public.nada_consta_documents n on n.request_id=r.id and n.status='approved'
    where r.id=request_id and s.profile_id=auth.uid() and r.status='approved'
  )
);
