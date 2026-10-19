-- Mantém um protocolo ativo por estudante, mas permite outro grau com nova matrícula.
-- Protocolos cancelados não consomem a matrícula e podem ser refeitos.
drop index if exists public.cataloging_requests_one_non_canceled_per_student;

create unique index cataloging_requests_one_non_canceled_per_enrollment
  on public.cataloging_requests (academic_enrollment_id)
  where status <> 'canceled';

-- A mesma matrícula do estudante não pode ser cadastrada como outro programa para
-- contornar a regra do protocolo já concluído.
create unique index academic_enrollments_one_registration_per_student
  on public.academic_enrollments (student_profile_id, registration_number);

update public.knowledge_base_entries
set summary = 'Cada matrícula corresponde a um vínculo acadêmico. Após concluir o protocolo, use a mesma conta com a nova matrícula de outro curso ou grau; após cancelamento, a matrícula pode ser reutilizada.',
    body_html = '<p>A matrícula identifica o vínculo acadêmico ao qual a ficha se refere. Após a conclusão do protocolo, não é possível abrir outro pedido com a mesma matrícula. Se você ingressar em novo curso ou grau e receber outra matrícula, use a mesma conta do Pronto! e informe a nova matrícula.</p><p>Se o protocolo foi cancelado, você pode iniciar outro pedido com a matrícula anterior. Os protocolos já enviados permanecem no histórico.</p>',
    updated_at = now()
where kind = 'faq' and title = 'Por que preciso informar a matrícula em cada nova solicitação?';

update public.knowledge_base_entries
set summary = 'Em novo curso ou grau, informe a nova matrícula na mesma conta. Se o protocolo anterior foi cancelado, você pode reutilizar aquela matrícula.',
    body_html = '<p>Sim. Quando você ingressa em outro curso ou grau e recebe uma nova matrícula, use a mesma conta para pedir a ficha do novo trabalho. A matrícula de um protocolo concluído não pode ser usada novamente.</p><p>Se o protocolo anterior foi cancelado, você pode iniciar outro pedido e informar novamente a matrícula daquele vínculo.</p>',
    updated_at = now()
where kind = 'answer' and title = 'Preciso informar a matrícula novamente?';
