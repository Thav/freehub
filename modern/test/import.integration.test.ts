import test, { after } from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { buildApp } from "../src/api/app.js";

const db = process.env.DATABASE_URL ? new PrismaClient() : null;
const app = db ? await buildApp(db) : null;
const suffix = randomBytes(12).toString("hex");
const source = (text: string) => Buffer.from(text).toString("base64");
const session = async (login = "manager") => { assert.ok(app); const response = await app.inject({ method: "POST", url: "/api/login", payload: { login, password: "spike-password" } }); assert.equal(response.statusCode, 200); const header = response.headers["set-cookie"]; const cookie = (Array.isArray(header) ? header[0] : header)?.split(";", 1)[0]; assert.ok(cookie); return { cookie, csrf: (response.json() as { csrfToken: string }).csrfToken }; };

test("imports preview, safely apply, skip matches, reject duplicates, and are idempotent", { skip: !db }, async () => {
  assert.ok(db && app); const organization = await db.organization.findUniqueOrThrow({ where: { key: "spike-shop" } }); const auth = await session(); const headers = { cookie: auth.cookie, "x-csrf-token": auth.csrf };
  const csv = `first_name,last_name,email,phone,service_type,service_start_date,service_end_date\nNew,Member-${suffix},new.${suffix}@example.test,+1 503 ${suffix.slice(0, 8)},,,\nAda,Rider,ada@example.test,,\nDuplicate,Member,new.${suffix}@example.test,,\nBroken,Date,,,membership,invalid,2026-12-31\n`; const payload = { sourceBase64: source(csv), defaultService: { type: "membership", startDate: "2026-01-01", endDate: "2026-12-31", paid: true } };
  const preview = await app.inject({ method: "POST", url: `/api/organizations/${organization.id}/imports/preview`, headers, payload }); assert.equal(preview.statusCode, 201); const job = preview.json() as { id: string; format: string; summary: { creates: number; matches: number; rejected: number }; rows: { rowNumber: number; displayName: string | null }[] }; assert.equal(job.format, "freehub"); assert.deepEqual(job.summary, { creates: 1, matches: 1, rejected: 2 }); assert.equal(job.rows.find((row) => row.rowNumber === 2)?.displayName, `New Member-${suffix}`);
  const retry = await app.inject({ method: "POST", url: `/api/organizations/${organization.id}/imports/preview`, headers, payload }); assert.equal(retry.statusCode, 200); assert.equal((retry.json() as { id: string }).id, job.id);
  const applied = await app.inject({ method: "POST", url: `/api/organizations/${organization.id}/imports/${job.id}/apply`, headers, payload }); assert.equal(applied.statusCode, 200); assert.equal((applied.json() as { status: string }).status, "applied"); const created = await db.person.findFirstOrThrow({ where: { organizationId: organization.id, normalizedEmail: `new.${suffix}@example.test` }, include: { services: true } }); assert.equal(created.services.length, 1); assert.equal(created.services[0].paid, true);
  const noOp = await app.inject({ method: "POST", url: `/api/organizations/${organization.id}/imports/${job.id}/apply`, headers, payload }); assert.equal(noOp.statusCode, 200); assert.equal(await db.person.count({ where: { organizationId: organization.id, normalizedEmail: `new.${suffix}@example.test` } }), 1);
  const report = await app.inject({ method: "GET", url: `/api/organizations/${organization.id}/imports/${job.id}/rejections.csv`, headers: { cookie: auth.cookie } }); assert.equal(report.statusCode, 200); assert.match(report.body, /duplicate row/); assert.match(String(report.headers["content-disposition"]), /rejections\.csv/);
});

test("imports require a manager and remain organization scoped", { skip: !db }, async () => {
  assert.ok(db && app); const organization = await db.organization.findUniqueOrThrow({ where: { key: "spike-shop" } }); const other = await session("other-manager"); const payload = { sourceBase64: source("First Name,Last Name,Email\nCora,Sizio,cora@example.test\n") };
  const crossTenant = await app.inject({ method: "POST", url: `/api/organizations/${organization.id}/imports/preview`, headers: { cookie: other.cookie, "x-csrf-token": other.csrf }, payload }); assert.equal(crossTenant.statusCode, 403);
  const anonymous = await app.inject({ method: "POST", url: `/api/organizations/${organization.id}/imports/preview`, payload }); assert.equal(anonymous.statusCode, 401);
});

after(async () => { await app?.close(); await db?.$disconnect(); });
