-- Envio atômico para várias pessoas mencionadas ou para toda a equipe ativa.
create function public.send_staff_message_to_many(target_recipient_ids uuid[], message_body text, target_protocol text default null, include_all boolean default false)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  sender_name text;
  linked_request_id uuid;
  clean_protocol text := nullif(upper(btrim(target_protocol)), '');
  recipients uuid[];
  recipient uuid;
  sent_id uuid;
begin
  if coalesce(public.current_user_role() in ('cataloger','administrator'), false) is not true then raise exception 'active_staff_required'; end if;
  if char_length(btrim(coalesce(message_body,''))) not between 1 and 2000 then raise exception 'valid_message_required'; end if;
  if clean_protocol is not null then
    select id into linked_request_id from public.cataloging_requests where upper(protocol) = clean_protocol;
    if linked_request_id is null then raise exception 'protocol_not_found'; end if;
  end if;
  if include_all then
    select array_agg(id) into recipients from public.profiles
      where role in ('cataloger','administrator') and status = 'active' and id <> auth.uid();
  else
    recipients := coalesce(target_recipient_ids, '{}'::uuid[]);
  end if;
  if coalesce(cardinality(recipients),0) = 0 then raise exception 'active_staff_recipient_required'; end if;
  if exists (
    select 1 from unnest(recipients) as selected(id)
    left join public.profiles p on p.id = selected.id
    where p.id is null or p.id = auth.uid() or p.role not in ('cataloger','administrator') or p.status <> 'active'
  ) then raise exception 'active_staff_recipient_required'; end if;
  select full_name into sender_name from public.profiles where id = auth.uid();
  for recipient in select distinct id from unnest(recipients) as selected(id) loop
    insert into public.staff_messages(sender_id,recipient_id,request_id,body)
      values(auth.uid(),recipient,linked_request_id,btrim(message_body)) returning id into sent_id;
    insert into public.staff_notifications(recipient_id,request_id,source_key,kind,title,message,href)
      values(recipient,linked_request_id,'message:' || sent_id,'staff_message',
        'Mensagem de ' || sender_name,'Abra a aba Mensagens para ler.','/painel/fila');
  end loop;
  return (select count(distinct id)::integer from unnest(recipients) as selected(id));
end $$;

revoke all on function public.send_staff_message_to_many(uuid[],text,text,boolean) from public, anon, authenticated;
grant execute on function public.send_staff_message_to_many(uuid[],text,text,boolean) to authenticated;
