-- Fechamento pontual da biblioteca que não é feriado, recesso ou paralisação.
alter type public.announcement_type add value if not exists 'closure';
