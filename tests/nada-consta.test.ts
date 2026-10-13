import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync("supabase/migrations/202608230005_nada_consta_release.sql", "utf8");
const parallelMigration = readFileSync("supabase/migrations/202609140002_parallel_nada_consta_release.sql", "utf8");
const route = readFileSync("src/app/api/nada-consta/route.ts", "utf8");

test("reserves a private five-megabyte PDF bucket for Nada Consta", () => {
  assert.match(migration, /'nada-consta'.*false, 5242880, array\['application\/pdf'\]/s);
  assert.match(migration, /nada_consta_objects_student_insert/);
  assert.match(migration, /nada_consta_objects_authorized_read/);
});

test("validates extension, MIME, size and PDF magic bytes before upload", () => {
  assert.match(route, /endsWith\("\.pdf"\)/);
  assert.match(route, /file\.type !== "application\/pdf"/);
  assert.match(route, /5 \* 1024 \* 1024/);
  assert.match(route, /%PDF-/);
});

test("gates release on librarian validation and records retention", () => {
  assert.match(migration, /queue_request_release_notice/);
  assert.match(migration, /nada_consta_approved/);
  assert.match(migration, /interval '60 days'/);
  assert.match(migration, /object_path=null,status='purged'/);
});

test("allows document validation in parallel and releases only after both approvals", () => {
  assert.match(parallelMigration, /'submitted', 'in_review', 'changes_requested', 'approved'/);
  assert.match(parallelMigration, /release_when_card_and_document_are_ready/);
  assert.match(parallelMigration, /cataloging_card_homologations/);
  assert.match(parallelMigration, /after update of status on public\.cataloging_requests/);
});

test("never handles the complete academic work", () => {
  assert.doesNotMatch(route, /public_work_url|complete_work|trabalho_completo/);
});
