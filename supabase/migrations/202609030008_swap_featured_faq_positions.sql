create or replace function public.admin_save_frequently_asked_question(faq_id uuid, faq_question text, faq_answer text, faq_position integer, enabled boolean, home_featured_position integer)
returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
  if public.current_user_role() is distinct from 'administrator' then raise exception 'active_administrator_required'; end if;
  if home_featured_position is not null then update public.frequently_asked_questions set featured_position=null where featured_position=home_featured_position and id is distinct from faq_id; end if;
  if faq_id is null then insert into public.frequently_asked_questions(question,answer,position,active,featured_position,created_by,updated_by) values (btrim(faq_question),btrim(faq_answer),faq_position,enabled,home_featured_position,auth.uid(),auth.uid()) returning id into result;
  else update public.frequently_asked_questions set question=btrim(faq_question),answer=btrim(faq_answer),position=faq_position,active=enabled,featured_position=home_featured_position,updated_by=auth.uid(),updated_at=now() where id=faq_id returning id into result; end if;
  return result;
end $$;
