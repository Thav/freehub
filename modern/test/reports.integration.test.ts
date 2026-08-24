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

test("reports reconcile scoped records, local dates, snapshots, pagination, and CSV contracts", { skip: !db }, async () => {
  assert.ok(db && app); const manager = await db.user.findUniqueOrThrow({ where: { login: "manager" } }); const organization = await db.organization.create({ data: { name: `Report Shop ${suffix}`, key: `report-shop-${suffix}`, timezone: "America/Chicago" } }); await db.organizationMembership.create({ data: { organizationId: organization.id, userId: manager.id, role: "manager" } }); const auth = await session(); const headers = { cookie: auth.cookie, "x-csrf-token": auth.csrf };
  const person = await db.person.create({ data: { organizationId: organization.id, firstName: "Report", lastName: suffix, displayName: `Report ${suffix}`, email: `report.${suffix}@example.test`, staff: true } });
  const service = await db.service.create({ data: { organizationId: organization.id, personId: person.id, type: "membership", startDate: new Date("2026-03-01T00:00:00Z"), endDate: new Date("2026-03-10T00:00:00Z"), paid: true } });
  await db.note.create({ data: { organizationId: organization.id, serviceId: service.id, text: "quoted, note" } });
  const included = await db.visit.create({ data: { organizationId: organization.id, personId: person.id, activity: "volunteering", arrivedAt: new Date("2026-03-08T07:30:00Z"), startedAt: new Date("2026-03-08T08:00:00Z"), endedAt: new Date("2026-03-08T09:00:00Z"), durationSeconds: 3600, staffSnapshot: true, memberSnapshot: true } });
  await db.visit.create({ data: { organizationId: organization.id, personId: person.id, activity: "project", arrivedAt: new Date("2026-03-09T04:30:00Z"), staffSnapshot: false, memberSnapshot: false } }); // still March 8 in Chicago
  const people = await app.inject({ method: "GET", url: `/api/organizations/${organization.id}/reports/people?name=Report`, headers: { cookie: auth.cookie } }); assert.equal(people.statusCode, 200); assert.ok((people.json() as { rows: { id: string }[] }).rows.some((row) => row.id === person.id.toString()));
  const services = await app.inject({ method: "GET", url: `/api/organizations/${organization.id}/reports/services?after=2026-03-01&before=2026-03-10&serviceTypes=membership`, headers: { cookie: auth.cookie } }); assert.equal(services.statusCode, 200); assert.ok((services.json() as { rows: { id: string }[] }).rows.some((row) => row.id === service.id.toString()));
  const visits = await app.inject({ method: "GET", url: `/api/organizations/${organization.id}/reports/visits?after=2026-03-08&before=2026-03-08`, headers: { cookie: auth.cookie } }); assert.equal(visits.statusCode, 200); const visitRows = (visits.json() as { total: number; rows: { id: string; classification: string }[] }); assert.equal(visitRows.total, 2); assert.equal(visitRows.rows.find((row) => row.id === included.id.toString())?.classification, "staff volunteer");
  const summary = await app.inject({ method: "GET", url: `/api/organizations/${organization.id}/reports/summary?from=2026-03-08&to=2026-03-08`, headers: { cookie: auth.cookie } }); assert.equal(summary.statusCode, 200); assert.deepEqual((summary.json() as { days: { day: string; total: number; staff: number }[] }).days, [{ day: "2026-03-08", staff: 1, volunteer: 0, member: 0, patron: 1, total: 2 }]);
  const download = await app.inject({ method: "GET", url: `/api/organizations/${organization.id}/reports/services.csv?after=2026-03-01&before=2026-03-10&serviceTypes=membership`, headers: { cookie: auth.cookie } }); assert.equal(download.statusCode, 200); assert.match(String(download.headers["content-disposition"]), new RegExp(`${organization.key}_services_2026-03-01_2026-03-10\\.csv`)); assert.match(download.body, /service_type_id/); assert.match(download.body, /"quoted, note"/);
  const other = await db.organization.create({ data: { name: `Report Other ${suffix}`, key: `report-other-${suffix}`, timezone: "America/New_York" } }); const denied = await app.inject({ method: "GET", url: `/api/organizations/${other.id}/reports/people`, headers: { cookie: auth.cookie } }); assert.equal(denied.statusCode, 403);
  const extras = await Promise.all([...Array(26)].map((_, index) => db.person.create({ data: { organizationId: organization.id, firstName: "Paged", lastName: `${suffix}-${index}`, displayName: `Paged ${suffix}-${index}` } }))); const paged = await app.inject({ method: "GET", url: `/api/organizations/${organization.id}/reports/people?name=Paged&page=2`, headers: { cookie: auth.cookie } }); assert.equal(paged.statusCode, 200); assert.equal((paged.json() as { rows: unknown[] }).rows.length, 1); assert.equal(extras.length, 26);
  void headers;
});

after(async () => { await app?.close(); await db?.$disconnect(); });
