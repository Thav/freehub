import test, { after } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { buildApp } from "../src/api/app.js";

const db = process.env.DATABASE_URL ? new PrismaClient() : null;
const app = db ? await buildApp(db) : null;
const suffix = `${Date.now()}${Math.floor(Math.random() * 10_000)}`;
const cookie = (response: { headers: Record<string, string | string[] | undefined> }) => {
  const header = response.headers["set-cookie"]; const value = Array.isArray(header) ? header[0] : header; assert.ok(value); return value.split(";", 1)[0];
};
const login = async (loginName: string, password: string) => {
  assert.ok(app); const response = await app.inject({ method: "POST", url: "/api/login", payload: { login: loginName, password } }); assert.equal(response.statusCode, 200); return { cookie: cookie(response), csrf: (response.json() as { csrfToken: string }).csrfToken };
};

test("platform admins, managers, and operators enforce the role matrix and tenant boundaries", { skip: !db }, async () => {
  assert.ok(db && app);
  const passwordDigest = await bcrypt.hash("role-test-password", 10);
  const [manager, operator] = await Promise.all([
    db.user.create({ data: { login: `manager-${suffix}`, email: `manager-${suffix}@example.test`, name: "Tenant Manager", passwordDigest, passwordChangeRequired: false } }),
    db.user.create({ data: { login: `operator-${suffix}`, email: `operator-${suffix}@example.test`, name: "Tenant Operator", passwordDigest, passwordChangeRequired: false } })
  ]);
  const [one, two] = await Promise.all([
    db.organization.create({ data: { name: `Tenant One ${suffix}`, key: `tenant-one-${suffix}`, timezone: "America/Chicago", location: "One" } }),
    db.organization.create({ data: { name: `Tenant Two ${suffix}`, key: `tenant-two-${suffix}`, timezone: "America/Los_Angeles", location: "Two" } })
  ]);
  await db.organizationMembership.createMany({ data: [{ organizationId: one.id, userId: manager.id, role: "manager", startsAt: new Date() }, { organizationId: one.id, userId: operator.id, role: "operator", startsAt: new Date() }] });
  const person = await db.person.create({ data: { organizationId: two.id, firstName: "Other", lastName: "Tenant", displayName: "Other Tenant" } });
  const managerSession = await login(manager.login, "role-test-password");
  const operatorSession = await login(operator.login, "role-test-password");

  const ownSettings = await app.inject({ method: "PUT", url: `/api/organizations/${one.id}/settings`, headers: { cookie: managerSession.cookie, "x-csrf-token": managerSession.csrf }, payload: { name: `${one.name} Updated`, timezone: one.timezone, location: "Updated" } });
  assert.equal(ownSettings.statusCode, 200);
  const operatorSettings = await app.inject({ method: "PUT", url: `/api/organizations/${one.id}/settings`, headers: { cookie: operatorSession.cookie, "x-csrf-token": operatorSession.csrf }, payload: { name: one.name, timezone: one.timezone, location: "No" } });
  assert.equal(operatorSettings.statusCode, 403);
  const crossSettings = await app.inject({ method: "GET", url: `/api/organizations/${two.id}/settings`, headers: { cookie: managerSession.cookie } });
  assert.equal(crossSettings.statusCode, 403);
  const crossRead = await app.inject({ method: "GET", url: `/api/organizations/${one.id}/people/${person.id}`, headers: { cookie: managerSession.cookie } });
  assert.equal(crossRead.statusCode, 404, "foreign identifiers cannot escape the organization scope");
  const crossWrite = await app.inject({ method: "POST", url: `/api/organizations/${two.id}/visits`, headers: { cookie: managerSession.cookie, "x-csrf-token": managerSession.csrf }, payload: { personId: person.id.toString(), activity: "project", arrivedAt: new Date().toISOString() } });
  assert.equal(crossWrite.statusCode, 403);

  const grant = await app.inject({ method: "POST", url: `/api/organizations/${one.id}/memberships`, headers: { cookie: managerSession.cookie, "x-csrf-token": managerSession.csrf }, payload: { userId: operator.id.toString(), role: "manager", startsAt: new Date().toISOString().slice(0, 10) } });
  assert.equal(grant.statusCode, 409, "existing membership cannot be silently overwritten");
  const change = await app.inject({ method: "PUT", url: `/api/organizations/${one.id}/memberships/${operator.id}`, headers: { cookie: managerSession.cookie, "x-csrf-token": managerSession.csrf }, payload: { role: "manager", startsAt: new Date().toISOString().slice(0, 10), endsAt: null } });
  assert.equal(change.statusCode, 200);
  const audit = await db.roleAuditEvent.findFirst({ where: { organizationId: one.id, userId: operator.id, action: "changed" } });
  assert.ok(audit, "role change is auditable");

  const platform = await login("manager", "spike-password");
  const provision = await app.inject({ method: "POST", url: "/api/admin/users", headers: { cookie: platform.cookie, "x-csrf-token": platform.csrf }, payload: { login: `provisioned-${suffix}`, name: "Provisioned User", email: `provisioned-${suffix}@example.test` } });
  assert.equal(provision.statusCode, 201);
  const provisioned = provision.json() as { id: string; temporaryPassword: string };
  const organization = await app.inject({ method: "POST", url: "/api/admin/organizations", headers: { cookie: platform.cookie, "x-csrf-token": platform.csrf }, payload: { name: `Provisioned Org ${suffix}`, key: `provisioned-org-${suffix}`, timezone: "America/New_York", managerUserId: provisioned.id } });
  assert.equal(organization.statusCode, 201);
  assert.ok(provisioned.temporaryPassword.length >= 20);
});

after(async () => { await app?.close(); await db?.$disconnect(); });
