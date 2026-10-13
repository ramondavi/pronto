-- Calendário operacional: base federal e ocorrências manuais da biblioteca.
alter table public.library_announcements
  alter column created_by drop not null,
  add column if not exists calendar_source text not null default 'manual'
    check (calendar_source in ('manual','federal_mgi')),
  add column if not exists source_reference text;

create index if not exists library_announcements_calendar_date_idx
  on public.library_announcements (starts_at, ends_at) where active;

-- Portaria MGI nº 11.460, de 29/12/2025 (DOU de 30/12/2025).
-- Pontos facultativos parciais contam integralmente como indisponibilidade no SLA.
insert into public.library_announcements(type,title,message,starts_at,active,calendar_source,source_reference)
select v.type::public.announcement_type,v.title,v.message,(v.day::date + time '03:00')::timestamptz,true,
  'federal_mgi','Portaria MGI nº 11.460/2025'
from (values
 ('2026-01-01','holiday','Confraternização Universal','Feriado nacional.'),
 ('2026-02-16','optional_day','Carnaval','Ponto facultativo federal.'),
 ('2026-02-17','optional_day','Carnaval','Ponto facultativo federal.'),
 ('2026-02-18','optional_day','Quarta-Feira de Cinzas','Ponto facultativo federal até as 14h.'),
 ('2026-04-03','holiday','Paixão de Cristo','Feriado nacional.'),
 ('2026-04-20','optional_day','Ponto facultativo','Ponto facultativo federal.'),
 ('2026-04-21','holiday','Tiradentes','Feriado nacional.'),
 ('2026-05-01','holiday','Dia Mundial do Trabalho','Feriado nacional.'),
 ('2026-06-04','optional_day','Corpus Christi','Ponto facultativo federal.'),
 ('2026-06-05','optional_day','Ponto facultativo','Ponto facultativo federal.'),
 ('2026-09-07','holiday','Independência do Brasil','Feriado nacional.'),
 ('2026-10-12','holiday','Nossa Senhora Aparecida','Feriado nacional.'),
 ('2026-10-28','optional_day','Dia do Servidor Público federal','Ponto facultativo federal.'),
 ('2026-11-02','holiday','Finados','Feriado nacional.'),
 ('2026-11-15','holiday','Proclamação da República','Feriado nacional.'),
 ('2026-11-20','holiday','Dia Nacional de Zumbi e da Consciência Negra','Feriado nacional.'),
 ('2026-12-24','optional_day','Véspera de Natal','Ponto facultativo federal após as 13h.'),
 ('2026-12-25','holiday','Natal','Feriado nacional.'),
 ('2026-12-31','optional_day','Véspera de Ano Novo','Ponto facultativo federal após as 13h.')
) as v(day,type,title,message)
where not exists(select 1 from public.library_announcements a where a.calendar_source='federal_mgi' and a.starts_at::date=v.day::date);
