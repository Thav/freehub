import test, { after } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { buildApp } from "../src/api/app.js";

const db = process.env.DATABASE_URL ? new PrismaClient() : null;
const app = db ? await buildApp(db) : null;
const suffix = `${Date.now()}${Math.floor(Math.random() * 10_000)}`;
const session = async () => {
  assert.ok(app);
  const response = await app.inject({ method: "POST", url: "/api/login", payload: { login: "manager", password: "spike-password" } });
  assert.equal(response.statusCode, 200);
  const header = response.headers["set-cookie"]; const value = Array.isArray(header) ? header[0] : header; assert.ok(value);
  return { cookie: value.split(";", 1)[0], csrf: (response.json() as { csrfToken: string }).csrfToken };
};

test("visits use organization-local DST day boundaries, immutable snapshots, duration, and correction attribution", { skip: !db }, async () => {
  assert.ok(db && app);
  const organization = await db.organization.findUniqueOrThrow({ where: { key: "spike-shop" } }); const auth = await session();
  const person = await db.person.create({ data: { organizationId: organization.id, firstName: "Visit", lastName: `Rider ${suffix}`, displayName: `Visit Rider ${suffix}`, staff: true } });
  await db.service.create({ data: { organizationId: organization.id, personId: person.id, type: "membership", startDate: new Date("2026-03-01T00:00:00Z"), endDate: new Date("2026-03-31T00:00:00Z") } });
  const headers = { cookie: auth.cookie, "x-csrf-token": auth.csrf };
  const create = await app.inject({ method: "POST", url: `/api/organizations/${organization.id}/visits`, headers, payload: { personId: person.id.toString(), activity: "volunteering", arrivedAt: "2026-03-08T07:30:00.000Z", startedAt: "2026-03-08T08:00:00.000Z", endedAt: "2026-03-08T09:00:00.000Z", note: "DST shift" } });
  assert.equal(create.statusCode, 201); const visit = create.json() as { id: string; staffSnapshot: boolean; memberSnapshot: boolean; durationSeconds: number; createdByUserId: string };
  assert.equal(visit.staffSnapshot, true); assert.equal(visit.memberSnapshot, true); assert.equal(visit.durationSeconds, 3600); assert.equal(visit.createdByUserId, "1");
  await db.person.update({ where: { id: person.id }, data: { staff: false } });
  const queue = await app.inject({ method: "GET", url: `/api/organizations/${organization.id}/visits/days/2026-03-08`, headers: { cookie: auth.cookie } });
  assert.equal(queue.statusCode, 200); const queued = (queue.json() as { visits: { id: string; note: { text: string } | null }[] }).visits.find((candidate) => candidate.id === visit.id); assert.ok(queued); assert.equal(queued.note?.text, "DST shift");
  const corrected = await app.inject({ method: "PUT", url: `/api/organizations/${organization.id}/visits/${visit.id}`, headers, payload: { activity: "project", arrivedAt: "2026-03-08T07:30:00.000Z", startedAt: "2026-03-08T08:00:00.000Z", endedAt: "2026-03-08T10:00:00.000Z" } });
  assert.equal(corrected.statusCode, 200); assert.equal((corrected.json() as { durationSeconds: number; updatedByUserId: string }).durationSeconds, 7200); assert.equal((corrected.json() as { updatedByUserId: string }).updatedByUserId, "1");
  const snapshots = await db.visit.findUniqueOrThrow({ where: { id: BigInt(visit.id) } }); assert.equal(snapshots.staffSnapshot, true); assert.equal(snapshots.memberSnapshot, true);
  const invalid = await app.inject({ method: "PUT", url: `/api/organizations/${organization.id}/visits/${visit.id}`, headers, payload: { activity: "project", arrivedAt: "2026-03-08T07:30:00.000Z", startedAt: "2026-03-08T10:00:00.000Z", endedAt: "2026-03-08T08:00:00.000Z" } });
  assert.equal(invalid.statusCode, 400);
});

test("sign-in and sign-out transitions reject incomplete or repeated state changes", { skip: !db }, async () => {
  assert.ok(db && app); const organization = await db.organization.findUniqueOrThrow({ where: { key: "spike-shop" } }); const auth = await session(); const headers = { cookie: auth.cookie, "x-csrf-token": auth.csrf };
  const person = await db.person.create({ data: { organizationId: organization.id, firstName: "Queue", lastName: suffix, displayName: `Queue ${suffix}` } });
  const created = await app.inject({ method: "POST", url: `/api/organizations/${organization.id}/visits`, headers, payload: { personId: person.id.toString(), activity: "project", arrivedAt: "2026-01-01T10:00:00.000Z" } }); assert.equal(created.statusCode, 201); const id = (created.json() as { id: string }).id;
  const duplicate = await app.inject({ method: "POST", url: `/api/organizations/${organization.id}/visits`, headers, payload: { personId: person.id.toString(), activity: "project", arrivedAt: "2026-01-01T16:00:00.000Z" } }); assert.equal(duplicate.statusCode, 409);
  const premature = await app.inject({ method: "POST", url: `/api/organizations/${organization.id}/visits/${id}/sign-out`, headers, payload: { at: "2026-01-01T10:00:00.000Z" } }); assert.equal(premature.statusCode, 409);
  const signedIn = await app.inject({ method: "POST", url: `/api/organizations/${organization.id}/visits/${id}/sign-in`, headers, payload: { at: "2026-01-01T10:00:00.000Z" } }); assert.equal(signedIn.statusCode, 200);
  const repeat = await app.inject({ method: "POST", url: `/api/organizations/${organization.id}/visits/${id}/sign-in`, headers, payload: { at: "2026-01-01T10:00:01.000Z" } }); assert.equal(repeat.statusCode, 409);
  const transfer = await app.inject({ method: "POST", url: `/api/organizations/${organization.id}/visits/${id}/transfer`, headers, payload: { activity: "volunteering", at: "2026-01-01T10:01:00.000Z" } }); assert.equal(transfer.statusCode, 201); const transferredId = (transfer.json() as { id: string }).id;
  const original = await db.visit.findUniqueOrThrow({ where: { id: BigInt(id) } }); assert.equal(original.durationSeconds, 60); assert.ok(original.endedAt);
  const signedOut = await app.inject({ method: "POST", url: `/api/organizations/${organization.id}/visits/${transferredId}/sign-out`, headers, payload: { at: "2026-01-01T10:02:00.000Z" } }); assert.equal(signedOut.statusCode, 200); assert.equal((signedOut.json() as { durationSeconds: number }).durationSeconds, 60);
  const returned = await app.inject({ method: "POST", url: `/api/organizations/${organization.id}/visits`, headers, payload: { personId: person.id.toString(), activity: "project", arrivedAt: "2026-01-01T11:00:00.000Z" } }); assert.equal(returned.statusCode, 201, "a completed activity does not block a later return");
  const queueOnly = await db.person.create({ data: { organizationId: organization.id, firstName: "Queue leave", lastName: suffix, displayName: `Queue leave ${suffix}` } });
  const abandoned = await app.inject({ method: "POST", url: `/api/organizations/${organization.id}/visits`, headers, payload: { personId: queueOnly.id.toString(), activity: "project", arrivedAt: "2026-01-01T11:00:00.000Z" } }); assert.equal(abandoned.statusCode, 201);
  const removed = await app.inject({ method: "DELETE", url: `/api/organizations/${organization.id}/visits/${(abandoned.json() as { id: string }).id}`, headers }); assert.equal(removed.statusCode, 204);
  const dailyLog = await app.inject({ method: "GET", url: `/api/organizations/${organization.id}/visits/days/2026-01-01`, headers: { cookie: auth.cookie } }); assert.equal(dailyLog.statusCode, 200); const cancelled = (dailyLog.json() as { visits: { id: string; cancelledAt: string | null }[] }).visits.find((visit) => visit.id === (abandoned.json() as { id: string }).id); assert.ok(cancelled?.cancelledAt, "removed queue entries remain in the daily log");
  const freshQueueEntry = await app.inject({ method: "POST", url: `/api/organizations/${organization.id}/visits`, headers, payload: { personId: queueOnly.id.toString(), activity: "project", arrivedAt: "2026-01-01T12:00:00.000Z" } }); assert.equal(freshQueueEntry.statusCode, 201);
});

after(async () => { await app?.close(); await db?.$disconnect(); });
