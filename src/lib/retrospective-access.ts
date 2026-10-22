import { createClient } from "@/lib/supabase/server";

/** A concessão é administrativa; o endereço de e-mail nunca concede acesso sozinho. */
export async function hasRetrospectiveAccess() {
  const { data, error } = await (await createClient()).rpc("has_retrospective_access");
  return !error && data === true;
}
