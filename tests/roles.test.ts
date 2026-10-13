import assert from "node:assert/strict";
import test from "node:test";
import { hasPermission } from "../src/domain/auth/roles.ts";

test("administrator inherits operational access", () => {
  assert.equal(hasPermission("administrator", "read:queue"), true);
  assert.equal(hasPermission("administrator", "manage:users"), true);
});

test("cataloger cannot manage users", () => {
  assert.equal(hasPermission("cataloger", "manage:users"), false);
});

test("student can only read own records", () => {
  assert.equal(hasPermission("student", "read:own-profile"), true);
  assert.equal(hasPermission("student", "read:queue"), false);
});
