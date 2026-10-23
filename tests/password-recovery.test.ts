import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const form = readFileSync("src/components/password-recovery-form.tsx", "utf8");
const actions = readFileSync("src/app/auth-actions.ts", "utf8");
const callback = readFileSync("src/app/auth/callback/route.ts", "utf8");
const confirm = readFileSync("src/app/auth/confirm/route.ts", "utf8");
const config = readFileSync("supabase/config.toml", "utf8");
const recoveryTemplate = readFileSync("supabase/templates/recovery.html", "utf8");

test("recovery email sends both links to the route that accepts token hashes", () => {
  const links = recoveryTemplate.match(/\{\{ \.SiteURL \}\}\/auth\/confirm\?token_hash=\{\{ \.TokenHash \}\}&amp;type=recovery/g);
  assert.equal(links?.length, 2, "button and fallback URL must use the token-hash confirmation route");
  assert.doesNotMatch(recoveryTemplate, /\{\{ \.RedirectTo \}\}\?token_hash=/);
  assert.match(confirm, /tokenHash && type === "recovery"/);
  assert.match(confirm, /\/confirmar-recuperacao/);
});

test("password recovery keeps the legacy return destination and explicit token confirmation", () => {
  assert.match(form, /useActionState\(requestPasswordReset,/);
  assert.match(form, /action=\{formAction\}/);
  assert.match(actions, /export async function requestPasswordReset/);
  assert.match(actions, /resetPasswordForEmail\(email/);
  assert.match(actions, /\/auth\/recuperacao/);
  assert.match(confirm, /\/confirmar-recuperacao/);
  assert.match(confirm, /token_hash/);
  assert.match(callback, /exchangeCodeForSession\(code\)/);
});

test("local Auth accepts both supported development origins", () => {
  assert.match(config, /site_url = "http:\/\/127\.0\.0\.1:3100"/);
  assert.match(config, /"http:\/\/localhost:3100\/\*\*"/);
  assert.match(config, /"http:\/\/127\.0\.0\.1:3100\/\*\*"/);
});
