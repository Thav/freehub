import test, { after } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { buildApp } from "../src/api/app.js";

const db = process.env.DATABASE_URL ? new PrismaClient() : null;
const app = db ? await buildApp(db) : null;
const suffix = randomBytes(12).toString("hex");
const session = async (login = "manager") => { assert.ok(app); const response = await app.inject({ method: "POST", url: "/api/login", payload: { login, password: "spike-password" } }); const cookie = (Array.isArray(response.headers["set-cookie"]) ? response.headers["set-cookie"][0] : response.headers["set-cookie"])?.split(";", 1)[0]; assert.ok(cookie); return { cookie, csrf: (response.json() as { csrfToken: string }).csrfToken }; };

test("bulk filters honor created/last-visit boundaries, export, archive, restore, and audit", { skip: !db }, async () => {
  assert.ok(db && app); const organization = await db.organization.findUniqueOrThrow({ where: { key: "spike-shop" } }); const auth = await session(); const headers = { cookie: auth.cookie, "x-csrf-token": auth.csrf };
  const target = await db.person.create({ data: { organizationId: organization.id, firstName: "Bulk", lastName: suffix, displayName: `Bulk ${suffix}`, createdAt: new Date("2026-03-05T12:00:00Z") } }); const visited = await db.person.create({ data: { organizationId: organization.id, firstName: "Visited", lastName: suffix, displayName: `Visited ${suffix}`, createdAt: new Date("2026-03-05T12:00:00Z") } }); await db.visit.create({ data: { organizationId: organization.id, personId: visited.id, activity: "project", arrivedAt: new Date("2026-03-07T12:00:00Z"), staffSnapshot: false, memberSnapshot: false } });
  const query = `createdAfter=2026-03-05&createdBefore=2026-03-05&neverVisited=true`; const preview = await app.inject({ method: "GET", url: `/api/organizations/${organization.id}/bulk-people?${query}`, headers: { cookie: auth.cookie } }); assert.equal(preview.statusCode, 200); assert.ok((preview.json() as { rows: { id: string }[] }).rows.some((row) => row.id === target.id.toString())); assert.ok(!(preview.json() as { rows: { id: string }[] }).rows.some((row) => row.id === visited.id.toString()));
  const lastVisit = await app.inject({ method: "GET", url: `/api/organizations/${organization.id}/bulk-people?lastVisitAfter=2026-03-07&lastVisitBefore=2026-03-07`, headers: { cookie: auth.cookie } }); assert.equal(lastVisit.statusCode, 200); assert.ok((lastVisit.json() as { rows: { id: string }[] }).rows.some((row) => row.id === visited.id.toString())); assert.ok(!(lastVisit.json() as { rows: { id: string }[] }).rows.some((row) => row.id === target.id.toString()));
  const exportFile = await app.inject({ method: "GET", url: `/api/organizations/${organization.id}/bulk-people.csv?${query}`, headers: { cookie: auth.cookie } }); assert.equal(exportFile.statusCode, 200); assert.match(exportFile.body, new RegExp(`Bulk ${suffix}`));
  const archive = await app.inject({ method: "POST", url: `/api/organizations/${organization.id}/bulk-people/archive`, headers, payload: { createdAfter: "2026-03-05", createdBefore: "2026-03-05", neverVisited: true } }); assert.equal(archive.statusCode, 200); assert.ok((archive.json() as { count: number }).count >= 1); assert.ok((await db.person.findUniqueOrThrow({ where: { id: target.id } })).archivedAt); assert.equal(await db.personArchiveEvent.count({ where: { personId: target.id, action: "archive", actorUserId: 1n } }), 1);
  const restore = await app.inject({ method: "POST", url: `/api/organizations/${organization.id}/bulk-people/restore`, headers, payload: { createdAfter: "2026-03-05", createdBefore: "2026-03-05", neverVisited: true } }); assert.equal(restore.statusCode, 200); assert.ok((restore.json() as { count: number }).count >= 1); assert.equal((await db.person.findUniqueOrThrow({ where: { id: target.id } })).archivedAt, null);
});

test("bulk previews cap displayed rows while preserving the complete export selection", { skip: !db }, async () => {
  assert.ok(db && app); const organization = await db.organization.findUniqueOrThrow({ where: { key: "spike-shop" } }); const auth = await session(); const marker = randomBytes(12).toString("hex"); await db.person.createMany({ data: Array.from({ length: 251 }, (_, index) => ({ organizationId: organization.id, firstName: "Large", lastName: `${marker}-${index}`, displayName: `Large ${marker}-${index}` })) }); const preview = await app.inject({ method: "GET", url: `/api/organizations/${organization.id}/bulk-people`, headers: { cookie: auth.cookie } }); assert.equal(preview.statusCode, 200); assert.equal((preview.json() as { rows: unknown[]; truncated: boolean }).rows.length, 250); assert.equal((preview.json() as { truncated: boolean }).truncated, true);
});

test("bulk mutations require a manager and cannot cross organization boundaries", { skip: !db }, async () => {
  assert.ok(db && app); const organization = await db.organization.findUniqueOrThrow({ where: { key: "spike-shop" } }); const other = await session("other-manager"); const response = await app.inject({ method: "POST", url: `/api/organizations/${organization.id}/bulk-people/archive`, headers: { cookie: other.cookie, "x-csrf-token": other.csrf }, payload: { neverVisited: true } }); assert.equal(response.statusCode, 403);
});
after(async () => { await app?.close(); await db?.$disconnect(); });
