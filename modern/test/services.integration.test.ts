import test, { after } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { buildApp } from "../src/api/app.js";

const db = process.env.DATABASE_URL ? new PrismaClient() : null;
const app = db ? await buildApp(db) : null;
const suffix = `${Date.now()}${Math.floor(Math.random() * 10_000)}`;
const session = async () => {
  assert.ok(app); const response = await app.inject({ method: "POST", url: "/api/login", payload: { login: "manager", password: "spike-password" } }); assert.equal(response.statusCode, 200);
  const header = response.headers["set-cookie"]; const cookie = (Array.isArray(header) ? header[0] : header)?.split(";", 1)[0]; assert.ok(cookie); return { cookie, csrf: (response.json() as { csrfToken: string }).csrfToken };
};

test("services preserve types, inclusive membership boundaries, notes, corrections, renewal, and audit history", { skip: !db }, async () => {
  assert.ok(db && app); const organization = await db.organization.findUniqueOrThrow({ where: { key: "spike-shop" } }); const auth = await session(); const headers = { cookie: auth.cookie, "x-csrf-token": auth.csrf };
  const person = await db.person.create({ data: { organizationId: organization.id, firstName: "Service", lastName: suffix, displayName: `Service ${suffix}` } });
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: organization.timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date()); const part = (type: string) => parts.find((value) => value.type === type)?.value; const today = `${part("year")}-${part("month")}-${part("day")}`;
  const created = await app.inject({ method: "POST", url: `/api/organizations/${organization.id}/people/${person.id}/services`, headers, payload: { type: "membership", startDate: today, endDate: today, paid: true, volunteered: true, note: "earned through volunteering" } });
  assert.equal(created.statusCode, 201); const membership = created.json() as { id: string; paid: boolean; volunteered: boolean }; assert.equal(membership.paid, true); assert.equal(membership.volunteered, true);
  const profile = await app.inject({ method: "GET", url: `/api/organizations/${organization.id}/people/${person.id}`, headers: { cookie: auth.cookie } }); assert.equal(profile.statusCode, 200); assert.deepEqual((profile.json() as { membership: { state: string }; displayRole: string }).membership.state, "current"); assert.equal((profile.json() as { displayRole: string }).displayRole, "member");
  const detail = await app.inject({ method: "GET", url: `/api/organizations/${organization.id}/services/${membership.id}`, headers: { cookie: auth.cookie } }); assert.equal(detail.statusCode, 200); assert.equal((detail.json() as { notes: { text: string }[] }).notes[0].text, "earned through volunteering");
  const corrected = await app.inject({ method: "PUT", url: `/api/organizations/${organization.id}/services/${membership.id}`, headers, payload: { type: "membership", startDate: today, endDate: today, paid: false, volunteered: true, note: "corrected payment" } }); assert.equal(corrected.statusCode, 200); assert.equal((corrected.json() as { updatedByUserId: string }).updatedByUserId, "1");
  const audit = await db.serviceAuditEvent.findMany({ where: { serviceId: BigInt(membership.id) }, orderBy: { createdAt: "asc" } }); assert.equal(audit.length, 2); assert.equal(audit[1].action, "corrected"); assert.deepEqual(audit[1].previous, { type: "membership", startDate: today, endDate: today, paid: true, volunteered: true });
  const renewed = await app.inject({ method: "POST", url: `/api/organizations/${organization.id}/services/${membership.id}/renew`, headers, payload: {} }); assert.equal(renewed.statusCode, 201); assert.equal((renewed.json() as { type: string }).type, "membership");
  const types = await Promise.all(["earn_a_bike", "class"].map((type) => app.inject({ method: "POST", url: `/api/organizations/${organization.id}/people/${person.id}/services`, headers, payload: { type, startDate: null, endDate: null } }))); for (const response of types) assert.equal(response.statusCode, 201);
  const invalid = await app.inject({ method: "POST", url: `/api/organizations/${organization.id}/people/${person.id}/services`, headers, payload: { type: "class", startDate: "2026-01-02", endDate: "2026-01-01" } }); assert.equal(invalid.statusCode, 400);
  const other = await db.organization.create({ data: { name: `Service other ${suffix}`, key: `service-other-${suffix}`, timezone: "America/New_York" } }); const crossTenant = await app.inject({ method: "GET", url: `/api/organizations/${other.id}/services/${membership.id}`, headers: { cookie: auth.cookie } }); assert.equal(crossTenant.statusCode, 403);
});

after(async () => { await app?.close(); await db?.$disconnect(); });
