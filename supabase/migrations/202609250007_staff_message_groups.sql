-- Conversas persistentes entre três ou mais integrantes da equipe.
create table public.staff_message_groups (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table public.staff_message_group_members (
  group_id uuid not null references public.staff_message_groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index staff_message_group_members_user on public.staff_message_group_members(user_id, group_id);
create table public.staff_group_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.staff_message_groups(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  request_id uuid references public.cataloging_requests(id) on delete set null,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index staff_group_messages_recent on public.staff_group_messages(group_id, created_at desc);

create function public.is_staff_message_group_member(target_group_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(public.current_user_role() in ('cataloger','administrator'), false)
    and exists (select 1 from public.staff_message_group_members where group_id = target_group_id and user_id = auth.uid());
$$;
revoke all on function public.is_staff_message_group_member(uuid) from public, anon, authenticated;
grant execute on function public.is_staff_message_group_member(uuid) to authenticated;

alter table public.staff_message_groups enable row level security;
alter table public.staff_message_group_members enable row level security;
alter table public.staff_group_messages enable row level security;
create policy staff_message_groups_read on public.staff_message_groups for select to authenticated using (public.is_staff_message_group_member(id));
create policy staff_message_group_members_read on public.staff_message_group_members for select to authenticated using (public.is_staff_message_group_member(group_id));
create policy staff_group_messages_read on public.staff_group_messages for select to authenticated using (public.is_staff_message_group_member(group_id) and created_at >= now() - interval '90 days');
revoke all on public.staff_message_groups, public.staff_message_group_members, public.staff_group_messages from anon, authenticated;
grant select on public.staff_message_groups, public.staff_message_group_members, public.staff_group_messages to authenticated;

create function public.create_staff_message_group(target_recipient_ids uuid[], message_body text, target_protocol text default null, include_all boolean default false)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  recipients uuid[];
  linked_request_id uuid;
  clean_protocol text := nullif(upper(btrim(target_protocol)), '');
  new_group_id uuid;
  new_message_id uuid;
  sender_name text;
  recipient uuid;
begin
  if coalesce(public.current_user_role() in ('cataloger','administrator'), false) is not true then raise exception 'active_staff_required'; end if;
  if char_length(btrim(coalesce(message_body,''))) not between 1 and 2000 then raise exception 'valid_message_required'; end if;
  if clean_protocol is not null then
    select id into linked_request_id from public.cataloging_requests where upper(protocol) = clean_protocol;
    if linked_request_id is null then raise exception 'protocol_not_found'; end if;
  end if;
  if include_all then
    select array_agg(id) into recipients from public.profiles where role in ('cataloger','administrator') and status = 'active' and id <> auth.uid();
  else
    recipients := coalesce(target_recipient_ids, '{}'::uuid[]);
  end if;
  if (select count(distinct id) from unnest(recipients) as selected(id)) < 2 then raise exception 'group_requires_two_recipients'; end if;
  if exists (select 1 from unnest(recipients) as selected(id) left join public.profiles p on p.id = selected.id
    where p.id is null or p.id = auth.uid() or p.role not in ('cataloger','administrator') or p.status <> 'active') then
    raise exception 'active_staff_recipient_required';
  end if;
  select full_name into sender_name from public.profiles where id = auth.uid();
  insert into public.staff_message_groups(created_by) values(auth.uid()) returning id into new_group_id;
  insert into public.staff_message_group_members(group_id,user_id) values(new_group_id,auth.uid());
  insert into public.staff_message_group_members(group_id,user_id)
    select new_group_id,id from (select distinct id from unnest(recipients) as selected(id)) recipients;
  insert into public.staff_group_messages(group_id,sender_id,request_id,body)
    values(new_group_id,auth.uid(),linked_request_id,btrim(message_body)) returning id into new_message_id;
  for recipient in select distinct id from unnest(recipients) as selected(id) loop
    insert into public.staff_notifications(recipient_id,request_id,source_key,kind,title,message,href)
      values(recipient,linked_request_id,'group-message:' || new_message_id || ':' || recipient,'staff_message',
        'Mensagem em grupo de ' || sender_name,'Abra a central de mensagens para ler.','/painel/fila');
  end loop;
  return new_group_id;
end $$;

create function public.send_staff_group_message(target_group_id uuid, message_body text, target_protocol text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  linked_request_id uuid;
  clean_protocol text := nullif(upper(btrim(target_protocol)), '');
  new_message_id uuid;
  sender_name text;
  recipient uuid;
begin
  if not public.is_staff_message_group_member(target_group_id) then raise exception 'group_membership_required'; end if;
  if char_length(btrim(coalesce(message_body,''))) not between 1 and 2000 then raise exception 'valid_message_required'; end if;
  if clean_protocol is not null then
    select id into linked_request_id from public.cataloging_requests where upper(protocol) = clean_protocol;
    if linked_request_id is null then raise exception 'protocol_not_found'; end if;
  end if;
  select full_name into sender_name from public.profiles where id = auth.uid();
  insert into public.staff_group_messages(group_id,sender_id,request_id,body)
    values(target_group_id,auth.uid(),linked_request_id,btrim(message_body)) returning id into new_message_id;
  for recipient in select m.user_id from public.staff_message_group_members m join public.profiles p on p.id = m.user_id
    where m.group_id = target_group_id and m.user_id <> auth.uid() and p.role in ('cataloger','administrator') and p.status = 'active' loop
    insert into public.staff_notifications(recipient_id,request_id,source_key,kind,title,message,href)
      values(recipient,linked_request_id,'group-message:' || new_message_id || ':' || recipient,'staff_message',
        'Mensagem em grupo de ' || sender_name,'Abra a central de mensagens para ler.','/painel/fila');
  end loop;
  return new_message_id;
end $$;

revoke all on function public.create_staff_message_group(uuid[],text,text,boolean), public.send_staff_group_message(uuid,text,text) from public, anon, authenticated;
grant execute on function public.create_staff_message_group(uuid[],text,text,boolean), public.send_staff_group_message(uuid,text,text) to authenticated;
alter publication supabase_realtime add table public.staff_group_messages;
select cron.schedule('pronto-staff-group-messages-purge', '5 3 * * *',
  $$delete from public.staff_message_groups g where g.created_at < now() - interval '90 days' and not exists
    (select 1 from public.staff_group_messages m where m.group_id = g.id and m.created_at >= now() - interval '90 days');
    delete from public.staff_group_messages where created_at < now() - interval '90 days'$$);
