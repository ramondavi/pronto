import test from "node:test";
import assert from "node:assert/strict";
import { accessReady, accessStages, emptyAccessPreparation, restoreAccessPreparation } from "../src/domain/repository-deposit/preparation.ts";

test("new preparation opens only the initial stage and blocks the guide", () => {
  assert.deepEqual(accessStages(emptyAccessPreparation), [true,false,false,false]);
  assert.equal(accessReady(emptyAccessPreparation), false);
  assert.deepEqual(emptyAccessPreparation.expanded, [0]);
});
test("confirmed account and correct existing access allow the direct route", () => {
  assert.equal(accessReady({ ...emptyAccessPreparation, route: "ready" }), true);
});
test("sent request is insufficient; correct release and final confirmation are required", () => {
  const sent = { ...emptyAccessPreparation, route: "none" as const, account: "confirmed" as const, requestSent: true };
  assert.equal(accessReady(sent), false);
  assert.equal(accessStages(sent)[3], false);
  const granted = { ...sent, release: "granted" as const };
  assert.equal(accessStages(granted)[3], true);
  assert.equal(accessReady(granted), false);
  assert.equal(accessReady({ ...granted, final: "confirmed" }), true);
  for (const release of ["waiting", "wrong", ""] as const) assert.equal(accessReady({ ...granted, release, final: "confirmed" }), false);
});
test("restoring data discards unknown decisions and invalid stage numbers", () => {
  const restored = restoreAccessPreparation({ route: "external", requestSent: "true", expanded: [0,3,-1,7,"2"] });
  assert.equal(restored.route, "");
  assert.equal(restored.requestSent, false);
  assert.deepEqual(restored.expanded, [0,3]);
  assert.equal(accessReady(restored), false);
});
