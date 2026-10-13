import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../supabase/migrations/202608220000_auth_authorization_hardening.sql", import.meta.url),
  "utf8",
);

test("database authorization resolves roles only for active accounts", () => {
  assert.match(migration, /create or replace function public\.current_user_role\(\)[\s\S]*where id = auth\.uid\(\) and status = 'active'/);
  assert.match(migration, /create or replace function public\.is_active_user\(\)/);
});

test("all foundational account and operations tables explicitly enable RLS", () => {
  const tables = [
    "profiles",
    "student_profiles",
    "staff_profiles",
    "academic_programs",
    "coordination_contacts",
    "library_announcements",
    "sla_settings",
    "audit_logs",
  ];

  for (const table of tables) {
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`));
  }
});

test("staff provisioning requires an active administrator and a confirmed institutional user", () => {
  assert.match(migration, /public\.current_user_role\(\) is distinct from 'administrator'::public\.user_role/);
  assert.match(migration, /from auth\.users[\s\S]*email_confirmed_at is not null/);
  assert.match(migration, /staff_role is null or staff_role not in \('cataloger', 'administrator'\)/);
  assert.match(migration, /'staff_account_provisioned'/);
});
