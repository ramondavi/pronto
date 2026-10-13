-- Require a resource path, not only an HTTPS provider home page.
-- Check new links without blocking unrelated updates to older requests.
create function public.require_public_work_resource_path()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.public_work_url !~* '^https://[a-z0-9-]+([.][a-z0-9-]+)+/[^/?#[:space:]]+([/?#][^[:space:]]*)?$' then
    raise exception 'public_https_url_required';
  end if;
  return new;
end;
$$;

create trigger cataloging_requests_require_public_work_resource_path
before insert or update of public_work_url on public.cataloging_requests
for each row execute function public.require_public_work_resource_path();
