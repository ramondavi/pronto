-- Estudantes de contas antigas informam a data uma vez; correções cabem à administração.
create or replace function public.set_student_birth_date(target_birth_date date)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if target_birth_date is null or target_birth_date not between date '1900-01-01' and current_date then
    raise exception 'valid_birth_date_required';
  end if;

  update public.student_profiles sp set birth_date = target_birth_date, updated_at = now()
    where sp.profile_id = auth.uid() and sp.birth_date is null and exists (
      select 1 from public.profiles p where p.id = sp.profile_id and p.role = 'student' and p.status = 'active');
  if not found then raise exception 'birth_date_already_set_or_student_inactive'; end if;
end;
$$;

create function public.admin_correct_student_birth_date(target_profile_id uuid, target_birth_date date)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if public.current_user_role() is distinct from 'administrator'::public.user_role then
    raise exception 'active_administrator_required';
  end if;
  if target_birth_date is null or target_birth_date not between date '1900-01-01' and current_date then
    raise exception 'valid_birth_date_required';
  end if;

  update public.student_profiles sp set birth_date = target_birth_date, updated_at = now()
    where sp.profile_id = target_profile_id and sp.birth_date is distinct from target_birth_date
      and exists (select 1 from public.profiles p where p.id = sp.profile_id and p.role = 'student');
  if not found then raise exception 'student_not_found_or_birth_date_unchanged'; end if;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id)
    values (auth.uid(), 'student_birth_date_corrected', 'student_profile', target_profile_id::text);
end;
$$;

revoke all on function public.admin_correct_student_birth_date(uuid,date) from public, anon;
grant execute on function public.admin_correct_student_birth_date(uuid,date) to authenticated;
