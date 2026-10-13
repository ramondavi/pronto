-- Permite que a política RLS de leitura própria seja efetivamente aplicada.
grant select on table public.privacy_notice_acknowledgements to authenticated;
