import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("authentication logs redact cookies and passwords and never log temporary credentials", async () => {
  const source = await readFile(new URL("../src/api/app.ts", import.meta.url), "utf8");
  assert.match(source, /"req\.headers\.cookie"/);
  assert.match(source, /"req\.body\.password"/);
  assert.match(source, /"res\.headers\.set-cookie"/);
  assert.doesNotMatch(source, /request\.log\.[^(]+\([^)]*temporaryPassword/);
  assert.doesNotMatch(source, /console\.(log|error).*temporaryPassword/);
});
