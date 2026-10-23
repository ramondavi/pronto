import assert from "node:assert/strict";
import test from "node:test";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createPasswordRecoveryClient, verifyPasswordRecovery } from "../src/lib/supabase/password-recovery.ts";

const url = "https://auth.example.invalid";
const key = "public-test-key";
type StoredCookie = { name: string; value: string; options: CookieOptions };

function sessionResponse(metadataSize = 0) {
  const user = { id: "00000000-0000-4000-8000-000000000001", aud: "authenticated", email: "test@example.invalid", user_metadata: { fixture: "x".repeat(metadataSize) } };
  const claims = { sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600, aud: "authenticated" };
  const accessToken = ["eyJhbGciOiJIUzI1NiJ9", Buffer.from(JSON.stringify(claims)).toString("base64url"), "test-signature"].join(".");
  return { user, access_token: accessToken, refresh_token: "local-test-refresh", token_type: "bearer", expires_in: 3600 };
}

test("recovery waits for initialization and writes usable session cookies before returning", async () => {
  for (const metadataSize of [0, 12000]) {
    const session = sessionResponse(metadataSize);
    let verifications = 0;
    let initialized = false;
    const storedCookies: StoredCookie[] = [];
    const authFetch: typeof fetch = async (input, init) => {
      const endpoint = new URL(String(input));
      if (endpoint.pathname === "/auth/v1/verify") {
        assert.ok(initialized, "verification must not race the initial cookie read");
        verifications++;
        assert.deepEqual(JSON.parse(String(init?.body)), { token_hash: "test-recovery-code", type: "recovery", gotrue_meta_security: {} });
        return Response.json(session);
      }
      assert.equal(endpoint.pathname, "/auth/v1/user");
      assert.equal(new Headers(init?.headers).get("authorization"), "Bearer " + session.access_token);
      return Response.json(session.user);
    };
    const client = createPasswordRecoveryClient(url, key, {
        getAll: async () => {
          await new Promise<void>((resolve) => setImmediate(resolve));
          initialized = true;
          return [];
        },
        setAll: (updates: StoredCookie[]) => { storedCookies.push(...updates); },
    }, { fetch: authFetch });
    const { data, error } = await verifyPasswordRecovery(client, "test-recovery-code");
    assert.equal(error, null);
    assert.ok(data.session);
    assert.ok(storedCookies.length >= (metadataSize ? 2 : 1), "session cookies must exist before redirect");
    for (const cookie of storedCookies) {
      assert.match(cookie.name, /^pronto-password-recovery(?:\.\d+)?$/);
      assert.equal(cookie.options.httpOnly, true);
      assert.equal(cookie.options.secure, true);
      assert.equal(cookie.options.maxAge, 900);
    }
    const nextRequestClient = createPasswordRecoveryClient(url, key, { getAll: () => storedCookies, setAll: () => {} }, { fetch: authFetch });
    const next = await nextRequestClient.auth.getUser();
    assert.equal(next.error, null);
    assert.equal(next.data.user?.id, session.user.id);
    const appClient = createServerClient(url, key, {
      global: { fetch: authFetch },
      cookies: { getAll: () => storedCookies, setAll: () => {} },
    });
    const appUser = await appClient.auth.getUser();
    assert.equal(appUser.data.user, null, "abandoning password recovery must not log in to the application");
    assert.equal(verifications, 1);
  }
});

test("legacy recovery and completion do not replace an existing app login; sign-out clears only recovery", async () => {
  const session = sessionResponse();
  const jar = new Map<string, StoredCookie>();
  const cookieMethods = {
    getAll: () => [...jar.values()],
    setAll: (updates: StoredCookie[]) => {
      for (const cookie of updates) {
        if (cookie.options.maxAge === 0) jar.delete(cookie.name);
        else jar.set(cookie.name, cookie);
      }
    },
  };
  const authFetch: typeof fetch = async (input, init) => {
    const endpoint = new URL(String(input));
    if (endpoint.pathname === "/auth/v1/logout") {
      assert.equal(endpoint.searchParams.get("scope"), "local");
      return new Response(null, { status: 204 });
    }
    assert.equal(endpoint.pathname, "/auth/v1/user");
    if (init?.method === "PUT") assert.equal(JSON.parse(String(init.body)).password, "Synthetic-only-password!2");
    return Response.json(session.user);
  };
  const appClient = createServerClient(url, key, { cookies: cookieMethods, global: { fetch: authFetch } });
  await appClient.auth.setSession(session);
  const appCookies = [...jar.entries()].map(([name, cookie]) => [name, cookie.value]);
  assert.ok(appCookies.length);
  const recovery = createPasswordRecoveryClient(url, key, cookieMethods, { fetch: authFetch });
  await recovery.auth.initialize();
  assert.equal((await recovery.auth.getUser()).data.user, null, "an ordinary login alone must not authorize password reset");
  const restored = await recovery.auth.setSession(session);
  assert.equal(restored.error, null);
  assert.ok(jar.has("pronto-password-recovery"));
  const update = await recovery.auth.updateUser({ password: "Synthetic-only-password!2" });
  assert.equal(update.error, null);
  await recovery.auth.signOut({ scope: "local" });
  assert.deepEqual([...jar.entries()].map(([name, cookie]) => [name, cookie.value]), appCookies);
  const after = createPasswordRecoveryClient(url, key, cookieMethods, { fetch: authFetch });
  assert.equal((await after.auth.getUser()).data.user, null);
});

test("an expired or already-used code does not create a recovery session", async () => {
  const storedCookies: StoredCookie[] = [];
  const client = createServerClient(url, key, {
    global: { fetch: async () => Response.json({ code: "otp_expired", msg: "Fixture: expired code" }, { status: 403, headers: { "X-Supabase-Api-Version": "2024-01-01" } }) },
    cookies: { getAll: () => [], setAll: (updates: StoredCookie[]) => { storedCookies.push(...updates); } },
  });
  const { data, error } = await verifyPasswordRecovery(client, "used-test-code");
  assert.equal(error?.code, "otp_expired");
  assert.equal(data.session, null);
  assert.equal(storedCookies.length, 0);
});
