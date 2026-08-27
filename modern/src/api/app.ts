import cookie from "@fastify/cookie";
import sensible from "@fastify/sensible";
import swagger from "@fastify/swagger";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { ImportDisposition, Prisma, PrismaClient, ServiceType, VisitActivity } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { Readable } from "node:stream";
import { BulkPeopleBody, BulkPeopleQuery, ImportApplyBody, ImportJobParams, ImportPreviewBody, LoginBody, MembershipBody, MembershipParams, MembershipUpdateBody, NoteBody, NoteParams, NoteUpdateBody, OrganizationBody, OrganizationParams, OrganizationSettingsBody, PasswordBody, PersonBody, PersonParams, PersonTagParams, ProvisionUserBody, ReportQuery, SearchQuery, ServiceBody, ServiceParams, ServiceRenewalBody, SummaryQuery, TagAssignmentBody, TagParams, UserParams, UserSettingsBody, VisitActionBody, VisitBody, VisitDayParams, VisitListQuery, VisitParams, VisitTransferBody, VisitUpdateBody } from "./contracts.js";
import { normalizeName, normalizePhone, parseImport, type ImportPerson, type ImportService, type ParsedFile } from "../import/csv.js";

type Auth = { userId: bigint; login: string; name: string; organizationId: bigint | null; role: "manager" | "operator" | null; csrfTokenDigest: string; sessionId: string; passwordChangeRequired: boolean; platformAdministrator: boolean };
const sessionCookie = "freehub_session";
const bigint = (value: string) => BigInt(value);
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const token = () => randomBytes(32).toString("base64url");
const sessionLifetimeMs = () => Math.max(60, Number(process.env.SESSION_TTL_SECONDS || 8 * 60 * 60)) * 1000;
const sameDigest = (left: string | null, right: string) => Boolean(left && timingSafeEqual(Buffer.from(left), Buffer.from(digest(right))));
const today = () => new Date(new Date().toISOString().slice(0, 10));
const date = (value: string) => new Date(`${value}T00:00:00.000Z`);
const instant = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error("invalid timestamp");
  return parsed;
};
const nextDay = (day: string) => {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, date + 1)).toISOString().slice(0, 10);
};
const previousDay = (day: string) => {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, date - 1)).toISOString().slice(0, 10);
};
const zonedDayStart = (day: string, timezone: string) => {
  const [year, month, date] = day.split("-").map(Number);
  const guess = Date.UTC(year, month - 1, date);
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(new Date(guess));
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return new Date(guess - (Date.UTC(value("year"), value("month") - 1, value("day"), value("hour"), value("minute"), value("second")) - guess));
};
const localDay = (at: Date, timezone: string) => { const parts = new Intl.DateTimeFormat("en-US", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(at); const value = (type: string) => parts.find((part) => part.type === type)?.value; return `${value("year")}-${value("month")}-${value("day")}`; };
const visitJson = (visit: { id: bigint; organizationId: bigint; personId: bigint; activity: string; arrivedAt: Date | null; startedAt: Date | null; endedAt: Date | null; durationSeconds: number | null; staffSnapshot: boolean; memberSnapshot: boolean; createdByUserId: bigint | null; updatedByUserId: bigint | null; cancelledAt: Date | null; cancelledByUserId: bigint | null; createdAt: Date; updatedAt: Date; person?: { displayName: string } }) => ({ id: visit.id.toString(), organizationId: visit.organizationId.toString(), personId: visit.personId.toString(), activity: visit.activity, arrivedAt: visit.arrivedAt, startedAt: visit.startedAt, endedAt: visit.endedAt, durationSeconds: visit.durationSeconds, staffSnapshot: visit.staffSnapshot, memberSnapshot: visit.memberSnapshot, createdByUserId: visit.createdByUserId?.toString() || null, updatedByUserId: visit.updatedByUserId?.toString() || null, cancelledAt: visit.cancelledAt, cancelledByUserId: visit.cancelledByUserId?.toString() || null, createdAt: visit.createdAt, updatedAt: visit.updatedAt, person: visit.person ? { displayName: visit.person.displayName } : undefined });
const duration = (startedAt: Date | null, endedAt: Date | null) => {
  if (!startedAt || !endedAt) return null;
  const seconds = Math.round((endedAt.getTime() - startedAt.getTime()) / 1000);
  if (seconds < 0) throw new Error("sign-out must not precede sign-in");
  return seconds;
};
const personJson = (person: { id: bigint; displayName: string; staff: boolean; archivedAt: Date | null }) => ({
  id: person.id.toString(), displayName: person.displayName, staff: person.staff, archivedAt: person.archivedAt
});
const dayString = (value: Date | null) => value?.toISOString().slice(0, 10) || null;
type ApiServiceType = "membership" | "earn_a_bike" | "class";
const databaseServiceType = (type: ApiServiceType) => type === "class" ? ServiceType.class_ : type;
const serviceJson = (service: { id: bigint; organizationId: bigint; personId: bigint; type: ServiceType; startDate: Date | null; endDate: Date | null; paid: boolean; volunteered: boolean; createdByUserId: bigint | null; updatedByUserId: bigint | null; createdAt: Date; updatedAt: Date }) => ({ id: service.id.toString(), organizationId: service.organizationId.toString(), personId: service.personId.toString(), type: service.type === ServiceType.class_ ? "class" : service.type, startDate: dayString(service.startDate), endDate: dayString(service.endDate), paid: service.paid, volunteered: service.volunteered, createdByUserId: service.createdByUserId?.toString() || null, updatedByUserId: service.updatedByUserId?.toString() || null, createdAt: service.createdAt, updatedAt: service.updatedAt });
const serviceSnapshot = (service: { type: ServiceType; startDate: Date | null; endDate: Date | null; paid: boolean; volunteered: boolean }) => ({ type: service.type === ServiceType.class_ ? "class" : service.type, startDate: dayString(service.startDate), endDate: dayString(service.endDate), paid: service.paid, volunteered: service.volunteered });
const noteJson = (note: { id: bigint; organizationId: bigint; personId: bigint | null; visitId: bigint | null; serviceId: bigint | null; text: string; createdByUserId: bigint | null; updatedByUserId: bigint | null; createdAt: Date; updatedAt: Date }, userNames: ReadonlyMap<string, string> = new Map()) => ({ id: note.id.toString(), organizationId: note.organizationId.toString(), personId: note.personId?.toString() || null, visitId: note.visitId?.toString() || null, serviceId: note.serviceId?.toString() || null, text: note.text, createdByUserId: note.createdByUserId?.toString() || null, updatedByUserId: note.updatedByUserId?.toString() || null, createdByName: note.createdByUserId ? userNames.get(note.createdByUserId.toString()) || null : null, updatedByName: note.updatedByUserId ? userNames.get(note.updatedByUserId.toString()) || null : null, createdAt: note.createdAt, updatedAt: note.updatedAt });
const trimmed = (value: string | null | undefined) => value?.trim() || null;
const normalizedPhone = (value: string | null) => normalizePhone(value || undefined) || null;
const personValues = (input: { firstName: string; lastName?: string | null; email?: string | null; phone?: string | null; street1?: string | null; street2?: string | null; city?: string | null; state?: string | null; postalCode?: string | null; country?: string | null; yearOfBirth?: number | null; staff?: boolean; emailOptOut?: boolean }) => {
  const firstName = input.firstName.trim(); const lastName = trimmed(input.lastName); const email = trimmed(input.email); const phone = trimmed(input.phone);
  return { firstName, lastName, displayName: [firstName, lastName].filter(Boolean).join(" "), email, normalizedEmail: email?.toLowerCase() || null, phone, normalizedPhone: normalizedPhone(phone), street1: trimmed(input.street1), street2: trimmed(input.street2), city: trimmed(input.city), state: trimmed(input.state), postalCode: trimmed(input.postalCode), country: trimmed(input.country)?.toUpperCase() || null, yearOfBirth: input.yearOfBirth ?? null, staff: input.staff ?? false, emailOptOut: input.emailOptOut ?? false };
};
const csv = (values: Array<string | number | boolean | null | undefined>) => values.map((value) => { const text = value === null || value === undefined ? "" : String(value); return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text; }).join(",");
const reportFilename = (key: string, report: string, after?: string, before?: string) => `${key}_${report}${after || before ? `_${after || "all"}_${before || "all"}` : ""}.csv`;
const pageOf = (value?: number) => value || 1;
const reportPageSize = 25;

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
    return { userId: session.userId, login: session.user.login, name: session.user.name, organizationId: session.organizationId, role: null, csrfTokenDigest: session.csrfTokenDigest || "", sessionId: session.id, passwordChangeRequired: session.user.passwordChangeRequired, platformAdministrator: session.user.platformAdministrator };
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
  const importJobJson = (job: { id: bigint; format: string; status: string; sourceSha256: string; createdAt: Date; appliedAt: Date | null; rows: { rowNumber: number; disposition: ImportDisposition; matchedPersonId: bigint | null; createdPersonId: bigint | null; matchReason: string | null; warnings: unknown; errors: unknown }[] }, displayNames = new Map<number, string>()) => ({
    id: job.id.toString(), format: job.format, status: job.status, sourceSha256: job.sourceSha256, createdAt: job.createdAt, appliedAt: job.appliedAt,
    summary: { creates: job.rows.filter((row) => row.disposition === "create").length, matches: job.rows.filter((row) => row.disposition === "existing_match").length, rejected: job.rows.filter((row) => row.disposition === "rejected").length },
    rows: job.rows.map((row) => ({ rowNumber: row.rowNumber, displayName: displayNames.get(row.rowNumber) || null, disposition: row.disposition, matchedPersonId: row.matchedPersonId?.toString() || null, createdPersonId: row.createdPersonId?.toString() || null, matchReason: row.matchReason, warnings: row.warnings, errors: row.errors }))
  });
  async function classifyImport(parsed: ParsedFile, organizationId: bigint, client: Pick<PrismaClient, "person"> = db) {
    const people = await client.person.findMany({ where: { organizationId }, select: { id: true, normalizedEmail: true, normalizedPhone: true, firstName: true, lastName: true } });
    const seen = new Set<string>();
    return parsed.rows.map((row) => {
      const errors = [...row.errors]; const email = row.person.email?.toLowerCase(); const phone = normalizePhone(row.person.phone); const name = normalizeName(row.person.firstName, row.person.lastName);
      const keys = [["email", email], ["phone", phone], ["name", name]] as const;
      if (keys.some(([, value]) => value && seen.has(`${value}`))) errors.push("duplicate row in this import");
      for (const [, value] of keys) if (value) seen.add(value);
      const matched = people.filter((person) => (email && person.normalizedEmail === email) || (phone && person.normalizedPhone === phone) || (name && normalizeName(person.firstName, person.lastName || undefined) === name));
      const unique = [...new Map(matched.map((person) => [person.id.toString(), person])).values()];
      const matchReason = unique.length === 1 ? (email && unique[0].normalizedEmail === email ? "normalized_email" : phone && unique[0].normalizedPhone === phone ? "normalized_phone" : "normalized_name") : null;
      if (unique.length > 1) errors.push("multiple existing people match this row");
      return { ...row, errors, disposition: errors.length ? ImportDisposition.rejected : unique.length ? ImportDisposition.existing_match : ImportDisposition.create, matchedPersonId: unique.length === 1 ? unique[0].id : null, matchReason };
    });
  }
  const importDisplayNames = (parsed: ParsedFile) => new Map(parsed.rows.map((row) => [row.rowNumber, [row.person.firstName, row.person.lastName].filter(Boolean).join(" ")]));
  const importPersonValues = (person: ImportPerson) => personValues({ ...person, lastName: person.lastName || null, email: person.email || null, phone: person.phone || null, street1: person.street1 || null, street2: person.street2 || null, city: person.city || null, state: person.state || null, postalCode: person.postalCode || null, country: person.country || null });
  type BulkFilter = { createdAfter?: string; createdBefore?: string; lastVisitAfter?: string; lastVisitBefore?: string; neverVisited?: boolean; archived?: boolean };
  type BulkRow = { id: bigint; displayName: string; createdAt: Date; lastVisitAt: Date | null };
  async function bulkRows(organizationId: bigint, filter: BulkFilter) {
    if (filter.createdAfter && filter.createdBefore && filter.createdBefore < filter.createdAfter) throw app.httpErrors.badRequest("created before must not precede created after"); if (filter.lastVisitAfter && filter.lastVisitBefore && filter.lastVisitBefore < filter.lastVisitAfter) throw app.httpErrors.badRequest("last visit before must not precede last visit after");
    const where: Prisma.Sql[] = [Prisma.sql`p."organizationId" = ${organizationId}`, filter.archived ? Prisma.sql`p."archivedAt" IS NOT NULL` : Prisma.sql`p."archivedAt" IS NULL`];
    if (filter.createdAfter) where.push(Prisma.sql`p."createdAt" >= ${date(filter.createdAfter)}`); if (filter.createdBefore) where.push(Prisma.sql`p."createdAt" < ${date(nextDay(filter.createdBefore))}`);
    const having: Prisma.Sql[] = []; if (filter.neverVisited) having.push(Prisma.sql`COUNT(v.id) = 0`); if (filter.lastVisitAfter) having.push(Prisma.sql`MAX(v."arrivedAt") >= ${date(filter.lastVisitAfter)}`); if (filter.lastVisitBefore) having.push(Prisma.sql`MAX(v."arrivedAt") < ${date(nextDay(filter.lastVisitBefore))}`);
    return db.$queryRaw<BulkRow[]>(Prisma.sql`SELECT p.id, p."displayName", p."createdAt", MAX(v."arrivedAt") AS "lastVisitAt" FROM "Person" p LEFT JOIN "Visit" v ON v."personId" = p.id AND v."organizationId" = p."organizationId" AND v."cancelledAt" IS NULL WHERE ${Prisma.join(where, " AND ")} GROUP BY p.id ${having.length ? Prisma.sql`HAVING ${Prisma.join(having, " AND ")}` : Prisma.empty} ORDER BY p."displayName" ASC, p.id ASC`);
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
    return { organizationId: auth.organizationId?.toString() || null, userId: auth.userId.toString(), login: auth.login, name: auth.name, csrfToken, passwordChangeRequired: auth.passwordChangeRequired };
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
    return { id: organization.id.toString(), name: organization.name, key: organization.key, timezone: organization.timezone, location: organization.location, canManage: true };
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
    const people = await db.person.findMany({ where: { organizationId: bigint(organizationId), archivedAt: null, displayName: { contains: q, mode: "insensitive" } }, orderBy: { displayName: "asc" }, take: 100 });
    return people.map(personJson);
  });
  app.get("/api/organizations/:organizationId/people/archived", { schema: { params: OrganizationParams, querystring: SearchQuery } }, async (request) => {
    const { organizationId } = request.params as { organizationId: string }; const { q } = request.query as { q: string }; await scoped(request, organizationId);
    const people = await db.person.findMany({ where: { organizationId: bigint(organizationId), archivedAt: { not: null }, displayName: { contains: q, mode: "insensitive" } }, orderBy: { displayName: "asc" }, take: 100 });
    return people.map(personJson);
  });
  app.get("/api/organizations/:organizationId/people/:personId", { schema: { params: PersonParams } }, async (request) => {
    const { organizationId, personId } = request.params as { organizationId: string; personId: string }; await scoped(request, organizationId);
    const person = await db.person.findFirst({ where: { id: bigint(personId), organizationId: bigint(organizationId) }, include: { organization: true, visits: { where: { cancelledAt: null }, orderBy: { arrivedAt: "desc" }, take: 10 }, services: { orderBy: [{ endDate: "desc" }, { createdAt: "desc" }] }, tags: { include: { tag: true } } } });
    if (!person) throw app.httpErrors.notFound(); const membershipDay = localDay(new Date(), person.organization.timezone); const memberships = person.services.filter((service) => service.type === "membership"); const currentMembership = memberships.find((service) => (!service.startDate || dayString(service.startDate)! <= membershipDay) && (!service.endDate || dayString(service.endDate)! >= membershipDay)) || null; const latestMembership = memberships[0] || null;
    return { ...personJson(person), today: membershipDay, firstName: person.firstName, lastName: person.lastName, email: person.email, phone: person.phone, street1: person.street1, street2: person.street2, city: person.city, state: person.state, postalCode: person.postalCode, country: person.country, yearOfBirth: person.yearOfBirth, emailOptOut: person.emailOptOut, archivedByUserId: person.archivedByUserId?.toString() || null, displayRole: person.staff ? "staff" : currentMembership ? "member" : "patron", membership: { state: currentMembership ? "current" : latestMembership ? "expired" : "none", service: currentMembership ? serviceJson(currentMembership) : latestMembership ? serviceJson(latestMembership) : null }, tags: person.tags.map(({ tag }) => ({ id: tag.id.toString(), name: tag.name })), visits: person.visits.map(visitJson), services: person.services.map(serviceJson) };
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
  app.post("/api/organizations/:organizationId/imports/preview", { schema: { params: OrganizationParams, body: ImportPreviewBody } }, async (request, reply) => {
    const { organizationId } = request.params as { organizationId: string }; const auth = await scoped(request, organizationId, { mutable: true }); if (auth.role !== "manager") throw app.httpErrors.forbidden("organization manager required");
    const body = request.body as { sourceBase64: string; defaultService?: ImportService }; let parsed: ParsedFile; try { parsed = parseImport(body.sourceBase64, body.defaultService); } catch (error) { throw app.httpErrors.badRequest((error as Error).message); }
    const existing = await db.importJob.findUnique({ where: { organizationId_sourceSha256: { organizationId: bigint(organizationId), sourceSha256: parsed.sha256 } }, include: { rows: { orderBy: { rowNumber: "asc" } } } }); if (existing) return importJobJson(existing, importDisplayNames(parsed));
    const rows = await classifyImport(parsed, bigint(organizationId));
    const job = await db.importJob.create({ data: { organizationId: bigint(organizationId), format: parsed.format, sourceSha256: parsed.sha256, status: "previewed", createdByUserId: auth.userId, rows: { create: rows.map((row) => ({ rowNumber: row.rowNumber, disposition: row.disposition, matchedPersonId: row.matchedPersonId, matchReason: row.matchReason, warnings: row.warnings, errors: row.errors, inputFingerprint: row.fingerprint })) } }, include: { rows: { orderBy: { rowNumber: "asc" } } } }); return reply.code(201).send(importJobJson(job, importDisplayNames(parsed)));
  });
  app.get("/api/organizations/:organizationId/imports/:importJobId", { schema: { params: ImportJobParams } }, async (request) => {
    const { organizationId, importJobId } = request.params as { organizationId: string; importJobId: string }; await scoped(request, organizationId); const job = await db.importJob.findFirst({ where: { id: bigint(importJobId), organizationId: bigint(organizationId) }, include: { rows: { orderBy: { rowNumber: "asc" } } } }); if (!job) throw app.httpErrors.notFound("import job not found"); return importJobJson(job);
  });
  app.post("/api/organizations/:organizationId/imports/:importJobId/apply", { schema: { params: ImportJobParams, body: ImportApplyBody } }, async (request) => {
    const { organizationId, importJobId } = request.params as { organizationId: string; importJobId: string }; const auth = await scoped(request, organizationId, { mutable: true }); if (auth.role !== "manager") throw app.httpErrors.forbidden("organization manager required"); const body = request.body as { sourceBase64: string; defaultService?: ImportService }; let parsed: ParsedFile; try { parsed = parseImport(body.sourceBase64, body.defaultService); } catch (error) { throw app.httpErrors.badRequest((error as Error).message); }
    const organization = bigint(organizationId); const job = await db.importJob.findFirst({ where: { id: bigint(importJobId), organizationId: organization }, include: { rows: { orderBy: { rowNumber: "asc" } } } }); if (!job) throw app.httpErrors.notFound("import job not found"); if (job.sourceSha256 !== parsed.sha256) throw app.httpErrors.conflict("CSV does not match this preview"); if (job.status === "applied") return importJobJson(job, importDisplayNames(parsed)); if (job.rows.length !== parsed.rows.length || job.rows.some((row, index) => row.inputFingerprint !== parsed.rows[index].fingerprint)) throw app.httpErrors.conflict("CSV options do not match this preview");
    const result = await db.$transaction(async (tx) => {
      const rows = await classifyImport(parsed, organization, tx);
      for (const row of rows) { const persisted = job.rows.find((item) => item.rowNumber === row.rowNumber)!; if (row.disposition === ImportDisposition.create) { const created = await tx.person.create({ data: { ...importPersonValues(row.person), organizationId: organization, createdByUserId: auth.userId, updatedByUserId: auth.userId } }); if (row.person.service) await tx.service.create({ data: { organizationId: organization, personId: created.id, type: databaseServiceType(row.person.service.type), startDate: row.person.service.startDate ? date(row.person.service.startDate) : null, endDate: row.person.service.endDate ? date(row.person.service.endDate) : null, paid: row.person.service.paid || false, volunteered: row.person.service.volunteered || false, createdByUserId: auth.userId, updatedByUserId: auth.userId } }); await tx.importRow.update({ where: { id: persisted.id }, data: { disposition: ImportDisposition.create, createdPersonId: created.id, matchedPersonId: null, matchReason: null, warnings: row.warnings, errors: row.errors } }); }
        else await tx.importRow.update({ where: { id: persisted.id }, data: { disposition: row.disposition, matchedPersonId: row.matchedPersonId, createdPersonId: null, matchReason: row.matchReason, warnings: row.warnings, errors: row.errors } }); }
      return tx.importJob.update({ where: { id: job.id }, data: { status: "applied", appliedAt: new Date() }, include: { rows: { orderBy: { rowNumber: "asc" } } } });
    }); return importJobJson(result, importDisplayNames(parsed));
  });
  app.get("/api/organizations/:organizationId/imports/:importJobId/rejections.csv", { schema: { params: ImportJobParams } }, async (request, reply) => {
    const { organizationId, importJobId } = request.params as { organizationId: string; importJobId: string }; await scoped(request, organizationId); const job = await db.importJob.findFirst({ where: { id: bigint(importJobId), organizationId: bigint(organizationId) }, include: { organization: true, rows: { where: { disposition: ImportDisposition.rejected }, orderBy: { rowNumber: "asc" } } } }); if (!job) throw app.httpErrors.notFound("import job not found"); const body = ["row_number,errors,warnings", ...job.rows.map((row) => csv([row.rowNumber, (row.errors as string[]).join("; "), (row.warnings as string[]).join("; ")]))].join("\r\n") + "\r\n"; reply.header("content-type", "text/csv; charset=utf-8").header("content-disposition", `attachment; filename=\"${job.organization.key}_import_${job.id}_rejections.csv\"`); return body;
  });
  app.get("/api/organizations/:organizationId/bulk-people", { schema: { params: OrganizationParams, querystring: BulkPeopleQuery } }, async (request) => {
    const { organizationId } = request.params as { organizationId: string }; await scoped(request, organizationId); const rows = await bulkRows(bigint(organizationId), request.query as BulkFilter); return { count: rows.length, rows: rows.slice(0, 250).map((row) => ({ id: row.id.toString(), displayName: row.displayName, createdAt: row.createdAt, lastVisitAt: row.lastVisitAt })), truncated: rows.length > 250 };
  });
  app.get("/api/organizations/:organizationId/bulk-people.csv", { schema: { params: OrganizationParams, querystring: BulkPeopleQuery } }, async (request, reply) => {
    const { organizationId } = request.params as { organizationId: string }; await scoped(request, organizationId); const rows = await bulkRows(bigint(organizationId), request.query as BulkFilter); const organization = await db.organization.findUniqueOrThrow({ where: { id: bigint(organizationId) } }); return csvReply(reply, `${organization.key}_bulk_people.csv`, [csv(["id", "display_name", "created_at", "last_visit_at"]), ...rows.map((row) => csv([row.id.toString(), row.displayName, row.createdAt.toISOString(), row.lastVisitAt?.toISOString() || null]))]);
  });
  for (const action of ["archive", "restore"] as const) app.post(`/api/organizations/:organizationId/bulk-people/${action}`, { schema: { params: OrganizationParams, body: BulkPeopleBody } }, async (request) => {
    const { organizationId } = request.params as { organizationId: string }; const auth = await scoped(request, organizationId, { mutable: true }); if (auth.role !== "manager") throw app.httpErrors.forbidden("organization manager required"); const rows = await bulkRows(bigint(organizationId), { ...(request.body as BulkFilter), archived: action === "restore" }); if (rows.length > 10_000) throw app.httpErrors.payloadTooLarge("bulk selection exceeds 10,000 people; narrow the filters"); if (!rows.length) return { action, count: 0 };
    await db.$transaction(async (tx) => { const ids = rows.map((row) => row.id); await tx.person.updateMany({ where: { id: { in: ids }, organizationId: bigint(organizationId) }, data: action === "archive" ? { archivedAt: new Date(), archivedByUserId: auth.userId, updatedByUserId: auth.userId } : { archivedAt: null, archivedByUserId: null, updatedByUserId: auth.userId } }); await tx.personArchiveEvent.createMany({ data: ids.map((personId) => ({ organizationId: bigint(organizationId), personId, actorUserId: auth.userId, action })) }); }); return { action, count: rows.length };
  });
  const serviceInput = (input: { type: ApiServiceType; startDate?: string | null; endDate?: string | null; paid?: boolean; volunteered?: boolean; note?: string }) => {
    const startDate = input.startDate ? date(input.startDate) : null; const endDate = input.endDate ? date(input.endDate) : null;
    if (startDate && endDate && endDate < startDate) throw app.httpErrors.badRequest("end date must not precede start date");
    return { type: input.type, startDate, endDate, paid: input.paid ?? false, volunteered: input.volunteered ?? false, note: input.note?.trim() || "" };
  };
  async function serviceForOrganization(organizationId: string, serviceId: string) {
    const service = await db.service.findFirst({ where: { id: bigint(serviceId), organizationId: bigint(organizationId) }, include: { notes: { orderBy: { createdAt: "desc" } } } });
    if (!service) throw app.httpErrors.notFound("service not found"); return service;
  }
  app.get("/api/organizations/:organizationId/people/:personId/services", { schema: { params: PersonParams } }, async (request) => {
    const { organizationId, personId } = request.params as { organizationId: string; personId: string }; await scoped(request, organizationId);
    const person = await db.person.findFirst({ where: { id: bigint(personId), organizationId: bigint(organizationId) } }); if (!person) throw app.httpErrors.notFound();
    const services = await db.service.findMany({ where: { organizationId: bigint(organizationId), personId: person.id }, include: { notes: { orderBy: { createdAt: "desc" } } }, orderBy: [{ endDate: "desc" }, { createdAt: "desc" }] }); return services.map((service) => ({ ...serviceJson(service), notes: service.notes.map((note) => noteJson(note)) }));
  });
  app.get("/api/organizations/:organizationId/services/:serviceId", { schema: { params: ServiceParams } }, async (request) => {
    const { organizationId, serviceId } = request.params as { organizationId: string; serviceId: string }; await scoped(request, organizationId); const service = await serviceForOrganization(organizationId, serviceId); return { ...serviceJson(service), notes: service.notes.map((note) => noteJson(note)) };
  });
  app.post("/api/organizations/:organizationId/people/:personId/services", { schema: { params: PersonParams, body: ServiceBody } }, async (request, reply) => {
    const { organizationId, personId } = request.params as { organizationId: string; personId: string }; const auth = await scoped(request, organizationId, { mutable: true }); const person = await db.person.findFirst({ where: { id: bigint(personId), organizationId: bigint(organizationId) } }); if (!person) throw app.httpErrors.notFound(); const body = request.body as { type: ApiServiceType; startDate?: string | null; endDate?: string | null; paid?: boolean; volunteered?: boolean; note?: string }; const organization = await db.organization.findUniqueOrThrow({ where: { id: bigint(organizationId) } }); const defaultStart = localDay(new Date(), organization.timezone); const defaultEnd = new Date(Date.UTC(Number(defaultStart.slice(0, 4)) + 1, Number(defaultStart.slice(5, 7)) - 1, Number(defaultStart.slice(8, 10)) - 1)).toISOString().slice(0, 10); const input = serviceInput({ ...body, startDate: body.startDate === undefined ? defaultStart : body.startDate, endDate: body.endDate === undefined ? defaultEnd : body.endDate });
    const service = await db.$transaction(async (tx) => { const created = await tx.service.create({ data: { organizationId: bigint(organizationId), personId: person.id, type: databaseServiceType(input.type), startDate: input.startDate, endDate: input.endDate, paid: input.paid, volunteered: input.volunteered, createdByUserId: auth.userId, updatedByUserId: auth.userId } }); if (input.note) await tx.note.create({ data: { organizationId: bigint(organizationId), serviceId: created.id, text: input.note, createdByUserId: auth.userId, updatedByUserId: auth.userId } }); await tx.serviceAuditEvent.create({ data: { organizationId: bigint(organizationId), serviceId: created.id, actorUserId: auth.userId, action: "created", current: serviceSnapshot(created) } }); return created; }); return reply.code(201).send(serviceJson(service));
  });
  app.put("/api/organizations/:organizationId/services/:serviceId", { schema: { params: ServiceParams, body: ServiceBody } }, async (request) => {
    const { organizationId, serviceId } = request.params as { organizationId: string; serviceId: string }; const auth = await scoped(request, organizationId, { mutable: true }); const existing = await serviceForOrganization(organizationId, serviceId); const input = serviceInput(request.body as { type: ApiServiceType; startDate?: string | null; endDate?: string | null; paid?: boolean; volunteered?: boolean; note?: string });
    const service = await db.$transaction(async (tx) => { const updated = await tx.service.update({ where: { id: existing.id }, data: { type: databaseServiceType(input.type), startDate: input.startDate, endDate: input.endDate, paid: input.paid, volunteered: input.volunteered, updatedByUserId: auth.userId } }); if (input.note) await tx.note.create({ data: { organizationId: updated.organizationId, serviceId: updated.id, text: input.note, createdByUserId: auth.userId, updatedByUserId: auth.userId } }); await tx.serviceAuditEvent.create({ data: { organizationId: updated.organizationId, serviceId: updated.id, actorUserId: auth.userId, action: "corrected", previous: serviceSnapshot(existing), current: serviceSnapshot(updated) } }); return updated; }); return serviceJson(service);
  });
  app.post("/api/organizations/:organizationId/services/:serviceId/renew", { schema: { params: ServiceParams, body: ServiceRenewalBody } }, async (request, reply) => {
    const { organizationId, serviceId } = request.params as { organizationId: string; serviceId: string }; const auth = await scoped(request, organizationId, { mutable: true }); const existing = await serviceForOrganization(organizationId, serviceId); if (existing.type !== "membership") throw app.httpErrors.badRequest("only memberships can be renewed"); const body = request.body as { startDate?: string; endDate?: string; paid?: boolean; volunteered?: boolean; note?: string }; const organization = await db.organization.findUniqueOrThrow({ where: { id: bigint(organizationId) } }); const defaultStart = existing.endDate && dayString(existing.endDate)! >= localDay(new Date(), organization.timezone) ? nextDay(dayString(existing.endDate)!) : localDay(new Date(), organization.timezone); const startDate = body.startDate || defaultStart; const endDate = body.endDate || new Date(Date.UTC(Number(startDate.slice(0, 4)) + 1, Number(startDate.slice(5, 7)) - 1, Number(startDate.slice(8, 10)) - 1)).toISOString().slice(0, 10); const input = serviceInput({ type: "membership", startDate, endDate, paid: body.paid, volunteered: body.volunteered, note: body.note });
    const renewed = await db.$transaction(async (tx) => { const created = await tx.service.create({ data: { organizationId: existing.organizationId, personId: existing.personId, type: "membership", startDate: input.startDate, endDate: input.endDate, paid: input.paid, volunteered: input.volunteered, createdByUserId: auth.userId, updatedByUserId: auth.userId } }); if (input.note) await tx.note.create({ data: { organizationId: created.organizationId, serviceId: created.id, text: input.note, createdByUserId: auth.userId, updatedByUserId: auth.userId } }); await tx.serviceAuditEvent.create({ data: { organizationId: created.organizationId, serviceId: created.id, actorUserId: auth.userId, action: "renewed", current: serviceSnapshot(created) } }); return created; }); return reply.code(201).send(serviceJson(renewed));
  });
  app.get("/api/organizations/:organizationId/tags", { schema: { params: OrganizationParams } }, async (request) => {
    const { organizationId } = request.params as { organizationId: string }; await scoped(request, organizationId);
    const tags = await db.tag.findMany({ where: { organizationId: bigint(organizationId) }, include: { _count: { select: { people: true } } }, orderBy: { name: "asc" } });
    return tags.map((tag) => ({ id: tag.id.toString(), name: tag.name, peopleCount: tag._count.people }));
  });
  app.get("/api/organizations/:organizationId/tags/:tagId", { schema: { params: TagParams } }, async (request) => {
    const { organizationId, tagId } = request.params as { organizationId: string; tagId: string }; await scoped(request, organizationId);
    const tag = await db.tag.findFirst({ where: { id: bigint(tagId), organizationId: bigint(organizationId) }, include: { people: { include: { person: { include: { services: { where: { type: "membership" }, orderBy: [{ endDate: "desc" }, { createdAt: "desc" }], take: 1 }, visits: { where: { cancelledAt: null }, orderBy: { arrivedAt: "desc" }, take: 1 } } } }, orderBy: { person: { displayName: "asc" } } } } });
    if (!tag) throw app.httpErrors.notFound();
    return { id: tag.id.toString(), name: tag.name, people: tag.people.map(({ person }) => ({ ...personJson(person), membershipEndsOn: dayString(person.services[0]?.endDate || null), lastVisitAt: person.visits[0]?.arrivedAt || null })) };
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
  async function noteAuthorNames(notes: Parameters<typeof noteJson>[0][]) {
    const ids = [...new Set(notes.flatMap((note) => [note.createdByUserId, note.updatedByUserId].filter((id): id is bigint => id !== null).map(String)))];
    const users = ids.length ? await db.user.findMany({ where: { id: { in: ids.map(bigint) } }, select: { id: true, name: true } }) : [];
    return new Map(users.map((user) => [user.id.toString(), user.name]));
  }
  async function noteResponse(note: Parameters<typeof noteJson>[0]) { return noteJson(note, await noteAuthorNames([note])); }
  app.get("/api/organizations/:organizationId/people/:personId/notes", { schema: { params: PersonParams } }, async (request) => {
    const { organizationId, personId } = request.params as { organizationId: string; personId: string }; await scoped(request, organizationId); const organizationIdBigint = bigint(organizationId); const personIdBigint = bigint(personId);
    const person = await db.person.findFirst({ where: { id: personIdBigint, organizationId: organizationIdBigint } }); if (!person) throw app.httpErrors.notFound();
    const notes = await db.note.findMany({ where: { organizationId: organizationIdBigint, OR: [{ personId: personIdBigint }, { visit: { personId: personIdBigint } }, { service: { personId: personIdBigint } }] }, orderBy: { createdAt: "desc" } });
    const userNames = await noteAuthorNames(notes); return notes.map((note) => noteJson(note, userNames));
  });
  app.get("/api/organizations/:organizationId/notes/:noteId", { schema: { params: NoteParams } }, async (request) => {
    const { organizationId, noteId } = request.params as { organizationId: string; noteId: string }; await scoped(request, organizationId); const note = await db.note.findFirst({ where: { id: bigint(noteId), organizationId: bigint(organizationId) } }); if (!note) throw app.httpErrors.notFound(); return noteResponse(note);
  });
  app.post("/api/organizations/:organizationId/notes", { schema: { params: OrganizationParams, body: NoteBody } }, async (request, reply) => {
    const { organizationId } = request.params as { organizationId: string }; const auth = await scoped(request, organizationId, { mutable: true }); const input = request.body as { text: string; personId?: string; visitId?: string; serviceId?: string }; const text = input.text.trim(); if (!text) throw app.httpErrors.badRequest("note text is required");
    const note = await db.note.create({ data: { organizationId: bigint(organizationId), ...await noteTarget(bigint(organizationId), input), text, createdByUserId: auth.userId, updatedByUserId: auth.userId } }); return reply.code(201).send(await noteResponse(note));
  });
  app.put("/api/organizations/:organizationId/notes/:noteId", { schema: { params: NoteParams, body: NoteUpdateBody } }, async (request) => {
    const { organizationId, noteId } = request.params as { organizationId: string; noteId: string }; const auth = await scoped(request, organizationId, { mutable: true }); const existing = await db.note.findFirst({ where: { id: bigint(noteId), organizationId: bigint(organizationId) } }); if (!existing) throw app.httpErrors.notFound(); const text = (request.body as { text: string }).text.trim(); if (!text) throw app.httpErrors.badRequest("note text is required"); return noteResponse(await db.note.update({ where: { id: existing.id }, data: { text, updatedByUserId: auth.userId } }));
  });
  app.delete("/api/organizations/:organizationId/notes/:noteId", { schema: { params: NoteParams } }, async (request, reply) => {
    const { organizationId, noteId } = request.params as { organizationId: string; noteId: string }; await scoped(request, organizationId, { mutable: true }); const existing = await db.note.findFirst({ where: { id: bigint(noteId), organizationId: bigint(organizationId) } }); if (!existing) throw app.httpErrors.notFound(); await db.note.delete({ where: { id: existing.id } }); return reply.code(204).send();
  });
  async function visitForOrganization(organizationId: string, visitId: string) {
    const visit = await db.visit.findFirst({ where: { id: bigint(visitId), organizationId: bigint(organizationId) }, include: { person: true, notes: { orderBy: { createdAt: "desc" } } } });
    if (!visit) throw app.httpErrors.notFound("visit not found");
    return visit;
  }
  async function memberAtArrival(person: { services: { type: string; startDate: Date | null; endDate: Date | null }[] }, arrivedAt: Date, timezone: string) {
    const day = localDay(arrivedAt, timezone);
    return person.services.some((service) => service.type === "membership" && (!service.startDate || service.startDate.toISOString().slice(0, 10) <= day) && (!service.endDate || service.endDate.toISOString().slice(0, 10) >= day));
  }
  app.get("/api/organizations/:organizationId/visits/days/:day", { schema: { params: VisitDayParams } }, async (request) => {
    const { organizationId, day } = request.params as { organizationId: string; day: string }; await scoped(request, organizationId);
    const organization = await db.organization.findUniqueOrThrow({ where: { id: bigint(organizationId) } }); const start = zonedDayStart(day, organization.timezone); const end = zonedDayStart(nextDay(day), organization.timezone);
    const visits = await db.visit.findMany({ where: { organizationId: bigint(organizationId), arrivedAt: { gte: start, lt: end } }, include: { person: true, notes: { orderBy: { createdAt: "desc" }, take: 1 } }, orderBy: { arrivedAt: "asc" } });
    return { day, today: localDay(new Date(), organization.timezone), previousDay: previousDay(day), nextDay: nextDay(day), timezone: organization.timezone, visits: visits.map((visit) => ({ ...visitJson(visit), note: visit.notes[0] ? noteJson(visit.notes[0]) : null })) };
  });
  app.get("/api/organizations/:organizationId/people/:personId/visits", { schema: { params: PersonParams, querystring: VisitListQuery } }, async (request) => {
    const { organizationId, personId } = request.params as { organizationId: string; personId: string }; await scoped(request, organizationId); const page = (request.query as { page?: number }).page || 1;
    const person = await db.person.findFirst({ where: { id: bigint(personId), organizationId: bigint(organizationId) } }); if (!person) throw app.httpErrors.notFound();
    const [visits, total] = await db.$transaction([db.visit.findMany({ where: { organizationId: bigint(organizationId), personId: person.id, cancelledAt: null }, include: { notes: { orderBy: { createdAt: "desc" }, take: 1 } }, orderBy: { arrivedAt: "desc" }, skip: (page - 1) * 25, take: 25 }), db.visit.count({ where: { organizationId: bigint(organizationId), personId: person.id, cancelledAt: null } })]);
    return { page, total, visits: visits.map((visit) => ({ ...visitJson(visit), note: visit.notes[0] ? noteJson(visit.notes[0]) : null })) };
  });
  app.get("/api/organizations/:organizationId/visits/:visitId", { schema: { params: VisitParams } }, async (request) => {
    const { organizationId, visitId } = request.params as { organizationId: string; visitId: string }; await scoped(request, organizationId); const visit = await visitForOrganization(organizationId, visitId);
    return { ...visitJson(visit), note: visit.notes[0] ? noteJson(visit.notes[0]) : null, notes: visit.notes.map((note) => noteJson(note)) };
  });
  app.post("/api/organizations/:organizationId/visits", { schema: { params: OrganizationParams, body: VisitBody } }, async (request, reply) => {
    const { organizationId } = request.params as { organizationId: string }; const input = request.body as { personId: string; activity: "project" | "volunteering"; arrivedAt: string; startedAt?: string | null; endedAt?: string | null; note?: string }; const auth = await scoped(request, organizationId, { mutable: true });
    const organization = await db.organization.findUniqueOrThrow({ where: { id: bigint(organizationId) } }); const arrivedAt = instant(input.arrivedAt); const startedAt = input.startedAt ? instant(input.startedAt) : null; const endedAt = input.endedAt ? instant(input.endedAt) : null;
    let durationSeconds: number | null; try { durationSeconds = duration(startedAt, endedAt); } catch (error) { throw app.httpErrors.badRequest((error as Error).message); }
    const person = await db.person.findFirst({ where: { id: bigint(input.personId), organizationId: bigint(organizationId), archivedAt: null }, include: { services: true } }); if (!person) throw app.httpErrors.notFound("active person not found");
    const arrivalDay = localDay(arrivedAt, organization.timezone); const duplicate = await db.visit.findFirst({ where: { organizationId: bigint(organizationId), personId: person.id, activity: input.activity, cancelledAt: null, endedAt: null, arrivedAt: { gte: zonedDayStart(arrivalDay, organization.timezone), lt: zonedDayStart(nextDay(arrivalDay), organization.timezone) } } });
    if (duplicate) throw app.httpErrors.conflict("person already has an active visit of this type today");
    const visit = await db.$transaction(async (tx) => { const created = await tx.visit.create({ data: { organizationId: bigint(organizationId), personId: person.id, activity: input.activity, arrivedAt, startedAt, endedAt, durationSeconds, staffSnapshot: person.staff, memberSnapshot: await memberAtArrival(person, arrivedAt, organization.timezone), createdByUserId: auth.userId, updatedByUserId: auth.userId }, include: { person: true } }); const text = input.note?.trim(); if (text) await tx.note.create({ data: { organizationId: bigint(organizationId), visitId: created.id, text, createdByUserId: auth.userId, updatedByUserId: auth.userId } }); return created; });
    return reply.code(201).send(visitJson(visit));
  });
  app.put("/api/organizations/:organizationId/visits/:visitId", { schema: { params: VisitParams, body: VisitUpdateBody } }, async (request) => {
    const { organizationId, visitId } = request.params as { organizationId: string; visitId: string }; const input = request.body as { activity: "project" | "volunteering"; arrivedAt: string; startedAt?: string | null; endedAt?: string | null; note?: string }; const auth = await scoped(request, organizationId, { mutable: true }); const existing = await visitForOrganization(organizationId, visitId);
    if (existing.cancelledAt) throw app.httpErrors.conflict("visit has been removed from the queue");
    const arrivedAt = instant(input.arrivedAt); const startedAt = input.startedAt ? instant(input.startedAt) : null; const endedAt = input.endedAt ? instant(input.endedAt) : null; let durationSeconds: number | null; try { durationSeconds = duration(startedAt, endedAt); } catch (error) { throw app.httpErrors.badRequest((error as Error).message); }
    const visit = await db.$transaction(async (tx) => { const updated = await tx.visit.update({ where: { id: existing.id }, data: { activity: input.activity, arrivedAt, startedAt, endedAt, durationSeconds, updatedByUserId: auth.userId }, include: { person: true } }); const text = input.note?.trim(); if (text) await tx.note.create({ data: { organizationId: updated.organizationId, visitId: updated.id, text, createdByUserId: auth.userId, updatedByUserId: auth.userId } }); return updated; }); return visitJson(visit);
  });
  for (const [action, field] of [["sign-in", "startedAt"], ["sign-out", "endedAt"]] as const) app.post(`/api/organizations/:organizationId/visits/:visitId/${action}`, { schema: { params: VisitParams, body: VisitActionBody } }, async (request) => {
    const { organizationId, visitId } = request.params as { organizationId: string; visitId: string }; const auth = await scoped(request, organizationId, { mutable: true }); const existing = await visitForOrganization(organizationId, visitId); const at = (request.body as { at?: string } | undefined)?.at ? instant((request.body as { at: string }).at) : new Date();
    if (existing.cancelledAt) throw app.httpErrors.conflict("visit has been removed from the queue");
    if (field === "startedAt" && (existing.startedAt || existing.endedAt)) throw app.httpErrors.conflict("visit is already signed in or out");
    if (field === "endedAt" && (!existing.startedAt || existing.endedAt)) throw app.httpErrors.conflict("visit must be signed in before sign-out");
    let durationSeconds: number | null; try { durationSeconds = field === "endedAt" ? duration(existing.startedAt, at) : existing.durationSeconds; } catch (error) { throw app.httpErrors.badRequest((error as Error).message); }
    const visit = await db.visit.update({ where: { id: existing.id }, data: field === "startedAt" ? { startedAt: at, updatedByUserId: auth.userId } : { endedAt: at, durationSeconds, updatedByUserId: auth.userId }, include: { person: true } }); return visitJson(visit);
  });
  app.post("/api/organizations/:organizationId/visits/:visitId/transfer", { schema: { params: VisitParams, body: VisitTransferBody } }, async (request, reply) => {
    const { organizationId, visitId } = request.params as { organizationId: string; visitId: string }; const input = request.body as { activity: "project" | "volunteering"; at?: string }; const auth = await scoped(request, organizationId, { mutable: true }); const existing = await visitForOrganization(organizationId, visitId); const at = input.at ? instant(input.at) : new Date();
    if (existing.cancelledAt || !existing.startedAt || existing.endedAt) throw app.httpErrors.conflict("only an active signed-in visit can be transferred");
    if (existing.activity === input.activity) throw app.httpErrors.badRequest("visit is already this activity");
    let durationSeconds: number; try { durationSeconds = duration(existing.startedAt, at)!; } catch (error) { throw app.httpErrors.badRequest((error as Error).message); }
    const transferred = await db.$transaction(async (tx) => { await tx.visit.update({ where: { id: existing.id }, data: { endedAt: at, durationSeconds, updatedByUserId: auth.userId } }); return tx.visit.create({ data: { organizationId: existing.organizationId, personId: existing.personId, activity: input.activity, arrivedAt: at, startedAt: at, staffSnapshot: existing.staffSnapshot, memberSnapshot: existing.memberSnapshot, createdByUserId: auth.userId, updatedByUserId: auth.userId }, include: { person: true } }); });
    return reply.code(201).send(visitJson(transferred));
  });
  app.delete("/api/organizations/:organizationId/visits/:visitId", { schema: { params: VisitParams } }, async (request, reply) => {
    const { organizationId, visitId } = request.params as { organizationId: string; visitId: string }; const auth = await scoped(request, organizationId, { mutable: true }); const existing = await visitForOrganization(organizationId, visitId);
    if (existing.cancelledAt) throw app.httpErrors.conflict("visit is already removed from the queue");
    if (existing.startedAt) throw app.httpErrors.conflict("signed-in visits must be signed out or transferred, not removed");
    await db.visit.update({ where: { id: existing.id }, data: { cancelledAt: new Date(), cancelledByUserId: auth.userId, updatedByUserId: auth.userId } }); return reply.code(204).send();
  });
  type ReportInput = { after?: string; before?: string; name?: string; type?: "all" | "staff" | "patron"; serviceTypes?: string; page?: number };
  const reportRange = (input: ReportInput, timezone: string, startName = "after", endName = "before") => {
    const start = input[startName as keyof ReportInput] as string | undefined; const end = input[endName as keyof ReportInput] as string | undefined;
    return { ...(start ? { gte: zonedDayStart(start, timezone) } : {}), ...(end ? { lt: zonedDayStart(nextDay(end), timezone) } : {}) };
  };
  const reportServices = async (organizationId: string, input: ReportInput, paged: boolean) => {
    const organization = await db.organization.findUniqueOrThrow({ where: { id: bigint(organizationId) } }); const types = input.serviceTypes?.split(",").filter((type): type is ApiServiceType => type === "membership" || type === "earn_a_bike" || type === "class") || [];
    if (input.serviceTypes && !types.length) throw app.httpErrors.badRequest("at least one valid service type is required");
    const where = { organizationId: bigint(organizationId), ...(types.length ? { type: { in: types.map(databaseServiceType) } } : {}), ...(input.after || input.before ? { endDate: reportRange(input, organization.timezone) } : {}) };
    const [total, rows] = await Promise.all([db.service.count({ where }), db.service.findMany({ where, include: { person: true, notes: { orderBy: { createdAt: "desc" }, take: 1 } }, orderBy: [{ endDate: "desc" }, { id: "desc" }], ...(paged ? { skip: (pageOf(input.page) - 1) * reportPageSize, take: reportPageSize } : {}) })]);
    return { organization, total, rows };
  };
  const reportVisits = async (organizationId: string, input: ReportInput, paged: boolean) => {
    const organization = await db.organization.findUniqueOrThrow({ where: { id: bigint(organizationId) } }); const where = { organizationId: bigint(organizationId), cancelledAt: null, arrivedAt: reportRange(input, organization.timezone) };
    const [total, rows] = await Promise.all([db.visit.count({ where }), db.visit.findMany({ where, include: { person: true, notes: { orderBy: { createdAt: "desc" }, take: 1 } }, orderBy: [{ arrivedAt: "desc" }, { id: "desc" }], ...(paged ? { skip: (pageOf(input.page) - 1) * reportPageSize, take: reportPageSize } : {}) })]);
    return { organization, total, rows };
  };
  const reportPeople = async (organizationId: string, input: ReportInput, paged: boolean) => {
    const organization = await db.organization.findUniqueOrThrow({ where: { id: bigint(organizationId) } }); const name = input.name?.trim(); const where = { organizationId: bigint(organizationId), ...(name && name.length >= 3 ? { displayName: { contains: name, mode: "insensitive" as const } } : {}), ...(input.type === "staff" ? { staff: true } : input.type === "patron" ? { staff: false } : {}), ...(input.after || input.before ? { createdAt: reportRange(input, organization.timezone) } : {}) };
    const [total, rows] = await Promise.all([db.person.count({ where }), db.person.findMany({ where, include: { services: { where: { type: "membership" }, orderBy: [{ endDate: "desc" }, { id: "desc" }], take: 1 } }, orderBy: [{ displayName: "asc" }, { id: "asc" }], ...(paged ? { skip: (pageOf(input.page) - 1) * reportPageSize, take: reportPageSize } : {}) })]);
    return { organization, total, rows };
  };
  const csvReply = (reply: import("fastify").FastifyReply, filename: string, lines: Iterable<string>) => reply.header("content-type", "text/csv; charset=utf-8").header("content-disposition", `attachment; filename="${filename}"`).send(Readable.from((function* () { for (const line of lines) yield `${line}\r\n`; })()));
  app.get("/api/organizations/:organizationId/reports/people", { schema: { params: OrganizationParams, querystring: ReportQuery } }, async (request) => {
    const { organizationId } = request.params as { organizationId: string }; await scoped(request, organizationId); const input = request.query as ReportInput; const result = await reportPeople(organizationId, input, true);
    return { page: pageOf(input.page), pageSize: reportPageSize, total: result.total, rows: result.rows.map((person) => ({ id: person.id.toString(), displayName: person.displayName, firstName: person.firstName, lastName: person.lastName, email: person.email, phone: person.phone, staff: person.staff, archivedAt: person.archivedAt, createdAt: person.createdAt, membershipExpiresOn: dayString(person.services[0]?.endDate || null) })) };
  });
  app.get("/api/organizations/:organizationId/reports/people.csv", { schema: { params: OrganizationParams, querystring: ReportQuery } }, async (request, reply) => {
    const { organizationId } = request.params as { organizationId: string }; await scoped(request, organizationId); const input = request.query as ReportInput; const result = await reportPeople(organizationId, input, false);
    return csvReply(reply, reportFilename(result.organization.key, "people", input.after, input.before), [csv(["id", "first_name", "last_name", "email", "email_opt_out", "phone", "postal_code", "staff", "created_at", "membership_expires_on", "archived"]), ...result.rows.map((p) => csv([p.id.toString(), p.firstName, p.lastName, p.email, p.emailOptOut, p.phone, p.postalCode, p.staff, p.createdAt.toISOString(), dayString(p.services[0]?.endDate || null), Boolean(p.archivedAt)]))]);
  });
  app.get("/api/organizations/:organizationId/reports/services", { schema: { params: OrganizationParams, querystring: ReportQuery } }, async (request) => {
    const { organizationId } = request.params as { organizationId: string }; await scoped(request, organizationId); const input = request.query as ReportInput; const result = await reportServices(organizationId, input, true);
    return { page: pageOf(input.page), pageSize: reportPageSize, total: result.total, rows: result.rows.map((service) => ({ id: service.id.toString(), personId: service.personId.toString(), personName: service.person.displayName, type: service.type === "class_" ? "class" : service.type, startDate: dayString(service.startDate), endDate: dayString(service.endDate), paid: service.paid, volunteered: service.volunteered, note: service.notes[0]?.text || null })) };
  });
  app.get("/api/organizations/:organizationId/reports/services.csv", { schema: { params: OrganizationParams, querystring: ReportQuery } }, async (request, reply) => {
    const { organizationId } = request.params as { organizationId: string }; await scoped(request, organizationId); const input = request.query as ReportInput; const result = await reportServices(organizationId, input, false);
    return csvReply(reply, reportFilename(result.organization.key, "services", input.after, input.before), [csv(["first_name", "last_name", "email", "email_opt_out", "phone", "postal_code", "service_type_id", "start_date", "end_date", "volunteered", "paid", "note"]), ...result.rows.map((s) => csv([s.person.firstName, s.person.lastName, s.person.email, s.person.emailOptOut, s.person.phone, s.person.postalCode, s.type === "class_" ? "class" : s.type, dayString(s.startDate), dayString(s.endDate), s.volunteered, s.paid, s.notes[0]?.text]))]);
  });
  app.get("/api/organizations/:organizationId/reports/visits", { schema: { params: OrganizationParams, querystring: ReportQuery } }, async (request) => {
    const { organizationId } = request.params as { organizationId: string }; await scoped(request, organizationId); const input = request.query as ReportInput; const result = await reportVisits(organizationId, input, true);
    return { page: pageOf(input.page), pageSize: reportPageSize, total: result.total, rows: result.rows.map((visit) => ({ id: visit.id.toString(), personId: visit.personId.toString(), personName: visit.person.displayName, activity: visit.activity, classification: visit.staffSnapshot ? (visit.activity === "volunteering" ? "staff volunteer" : "member") : visit.activity === "volunteering" ? "volunteer" : visit.memberSnapshot ? "member" : "patron", arrivedAt: visit.arrivedAt, startedAt: visit.startedAt, endedAt: visit.endedAt, durationSeconds: visit.durationSeconds, note: visit.notes[0]?.text || null })) };
  });
  app.get("/api/organizations/:organizationId/reports/visits.csv", { schema: { params: OrganizationParams, querystring: ReportQuery } }, async (request, reply) => {
    const { organizationId } = request.params as { organizationId: string }; await scoped(request, organizationId); const input = request.query as ReportInput; const result = await reportVisits(organizationId, input, false);
    return csvReply(reply, reportFilename(result.organization.key, "visits", input.after, input.before), [csv(["person_id", "first_name", "last_name", "email", "email_opt_out", "phone", "postal_code", "arrived_at", "start_at", "end_at", "staff", "member", "volunteer", "note"]), ...result.rows.map((v) => csv([v.personId.toString(), v.person.firstName, v.person.lastName, v.person.email, v.person.emailOptOut, v.person.phone, v.person.postalCode, v.arrivedAt?.toISOString(), v.startedAt?.toISOString(), v.endedAt?.toISOString(), v.staffSnapshot, v.memberSnapshot, v.activity === "volunteering", v.notes[0]?.text]))]);
  });
  app.get("/api/organizations/:organizationId/reports/summary", { schema: { params: OrganizationParams, querystring: SummaryQuery } }, async (request) => {
    const { organizationId } = request.params as { organizationId: string }; await scoped(request, organizationId); const input = request.query as { from?: string; to?: string }; const organization = await db.organization.findUniqueOrThrow({ where: { id: bigint(organizationId) } }); const range = reportRange({ after: input.from, before: input.to }, organization.timezone); const visits = await db.visit.findMany({ where: { organizationId: bigint(organizationId), cancelledAt: null, arrivedAt: range }, select: { arrivedAt: true, staffSnapshot: true, memberSnapshot: true, activity: true } });
    const days = new Map<string, { day: string; staff: number; volunteer: number; member: number; patron: number; total: number }>(); for (const visit of visits) { if (!visit.arrivedAt) continue; const day = localDay(visit.arrivedAt, organization.timezone); const row = days.get(day) || { day, staff: 0, volunteer: 0, member: 0, patron: 0, total: 0 }; if (visit.staffSnapshot && visit.activity === "volunteering") row.staff++; else if (visit.activity === "volunteering") row.volunteer++; else if (visit.memberSnapshot || visit.staffSnapshot) row.member++; else row.patron++; row.total++; days.set(day, row); }
    const dayRows = [...days.values()].sort((a, b) => a.day.localeCompare(b.day)); const weeks = new Map<string, typeof dayRows[number]>(); for (const row of dayRows) { const value = new Date(`${row.day}T00:00:00Z`); value.setUTCDate(value.getUTCDate() - value.getUTCDay()); const week = value.toISOString().slice(0, 10); const total = weeks.get(week) || { day: week, staff: 0, volunteer: 0, member: 0, patron: 0, total: 0 }; for (const key of ["staff", "volunteer", "member", "patron", "total"] as const) total[key] += row[key]; weeks.set(week, total); }
    return { timezone: organization.timezone, days: dayRows, weeks: [...weeks.values()] };
  });
  return app;
}
