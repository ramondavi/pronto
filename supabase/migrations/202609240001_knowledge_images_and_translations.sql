-- Imagens públicas de artigos, com escrita restrita a administradores ativos.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('knowledge-images', 'knowledge-images', true, 2097152, array['image/png','image/jpeg','image/webp','image/gif'])
on conflict (id) do nothing;

create policy knowledge_images_public_read on storage.objects for select to anon, authenticated
  using (bucket_id = 'knowledge-images');
create policy knowledge_images_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'knowledge-images' and public.current_user_role() = 'administrator');
create policy knowledge_images_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'knowledge-images' and public.current_user_role() = 'administrator');

-- Traduções editoriais mantêm título, resumo e corpo próprios por idioma.
alter table public.knowledge_base_entries add column translations jsonb not null default '{}'::jsonb
  check (jsonb_typeof(translations) = 'object');

create function public.admin_save_knowledge_base_entry_localized(
  entry_id uuid, entry_slug text, entry_kind text, entry_title text, entry_summary text,
  entry_body_html text, entry_category text, entry_audiences text[], entry_active boolean,
  entry_position integer, entry_featured_position integer, entry_translations jsonb
) returns uuid language plpgsql security definer set search_path = '' as $$
declare result uuid; locale text; content jsonb;
begin
  if public.current_user_role() is distinct from 'administrator' then raise exception 'active_administrator_required'; end if;
  if jsonb_typeof(entry_translations) is distinct from 'object' then raise exception 'invalid_translations'; end if;
  for locale, content in select key, value from jsonb_each(entry_translations) loop
    if locale not in ('en','es','de','fr','it') or jsonb_typeof(content) is distinct from 'object'
      or char_length(btrim(coalesce(content->>'title',''))) > 300
      or char_length(btrim(coalesce(content->>'summary',''))) > 1000
      or char_length(coalesce(content->>'body_html','')) > 50000
    then raise exception 'invalid_translation'; end if;
  end loop;
  result := public.admin_save_knowledge_base_entry(entry_id,entry_slug,entry_kind,entry_title,entry_summary,
    entry_body_html,entry_category,entry_audiences,entry_active,entry_position,entry_featured_position);
  update public.knowledge_base_entries set translations = entry_translations where id = result;
  return result;
end $$;
revoke all on function public.admin_save_knowledge_base_entry_localized(uuid,text,text,text,text,text,text,text[],boolean,integer,integer,jsonb) from public, anon;
grant execute on function public.admin_save_knowledge_base_entry_localized(uuid,text,text,text,text,text,text,text[],boolean,integer,integer,jsonb) to authenticated;
