import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const form = readFileSync("src/components/password-recovery-form.tsx", "utf8");
const actions = readFileSync("src/app/auth-actions.ts", "utf8");
const callback = readFileSync("src/app/auth/callback/route.ts", "utf8");
const confirm = readFileSync("src/app/auth/confirm/route.ts", "utf8");
const config = readFileSync("supabase/config.toml", "utf8");

test("password recovery starts and completes PKCE on the server", () => {
  assert.match(form, /action=\{requestPasswordReset\}/);
  assert.match(actions, /export async function requestPasswordReset/);
  assert.match(actions, /resetPasswordForEmail\(email/);
  assert.match(actions, /\/auth\/confirm/);
  assert.match(confirm, /\/confirmar-recuperacao/);
  assert.match(confirm, /token_hash/);
  assert.match(callback, /exchangeCodeForSession\(code\)/);
});

test("local Auth accepts both supported development origins", () => {
  assert.match(config, /site_url = "http:\/\/127\.0\.0\.1:3100"/);
  assert.match(config, /"http:\/\/localhost:3100\/\*\*"/);
  assert.match(config, /"http:\/\/127\.0\.0\.1:3100\/\*\*"/);
});
