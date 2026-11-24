-- Reorganiza os capítulos publicados por tarefa, sem alterar textos, URLs ou datas de publicação.
alter table public.staff_guide_pages
  drop constraint if exists staff_guide_pages_section_check;
alter table public.staff_guide_pages
  add constraint staff_guide_pages_section_check check (section in (
    'comece-aqui','atendimento','fila','analise','catalogacao','assuntos','administracao',
    'conteudo','controle','casos','casos-atendimento','casos-gestao'
  ));

create or replace function public.admin_save_staff_guide_page(
  page_id uuid, page_slug text, page_section text, page_audience text,
  page_position integer, page_title text, page_summary text, page_html text, page_screens text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare result uuid;
begin
  if not public.has_permission('admin.guide.manage') then raise exception 'permission_denied'; end if;
  if page_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    or page_section not in ('comece-aqui','fila','analise','catalogacao','assuntos','administracao','conteudo','controle','casos-atendimento','casos-gestao')
    or page_audience not in ('team','administrator')
    or page_position not between 0 and 9999
    or char_length(btrim(page_title)) not between 1 and 300
    or char_length(coalesce(page_summary,'')) > 1000
    or char_length(coalesce(page_html,'')) > 100000
    or char_length(coalesce(page_screens,'')) > 500 then
    raise exception 'invalid_staff_guide_page';
  end if;
  if page_id is null then
    insert into public.staff_guide_pages(slug,section,audience,position,draft_title,draft_summary,draft_html,draft_screens,updated_by)
    values(page_slug,page_section,page_audience,page_position,btrim(page_title),coalesce(page_summary,''),coalesce(page_html,'<p></p>'),btrim(coalesce(page_screens,'')),auth.uid()) returning id into result;
  else
    update public.staff_guide_pages set slug=page_slug,section=page_section,audience=page_audience,
      position=page_position,draft_title=btrim(page_title),draft_summary=coalesce(page_summary,''),
      draft_html=coalesce(page_html,'<p></p>'),draft_screens=btrim(coalesce(page_screens,'')),updated_at=now(),updated_by=auth.uid()
    where id=page_id returning id into result;
    if result is null then raise exception 'staff_guide_page_not_found'; end if;
  end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
    values(auth.uid(),'staff_guide_saved','staff_guide_page',result::text,jsonb_build_object('slug',page_slug));
  return result;
end $$;
revoke all on function public.admin_save_staff_guide_page(uuid,text,text,text,integer,text,text,text,text) from public, anon;
grant execute on function public.admin_save_staff_guide_page(uuid,text,text,text,integer,text,text,text,text) to authenticated;

-- A posição é editorial. Rascunhos com alterações próprias de seção ou posição são preservados.
with destination(published_slug, section, position) as (values
  ('conheca-o-pronto','comece-aqui',10),
  ('usar-visao-geral-equipe','comece-aqui',20),
  ('ajustar-minha-conta-equipe','comece-aqui',30),
  ('ver-como-estudante','comece-aqui',40),
  ('entender-estados-atendimento','fila',10),
  ('localizar-atendimento','fila',20),
  ('filtrar-ordenar-fila','fila',30),
  ('assumir-atendimento','fila',40),
  ('devolver-atendimento-fila','fila',50),
  ('atribuir-reatribuir-atendimento','fila',60),
  ('definir-prioridade-atendimento','fila',70),
  ('consultar-historico-atendimento','fila',80),
  ('conferir-declaracoes-acesso-trabalho','analise',10),
  ('conferir-corrigir-metadados','analise',20),
  ('solicitar-conferir-correcao','analise',30),
  ('conferir-pessoas-ficha','catalogacao',10),
  ('informar-cdu-cutter-descricao','catalogacao',20),
  ('revisar-homologar-ficha','catalogacao',30),
  ('conferir-nada-consta','catalogacao',40),
  ('registrar-publicacao-encerrar-protocolo','catalogacao',50),
  ('entender-assuntos-autoridades','assuntos',10),
  ('consultar-autoridade-assunto','assuntos',20),
  ('escolher-assuntos-controlados','assuntos',30),
  ('cadastrar-assunto-manualmente','assuntos',40),
  ('conferir-importar-autoridade','assuntos',50),
  ('corrigir-assunto-existente','assuntos',60),
  ('alterar-situacao-assunto','assuntos',70),
  ('mesclar-assuntos-duplicados','assuntos',80),
  ('excluir-assunto-sem-uso','assuntos',90),
  ('publicar-autoridade-catalogo','assuntos',100),
  ('organizar-temas-por-area','assuntos',110),
  ('localizar-bairro-no-mapa','assuntos',120),
  ('revisar-lugar-autoridade','assuntos',130),
  ('provisionar-conta-equipe','administracao',10),
  ('alterar-situacao-perfil-conta','administracao',20),
  ('conferir-ajustar-permissoes','administracao',30),
  ('configurar-programa-sla-ri','administracao',40),
  ('registrar-horario-dia','administracao',50),
  ('publicar-ocorrencia-mural','administracao',60),
  ('retirar-aviso-mural','administracao',70),
  ('criar-revisar-modelo-resposta','conteudo',10),
  ('manter-ajuda-faq-respostas','conteudo',20),
  ('criar-publicar-capitulo','conteudo',30),
  ('cadastrar-revisar-cdu-catalogo','controle',10),
  ('consultar-indicadores-atendimento','controle',20),
  ('acompanhar-deposito-pendente','controle',30),
  ('conferir-retencao-arquivos','controle',40),
  ('conferir-backup-restauro','controle',50),
  ('consultar-auditoria','controle',60),
  ('caso-solicitacao-sem-responsavel','casos-atendimento',10),
  ('caso-correcao-reenviada','casos-atendimento',20),
  ('caso-link-trabalho-inacessivel','casos-atendimento',30),
  ('caso-dados-mudaram-apos-referencia','casos-atendimento',40),
  ('caso-homologacao-bloqueada','casos-atendimento',50),
  ('caso-nada-consta-devolvido','casos-atendimento',60),
  ('caso-ficha-homologada-nao-liberada','casos-atendimento',70),
  ('caso-trocar-responsavel-atendimento','casos-atendimento',80),
  ('caso-autodeposito-sem-publicacao','casos-atendimento',90),
  ('caso-assunto-ausente-inativo-duplicado','casos-gestao',10),
  ('caso-importacao-autoridade-ambigua','casos-gestao',20),
  ('caso-acesso-equipe-bloqueado','casos-gestao',30)
)
update public.staff_guide_pages as page
set section = case when page.section = page.published_section then destination.section else page.section end,
    position = case when page.position = page.published_position then destination.position else page.position end,
    published_section = destination.section,
    published_position = destination.position
from destination
where page.published_slug = destination.published_slug and page.published_at is not null;
