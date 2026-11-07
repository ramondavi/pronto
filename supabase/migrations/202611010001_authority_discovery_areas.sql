-- Editorial discovery paths; these do not classify or change authority records.
create table public.authority_discovery_areas (
 id uuid primary key default gen_random_uuid(),
 area_key text not null unique check (char_length(area_key) between 2 and 80),
 search_query text not null check (char_length(btrim(search_query)) between 2 and 250),
 names jsonb not null,
 details jsonb not null,
 position integer not null default 0 check (position >= 0),
 updated_at timestamptz not null default now(),
 constraint authority_discovery_areas_languages check (
  jsonb_typeof(names) = 'object' and jsonb_typeof(details) = 'object'
  and names ?& array['pt','en','es','de','fr','it']
  and details ?& array['pt','en','es','de','fr','it']
  and least(char_length(btrim(names->>'pt')),char_length(btrim(names->>'en')),char_length(btrim(names->>'es')),char_length(btrim(names->>'de')),char_length(btrim(names->>'fr')),char_length(btrim(names->>'it'))) >= 2
  and greatest(char_length(names->>'pt'),char_length(names->>'en'),char_length(names->>'es'),char_length(names->>'de'),char_length(names->>'fr'),char_length(names->>'it')) <= 100
  and least(char_length(btrim(details->>'pt')),char_length(btrim(details->>'en')),char_length(btrim(details->>'es')),char_length(btrim(details->>'de')),char_length(btrim(details->>'fr')),char_length(btrim(details->>'it'))) >= 2
  and greatest(char_length(details->>'pt'),char_length(details->>'en'),char_length(details->>'es'),char_length(details->>'de'),char_length(details->>'fr'),char_length(details->>'it')) <= 240
 )
);
alter table public.authority_discovery_areas enable row level security;
revoke all on public.authority_discovery_areas from public, anon, authenticated;
grant select on public.authority_discovery_areas to anon, authenticated;
grant insert, update, delete on public.authority_discovery_areas to authenticated;
create policy authority_discovery_areas_public_read on public.authority_discovery_areas for select to anon, authenticated using (true);
create policy authority_discovery_areas_staff_insert on public.authority_discovery_areas for insert to authenticated with check (public.has_permission('admin.subjects.manage'));
create policy authority_discovery_areas_staff_update on public.authority_discovery_areas for update to authenticated using (public.has_permission('admin.subjects.manage')) with check (public.has_permission('admin.subjects.manage'));
create policy authority_discovery_areas_staff_delete on public.authority_discovery_areas for delete to authenticated using (public.has_permission('admin.subjects.manage'));

create function public.audit_authority_discovery_area() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
 values (auth.uid(),case tg_op when 'INSERT' then 'authority_area_created' when 'UPDATE' then 'authority_area_updated' else 'authority_area_deleted' end,
 'authority_discovery_area',(case when tg_op = 'DELETE' then old.id else new.id end)::text,
 jsonb_build_object('key',case when tg_op = 'DELETE' then old.area_key else new.area_key end));
 if tg_op = 'DELETE' then return old; end if;
 return new;
end;
$$;
create trigger authority_discovery_area_audit after insert or update or delete on public.authority_discovery_areas for each row execute function public.audit_authority_discovery_area();

insert into public.authority_discovery_areas(area_key,search_query,names,details,position) values
('habitar','habitação OR moradia OR housing','{"pt":"Habitar","en":"Housing","es":"Habitar","de":"Wohnen","fr":"Habiter","it":"Abitare"}','{"pt":"Habitação, moradia e modos de viver","en":"Housing and ways of living","es":"Vivienda y formas de habitar","de":"Wohnen und Lebensweisen","fr":"Habitat et modes de vie","it":"Abitazione e modi di vivere"}',0),
('cidade','urbanismo OR cidade OR city','{"pt":"Cidade","en":"City","es":"Ciudad","de":"Stadt","fr":"Ville","it":"Città"}','{"pt":"Urbanismo, espaço público e planejamento","en":"Urbanism, public space, and planning","es":"Urbanismo, espacio público y planificación","de":"Städtebau, öffentlicher Raum und Planung","fr":"Urbanisme, espace public et planification","it":"Urbanistica, spazio pubblico e pianificazione"}',1),
('patrimonio','patrimônio OR conservação OR heritage','{"pt":"Patrimônio","en":"Heritage","es":"Patrimonio","de":"Kulturerbe","fr":"Patrimoine","it":"Patrimonio"}','{"pt":"Memória, conservação e restauro","en":"Memory, conservation, and restoration","es":"Memoria, conservación y restauración","de":"Erinnerung, Erhaltung und Restaurierung","fr":"Mémoire, conservation et restauration","it":"Memoria, conservazione e restauro"}',2),
('paisagem','paisagem OR ambiente OR landscape','{"pt":"Paisagem","en":"Landscape","es":"Paisaje","de":"Landschaft","fr":"Paysage","it":"Paesaggio"}','{"pt":"Natureza, território e ambiente","en":"Nature, territory, and environment","es":"Naturaleza, territorio y ambiente","de":"Natur, Territorium und Umwelt","fr":"Nature, territoire et environnement","it":"Natura, territorio e ambiente"}',3),
('projeto','projeto OR construção OR design','{"pt":"Projeto","en":"Design","es":"Proyecto","de":"Entwurf","fr":"Projet","it":"Progetto"}','{"pt":"Processos, técnicas e materiais","en":"Processes, techniques, and materials","es":"Procesos, técnicas y materiales","de":"Prozesse, Techniken und Materialien","fr":"Processus, techniques et matériaux","it":"Processi, tecniche e materiali"}',4);
