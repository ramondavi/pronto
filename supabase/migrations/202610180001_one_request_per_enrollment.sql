-- Um protocolo não cancelado por estudante. Cancelamentos permitem nova submissão,
-- inclusive para a mesma matrícula; conclusões encerram essa possibilidade.
create unique index cataloging_requests_one_non_canceled_per_student
  on public.cataloging_requests (student_profile_id)
  where status <> 'canceled';
