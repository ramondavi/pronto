import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(new URL("../supabase/migrations/202608310001_staff_provisioning_notifications.sql", import.meta.url), "utf8");

test("pending internal accounts notify only active administrators and use a separate local outbox", () => {
  assert.match(migration, /create table public\.account_notification_outbox/);
  assert.match(migration, /administrator\.role = 'administrator' and administrator\.status = 'active'/);
  assert.match(migration, /after insert or update of email_confirmed_at on auth\.users/);
  assert.match(migration, /claim_local_account_notification_outbox/);
});
