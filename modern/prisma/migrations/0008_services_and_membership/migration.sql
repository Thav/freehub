-- FH-015: service corrections have an immutable, tenant-scoped audit trail.
CREATE TABLE "ServiceAuditEvent" (
  "id" BIGSERIAL PRIMARY KEY,
  "organizationId" BIGINT NOT NULL REFERENCES "Organization"("id") ON DELETE RESTRICT,
  "serviceId" BIGINT NOT NULL REFERENCES "Service"("id") ON DELETE RESTRICT,
  "actorUserId" BIGINT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
  "action" VARCHAR(24) NOT NULL,
  "previous" JSONB,
  "current" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ServiceAuditEvent_action" CHECK ("action" IN ('created', 'corrected', 'renewed')),
  CONSTRAINT "ServiceAuditEvent_previous_object" CHECK ("previous" IS NULL OR jsonb_typeof("previous") = 'object'),
  CONSTRAINT "ServiceAuditEvent_current_object" CHECK ("current" IS NULL OR jsonb_typeof("current") = 'object')
);
CREATE INDEX "ServiceAuditEvent_organization_service_created_idx" ON "ServiceAuditEvent"("organizationId", "serviceId", "createdAt");
CREATE OR REPLACE FUNCTION freehub_service_audit_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'service audit events are append only' USING ERRCODE = 'integrity_constraint_violation'; END $$;
CREATE TRIGGER "ServiceAuditEvent_append_only" BEFORE UPDATE OR DELETE ON "ServiceAuditEvent" FOR EACH ROW EXECUTE FUNCTION freehub_service_audit_append_only();
