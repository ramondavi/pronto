import assert from "node:assert/strict";
import test from "node:test";
import { describeRequestProgress } from "../src/domain/request-progress.ts";

test("mostra o estado operacional pelos marcos registrados", () => {
  assert.equal(describeRequestProgress({ status: "submitted", assignedTo: null }).label, "Aguardando responsável");
  assert.equal(describeRequestProgress({ status: "changes_requested" }).label, "Aguardando correção do estudante");
  assert.equal(describeRequestProgress({ status: "approved", nadaConstaStatus: "pending" }).label, "Nada Consta em validação");
  assert.equal(describeRequestProgress({ status: "approved", nadaConstaStatus: "approved", hasHomologation: true }).label, "Ficha liberada — aguarda autodepósito");
  assert.equal(describeRequestProgress({ status: "approved", nadaConstaStatus: "approved", hasRepositoryDeposit: true }).label, "Aguardando validação no RI/UFBA");
  assert.equal(describeRequestProgress({ status: "completed", hasPublication: true }).label, "Protocolo encerrado");
});
