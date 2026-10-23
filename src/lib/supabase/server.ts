import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createPasswordRecoveryClient } from "./password-recovery";

type CookieToSet = {
  name: string;
  value: string;
  options: CookieOptions;
};

export async function createClient() {
  return createAuthClient(false);
}

export async function createRecoveryClient() {
  return createAuthClient(true);
}

async function createAuthClient(recovery: boolean) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase server environment variables are not configured.");

  const cookieStore = await cookies();
  const cookieMethods = {
    getAll: () => cookieStore.getAll(),
    setAll: (cookiesToSet: CookieToSet[]) => {
      try {
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
      } catch {
        // Server Components cannot set cookies; recovery cookies expire before token refresh.
      }
    },
  };
  return recovery
    ? createPasswordRecoveryClient(url, key, cookieMethods, { secure: process.env.NODE_ENV === "production" })
    : createServerClient(url, key, { cookies: cookieMethods });
}
