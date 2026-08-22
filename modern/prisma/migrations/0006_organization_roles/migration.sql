-- FH-011: membership lifecycle dates and immutable role-change audit events.
ALTER TABLE "OrganizationMembership" ADD COLUMN "startsAt" DATE, ADD COLUMN "endsAt" DATE;
UPDATE "OrganizationMembership" SET "startsAt" = "createdAt"::date WHERE "startsAt" IS NULL;
ALTER TABLE "OrganizationMembership" ALTER COLUMN "startsAt" SET NOT NULL, ALTER COLUMN "startsAt" SET DEFAULT CURRENT_DATE;
ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_date_range" CHECK ("endsAt" IS NULL OR "endsAt" >= "startsAt");
CREATE INDEX "OrganizationMembership_active_idx" ON "OrganizationMembership"("organizationId", "userId", "startsAt", "endsAt");
CREATE TABLE "RoleAuditEvent" (
  "id" BIGSERIAL PRIMARY KEY,
  "organizationId" BIGINT NOT NULL REFERENCES "Organization"("id") ON DELETE RESTRICT,
  "userId" BIGINT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
  "actorUserId" BIGINT NOT NULL,
  "action" VARCHAR(24) NOT NULL,
  "previousRole" "OrganizationRole",
  "role" "OrganizationRole",
  "previousStartsAt" DATE,
  "startsAt" DATE,
  "previousEndsAt" DATE,
  "endsAt" DATE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RoleAuditEvent_action" CHECK ("action" IN ('granted', 'changed', 'revoked'))
);
CREATE INDEX "RoleAuditEvent_organization_user_created_idx" ON "RoleAuditEvent"("organizationId", "userId", "createdAt");
CREATE OR REPLACE FUNCTION freehub_role_audit_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'role audit events are append only' USING ERRCODE = 'integrity_constraint_violation'; END $$;
CREATE TRIGGER "RoleAuditEvent_append_only" BEFORE UPDATE OR DELETE ON "RoleAuditEvent" FOR EACH ROW EXECUTE FUNCTION freehub_role_audit_append_only();
