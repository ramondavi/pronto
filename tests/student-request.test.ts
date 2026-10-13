import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { compactDraft, emptyStudentRequestDraft, restoreStudentRequestDraft, studentRequestDraftKey } from "../src/domain/student-requests/draft.ts";

const migration = readFileSync(new URL("../supabase/migrations/202608230000_student_requests.sql", import.meta.url), "utf8");
const requiredDetailsMigration = readFileSync(new URL("../supabase/migrations/202608310005_require_student_cataloging_details.sql", import.meta.url), "utf8");
const relatedPeopleMigration = readFileSync(new URL("../supabase/migrations/202609140001_related_people_order.sql", import.meta.url), "utf8");

test("keeps registration numbers on reusable academic enrollments", () => {
  assert.match(migration, /create table public\.academic_enrollments/);
  assert.match(migration, /unique \(student_profile_id, academic_program_id, registration_number\)/);
  assert.match(migration, /academic_enrollment_id uuid not null/);
});

test("makes the five approved programs reproducible in the migration flow", () => {
  for (const code of ["architecture-urbanism-undergraduate", "athdc-specialization", "mp-cecre-master", "ppgau-academic-master", "ppgau-doctorate"]) {
    assert.match(migration, new RegExp(`'${code}'`));
  }
  assert.match(migration, /on conflict \(code\) do nothing/);
});

test("enforces one active request per student in the database", () => {
  assert.match(migration, /create unique index cataloging_requests_one_active_per_student[\s\S]*where status in \('submitted', 'in_review', 'changes_requested', 'approved'\)/);
});

test("generates internal annual protocols transactionally", () => {
  assert.match(migration, /create table public\.protocol_counters/);
  assert.match(migration, /on conflict \(year\) do update set last_number/);
  assert.match(migration, /'FC' \|\| protocol_year::text \|\| '-' \|\| lpad\(protocol_number::text, 4, '0'\)/);
});

test("allows request creation only through the protected RPC", () => {
  assert.match(migration, /revoke all on table public\.academic_enrollments, public\.cataloging_requests,[\s\S]*from anon, authenticated/);
  assert.match(migration, /public\.current_user_role\(\) is distinct from 'student'::public\.user_role/);
  assert.match(migration, /grant execute on function public\.open_student_request\(jsonb\) to authenticated/);
});

test("compacts repeatable draft fields without losing structured people", () => {
  const compact = compactDraft({
    ...emptyStudentRequestDraft,
    title: "  Um trabalho  ",
    keywordsPt: [" Arquitetura ", "", " Cidade "],
    people: { author: "  Ana Silva ", additionalAuthors: [], committeeMembers: [" Prof.ª Lia "], birthYearAcknowledged: true, birthYearAuthorIndex: 0, advisor: " Prof. José ", advisorNoteLabel: "Orientador", coadvisor: "", coadvisorNoteLabel: "Coorientador" },
  });
  assert.equal(compact.title, "Um trabalho");
  assert.deepEqual(compact.keywordsPt, ["Arquitetura", "Cidade"]);
  assert.equal(compact.people.author, "Ana Silva");
  assert.equal(compact.people.birthYearAcknowledged, true);
  assert.deepEqual(compact.people.committeeMembers, ["Prof.ª Lia"]);
  assert.match(studentRequestDraftKey("student-1"), /^pronto:student-request-draft:/);
});

test("exige a escolha explícita sobre ilustrações", () => {
  assert.match(requiredDetailsMigration, /illustrations_choice_required/);
  assert.match(requiredDetailsMigration, /payload \? 'hasIllustrations'/);
  assert.equal(emptyStudentRequestDraft.hasIllustrations, "");
});

test("preserva membros da banca e a ordem das pessoas relacionadas", () => {
  assert.match(relatedPeopleMigration, /committeeMembers/);
  assert.match(relatedPeopleMigration, /committee_member/);
  assert.match(relatedPeopleMigration, /open_student_request_v7/);
});

test("recupera rascunhos antigos sem deslocar a equivalência dos termos", () => {
  const restored = restoreStudentRequestDraft({
    title: "Título preservado", hasIllustrations: false,
    people: { author: "Ana Silva", birthYear: 1998 },
    keywordsPt: ["Arquitetura", null, "Cidade"], keywordsEn: ["Architecture", "Housing", "City"],
  });
  assert.equal(restored.title, "Título preservado");
  assert.equal(restored.people.author, "Ana Silva");
  assert.equal("birthYear" in restored.people, false);
  assert.equal(restored.hasIllustrations, "no");
  assert.deepEqual(restored.keywordsPt, ["Arquitetura", "", "Cidade"]);
  assert.deepEqual(restored.keywordsEn, ["Architecture", "Housing", "City"]);
});

test("restaura trabalho estrangeiro com equivalente português e sem duplicar o idioma original", () => {
  const restored = restoreStudentRequestDraft({
    originalLanguage: "fr", equivalentTitles: [
      { language: "fr", title: "Titre original" },
      { language: "en", title: "English title" },
      { language: "pt", title: "Título em português" },
      { language: "en", title: "Duplicado" },
    ],
  });
  assert.deepEqual(restored.equivalentTitles, [
    { language: "pt", title: "Título em português" },
    { language: "en", title: "English title" },
  ]);
});

test("tolera rascunho malformado e mantém defaults independentes", () => {
  const restored = restoreStudentRequestDraft({ originalLanguage: "inválido", people: null, keywordsPt: false });
  assert.equal(restored.originalLanguage, "pt");
  assert.equal(restored.people.author, "");
  assert.deepEqual(restored.keywordsPt, ["", "", ""]);
  restored.people.committeeMembers.push("Pessoa de exemplo");
  assert.deepEqual(emptyStudentRequestDraft.people.committeeMembers, []);
});
