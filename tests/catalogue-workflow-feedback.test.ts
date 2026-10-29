import test from "node:test";
import assert from "node:assert/strict";
import { cduMutationError } from "../src/lib/cdu-mutation-error.ts";
import { cataloguePermissionCopy } from "../src/lib/catalogue-permission-copy.ts";
test("erros CDU distinguem duplicidade, acesso, hierarquia e disponibilidade", () => {
 assert.match(cduMutationError({code:"23505"}),/já está cadastrado/);
 assert.match(cduMutationError({message:"permission_denied"}),/acesso/);
 assert.match(cduMutationError({code:"PGRST202"}),/conexão/);
 assert.match(cduMutationError({message:"cdu_hierarchy_cycle"}),/ciclo/);
 assert.match(cduMutationError({message:"cdu_parent_table_mismatch"}),/mesma tabela/);
 assert.match(cduMutationError({message:"valid_cdu_description_required"}),/1 a 80/);
 assert.match(cduMutationError(null),/campos foram preservados/);
});
test("textos refletem catálogo e o acionamento de backup exclusivo de administradores", () => {
 assert.deepEqual(Object.keys(cataloguePermissionCopy).sort(),["admin.backups.execute","admin.cdu.manage","admin.cdu.view","admin.subjects.manage","admin.subjects.view"]);
 assert.match(cataloguePermissionCopy["admin.subjects.manage"].description,/importar e mesclar/);
 assert.match(cataloguePermissionCopy["admin.cdu.manage"].description,/montar notações/);
 assert.match(cataloguePermissionCopy["admin.backups.execute"].description,/Somente administradores ativos/);
});
