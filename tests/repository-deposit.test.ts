import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync("supabase/migrations/202608230007_repository_deposit_guide.sql", "utf8");
const page = readFileSync("src/app/painel/autodeposito/page.tsx", "utf8");
const guide = readFileSync("src/components/repository-deposit-guide.tsx", "utf8");

test("records an idempotent repository deposit start only for a released request", () => {
  assert.match(migration, /create or replace function public\.start_repository_deposit/);
  assert.match(migration, /r\.status='approved'/);
  assert.match(migration, /repository_deposit_enabled/);
  assert.match(migration, /cataloging_card_homologations/);
  assert.match(migration, /n\.status='approved'/);
  assert.match(migration, /repository_deposit_started/);
});

test("allows only administrators to change repository guide availability", () => {
  assert.match(migration, /current_user_role\(\) is distinct from 'administrator'/);
  assert.match(migration, /repository_deposit_configuration_changed/);
});

test("maps only applicable metadata and leaves RI decisions manual", () => {
  assert.match(page, /repository_collection_label/);
  assert.match(page, /snapshot\.subjects/);
  assert.match(page, /Áreas de conhecimento CNPq/);
  assert.match(guide, /Acesso, embargo e licenças são escolhidos por você diretamente no repositório/);
  assert.doesNotMatch(guide, /\.upload\(|storage\.from|SWORD|dspace\/api/i);
});
