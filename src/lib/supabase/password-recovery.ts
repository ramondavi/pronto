import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerClient, type CookieMethodsServer, type CookieOptions } from "@supabase/ssr";

// Recovery credentials must never share the application's login storage.
export function createPasswordRecoveryClient(url: string, key: string, cookies: CookieMethodsServer, options: { secure?: boolean; fetch?: typeof fetch } = {}) {
  const setAll = cookies.setAll;
  if (!setAll) throw new Error("Recovery cookie persistence is required.");
  return createServerClient(url, key, {
    cookieOptions: { name: "pronto-password-recovery", httpOnly: true, sameSite: "lax", path: "/", maxAge: 900, secure: options.secure ?? true },
    cookies: {
      getAll: cookies.getAll,
      // ssr 0.6 overrides maxAge; impose the short lifetime at the adapter.
      setAll: (updates: { name: string; value: string; options: CookieOptions }[]) => setAll(updates.map((cookie) => ({ ...cookie, options: { ...cookie.options, maxAge: cookie.options.maxAge === 0 ? 0 : 900 } }))),
    },
    global: options.fetch ? { fetch: options.fetch } : undefined,
  });
}

export async function verifyPasswordRecovery(client: SupabaseClient, tokenHash: string) {
  // verifyOtp does not await initialization. Its recovery event can otherwise be
  // queued until after the response, leaving the browser without session cookies.
  await client.auth.initialize();
  return client.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
}
