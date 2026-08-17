-- FH-009: PostgreSQL 18 canonical foundation. Prisma describes the application
-- types; this migration owns constraints that require expressions or triggers.

ALTER TYPE "ServiceType" RENAME VALUE 'class_' TO 'class';

ALTER TABLE "Organization" ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ USING "createdAt" AT TIME ZONE 'UTC', ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ USING "updatedAt" AT TIME ZONE 'UTC', ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "User" ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ USING "createdAt" AT TIME ZONE 'UTC', ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ USING "updatedAt" AT TIME ZONE 'UTC', ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "OrganizationMembership" ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ USING "createdAt" AT TIME ZONE 'UTC', ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ USING "updatedAt" AT TIME ZONE 'UTC', ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Session" ALTER COLUMN "expiresAt" TYPE TIMESTAMPTZ USING "expiresAt" AT TIME ZONE 'UTC', ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ USING "createdAt" AT TIME ZONE 'UTC';
ALTER TABLE "Person" ALTER COLUMN "archivedAt" TYPE TIMESTAMPTZ USING "archivedAt" AT TIME ZONE 'UTC', ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ USING "createdAt" AT TIME ZONE 'UTC', ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ USING "updatedAt" AT TIME ZONE 'UTC', ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Visit" ALTER COLUMN "arrivedAt" TYPE TIMESTAMPTZ USING "arrivedAt" AT TIME ZONE 'UTC', ALTER COLUMN "startedAt" TYPE TIMESTAMPTZ USING "startedAt" AT TIME ZONE 'UTC', ALTER COLUMN "endedAt" TYPE TIMESTAMPTZ USING "endedAt" AT TIME ZONE 'UTC', ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ USING "createdAt" AT TIME ZONE 'UTC', ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ USING "updatedAt" AT TIME ZONE 'UTC', ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Service" ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ USING "createdAt" AT TIME ZONE 'UTC', ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ USING "updatedAt" AT TIME ZONE 'UTC', ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Tag" ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ USING "createdAt" AT TIME ZONE 'UTC', ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ USING "updatedAt" AT TIME ZONE 'UTC', ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "PersonTag" ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ USING "createdAt" AT TIME ZONE 'UTC';
ALTER TABLE "Note" ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ USING "createdAt" AT TIME ZONE 'UTC', ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ USING "updatedAt" AT TIME ZONE 'UTC', ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "PersonArchiveEvent" ALTER COLUMN "occurredAt" TYPE TIMESTAMPTZ USING "occurredAt" AT TIME ZONE 'UTC';
ALTER TABLE "ImportJob" ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ USING "createdAt" AT TIME ZONE 'UTC', ALTER COLUMN "appliedAt" TYPE TIMESTAMPTZ USING "appliedAt" AT TIME ZONE 'UTC';
ALTER TABLE "MigrationRun" ALTER COLUMN "startedAt" TYPE TIMESTAMPTZ USING "startedAt" AT TIME ZONE 'UTC', ALTER COLUMN "completedAt" TYPE TIMESTAMPTZ USING "completedAt" AT TIME ZONE 'UTC';
ALTER TABLE "MigrationIssue" ALTER COLUMN "resolvedAt" TYPE TIMESTAMPTZ USING "resolvedAt" AT TIME ZONE 'UTC';

ALTER TABLE "Person" ADD CONSTRAINT "Person_archivedByUserId_fkey" FOREIGN KEY ("archivedByUserId") REFERENCES "User"("id"), ADD CONSTRAINT "Person_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id"), ADD CONSTRAINT "Person_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id"), ADD CONSTRAINT "Person_organizationId_id_key" UNIQUE ("organizationId", "id");
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id"), ADD CONSTRAINT "Visit_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id"), ADD CONSTRAINT "Visit_person_tenant_fkey" FOREIGN KEY ("organizationId", "personId") REFERENCES "Person"("organizationId", "id"), ADD CONSTRAINT "Visit_organizationId_id_key" UNIQUE ("organizationId", "id");
ALTER TABLE "Service" ADD CONSTRAINT "Service_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id"), ADD CONSTRAINT "Service_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id"), ADD CONSTRAINT "Service_person_tenant_fkey" FOREIGN KEY ("organizationId", "personId") REFERENCES "Person"("organizationId", "id"), ADD CONSTRAINT "Service_organizationId_id_key" UNIQUE ("organizationId", "id");
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_organizationId_id_key" UNIQUE ("organizationId", "id");
ALTER TABLE "PersonTag" ADD CONSTRAINT "PersonTag_person_tenant_fkey" FOREIGN KEY ("organizationId", "personId") REFERENCES "Person"("organizationId", "id"), ADD CONSTRAINT "PersonTag_tag_tenant_fkey" FOREIGN KEY ("organizationId", "tagId") REFERENCES "Tag"("organizationId", "id");
ALTER TABLE "Note" ADD CONSTRAINT "Note_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id"), ADD CONSTRAINT "Note_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id"), ADD CONSTRAINT "Note_person_tenant_fkey" FOREIGN KEY ("organizationId", "personId") REFERENCES "Person"("organizationId", "id"), ADD CONSTRAINT "Note_visit_tenant_fkey" FOREIGN KEY ("organizationId", "visitId") REFERENCES "Visit"("organizationId", "id"), ADD CONSTRAINT "Note_service_tenant_fkey" FOREIGN KEY ("organizationId", "serviceId") REFERENCES "Service"("organizationId", "id");
ALTER TABLE "PersonArchiveEvent" ADD CONSTRAINT "PersonArchiveEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id"), ADD CONSTRAINT "PersonArchiveEvent_person_tenant_fkey" FOREIGN KEY ("organizationId", "personId") REFERENCES "Person"("organizationId", "id");
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id"), ADD CONSTRAINT "ImportJob_status_check" CHECK ("status" IN ('previewed', 'applied', 'failed'));
ALTER TABLE "ImportRow" ADD CONSTRAINT "ImportRow_matchedPersonId_fkey" FOREIGN KEY ("matchedPersonId") REFERENCES "Person"("id"), ADD CONSTRAINT "ImportRow_createdPersonId_fkey" FOREIGN KEY ("createdPersonId") REFERENCES "Person"("id"), ADD CONSTRAINT "ImportRow_warnings_array_check" CHECK (jsonb_typeof("warnings") = 'array'), ADD CONSTRAINT "ImportRow_errors_array_check" CHECK (jsonb_typeof("errors") = 'array');
ALTER TABLE "MigrationIssue" ADD CONSTRAINT "MigrationIssue_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "User"("id"), ADD CONSTRAINT "MigrationIssue_sanitizedDetail_object_check" CHECK (jsonb_typeof("sanitizedDetail") = 'object');
ALTER TABLE "Session" ADD CONSTRAINT "Session_membership_fkey" FOREIGN KEY ("organizationId", "userId") REFERENCES "OrganizationMembership"("organizationId", "userId");

CREATE UNIQUE INDEX "Tag_organizationId_name_lower_unique" ON "Tag" ("organizationId", lower("name"));
CREATE INDEX "Person_active_search_idx" ON "Person" ("organizationId", "displayName") WHERE "archivedAt" IS NULL;
CREATE INDEX "Service_organizationId_personId_idx" ON "Service" ("organizationId", "personId");
CREATE INDEX "PersonTag_organizationId_personId_idx" ON "PersonTag" ("organizationId", "personId");
CREATE INDEX "Note_organizationId_personId_idx" ON "Note" ("organizationId", "personId");

CREATE OR REPLACE FUNCTION freehub_validate_timezone() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = NEW."timezone") THEN
    RAISE EXCEPTION 'invalid IANA timezone: %', NEW."timezone" USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "Organization_timezone_valid" BEFORE INSERT OR UPDATE OF "timezone" ON "Organization" FOR EACH ROW EXECUTE FUNCTION freehub_validate_timezone();

CREATE OR REPLACE FUNCTION freehub_derive_person_display_name() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW."displayName" := btrim(concat_ws(' ', NEW."firstName", NEW."lastName"));
  RETURN NEW;
END $$;
CREATE TRIGGER "Person_displayName_derived" BEFORE INSERT OR UPDATE OF "firstName", "lastName" ON "Person" FOR EACH ROW EXECUTE FUNCTION freehub_derive_person_display_name();

CREATE OR REPLACE FUNCTION freehub_enforce_visit_rules() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (NEW."staffSnapshot", NEW."memberSnapshot") IS DISTINCT FROM (OLD."staffSnapshot", OLD."memberSnapshot") THEN
    RAISE EXCEPTION 'visit snapshots are immutable' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW."arrivedAt" IS NULL AND current_setting('freehub.migration_mode', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'new visits require arrivedAt' USING ERRCODE = 'not_null_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "Visit_contract_rules" BEFORE INSERT OR UPDATE ON "Visit" FOR EACH ROW EXECUTE FUNCTION freehub_enforce_visit_rules();

CREATE OR REPLACE FUNCTION freehub_archive_events_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'person archive events are append only' USING ERRCODE = 'integrity_constraint_violation';
END $$;
CREATE TRIGGER "PersonArchiveEvent_append_only" BEFORE UPDATE OR DELETE ON "PersonArchiveEvent" FOR EACH ROW EXECUTE FUNCTION freehub_archive_events_append_only();

CREATE OR REPLACE FUNCTION freehub_import_row_tenant_check() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE job_organization_id bigint;
BEGIN
  SELECT "organizationId" INTO job_organization_id FROM "ImportJob" WHERE id = NEW."importJobId";
  IF NEW."matchedPersonId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "Person" WHERE id = NEW."matchedPersonId" AND "organizationId" = job_organization_id) THEN RAISE EXCEPTION 'matched person must belong to import organization' USING ERRCODE = 'foreign_key_violation'; END IF;
  IF NEW."createdPersonId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "Person" WHERE id = NEW."createdPersonId" AND "organizationId" = job_organization_id) THEN RAISE EXCEPTION 'created person must belong to import organization' USING ERRCODE = 'foreign_key_violation'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "ImportRow_tenant_match" BEFORE INSERT OR UPDATE ON "ImportRow" FOR EACH ROW EXECUTE FUNCTION freehub_import_row_tenant_check();
