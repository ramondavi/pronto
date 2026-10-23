import assert from "node:assert/strict";
import test from "node:test";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { verifyPasswordRecovery } from "../src/lib/supabase/password-recovery.ts";

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
    const client = createServerClient(url, key, {
      global: { fetch: authFetch },
      cookies: {
        getAll: async () => {
          await new Promise<void>((resolve) => setImmediate(resolve));
          initialized = true;
          return [];
        },
        setAll: (updates: StoredCookie[]) => { storedCookies.push(...updates); },
      },
    });
    const { data, error } = await verifyPasswordRecovery(client, "test-recovery-code");
    assert.equal(error, null);
    assert.ok(data.session);
    assert.ok(storedCookies.length >= (metadataSize ? 2 : 1), "session cookies must exist before redirect");
    const nextRequestClient = createServerClient(url, key, {
      global: { fetch: authFetch },
      cookies: { getAll: () => storedCookies, setAll: () => {} },
    });
    const next = await nextRequestClient.auth.getUser();
    assert.equal(next.error, null);
    assert.equal(next.data.user?.id, session.user.id);
    assert.equal(verifications, 1);
  }
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
