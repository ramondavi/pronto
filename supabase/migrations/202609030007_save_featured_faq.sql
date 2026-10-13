create function public.admin_save_frequently_asked_question(
  faq_id uuid, faq_question text, faq_answer text, faq_position integer, enabled boolean, home_featured_position integer
) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
  if public.current_user_role() is distinct from 'administrator' then raise exception 'active_administrator_required'; end if;
  if char_length(btrim(coalesce(faq_question,''))) not between 5 and 300 or char_length(btrim(coalesce(faq_answer,''))) not between 5 and 4000 or faq_position not between 0 and 9999 then raise exception 'invalid_frequently_asked_question'; end if;
  if faq_id is null then
    insert into public.frequently_asked_questions(question,answer,position,active,featured_position,created_by,updated_by) values (btrim(faq_question),btrim(faq_answer),faq_position,enabled,home_featured_position,auth.uid(),auth.uid()) returning id into result;
  else
    update public.frequently_asked_questions set question=btrim(faq_question),answer=btrim(faq_answer),position=faq_position,active=enabled,featured_position=home_featured_position,updated_by=auth.uid(),updated_at=now() where id=faq_id returning id into result;
    if result is null then raise exception 'frequently_asked_question_not_found'; end if;
  end if;
  return result;
end $$;
revoke all on function public.admin_save_frequently_asked_question(uuid,text,text,integer,boolean,integer) from public,anon;
grant execute on function public.admin_save_frequently_asked_question(uuid,text,text,integer,boolean,integer) to authenticated;
