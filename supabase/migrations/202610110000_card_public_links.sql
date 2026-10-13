-- Endereço público estável da ficha: o token não revela o protocolo nem a identidade do estudante.
alter table public.cataloging_card_homologations
  add column public_token uuid not null default gen_random_uuid();

create unique index cataloging_card_homologations_public_token_key
  on public.cataloging_card_homologations(public_token);

-- A consulta pública revela somente a disponibilidade e a URL já conferida no RI.
create function public.get_card_publication(link_token uuid)
returns table (permanent_url text)
language sql stable security definer
set search_path = ''
as $$
  select publication.permanent_url
  from public.cataloging_card_homologations as card
  left join public.repository_publications as publication on publication.request_id = card.request_id
  where card.public_token = link_token
  limit 1;
$$;

revoke all on function public.get_card_publication(uuid) from public;
grant execute on function public.get_card_publication(uuid) to anon, authenticated;
