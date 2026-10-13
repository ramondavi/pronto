create table public.frequently_asked_questions (
  id uuid primary key default gen_random_uuid(),
  question text not null check (char_length(btrim(question)) between 5 and 300),
  answer text not null check (char_length(btrim(answer)) between 5 and 4000),
  position integer not null default 0 check (position between 0 and 9999),
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.frequently_asked_questions enable row level security;
create policy "frequently_asked_questions_public_read" on public.frequently_asked_questions for select to anon, authenticated using (active or public.current_user_role() = 'administrator');
revoke all on table public.frequently_asked_questions from anon, authenticated;
grant select on table public.frequently_asked_questions to anon, authenticated;

insert into public.frequently_asked_questions(question, answer, position) values
('Quem pode usar o Pronto!?', 'Estudantes da UFBA que precisam solicitar ficha catalográfica e realizar o autodepósito, além da equipe autorizada da BIB/FA.', 10),
('O trabalho completo é enviado ao Pronto!?', 'Não. O estudante informa um link público para análise e o PDF completo permanece no próprio dispositivo durante a mesclagem da ficha.', 20),
('Quando posso baixar a ficha?', 'Depois que a ficha for homologada pela biblioteca e o Nada Consta for aprovado.', 30),
('O sistema deposita o trabalho automaticamente no RI/UFBA?', 'Não. O Pronto! orienta e reaproveita metadados, mas o depósito e as escolhas de licença são feitos pelo estudante no Repositório Institucional.', 40),
('O PDF final é automaticamente certificado como PDF/A?', 'Não. O navegador gera o arquivo final, mas a conferência ou conversão para PDF/A continua sendo responsabilidade do estudante conforme a exigência do RI/UFBA.', 50),
('Como acompanho uma correção solicitada?', 'Entre no painel e abra sua solicitação. Somente os campos devolvidos pela biblioteca ficarão disponíveis para correção.', 60);

create or replace function public.admin_save_frequently_asked_question(
  faq_id uuid, faq_question text, faq_answer text, faq_position integer, enabled boolean
) returns uuid language plpgsql security definer set search_path = '' as $$
declare result uuid;
begin
  if public.current_user_role() is distinct from 'administrator' then raise exception 'active_administrator_required'; end if;
  if char_length(btrim(coalesce(faq_question, ''))) not between 5 and 300 or char_length(btrim(coalesce(faq_answer, ''))) not between 5 and 4000 or faq_position not between 0 and 9999 then raise exception 'invalid_frequently_asked_question'; end if;
  if faq_id is null then
    insert into public.frequently_asked_questions(question, answer, position, active, created_by, updated_by) values (btrim(faq_question), btrim(faq_answer), faq_position, enabled, auth.uid(), auth.uid()) returning id into result;
  else
    update public.frequently_asked_questions set question = btrim(faq_question), answer = btrim(faq_answer), position = faq_position, active = enabled, updated_by = auth.uid(), updated_at = now() where id = faq_id returning id into result;
    if result is null then raise exception 'frequently_asked_question_not_found'; end if;
  end if;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata) values (auth.uid(), 'frequently_asked_question_saved', 'frequently_asked_question', result::text, jsonb_build_object('active', enabled, 'position', faq_position));
  return result;
end;
$$;
revoke all on function public.admin_save_frequently_asked_question(uuid, text, text, integer, boolean) from public, anon;
grant execute on function public.admin_save_frequently_asked_question(uuid, text, text, integer, boolean) to authenticated;
