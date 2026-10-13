-- O editor básico salva marcação HTML restrita; o envio sanitiza novamente.
alter table public.request_analyses
  drop constraint if exists request_analyses_student_message_reply_check;
alter table public.request_analyses
  add constraint request_analyses_student_message_reply_check
  check (student_message_reply is null or char_length(student_message_reply) <= 8000);

create or replace function public.save_student_message_reply(target_request_id uuid, reply_text text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(public.current_user_role() in ('cataloger', 'administrator'), false) is not true then raise exception 'active_staff_required'; end if;
  if char_length(btrim(coalesce(reply_text, ''))) > 8000 then raise exception 'reply_too_long'; end if;
  perform 1 from public.cataloging_requests
    where id = target_request_id and assigned_to = auth.uid() and status = 'in_review' and nullif(btrim(library_note), '') is not null
    for update;
  if not found then raise exception 'request_locked_or_no_student_message'; end if;
  insert into public.request_analyses(request_id, analysis_notes, internal_note, last_edited_by, student_message_reply, updated_at)
    values(target_request_id, '', '', auth.uid(), nullif(btrim(reply_text), ''), now())
    on conflict(request_id) do update set student_message_reply = excluded.student_message_reply,
      last_edited_by = auth.uid(), updated_at = now();
end;
$$;
