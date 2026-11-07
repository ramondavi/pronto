-- A página inicial pode destacar até seis perguntas administráveis.
alter table public.knowledge_base_entries drop constraint knowledge_base_entries_featured_position_check;
alter table public.knowledge_base_entries add constraint knowledge_base_entries_featured_position_check check (featured_position between 1 and 6);

-- admin_save_knowledge_base_entry: admin.knowledge.manage
create or replace function public.admin_save_knowledge_base_entry(
  entry_id uuid, entry_slug text, entry_kind text, entry_title text, entry_summary text,
  entry_body_html text, entry_category text, entry_audiences text[], entry_active boolean,
  entry_position integer, entry_featured_position integer
) returns uuid language plpgsql security definer set search_path = '' as $$
declare result uuid; clean_slug text := nullif(btrim(entry_slug), '');
begin
  if not public.has_permission('admin.knowledge.manage') then
    if not public.has_permission('admin.faq.manage') or entry_kind <> 'faq'
      or (entry_id is not null and not exists (select 1 from public.knowledge_base_entries where id=entry_id and kind='faq')) then
      raise exception 'permission_denied';
    end if;
  end if;
  if entry_kind not in ('faq', 'answer', 'article')
    or char_length(btrim(coalesce(entry_title, ''))) not between 5 and 300
    or char_length(btrim(coalesce(entry_summary, ''))) not between 5 and 1000
    or char_length(coalesce(entry_body_html, '')) > 50000
    or entry_category not in ('Geral', 'Solicitação', 'Análise', 'Ficha', 'Autodepósito', 'Atendimento', 'Administração')
    or coalesce(cardinality(entry_audiences), 0) = 0
    or not (entry_audiences <@ array['public','student','cataloger','administrator','panel']::text[])
    or entry_position not between 0 and 9999
    or (entry_kind = 'article' and (clean_slug is null or clean_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'))
    or (entry_kind <> 'article' and clean_slug is not null)
    or (entry_featured_position is not null and (entry_kind <> 'faq' or 'public' <> all(entry_audiences) or entry_featured_position not between 1 and 6))
  then raise exception 'invalid_knowledge_base_entry'; end if;
  if entry_featured_position is not null then
    update public.knowledge_base_entries set featured_position = null where featured_position = entry_featured_position and id is distinct from entry_id;
  end if;
  if entry_id is null then
    insert into public.knowledge_base_entries(slug,kind,title,summary,body_html,category,audiences,active,position,featured_position,published_at,created_by,updated_by)
    values(clean_slug,entry_kind,btrim(entry_title),btrim(entry_summary),coalesce(entry_body_html,''),entry_category,entry_audiences,entry_active,entry_position,entry_featured_position,case when entry_active then now() end,auth.uid(),auth.uid())
    returning id into result;
  else
    update public.knowledge_base_entries
    set slug=clean_slug,kind=entry_kind,title=btrim(entry_title),summary=btrim(entry_summary),body_html=coalesce(entry_body_html,''),category=entry_category,
        audiences=entry_audiences,active=entry_active,position=entry_position,featured_position=entry_featured_position,
        published_at=case when entry_active then coalesce(published_at, now()) else null end,updated_at=now(),updated_by=auth.uid()
    where id=entry_id returning id into result;
  end if;
  if result is null then raise exception 'knowledge_base_entry_not_found'; end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
  values(auth.uid(),'knowledge_base_entry_saved','knowledge_base_entry',result::text,jsonb_build_object('kind',entry_kind,'audiences',entry_audiences,'active',entry_active));
  return result;
end $$;

-- Novas perguntas públicas, editáveis na mesma aba Ajuda e FAQ.
insert into public.knowledge_base_entries(kind,title,summary,body_html,category,audiences,active,position,featured_position,published_at)
select 'faq', seed.title, seed.answer, '<p>' || seed.answer || '</p>', seed.category,
  array['public','student','cataloger','administrator','panel'], true, seed.position, seed.featured_position, now()
from (values
  ('Onde acompanho minha solicitação?', 'No seu painel, você acompanha o andamento do pedido, lê as orientações da biblioteca e vê se precisa fazer algo.', 'Atendimento', 40, 4),
  ('Posso corrigir os dados depois de enviar?', 'Se a biblioteca devolver a solicitação para correção, você pode ajustar os campos liberados no painel e enviar novamente.', 'Análise', 50, 5),
  ('Como faço o autodepósito?', 'Após a liberação da ficha, confira no painel as orientações para seu curso e siga as etapas no Repositório Institucional da UFBA.', 'Autodepósito', 60, 6)
) as seed(title,answer,category,position,featured_position)
where not exists (select 1 from public.knowledge_base_entries existing where existing.kind = 'faq' and existing.title = seed.title);

update public.knowledge_base_entries set translations = '{"en":{"title":"Where can I track my request?","summary":"In your dashboard, you can follow its progress, read the library''s guidance, and see whether you need to take action.","body_html":"<p>In your dashboard, you can follow its progress, read the library''s guidance, and see whether you need to take action.</p>"},"es":{"title":"¿Dónde sigo mi solicitud?","summary":"En tu panel puedes seguir el progreso, leer las orientaciones de la biblioteca y ver si necesitas realizar alguna acción.","body_html":"<p>En tu panel puedes seguir el progreso, leer las orientaciones de la biblioteca y ver si necesitas realizar alguna acción.</p>"},"de":{"title":"Wo kann ich meinen Antrag verfolgen?","summary":"Im Dashboard sehen Sie den Bearbeitungsstand, Hinweise der Bibliothek und ob Sie etwas unternehmen müssen.","body_html":"<p>Im Dashboard sehen Sie den Bearbeitungsstand, Hinweise der Bibliothek und ob Sie etwas unternehmen müssen.</p>"},"fr":{"title":"Où suivre ma demande ?","summary":"Dans votre espace, vous pouvez suivre son avancement, lire les consignes de la bibliothèque et voir si une action est nécessaire.","body_html":"<p>Dans votre espace, vous pouvez suivre son avancement, lire les consignes de la bibliothèque et voir si une action est nécessaire.</p>"},"it":{"title":"Dove posso seguire la mia richiesta?","summary":"Nel pannello puoi seguirne l''avanzamento, leggere le indicazioni della biblioteca e vedere se devi intervenire.","body_html":"<p>Nel pannello puoi seguirne l''avanzamento, leggere le indicazioni della biblioteca e vedere se devi intervenire.</p>"}}'::jsonb where kind = 'faq' and title = 'Onde acompanho minha solicitação?' and featured_position = 4;

update public.knowledge_base_entries set translations = '{"en":{"title":"Can I correct information after submitting?","summary":"If the library returns your request for corrections, you can edit the available fields in your dashboard and submit it again.","body_html":"<p>If the library returns your request for corrections, you can edit the available fields in your dashboard and submit it again.</p>"},"es":{"title":"¿Puedo corregir los datos después de enviarlos?","summary":"Si la biblioteca devuelve la solicitud para corregirla, puedes modificar los campos habilitados en el panel y volver a enviarla.","body_html":"<p>Si la biblioteca devuelve la solicitud para corregirla, puedes modificar los campos habilitados en el panel y volver a enviarla.</p>"},"de":{"title":"Kann ich Angaben nach dem Absenden korrigieren?","summary":"Wenn die Bibliothek den Antrag zur Korrektur zurückgibt, können Sie die freigegebenen Felder im Dashboard anpassen und erneut absenden.","body_html":"<p>Wenn die Bibliothek den Antrag zur Korrektur zurückgibt, können Sie die freigegebenen Felder im Dashboard anpassen und erneut absenden.</p>"},"fr":{"title":"Puis-je corriger les données après l’envoi ?","summary":"Si la bibliothèque renvoie votre demande pour correction, vous pouvez modifier les champs autorisés dans votre espace et l’envoyer à nouveau.","body_html":"<p>Si la bibliothèque renvoie votre demande pour correction, vous pouvez modifier les champs autorisés dans votre espace et l’envoyer à nouveau.</p>"},"it":{"title":"Posso correggere i dati dopo l’invio?","summary":"Se la biblioteca restituisce la richiesta per correzioni, puoi modificare i campi abilitati nel pannello e inviarla di nuovo.","body_html":"<p>Se la biblioteca restituisce la richiesta per correzioni, puoi modificare i campi abilitati nel pannello e inviarla di nuovo.</p>"}}'::jsonb where kind = 'faq' and title = 'Posso corrigir os dados depois de enviar?' and featured_position = 5;

update public.knowledge_base_entries set translations = '{"en":{"title":"How do I complete self-deposit?","summary":"After your catalog record is released, check the guidance for your course in your dashboard and follow the steps in UFBA''s Institutional Repository.","body_html":"<p>After your catalog record is released, check the guidance for your course in your dashboard and follow the steps in UFBA''s Institutional Repository.</p>"},"es":{"title":"¿Cómo hago el autodepósito?","summary":"Después de la liberación de la ficha, consulta en el panel las orientaciones para tu curso y sigue los pasos en el Repositorio Institucional de la UFBA.","body_html":"<p>Después de la liberación de la ficha, consulta en el panel las orientaciones para tu curso y sigue los pasos en el Repositorio Institucional de la UFBA.</p>"},"de":{"title":"Wie funktioniert die Selbsteinreichung?","summary":"Nach Freigabe des Katalogeintrags finden Sie im Dashboard die Hinweise für Ihren Studiengang und folgen den Schritten im institutionellen Repositorium der UFBA.","body_html":"<p>Nach Freigabe des Katalogeintrags finden Sie im Dashboard die Hinweise für Ihren Studiengang und folgen den Schritten im institutionellen Repositorium der UFBA.</p>"},"fr":{"title":"Comment effectuer l’auto-dépôt ?","summary":"Après la mise à disposition de la notice, consultez les consignes pour votre formation dans votre espace et suivez les étapes du dépôt institutionnel de l’UFBA.","body_html":"<p>Après la mise à disposition de la notice, consultez les consignes pour votre formation dans votre espace et suivez les étapes du dépôt institutionnel de l’UFBA.</p>"},"it":{"title":"Come faccio l’autodeposito?","summary":"Dopo il rilascio della scheda, consulta nel pannello le indicazioni per il tuo corso e segui i passaggi nel Repositorio istituzionale dell’UFBA.","body_html":"<p>Dopo il rilascio della scheda, consulta nel pannello le indicazioni per il tuo corso e segui i passaggi nel Repositorio istituzionale dell’UFBA.</p>"}}'::jsonb where kind = 'faq' and title = 'Como faço o autodepósito?' and featured_position = 6;
