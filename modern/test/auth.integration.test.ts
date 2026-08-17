import test, { after } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { buildApp } from "../src/api/app.js";

const databaseUrl = process.env.DATABASE_URL;
const db = databaseUrl ? new PrismaClient() : null;
const app = db ? await buildApp(db) : null;
const suffix = `${Date.now()}${Math.floor(Math.random() * 10_000)}`;
const login = `cutover-${suffix}`;
let userId: bigint | undefined;

const cookieFrom = (response: { headers: Record<string, string | string[] | undefined> }) => {
  const header = response.headers["set-cookie"];
  const value = Array.isArray(header) ? header[0] : header;
  assert.ok(value);
  return value.split(";", 1)[0];
};
const loginAs = async (credentials: { login: string; password: string }) => {
  assert.ok(app);
  const response = await app.inject({ method: "POST", url: "/api/login", payload: credentials });
  return { response, cookie: cookieFrom(response), body: response.json() as { csrfToken: string; passwordChangeRequired: boolean } };
};

test("cutover provisioning, forced change, CSRF, expiry, disablement, and revocation", { skip: !db }, async () => {
  assert.ok(db && app);
  const organization = await db.organization.findUniqueOrThrow({ where: { key: "spike-shop" } });
  const manager = await loginAs({ login: "manager", password: "spike-password" });
  assert.equal(manager.response.statusCode, 200);

  const migrated = await db.user.create({ data: { login, email: `${login}@example.test`, name: "Cutover User", passwordDigest: "a".repeat(40), passwordChangeRequired: true } });
  userId = migrated.id;
  await db.organizationMembership.create({ data: { organizationId: organization.id, userId: migrated.id, role: "operator" } });
  const unprovisioned = await app.inject({ method: "POST", url: "/api/login", payload: { login, password: "legacy-password" } });
  assert.equal(unprovisioned.statusCode, 401, "legacy SHA-1-style digest never authenticates");

  const missingCsrf = await app.inject({ method: "POST", url: `/api/users/${migrated.id}/temporary-password`, headers: { cookie: manager.cookie } });
  assert.equal(missingCsrf.statusCode, 403);
  const provision = await app.inject({ method: "POST", url: `/api/users/${migrated.id}/temporary-password`, headers: { cookie: manager.cookie, "x-csrf-token": manager.body.csrfToken } });
  assert.equal(provision.statusCode, 200);
  assert.match(provision.headers["cache-control"] || "", /no-store/);
  const temporaryPassword = (provision.json() as { temporaryPassword: string }).temporaryPassword;
  assert.ok(temporaryPassword.length >= 20);

  const forced = await loginAs({ login, password: temporaryPassword });
  assert.equal(forced.response.statusCode, 200);
  assert.equal(forced.body.passwordChangeRequired, true);
  const barred = await app.inject({ method: "GET", url: "/api/organizations", headers: { cookie: forced.cookie } });
  assert.equal(barred.statusCode, 403);
  const change = await app.inject({ method: "POST", url: "/api/password", headers: { cookie: forced.cookie, "x-csrf-token": forced.body.csrfToken }, payload: { password: "a modern secure password" } });
  assert.equal(change.statusCode, 204);
  const allowed = await app.inject({ method: "GET", url: "/api/organizations", headers: { cookie: forced.cookie } });
  assert.equal(allowed.statusCode, 200);

  const logout = await app.inject({ method: "POST", url: "/api/logout", headers: { cookie: forced.cookie, "x-csrf-token": forced.body.csrfToken } });
  assert.equal(logout.statusCode, 204);
  const revoked = await app.inject({ method: "GET", url: "/api/organizations", headers: { cookie: forced.cookie } });
  assert.equal(revoked.statusCode, 401);

  const expiredToken = "expired-test-token";
  await db.session.create({ data: { tokenDigest: (await import("node:crypto")).createHash("sha256").update(expiredToken).digest("hex"), csrfTokenDigest: "b".repeat(64), userId: migrated.id, organizationId: organization.id, expiresAt: new Date(Date.now() - 1_000) } });
  const expired = await app.inject({ method: "GET", url: "/api/organizations", headers: { cookie: `freehub_session=${expiredToken}` } });
  assert.equal(expired.statusCode, 401);
  await db.user.update({ where: { id: migrated.id }, data: { disabledAt: new Date() } });
  const disabled = await app.inject({ method: "POST", url: "/api/login", payload: { login, password: "a modern secure password" } });
  assert.equal(disabled.statusCode, 401);
});

after(async () => {
  if (db && userId) await db.user.delete({ where: { id: userId } });
  await app?.close();
  await db?.$disconnect();
});
