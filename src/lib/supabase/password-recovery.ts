import type { SupabaseClient } from "@supabase/supabase-js";

export async function verifyPasswordRecovery(client: SupabaseClient, tokenHash: string) {
  // verifyOtp does not await initialization. Its recovery event can otherwise be
  // queued until after the response, leaving the browser without session cookies.
  await client.auth.initialize();
  return client.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
}
