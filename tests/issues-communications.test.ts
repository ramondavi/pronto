import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(new URL("../supabase/migrations/202608230002_issues_communications.sql", import.meta.url), "utf8");

test("seeds the six approved issue templates", () => {
  for (const code of ["required_missing", "work_mismatch", "title_page_name", "public_link_unavailable", "incomplete_information", "format_standardization"]) assert.match(migration, new RegExp(`'${code}'`));
});

test("stores immutable revision rounds, field issues and corrections", () => {
  assert.match(migration, /create table public\.request_revision_rounds/);
  assert.match(migration, /create table public\.request_field_issues/);
  assert.match(migration, /create table public\.request_corrections/);
  assert.match(migration, /original_value jsonb/);
  assert.match(migration, /corrected_value jsonb/);
});

test("accepts exactly the pending fields from the current round", () => {
  assert.match(migration, /only_pending_fields_required/);
  assert.match(migration, /count\(distinct value ->> 'fieldKey'\)/);
  assert.match(migration, /not exists \(select 1 from public\.request_field_issues/);
});

test("queues opening, pending and release communications idempotently", () => {
  for (const event of ["request_opened", "changes_requested", "request_released"]) assert.match(migration, new RegExp(`'${event}'`));
  assert.match(migration, /idempotency_key text not null unique/);
});

test("keeps local delivery administrative and production-neutral", () => {
  assert.match(migration, /claim_local_email_outbox/);
  assert.match(migration, /active_administrator_required/);
  assert.match(migration, /for update skip locked/);
});
