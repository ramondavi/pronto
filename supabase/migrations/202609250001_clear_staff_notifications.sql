-- Limpeza em lote preserva os avisos no histórico até a retenção de 90 dias.
create or replace function public.clear_all_staff_notifications()
returns void language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(public.current_user_role() in ('cataloger','administrator'), false) is not true then
    raise exception 'active_staff_required';
  end if;
  update public.staff_notifications
    set read_at = coalesce(read_at, now()), archived_at = coalesce(archived_at, now())
    where recipient_id = auth.uid() and archived_at is null and created_at >= now() - interval '90 days';
end $$;

revoke all on function public.clear_all_staff_notifications() from public, anon, authenticated;
grant execute on function public.clear_all_staff_notifications() to authenticated;
