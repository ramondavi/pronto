-- Cada vínculo acadêmico pode originar somente um protocolo, independentemente do estado.
-- A restrição também protege contra submissões simultâneas da mesma matrícula.
create unique index cataloging_requests_one_per_enrollment
  on public.cataloging_requests (academic_enrollment_id);
