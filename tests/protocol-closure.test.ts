import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration=readFileSync("supabase/migrations/202608230008_protocol_closure_coordination.sql","utf8");
const publicPage=readFileSync("src/app/coordenacao/[token]/page.tsx","utf8");

test("closes only a fully released request and schedules existing retention flow",()=>{assert.match(migration,/request_not_ready_for_closure/);assert.match(migration,/cataloging_card_homologations/);assert.match(migration,/n\.status='approved'/);assert.match(migration,/repository_deposit_progress/);assert.match(migration,/set status='completed'/);assert.match(migration,/repository_publications/)});
test("queues final messages for student and coordination",()=>{assert.match(migration,/request_completed:student/);assert.match(migration,/request_completed:coordination/);assert.match(migration,/receives_completion_emails/)});
test("stores only a hash and invalidates access after final delivery",()=>{assert.match(migration,/digest\(raw_token,'sha256'\)/);assert.match(migration,/one_active_request/);assert.match(migration,/invalidate_coordination_access_after_final_email/);assert.match(migration,/final_communicated_at/)});
test("coordination snapshot is deliberately restricted",()=>{assert.match(publicPage,/mostra somente o acompanhamento da solicitação/i);assert.match(publicPage,/CPF, documentos enviados e observações internas não são disponibilizados/i);assert.doesNotMatch(publicPage,/object_path|internal_note|student_cpf/)});
