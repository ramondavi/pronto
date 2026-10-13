import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(new URL("../supabase/migrations/202608230001_staff_queue.sql", import.meta.url), "utf8");

test("implements atomic ticket ownership in database functions", () => {
  assert.match(migration, /create or replace function public\.assume_cataloging_request/);
  assert.match(migration, /where id = target_request_id[\s\S]*and assigned_to is null/);
  assert.match(migration, /get diagnostics changed_count = row_count/);
  assert.match(migration, /request_already_assigned/);
});

test("allows analysis writes only for the current ticket owner", () => {
  assert.match(migration, /create or replace function public\.save_request_analysis/);
  assert.match(migration, /where id = target_request_id and assigned_to = auth\.uid\(\)/);
  assert.match(migration, /request_locked_by_another_staff/);
});

test("restricts reassignment to administrators and active staff targets", () => {
  assert.match(migration, /public\.current_user_role\(\) is distinct from 'administrator'::public\.user_role/);
  assert.match(migration, /status = 'active' and role in \('cataloger', 'administrator'\)/);
});

test("keeps internal analyses invisible to students", () => {
  assert.match(migration, /create policy "request_analyses_read_by_staff"/);
  assert.match(migration, /public\.current_user_role\(\) in \('cataloger', 'administrator'\)/);
  assert.match(migration, /revoke all on table public\.request_analyses from anon, authenticated/);
});

test("records assignment lifecycle actions in audit logs", () => {
  for (const action of ["cataloging_request_assumed", "cataloging_request_released", "cataloging_request_reassigned"]) {
    assert.match(migration, new RegExp(`'${action}'`));
  }
});
