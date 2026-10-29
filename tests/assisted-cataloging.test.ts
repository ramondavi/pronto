import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { findCutterSuggestions } from "../src/domain/cutter-suggestions.ts";

const migration = readFileSync("supabase/migrations/202608230003_assisted_cataloging.sql", "utf8");
const reviewMigration = readFileSync("supabase/migrations/202608260001_cataloging_review_workflow.sql", "utf8");
const relatedPeopleMigration = readFileSync("supabase/migrations/202609140001_related_people_order.sql", "utf8");
const workspace = readFileSync("src/components/assisted-cataloging-workspace.tsx", "utf8");

test("stores reusable authorities without overwriting request snapshots", () => {
  assert.match(migration, /create table public\.person_authorities/);
  assert.match(migration, /create table public\.request_cataloging_people/);
  assert.match(migration, /transcribed_name text not null/);
  assert.match(migration, /authorized_name_snapshot text not null/);
});

test("models bilingual controlled terms and one primary subject", () => {
  assert.match(migration, /preferred_label_pt text not null/);
  assert.match(migration, /preferred_label_en text/);
  assert.match(migration, /request_controlled_terms_one_primary/);
});

test("keeps CDU and Cutter manual and prepares structured MARC metadata", () => {
  assert.match(migration, /cdu_code text/);
  assert.match(migration, /cutter_code text/);
  assert.match(migration, /marc21_preparation jsonb/);
  assert.doesNotMatch(migration, /cutter.*suggest/i);
});

test("supports ordered bilingual terms, incremental authority lookup and a live preview", () => {
  assert.match(workspace, /draggable=\{editable\}/);
  assert.match(workspace, /moveTerm\(draggedTerm, index\)/);
  assert.match(workspace, /authorityMatches/);
  assert.match(workspace, /termMatches/);
  assert.match(workspace, /CatalogingCardPreview[\s\S]*?snapshot=\{shownSnapshot\}/);
  assert.match(workspace, /activeAutocomplete/);
  assert.match(workspace, /onFocus=\{\(\) => setActiveAutocomplete/);
});

test("normalizes Cutter and audits direct staff corrections in a new migration", () => {
  assert.match(reviewMigration, /normalize_cutter_without_title_initial/);
  assert.match(reviewMigration, /staff_correct_request_field/);
  assert.match(reviewMigration, /request_field_corrected_by_staff/);
  assert.match(reviewMigration, /assigned_to = auth\.uid\(\).*status = 'in_review'/);
});

test("sugere Cutter progressivamente pelo sobrenome autorizado, sem preenchimento automático", () => {
  const suggestions = findCutterSuggestions({ San: 123, Sant: 124, Silva: 567 }, "Santos, Maria");
  assert.deepEqual(suggestions.map((item) => item.code), ["S124", "S123"]);
  const santana = findCutterSuggestions({ Sant: 231, Santag: 232, Santar: 233 }, "Santana, Joana");
  assert.equal(santana[0]?.code, "S232");
  assert.match(workspace, /findCutterSuggestions/);
  assert.match(workspace, /setCutterCode\(suggestion\.code\)/);
  assert.match(workspace, /cutterSuggestionsOpen/);
  assert.match(workspace, /setCutterSuggestionsOpen\(false\)/);
});

test("scores CDU history with primary weight two and secondary weight one", () => {
  assert.match(migration, /2 \* count\(distinct requests\.id\).*primary_term_id[\s\S]*\+ count\(distinct \(requests\.id, terms\.controlled_term_id\)\)/);
  assert.match(migration, /requests\.status in \('approved', 'completed'\)/);
  assert.match(migration, /limit 3/);
});

test("restricts assisted cataloging writes to the ticket owner", () => {
  assert.match(migration, /assigned_to = auth\.uid\(\) and status in \('in_review', 'changes_requested'\)/);
  assert.match(migration, /revoke all on table public\.person_authorities[\s\S]*from anon, authenticated/);
});

test("restringe a ordem de pessoas relacionadas e mantém orientação à frente da banca", () => {
  assert.match(workspace, /movePerson/);
  assert.match(workspace, /withinAuthors/);
  assert.match(workspace, /withinMovablePeople/);
  assert.match(workspace, /1º membro da banca/);
  assert.match(relatedPeopleMigration, /invalid_related_people_order/);
  assert.match(relatedPeopleMigration, /save_assisted_cataloging_v2/);
});
