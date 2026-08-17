import cookie from "@fastify/cookie";
import sensible from "@fastify/sensible";
import swagger from "@fastify/swagger";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { PrismaClient, VisitActivity } from "@prisma/client";
import bcrypt from "bcryptjs";
import { LoginBody, OrganizationParams, PersonParams, SearchQuery, VisitBody, VisitParams } from "./contracts.js";

type Auth = { userId: bigint; organizationId: bigint; role: "manager" | "operator" };
const sessionCookie = "freehub_session";
const bigint = (value: string) => BigInt(value);
const personJson = (person: { id: bigint; displayName: string; staff: boolean; archivedAt: Date | null }) => ({
  id: person.id.toString(), displayName: person.displayName, staff: person.staff, archivedAt: person.archivedAt
});

export async function buildApp(db = new PrismaClient()): Promise<FastifyInstance> {
  const app = (await import("fastify")).default({ logger: { level: process.env.LOG_LEVEL || "info" } });
  await app.register(cookie);
  await app.register(sensible);
  await app.register(swagger, { openapi: { info: { title: "Freehub API", version: "1.0.0" } } });
  app.setErrorHandler((error, request, reply) => {
    const safeError = error as { statusCode?: number; code?: string; message?: string };
    request.log.error({ err: error, requestId: request.id }, "request failed");
    const statusCode = safeError.statusCode && safeError.statusCode >= 400 ? safeError.statusCode : 500;
    return reply.code(statusCode).send({ error: { code: safeError.code || "internal_error", message: statusCode < 500 ? safeError.message : "internal server error", requestId: request.id } });
  });

  async function scoped(request: FastifyRequest, organizationId: string): Promise<Auth> {
    const sessionId = request.cookies[sessionCookie];
    if (!sessionId) throw app.httpErrors.unauthorized();
    const session = await db.session.findUnique({ where: { id: sessionId } });
    if (!session || session.expiresAt <= new Date()) throw app.httpErrors.unauthorized();
    const orgId = bigint(organizationId);
    const membership = await db.organizationMembership.findUnique({ where: { organizationId_userId: { organizationId: orgId, userId: session.userId } } });
    if (!membership) throw app.httpErrors.forbidden("organization membership required");
    return { userId: session.userId, organizationId: orgId, role: membership.role };
  }

  app.get("/up", { schema: { response: { 200: { type: "object", properties: { status: { type: "string" } }, required: ["status"] } } } }, async () => ({ status: "ok" }));
  app.post("/api/login", { schema: { body: LoginBody } }, async (request, reply) => {
    const { login, password } = request.body as { login: string; password: string };
    const user = await db.user.findFirst({ where: { login: { equals: login, mode: "insensitive" } } });
    if (!user || !(await bcrypt.compare(password, user.passwordDigest))) return reply.code(401).send({ error: "invalid credentials" });
    const membership = await db.organizationMembership.findFirst({ where: { userId: user.id }, orderBy: { organizationId: "asc" } });
    if (!membership) return reply.code(403).send({ error: "no organization membership" });
    const session = await db.session.create({ data: { userId: user.id, organizationId: membership.organizationId, expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000) } });
    reply.setCookie(sessionCookie, session.id, { httpOnly: true, sameSite: "lax", path: "/" });
    return { organizationId: membership.organizationId.toString(), login: user.login };
  });
  app.post("/api/logout", async (request, reply) => { if (request.cookies[sessionCookie]) await db.session.deleteMany({ where: { id: request.cookies[sessionCookie] } }); reply.clearCookie(sessionCookie, { path: "/" }); return reply.code(204).send(); });
  app.get("/api/organizations", async (request) => {
    const sessionId = request.cookies[sessionCookie]; if (!sessionId) throw app.httpErrors.unauthorized();
    const session = await db.session.findUnique({ where: { id: sessionId } }); if (!session) throw app.httpErrors.unauthorized();
    const rows = await db.organizationMembership.findMany({ where: { userId: session.userId }, include: { organization: true } });
    return rows.map(({ organization, role }) => ({ id: organization.id.toString(), name: organization.name, key: organization.key, role }));
  });
  app.get("/api/organizations/:organizationId/people", { schema: { params: OrganizationParams, querystring: SearchQuery } }, async (request) => {
    const { organizationId } = request.params as { organizationId: string }; const { q } = request.query as { q: string }; await scoped(request, organizationId);
    const people = await db.person.findMany({ where: { organizationId: bigint(organizationId), archivedAt: null, displayName: { contains: q, mode: "insensitive" } }, orderBy: { displayName: "asc" }, take: 15 });
    return people.map(personJson);
  });
  app.get("/api/organizations/:organizationId/people/:personId", { schema: { params: PersonParams } }, async (request) => {
    const { organizationId, personId } = request.params as { organizationId: string; personId: string }; await scoped(request, organizationId);
    const person = await db.person.findFirst({ where: { id: bigint(personId), organizationId: bigint(organizationId) }, include: { visits: { orderBy: { arrivedAt: "desc" }, take: 10 }, services: true } });
    if (!person) throw app.httpErrors.notFound(); return { ...personJson(person), visits: person.visits.map((visit) => ({ ...visit, id: visit.id.toString(), personId: visit.personId.toString(), organizationId: visit.organizationId.toString() })), services: person.services.map((service) => ({ id: service.id.toString(), type: service.type, startDate: service.startDate, endDate: service.endDate, paid: service.paid, volunteered: service.volunteered })) };
  });
  app.post("/api/organizations/:organizationId/visits", { schema: { params: OrganizationParams, body: VisitBody } }, async (request, reply) => {
    const { organizationId } = request.params as { organizationId: string }; const input = request.body as { personId: string; activity: VisitActivity; arrivedAt: string }; await scoped(request, organizationId);
    const person = await db.person.findFirst({ where: { id: bigint(input.personId), organizationId: bigint(organizationId), archivedAt: null }, include: { services: true } }); if (!person) throw app.httpErrors.notFound("active person not found");
    const day = input.arrivedAt.slice(0, 10); const member = person.services.some((service) => service.type === "membership" && (!service.startDate || service.startDate <= new Date(day)) && (!service.endDate || service.endDate >= new Date(day)));
    const visit = await db.visit.create({ data: { organizationId: bigint(organizationId), personId: person.id, activity: input.activity, arrivedAt: new Date(input.arrivedAt), staffSnapshot: person.staff, memberSnapshot: member } });
    return reply.code(201).send({ id: visit.id.toString(), staffSnapshot: visit.staffSnapshot, memberSnapshot: visit.memberSnapshot });
  });
  for (const [action, field] of [["sign-in", "startedAt"], ["sign-out", "endedAt"]] as const) app.post(`/api/organizations/:organizationId/visits/:visitId/${action}`, { schema: { params: VisitParams } }, async (request) => {
    const { organizationId, visitId } = request.params as { organizationId: string; visitId: string }; await scoped(request, organizationId);
    const existing = await db.visit.findFirst({ where: { id: bigint(visitId), organizationId: bigint(organizationId) } }); if (!existing) throw app.httpErrors.notFound();
    const now = new Date(); const values = field === "endedAt" ? { endedAt: now, durationSeconds: existing.startedAt ? Math.max(0, Math.round((now.getTime() - existing.startedAt.getTime()) / 1000)) : null } : { startedAt: now };
    const visit = await db.visit.update({ where: { id: existing.id }, data: values }); return { id: visit.id.toString(), durationSeconds: visit.durationSeconds };
  });
  app.get("/api/organizations/:organizationId/reports/people.csv", { schema: { params: OrganizationParams } }, async (request, reply) => {
    const { organizationId } = request.params as { organizationId: string }; await scoped(request, organizationId); const people = await db.person.findMany({ where: { organizationId: bigint(organizationId) }, orderBy: { displayName: "asc" } });
    const body = ["id,display_name,archived", ...people.map((p) => `${p.id},${JSON.stringify(p.displayName)},${p.archivedAt ? "true" : "false"}`)].join("\n") + "\n";
    return reply.header("content-type", "text/csv; charset=utf-8").header("content-disposition", "attachment; filename=people.csv").send(body);
  });
  return app;
}
