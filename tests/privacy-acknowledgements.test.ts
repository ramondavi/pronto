import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import test from "node:test";

test("a ciência da política é registrada por versão e não depende de consentimento", async () => {
  const [migration, permissions, signup, layout, acknowledgement] = await Promise.all([
    readFile("supabase/migrations/202608310002_privacy_notice_acknowledgements.sql", "utf8"),
    readFile("supabase/migrations/202608310003_grant_privacy_acknowledgement_read.sql", "utf8"),
    readFile("src/app/auth-actions.ts", "utf8"),
    readFile("src/app/painel/layout.tsx", "utf8"),
    readFile("src/components/privacy-acknowledgement.tsx", "utf8"),
  ]);
  assert.match(migration, /unique \(profile_id, notice_version\)/);
  assert.match(migration, /privacy_notice_acknowledgement_required/);
  assert.match(permissions, /grant select on table public\.privacy_notice_acknowledgements to authenticated/);
  assert.match(signup, /privacy_notice_version: PRIVACY_NOTICE_VERSION/);
  assert.match(signup, /revalidatePath\("\/painel", "layout"\)/);
  assert.match(layout, /PrivacyAcknowledgement/);
  assert.match(acknowledgement, /Li e estou ciente/);
  assert.match(acknowledgement, /window\.location\.replace\(window\.location\.pathname \+ window\.location\.search\)/);
});
