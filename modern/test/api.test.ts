import test from "node:test";
import assert from "node:assert/strict";
import { buildApp } from "../src/api/app.js";

test("health endpoint does not require a database", async () => {
  const db = { session: { findUnique: async () => null } } as never;
  const app = await buildApp(db);
  const response = await app.inject({ method: "GET", url: "/up" });
  assert.equal(response.statusCode, 200); assert.deepEqual(response.json(), { status: "ok" });
  await app.close();
});
