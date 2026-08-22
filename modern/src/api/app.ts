import cookie from "@fastify/cookie";
import sensible from "@fastify/sensible";
import swagger from "@fastify/swagger";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { PrismaClient, VisitActivity } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { LoginBody, MembershipBody, MembershipParams, MembershipUpdateBody, NoteBody, NoteParams, NoteUpdateBody, OrganizationBody, OrganizationParams, OrganizationSettingsBody, PasswordBody, PersonBody, PersonParams, PersonTagParams, ProvisionUserBody, SearchQuery, TagAssignmentBody, TagParams, UserParams, UserSettingsBody, VisitBody, VisitParams } from "./contracts.js";

type Auth = { userId: bigint; organizationId: bigint | null; role: "manager" | "operator" | null; csrfTokenDigest: string; sessionId: string; passwordChangeRequired: boolean; platformAdministrator: boolean };
const sessionCookie = "freehub_session";
const bigint = (value: string) => BigInt(value);
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const token = () => randomBytes(32).toString("base64url");
const sessionLifetimeMs = () => Math.max(60, Number(process.env.SESSION_TTL_SECONDS || 8 * 60 * 60)) * 1000;
const sameDigest = (left: string | null, right: string) => Boolean(left && timingSafeEqual(Buffer.from(left), Buffer.from(digest(right))));
const today = () => new Date(new Date().toISOString().slice(0, 10));
const date = (value: string) => new Date(`${value}T00:00:00.000Z`);
const personJson = (person: { id: bigint; displayName: string; staff: boolean; archivedAt: Date | null }) => ({
  id: person.id.toString(), displayName: person.displayName, staff: person.staff, archivedAt: person.archivedAt
});
const noteJson = (note: { id: bigint; organizationId: bigint; personId: bigint | null; visitId: bigint | null; serviceId: bigint | null; text: string; createdByUserId: bigint | null; updatedByUserId: bigint | null; createdAt: Date; updatedAt: Date }) => ({ id: note.id.toString(), organizationId: note.organizationId.toString(), personId: note.personId?.toString() || null, visitId: note.visitId?.toString() || null, serviceId: note.serviceId?.toString() || null, text: note.text, createdByUserId: note.createdByUserId?.toString() || null, updatedByUserId: note.updatedByUserId?.toString() || null, createdAt: note.createdAt, updatedAt: note.updatedAt });
const trimmed = (value: string | null | undefined) => value?.trim() || null;
const normalizePhone = (value: string | null) => value ? `${value.trim().startsWith("+") ? "+" : ""}${value.replace(/\D/g, "")}` || null : null;
const personValues = (input: { firstName: string; lastName?: string | null; email?: string | null; phone?: string | null; street1?: string | null; street2?: string | null; city?: string | null; state?: string | null; postalCode?: string | null; country?: string | null; yearOfBirth?: number | null; staff?: boolean; emailOptOut?: boolean }) => {
  const firstName = input.firstName.trim(); const lastName = trimmed(input.lastName); const email = trimmed(input.email); const phone = trimmed(input.phone);
  return { firstName, lastName, displayName: [firstName, lastName].filter(Boolean).join(" "), email, normalizedEmail: email?.toLowerCase() || null, phone, normalizedPhone: normalizePhone(phone), street1: trimmed(input.street1), street2: trimmed(input.street2), city: trimmed(input.city), state: trimmed(input.state), postalCode: trimmed(input.postalCode), country: trimmed(input.country)?.toUpperCase() || null, yearOfBirth: input.yearOfBirth ?? null, staff: input.staff ?? false, emailOptOut: input.emailOptOut ?? false };
};

export async function buildApp(db = new PrismaClient()): Promise<FastifyInstance> {
  const app = (await import("fastify")).default({ logger: { level: process.env.LOG_LEVEL || "info", redact: ["req.headers.authorization", "req.headers.cookie", "req.body.password", "res.headers.set-cookie"] } });
  await app.register(cookie);
  await app.register(sensible);
  await app.register(swagger, { openapi: { info: { title: "Freehub API", version: "1.0.0" } } });
  app.setErrorHandler((error, request, reply) => {
    const safeError = error as { statusCode?: number; code?: string; message?: string };
    request.log.error({ err: error, requestId: request.id }, "request failed");
    const statusCode = safeError.statusCode && safeError.statusCode >= 400 ? safeError.statusCode : safeError.code === "P2002" ? 409 : 500;
    return reply.code(statusCode).send({ error: { code: safeError.code || "internal_error", message: statusCode < 500 ? safeError.message : "internal server error", requestId: request.id } });
  });

  async function authenticated(request: FastifyRequest): Promise<Auth> {
    const rawToken = request.cookies[sessionCookie];
    if (!rawToken) throw app.httpErrors.unauthorized();
    const session = await db.session.findUnique({ where: { tokenDigest: digest(rawToken) }, include: { user: true } });
    if (!session || session.expiresAt <= new Date() || session.revokedAt || session.user.disabledAt) throw app.httpErrors.unauthorized();
    return { userId: session.userId, organizationId: session.organizationId, role: null, csrfTokenDigest: session.csrfTokenDigest || "", sessionId: session.id, passwordChangeRequired: session.user.passwordChangeRequired, platformAdministrator: session.user.platformAdministrator };
  }
  async function csrf(request: FastifyRequest, auth: Auth) {
    const value = request.headers["x-csrf-token"];
    if (typeof value !== "string" || !sameDigest(auth.csrfTokenDigest, value)) throw app.httpErrors.forbidden("valid CSRF token required");
  }
  async function scoped(request: FastifyRequest, organizationId: string, options: { mutable?: boolean; allowPasswordChange?: boolean } = {}): Promise<Auth> {
    const auth = await authenticated(request);
    if (auth.passwordChangeRequired && !options.allowPasswordChange) throw app.httpErrors.forbidden("password change required");
    if (options.mutable) await csrf(request, auth);
    const orgId = bigint(organizationId);
    const membership = await db.organizationMembership.findFirst({ where: { organizationId: orgId, userId: auth.userId, startsAt: { lte: today() }, OR: [{ endsAt: null }, { endsAt: { gte: today() } }] } });
    if (!membership) throw app.httpErrors.forbidden("organization membership required");
    return { ...auth, organizationId: orgId, role: membership.role };
  }

  app.get("/up", { schema: { response: { 200: { type: "object", properties: { status: { type: "string" } }, required: ["status"] } } } }, async () => ({ status: "ok" }));
  app.post("/api/login", { schema: { body: LoginBody } }, async (request, reply) => {
    const { login, password } = request.body as { login: string; password: string };
    const user = await db.user.findFirst({ where: { login: { equals: login, mode: "insensitive" } } });
    if (!user || user.disabledAt || !(await bcrypt.compare(password, user.passwordDigest))) return reply.code(401).send({ error: "invalid credentials" });
    const membership = await db.organizationMembership.findFirst({ where: { userId: user.id }, orderBy: { organizationId: "asc" } });
    if (!membership) return reply.code(403).send({ error: "no organization membership" });
    const rawToken = token(); const csrfToken = token();
    await db.session.create({ data: { tokenDigest: digest(rawToken), csrfTokenDigest: digest(csrfToken), userId: user.id, organizationId: membership.organizationId, expiresAt: new Date(Date.now() + sessionLifetimeMs()) } });
    reply.header("cache-control", "no-store").setCookie(sessionCookie, rawToken, { httpOnly: true, sameSite: "lax", secure: process.env.COOKIE_SECURE !== "false", path: "/", maxAge: Math.floor(sessionLifetimeMs() / 1000) });
    return { organizationId: membership.organizationId.toString(), login: user.login, csrfToken, passwordChangeRequired: user.passwordChangeRequired };
  });
  app.post("/api/logout", async (request, reply) => { const auth = await authenticated(request); await csrf(request, auth); await db.session.update({ where: { id: auth.sessionId }, data: { revokedAt: new Date() } }); reply.clearCookie(sessionCookie, { path: "/" }); return reply.code(204).send(); });
  app.get("/api/session", async (request) => {
    const auth = await authenticated(request); const csrfToken = token();
    await db.session.update({ where: { id: auth.sessionId }, data: { csrfTokenDigest: digest(csrfToken) } });
    return { organizationId: auth.organizationId?.toString() || null, csrfToken, passwordChangeRequired: auth.passwordChangeRequired };
  });
  app.get("/api/organizations", async (request) => {
    const auth = await authenticated(request); if (auth.passwordChangeRequired) throw app.httpErrors.forbidden("password change required");
    const rows = await db.organizationMembership.findMany({ where: { userId: auth.userId, startsAt: { lte: today() }, OR: [{ endsAt: null }, { endsAt: { gte: today() } }] }, include: { organization: true } });
    return rows.map(({ organization, role }) => ({ id: organization.id.toString(), name: organization.name, key: organization.key, role }));
  });
  app.post("/api/password", { schema: { body: PasswordBody } }, async (request, reply) => {
    const auth = await authenticated(request); await csrf(request, auth);
    const { password } = request.body as { password: string };
    const passwordDigest = await bcrypt.hash(password, 12);
    await db.$transaction([db.user.update({ where: { id: auth.userId }, data: { passwordDigest, passwordChangeRequired: false } }), db.session.updateMany({ where: { userId: auth.userId, id: { not: auth.sessionId } }, data: { revokedAt: new Date() } })]);
    return reply.code(204).send();
  });
  app.post("/api/users/:userId/temporary-password", { schema: { params: UserParams } }, async (request, reply) => {
    const auth = await authenticated(request); await csrf(request, auth);
    if (!auth.platformAdministrator) throw app.httpErrors.forbidden("platform administrator required");
    const userId = bigint((request.params as { userId: string }).userId);
    const temporaryPassword = randomBytes(18).toString("base64url");
    const passwordDigest = await bcrypt.hash(temporaryPassword, 12);
    await db.$transaction([db.user.update({ where: { id: userId }, data: { passwordDigest, passwordChangeRequired: true, disabledAt: null } }), db.session.updateMany({ where: { userId }, data: { revokedAt: new Date() } })]);
    reply.header("cache-control", "no-store");
    return { temporaryPassword };
  });
  app.get("/api/users/me", async (request) => {
    const auth = await authenticated(request); const user = await db.user.findUniqueOrThrow({ where: { id: auth.userId } });
    return { id: user.id.toString(), login: user.login, name: user.name, email: user.email, platformAdministrator: user.platformAdministrator };
  });
  app.put("/api/users/me", { schema: { body: UserSettingsBody } }, async (request) => {
    const auth = await authenticated(request); await csrf(request, auth); const input = request.body as { name: string; email: string };
    const user = await db.user.update({ where: { id: auth.userId }, data: { name: input.name.trim(), email: input.email.trim().toLowerCase() } });
    return { id: user.id.toString(), login: user.login, name: user.name, email: user.email };
  });
  async function requireOrganizationAdministrator(request: FastifyRequest, organizationId: string) {
    const auth = await scoped(request, organizationId, { mutable: true });
    if (!auth.platformAdministrator && auth.role !== "manager") throw app.httpErrors.forbidden("organization manager required");
    return auth;
  }
  async function recordRoleChange(input: { organizationId: bigint; userId: bigint; actorUserId: bigint; action: "granted" | "changed" | "revoked"; previousRole?: "manager" | "operator"; role?: "manager" | "operator"; previousStartsAt?: Date; startsAt?: Date; previousEndsAt?: Date | null; endsAt?: Date | null }) {
    return db.roleAuditEvent.create({ data: input });
  }
  app.get("/api/organizations/:organizationId/settings", { schema: { params: OrganizationParams } }, async (request) => {
    const { organizationId } = request.params as { organizationId: string }; const auth = await scoped(request, organizationId);
    const organization = await db.organization.findUniqueOrThrow({ where: { id: bigint(organizationId) } });
    return { id: organization.id.toString(), name: organization.name, key: organization.key, timezone: organization.timezone, location: organization.location, canManage: auth.platformAdministrator || auth.role === "manager" };
  });
  app.put("/api/organizations/:organizationId/settings", { schema: { params: OrganizationParams, body: OrganizationSettingsBody } }, async (request) => {
    const { organizationId } = request.params as { organizationId: string }; await requireOrganizationAdministrator(request, organizationId); const input = request.body as { name: string; timezone: string; location?: string };
    const organization = await db.organization.update({ where: { id: bigint(organizationId) }, data: { name: input.name.trim(), timezone: input.timezone, location: input.location?.trim() || null } });
    return { id: organization.id.toString(), name: organization.name, key: organization.key, timezone: organization.timezone, location: organization.location };
  });
  app.get("/api/organizations/:organizationId/memberships", { schema: { params: OrganizationParams } }, async (request) => {
    const { organizationId } = request.params as { organizationId: string }; const auth = await scoped(request, organizationId);
    if (!auth.platformAdministrator && auth.role !== "manager") throw app.httpErrors.forbidden("organization manager required");
    const rows = await db.organizationMembership.findMany({ where: { organizationId: bigint(organizationId) }, include: { user: true }, orderBy: [{ user: { name: "asc" } }] });
    return rows.map((row) => ({ userId: row.userId.toString(), login: row.user.login, name: row.user.name, role: row.role, startsAt: row.startsAt.toISOString().slice(0, 10), endsAt: row.endsAt?.toISOString().slice(0, 10) || null }));
  });
  app.post("/api/organizations/:organizationId/memberships", { schema: { params: OrganizationParams, body: MembershipBody } }, async (request, reply) => {
    const { organizationId } = request.params as { organizationId: string }; const auth = await requireOrganizationAdministrator(request, organizationId); const input = request.body as { userId: string; role: "manager" | "operator"; startsAt?: string; endsAt?: string | null };
    const startsAt = input.startsAt ? date(input.startsAt) : today(); const endsAt = input.endsAt ? date(input.endsAt) : null; if (endsAt && endsAt < startsAt) throw app.httpErrors.badRequest("membership end date must not precede start date");
    await db.user.findUniqueOrThrow({ where: { id: bigint(input.userId) } });
    const membership = await db.organizationMembership.create({ data: { organizationId: bigint(organizationId), userId: bigint(input.userId), role: input.role, startsAt, endsAt } });
    await recordRoleChange({ organizationId: membership.organizationId, userId: membership.userId, actorUserId: auth.userId, action: "granted", role: membership.role, startsAt, endsAt });
    return reply.code(201).send({ userId: membership.userId.toString(), role: membership.role, startsAt: startsAt.toISOString().slice(0, 10), endsAt: endsAt?.toISOString().slice(0, 10) || null });
  });
  app.put("/api/organizations/:organizationId/memberships/:userId", { schema: { params: MembershipParams, body: MembershipUpdateBody } }, async (request) => {
    const { organizationId, userId } = request.params as { organizationId: string; userId: string }; const auth = await requireOrganizationAdministrator(request, organizationId); const input = request.body as { role: "manager" | "operator"; startsAt: string; endsAt?: string | null };
    const startsAt = date(input.startsAt); const endsAt = input.endsAt ? date(input.endsAt) : null; if (endsAt && endsAt < startsAt) throw app.httpErrors.badRequest("membership end date must not precede start date");
    const existing = await db.organizationMembership.findUniqueOrThrow({ where: { organizationId_userId: { organizationId: bigint(organizationId), userId: bigint(userId) } } });
    const membership = await db.organizationMembership.update({ where: { id: existing.id }, data: { role: input.role, startsAt, endsAt } });
    await recordRoleChange({ organizationId: membership.organizationId, userId: membership.userId, actorUserId: auth.userId, action: "changed", previousRole: existing.role, role: membership.role, previousStartsAt: existing.startsAt, startsAt, previousEndsAt: existing.endsAt, endsAt });
    return { userId: membership.userId.toString(), role: membership.role, startsAt: startsAt.toISOString().slice(0, 10), endsAt: endsAt?.toISOString().slice(0, 10) || null };
  });
  app.delete("/api/organizations/:organizationId/memberships/:userId", { schema: { params: MembershipParams } }, async (request, reply) => {
    const { organizationId, userId } = request.params as { organizationId: string; userId: string }; const auth = await requireOrganizationAdministrator(request, organizationId); const existing = await db.organizationMembership.findUniqueOrThrow({ where: { organizationId_userId: { organizationId: bigint(organizationId), userId: bigint(userId) } } }); const endsAt = today();
    await db.organizationMembership.update({ where: { id: existing.id }, data: { endsAt } }); await recordRoleChange({ organizationId: existing.organizationId, userId: existing.userId, actorUserId: auth.userId, action: "revoked", previousRole: existing.role, previousStartsAt: existing.startsAt, previousEndsAt: existing.endsAt, endsAt });
    return reply.code(204).send();
  });
  app.post("/api/admin/organizations", { schema: { body: OrganizationBody } }, async (request, reply) => {
    const auth = await authenticated(request); await csrf(request, auth); if (!auth.platformAdministrator) throw app.httpErrors.forbidden("platform administrator required"); const input = request.body as { name: string; key: string; timezone: string; location?: string; managerUserId: string };
    const organization = await db.$transaction(async (tx) => { await tx.user.findUniqueOrThrow({ where: { id: bigint(input.managerUserId) } }); const created = await tx.organization.create({ data: { name: input.name.trim(), key: input.key, timezone: input.timezone, location: input.location?.trim() || null } }); const membership = await tx.organizationMembership.create({ data: { organizationId: created.id, userId: bigint(input.managerUserId), role: "manager", startsAt: today() } }); await tx.roleAuditEvent.create({ data: { organizationId: created.id, userId: membership.userId, actorUserId: auth.userId, action: "granted", role: "manager", startsAt: membership.startsAt } }); return created; });
    return reply.code(201).send({ id: organization.id.toString(), name: organization.name, key: organization.key });
  });
  app.get("/api/admin/users", async (request) => {
    const auth = await authenticated(request); if (!auth.platformAdministrator) throw app.httpErrors.forbidden("platform administrator required");
    const users = await db.user.findMany({ include: { memberships: { include: { organization: true } } }, orderBy: { login: "asc" } });
    return users.map((user) => ({ id: user.id.toString(), login: user.login, name: user.name, email: user.email, disabledAt: user.disabledAt, memberships: user.memberships.map((membership) => ({ organizationId: membership.organizationId.toString(), organizationName: membership.organization.name, role: membership.role, startsAt: membership.startsAt.toISOString().slice(0, 10), endsAt: membership.endsAt?.toISOString().slice(0, 10) || null })) }));
  });
  app.post("/api/admin/users", { schema: { body: ProvisionUserBody } }, async (request, reply) => {
    const auth = await authenticated(request); await csrf(request, auth); if (!auth.platformAdministrator) throw app.httpErrors.forbidden("platform administrator required"); const input = request.body as { login: string; name: string; email: string };
    const temporaryPassword = randomBytes(18).toString("base64url"); const passwordDigest = await bcrypt.hash(temporaryPassword, 12);
    const user = await db.user.create({ data: { login: input.login.trim(), name: input.name.trim(), email: input.email.trim().toLowerCase(), passwordDigest, passwordChangeRequired: true } }); reply.header("cache-control", "no-store");
    return reply.code(201).send({ id: user.id.toString(), login: user.login, temporaryPassword });
  });
  app.get("/api/organizations/:organizationId/people", { schema: { params: OrganizationParams, querystring: SearchQuery } }, async (request) => {
    const { organizationId } = request.params as { organizationId: string }; const { q } = request.query as { q: string }; await scoped(request, organizationId);
    const people = await db.person.findMany({ where: { organizationId: bigint(organizationId), archivedAt: null, displayName: { contains: q, mode: "insensitive" } }, orderBy: { displayName: "asc" }, take: 15 });
    return people.map(personJson);
  });
  app.get("/api/organizations/:organizationId/people/:personId", { schema: { params: PersonParams } }, async (request) => {
    const { organizationId, personId } = request.params as { organizationId: string; personId: string }; await scoped(request, organizationId);
    const person = await db.person.findFirst({ where: { id: bigint(personId), organizationId: bigint(organizationId) }, include: { visits: { orderBy: { arrivedAt: "desc" }, take: 10 }, services: true, tags: { include: { tag: true } } } });
    if (!person) throw app.httpErrors.notFound(); return { ...personJson(person), firstName: person.firstName, lastName: person.lastName, email: person.email, phone: person.phone, street1: person.street1, street2: person.street2, city: person.city, state: person.state, postalCode: person.postalCode, country: person.country, yearOfBirth: person.yearOfBirth, emailOptOut: person.emailOptOut, archivedByUserId: person.archivedByUserId?.toString() || null, tags: person.tags.map(({ tag }) => ({ id: tag.id.toString(), name: tag.name })), visits: person.visits.map((visit) => ({ ...visit, id: visit.id.toString(), personId: visit.personId.toString(), organizationId: visit.organizationId.toString() })), services: person.services.map((service) => ({ id: service.id.toString(), type: service.type, startDate: service.startDate, endDate: service.endDate, paid: service.paid, volunteered: service.volunteered })) };
  });
  app.post("/api/organizations/:organizationId/people", { schema: { params: OrganizationParams, body: PersonBody } }, async (request, reply) => {
    const { organizationId } = request.params as { organizationId: string }; const auth = await scoped(request, organizationId, { mutable: true }); const input = request.body as Parameters<typeof personValues>[0]; if (!input.firstName.trim()) throw app.httpErrors.badRequest("first name is required"); const values = personValues(input); if (values.country && values.country.length !== 2) throw app.httpErrors.badRequest("country must be a two-letter code");
    const person = await db.person.create({ data: { ...values, organizationId: bigint(organizationId), createdByUserId: auth.userId, updatedByUserId: auth.userId } }); return reply.code(201).send(personJson(person));
  });
  app.put("/api/organizations/:organizationId/people/:personId", { schema: { params: PersonParams, body: PersonBody } }, async (request) => {
    const { organizationId, personId } = request.params as { organizationId: string; personId: string }; const auth = await scoped(request, organizationId, { mutable: true }); const existing = await db.person.findFirst({ where: { id: bigint(personId), organizationId: bigint(organizationId) } }); if (!existing) throw app.httpErrors.notFound(); const input = request.body as Parameters<typeof personValues>[0]; if (!input.firstName.trim()) throw app.httpErrors.badRequest("first name is required");
    const values = personValues(input); if (values.country && values.country.length !== 2) throw app.httpErrors.badRequest("country must be a two-letter code"); const person = await db.person.update({ where: { id: existing.id }, data: { ...values, updatedByUserId: auth.userId } }); return personJson(person);
  });
  for (const action of ["archive", "restore"] as const) app.post(`/api/organizations/:organizationId/people/:personId/${action}`, { schema: { params: PersonParams } }, async (request) => {
    const { organizationId, personId } = request.params as { organizationId: string; personId: string }; const auth = await scoped(request, organizationId, { mutable: true }); const existing = await db.person.findFirst({ where: { id: bigint(personId), organizationId: bigint(organizationId) } }); if (!existing) throw app.httpErrors.notFound();
    if (action === "archive" && existing.archivedAt) throw app.httpErrors.conflict("person is already archived"); if (action === "restore" && !existing.archivedAt) throw app.httpErrors.conflict("person is not archived");
    const person = await db.$transaction(async (tx) => { const updated = await tx.person.update({ where: { id: existing.id }, data: action === "archive" ? { archivedAt: new Date(), archivedByUserId: auth.userId, updatedByUserId: auth.userId } : { archivedAt: null, archivedByUserId: null, updatedByUserId: auth.userId } }); await tx.personArchiveEvent.create({ data: { organizationId: updated.organizationId, personId: updated.id, actorUserId: auth.userId, action } }); return updated; }); return personJson(person);
  });
  app.get("/api/organizations/:organizationId/tags", { schema: { params: OrganizationParams } }, async (request) => {
    const { organizationId } = request.params as { organizationId: string }; await scoped(request, organizationId);
    const tags = await db.tag.findMany({ where: { organizationId: bigint(organizationId) }, include: { _count: { select: { people: true } } }, orderBy: { name: "asc" } });
    return tags.map((tag) => ({ id: tag.id.toString(), name: tag.name, peopleCount: tag._count.people }));
  });
  app.get("/api/organizations/:organizationId/tags/:tagId", { schema: { params: TagParams } }, async (request) => {
    const { organizationId, tagId } = request.params as { organizationId: string; tagId: string }; await scoped(request, organizationId);
    const tag = await db.tag.findFirst({ where: { id: bigint(tagId), organizationId: bigint(organizationId) }, include: { people: { include: { person: true }, orderBy: { person: { displayName: "asc" } } } } });
    if (!tag) throw app.httpErrors.notFound();
    return { id: tag.id.toString(), name: tag.name, people: tag.people.map(({ person }) => personJson(person)) };
  });
  app.put("/api/organizations/:organizationId/people/:personId/tags", { schema: { params: PersonParams, body: TagAssignmentBody } }, async (request) => {
    const { organizationId, personId } = request.params as { organizationId: string; personId: string }; const auth = await scoped(request, organizationId, { mutable: true }); const organizationIdBigint = bigint(organizationId);
    const person = await db.person.findFirst({ where: { id: bigint(personId), organizationId: organizationIdBigint } }); if (!person) throw app.httpErrors.notFound();
    const rawNames = (request.body as { names: string[] }).names.map((name) => name.trim()).filter(Boolean); const names = [...new Map(rawNames.map((name) => [name.toLocaleLowerCase(), name])).values()];
    if (names.length !== rawNames.length) throw app.httpErrors.badRequest("tag names must be unique");
    const tags = await db.$transaction(async (tx) => {
      const resolved = [];
      for (const name of names) {
        const existing = await tx.tag.findFirst({ where: { organizationId: organizationIdBigint, name: { equals: name, mode: "insensitive" } } });
        resolved.push(existing || await tx.tag.create({ data: { organizationId: organizationIdBigint, name } }));
      }
      if (resolved.length) await tx.personTag.createMany({ data: resolved.map((tag) => ({ organizationId: organizationIdBigint, personId: person.id, tagId: tag.id })), skipDuplicates: true });
      return resolved;
    });
    void auth;
    return tags.map((tag) => ({ id: tag.id.toString(), name: tag.name }));
  });
  app.delete("/api/organizations/:organizationId/people/:personId/tags/:tagId", { schema: { params: PersonTagParams } }, async (request, reply) => {
    const { organizationId, personId, tagId } = request.params as { organizationId: string; personId: string; tagId: string }; await scoped(request, organizationId, { mutable: true }); const organizationIdBigint = bigint(organizationId);
    const assignment = await db.personTag.findFirst({ where: { organizationId: organizationIdBigint, personId: bigint(personId), tagId: bigint(tagId) } }); if (!assignment) throw app.httpErrors.notFound(); await db.personTag.delete({ where: { id: assignment.id } }); return reply.code(204).send();
  });
  async function noteTarget(organizationId: bigint, input: { personId?: string; visitId?: string; serviceId?: string }) {
    const targets = (["personId", "visitId", "serviceId"] as const).filter((field) => input[field]);
    if (targets.length !== 1) throw app.httpErrors.badRequest("a note must have exactly one target");
    const field = targets[0]; const id = bigint(input[field]!);
    const target = field === "personId" ? await db.person.findFirst({ where: { id, organizationId } }) : field === "visitId" ? await db.visit.findFirst({ where: { id, organizationId } }) : await db.service.findFirst({ where: { id, organizationId } });
    if (!target) throw app.httpErrors.notFound("note target not found");
    return { personId: field === "personId" ? id : null, visitId: field === "visitId" ? id : null, serviceId: field === "serviceId" ? id : null };
  }
  app.get("/api/organizations/:organizationId/people/:personId/notes", { schema: { params: PersonParams } }, async (request) => {
    const { organizationId, personId } = request.params as { organizationId: string; personId: string }; await scoped(request, organizationId); const organizationIdBigint = bigint(organizationId); const personIdBigint = bigint(personId);
    const person = await db.person.findFirst({ where: { id: personIdBigint, organizationId: organizationIdBigint } }); if (!person) throw app.httpErrors.notFound();
    const notes = await db.note.findMany({ where: { organizationId: organizationIdBigint, OR: [{ personId: personIdBigint }, { visit: { personId: personIdBigint } }, { service: { personId: personIdBigint } }] }, orderBy: { createdAt: "desc" } });
    return notes.map(noteJson);
  });
  app.get("/api/organizations/:organizationId/notes/:noteId", { schema: { params: NoteParams } }, async (request) => {
    const { organizationId, noteId } = request.params as { organizationId: string; noteId: string }; await scoped(request, organizationId); const note = await db.note.findFirst({ where: { id: bigint(noteId), organizationId: bigint(organizationId) } }); if (!note) throw app.httpErrors.notFound(); return noteJson(note);
  });
  app.post("/api/organizations/:organizationId/notes", { schema: { params: OrganizationParams, body: NoteBody } }, async (request, reply) => {
    const { organizationId } = request.params as { organizationId: string }; const auth = await scoped(request, organizationId, { mutable: true }); const input = request.body as { text: string; personId?: string; visitId?: string; serviceId?: string }; const text = input.text.trim(); if (!text) throw app.httpErrors.badRequest("note text is required");
    const note = await db.note.create({ data: { organizationId: bigint(organizationId), ...await noteTarget(bigint(organizationId), input), text, createdByUserId: auth.userId, updatedByUserId: auth.userId } }); return reply.code(201).send(noteJson(note));
  });
  app.put("/api/organizations/:organizationId/notes/:noteId", { schema: { params: NoteParams, body: NoteUpdateBody } }, async (request) => {
    const { organizationId, noteId } = request.params as { organizationId: string; noteId: string }; const auth = await scoped(request, organizationId, { mutable: true }); const existing = await db.note.findFirst({ where: { id: bigint(noteId), organizationId: bigint(organizationId) } }); if (!existing) throw app.httpErrors.notFound(); const text = (request.body as { text: string }).text.trim(); if (!text) throw app.httpErrors.badRequest("note text is required"); return noteJson(await db.note.update({ where: { id: existing.id }, data: { text, updatedByUserId: auth.userId } }));
  });
  app.delete("/api/organizations/:organizationId/notes/:noteId", { schema: { params: NoteParams } }, async (request, reply) => {
    const { organizationId, noteId } = request.params as { organizationId: string; noteId: string }; await scoped(request, organizationId, { mutable: true }); const existing = await db.note.findFirst({ where: { id: bigint(noteId), organizationId: bigint(organizationId) } }); if (!existing) throw app.httpErrors.notFound(); await db.note.delete({ where: { id: existing.id } }); return reply.code(204).send();
  });
  app.post("/api/organizations/:organizationId/visits", { schema: { params: OrganizationParams, body: VisitBody } }, async (request, reply) => {
    const { organizationId } = request.params as { organizationId: string }; const input = request.body as { personId: string; activity: VisitActivity; arrivedAt: string }; await scoped(request, organizationId, { mutable: true });
    const person = await db.person.findFirst({ where: { id: bigint(input.personId), organizationId: bigint(organizationId), archivedAt: null }, include: { services: true } }); if (!person) throw app.httpErrors.notFound("active person not found");
    const day = input.arrivedAt.slice(0, 10); const member = person.services.some((service) => service.type === "membership" && (!service.startDate || service.startDate <= new Date(day)) && (!service.endDate || service.endDate >= new Date(day)));
    const visit = await db.visit.create({ data: { organizationId: bigint(organizationId), personId: person.id, activity: input.activity, arrivedAt: new Date(input.arrivedAt), staffSnapshot: person.staff, memberSnapshot: member } });
    return reply.code(201).send({ id: visit.id.toString(), staffSnapshot: visit.staffSnapshot, memberSnapshot: visit.memberSnapshot });
  });
  for (const [action, field] of [["sign-in", "startedAt"], ["sign-out", "endedAt"]] as const) app.post(`/api/organizations/:organizationId/visits/:visitId/${action}`, { schema: { params: VisitParams } }, async (request) => {
    const { organizationId, visitId } = request.params as { organizationId: string; visitId: string }; await scoped(request, organizationId, { mutable: true });
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
