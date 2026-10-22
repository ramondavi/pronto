import test from "node:test";
import assert from "node:assert/strict";
import { safePanelDestination } from "../src/domain/auth/navigation.ts";

const requestId = "12345678-1234-1234-1234-123456789abc";
test("login preserves the guide for the requested work and discards unrelated parameters", () => {
  assert.equal(safePanelDestination(`/painel/autodeposito?pedido=${requestId}&token=discard#fragment`), `/painel/autodeposito?pedido=${requestId}`);
  assert.equal(safePanelDestination(`/painel/solicitacao?pedido=${requestId}`), `/painel/solicitacao?pedido=${requestId}`);
});
test("login rejects external, ambiguous and unauthorized destinations", () => {
  for (const destination of [undefined, "https://example.org", "//example.org/painel", "/painel/admin", "/painel/autodeposito/../admin", "/painel/autodeposito%2fadmin"]) {
    assert.equal(safePanelDestination(destination), "/painel");
  }
  assert.equal(safePanelDestination("/painel/autodeposito?pedido=invalid"), "/painel/autodeposito");
  assert.equal(safePanelDestination(`/painel?pedido=${requestId}`), "/painel");
});
