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

test("people preserve display contacts, normalize match fields, archive reversibly, and remain tenant-scoped", { skip: !db }, async () => {
  assert.ok(db && app); const organization = await db.organization.findUniqueOrThrow({ where: { key: "spike-shop" } }); const auth = await session();
  const create = await app.inject({ method: "POST", url: `/api/organizations/${organization.id}/people`, headers: { cookie: auth.cookie, "x-csrf-token": auth.csrf }, payload: { firstName: "  Pat ", lastName: "  Rider ", email: ` PAT.${suffix}@Example.TEST `, phone: "+1 (503) 555-0199", street1: " 1 Bike Way ", city: " Portland ", state: " OR ", postalCode: " 97201 ", country: " us ", staff: true } });
  assert.equal(create.statusCode, 201); const personId = (create.json() as { id: string }).id;
  const stored = await db.person.findUniqueOrThrow({ where: { id: BigInt(personId) } });
  assert.equal(stored.displayName, "Pat Rider"); assert.equal(stored.email, `PAT.${suffix}@Example.TEST`); assert.equal(stored.normalizedEmail, `pat.${suffix}@example.test`); assert.equal(stored.normalizedPhone, "+15035550199"); assert.equal(stored.createdByUserId, 1n);
  const search = await app.inject({ method: "GET", url: `/api/organizations/${organization.id}/people?q=Pat`, headers: { cookie: auth.cookie } }); assert.equal(search.statusCode, 200); assert.ok((search.json() as { id: string }[]).some((person) => person.id === personId));
  const archive = await app.inject({ method: "POST", url: `/api/organizations/${organization.id}/people/${personId}/archive`, headers: { cookie: auth.cookie, "x-csrf-token": auth.csrf } }); assert.equal(archive.statusCode, 200);
  const hidden = await app.inject({ method: "GET", url: `/api/organizations/${organization.id}/people?q=Pat`, headers: { cookie: auth.cookie } }); assert.ok(!(hidden.json() as { id: string }[]).some((person) => person.id === personId));
  const retained = await app.inject({ method: "GET", url: `/api/organizations/${organization.id}/people/${personId}`, headers: { cookie: auth.cookie } }); assert.equal(retained.statusCode, 200); assert.ok((retained.json() as { archivedAt: string | null }).archivedAt);
  const checkIn = await app.inject({ method: "POST", url: `/api/organizations/${organization.id}/visits`, headers: { cookie: auth.cookie, "x-csrf-token": auth.csrf }, payload: { personId, activity: "project", arrivedAt: new Date().toISOString() } }); assert.equal(checkIn.statusCode, 404);
  const event = await db.personArchiveEvent.findFirstOrThrow({ where: { personId: BigInt(personId), action: "archive" } }); assert.equal(event.actorUserId, 1n);
  const restore = await app.inject({ method: "POST", url: `/api/organizations/${organization.id}/people/${personId}/restore`, headers: { cookie: auth.cookie, "x-csrf-token": auth.csrf } }); assert.equal(restore.statusCode, 200);
  const shown = await app.inject({ method: "GET", url: `/api/organizations/${organization.id}/people?q=Pat`, headers: { cookie: auth.cookie } }); assert.ok((shown.json() as { id: string }[]).some((person) => person.id === personId));
  const other = await db.organization.create({ data: { name: `Other ${suffix}`, key: `other-${suffix}`, timezone: "America/New_York" } });
  const crossRead = await app.inject({ method: "GET", url: `/api/organizations/${other.id}/people/${personId}`, headers: { cookie: auth.cookie } }); assert.equal(crossRead.statusCode, 403);
  const crossWrite = await app.inject({ method: "PUT", url: `/api/organizations/${other.id}/people/${personId}`, headers: { cookie: auth.cookie, "x-csrf-token": auth.csrf }, payload: { firstName: "Escape" } }); assert.equal(crossWrite.statusCode, 403);
});

test("tags are organization-owned and notes aggregate person, visit, and service targets with audit attribution", { skip: !db }, async () => {
  assert.ok(db && app); const organization = await db.organization.findUniqueOrThrow({ where: { key: "spike-shop" } }); const auth = await session();
  const person = await db.person.create({ data: { organizationId: organization.id, firstName: "Tagged", lastName: `Rider ${suffix}`, displayName: `Tagged Rider ${suffix}` } });
  const visit = await db.visit.create({ data: { organizationId: organization.id, personId: person.id, activity: "project", arrivedAt: new Date(), staffSnapshot: false, memberSnapshot: false } });
  const service = await db.service.create({ data: { organizationId: organization.id, personId: person.id, type: "membership" } });
  const headers = { cookie: auth.cookie, "x-csrf-token": auth.csrf };
  const volunteerName = `Volunteer ${suffix}`; const safetyName = `Safety ${suffix}`;
  const tags = await app.inject({ method: "PUT", url: `/api/organizations/${organization.id}/people/${person.id}/tags`, headers, payload: { names: [volunteerName, safetyName] } }); assert.equal(tags.statusCode, 200); assert.deepEqual((tags.json() as { name: string }[]).map((tag) => tag.name), [volunteerName, safetyName]);
  const listed = await app.inject({ method: "GET", url: `/api/organizations/${organization.id}/tags`, headers: { cookie: auth.cookie } }); assert.equal(listed.statusCode, 200); const volunteer = (listed.json() as { id: string; name: string; peopleCount: number }[]).find((tag) => tag.name === volunteerName); assert.ok(volunteer); assert.equal(volunteer.peopleCount, 1);
  const tagged = await app.inject({ method: "GET", url: `/api/organizations/${organization.id}/tags/${volunteer.id}`, headers: { cookie: auth.cookie } }); assert.equal(tagged.statusCode, 200); assert.equal((tagged.json() as { people: { id: string }[] }).people[0].id, person.id.toString());
  const createNote = async (target: Record<string, string>, text: string) => app.inject({ method: "POST", url: `/api/organizations/${organization.id}/notes`, headers, payload: { ...target, text } });
  const personNote = await createNote({ personId: person.id.toString() }, "person note"); const visitNote = await createNote({ visitId: visit.id.toString() }, "visit note"); const serviceNote = await createNote({ serviceId: service.id.toString() }, "service note");
  for (const response of [personNote, visitNote, serviceNote]) assert.equal(response.statusCode, 201); assert.equal((personNote.json() as { createdByUserId: string }).createdByUserId, "1");
  const aggregate = await app.inject({ method: "GET", url: `/api/organizations/${organization.id}/people/${person.id}/notes`, headers: { cookie: auth.cookie } }); assert.equal(aggregate.statusCode, 200); assert.deepEqual(new Set((aggregate.json() as { text: string }[]).map((note) => note.text)), new Set(["person note", "visit note", "service note"]));
  const update = await app.inject({ method: "PUT", url: `/api/organizations/${organization.id}/notes/${(personNote.json() as { id: string }).id}`, headers, payload: { text: "updated person note" } }); assert.equal(update.statusCode, 200); assert.equal((update.json() as { updatedByUserId: string }).updatedByUserId, "1");
  const other = await db.organization.create({ data: { name: `Tags other ${suffix}`, key: `tags-other-${suffix}`, timezone: "America/New_York" } });
  const crossTag = await app.inject({ method: "GET", url: `/api/organizations/${other.id}/tags/${volunteer.id}`, headers: { cookie: auth.cookie } }); assert.equal(crossTag.statusCode, 403);
  const crossNote = await app.inject({ method: "PUT", url: `/api/organizations/${other.id}/notes/${(personNote.json() as { id: string }).id}`, headers, payload: { text: "escape" } }); assert.equal(crossNote.statusCode, 403);
  const invalidTarget = await app.inject({ method: "POST", url: `/api/organizations/${organization.id}/notes`, headers, payload: { personId: person.id.toString(), visitId: visit.id.toString(), text: "invalid" } }); assert.equal(invalidTarget.statusCode, 400);
});

after(async () => { await app?.close(); await db?.$disconnect(); });
