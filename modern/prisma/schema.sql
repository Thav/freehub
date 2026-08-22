--
-- PostgreSQL database dump
--

\restrict fMIFeoAZNpkZFo6rcdDtNsmUo5O74l7VY9sUHNw7IZItVpubp1oPYmFRRegMCeH

-- Dumped from database version 18.4 (Debian 18.4-1.pgdg13+1)
-- Dumped by pg_dump version 18.4 (Debian 18.4-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: SCHEMA "public"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA "public" IS 'standard public schema';


--
-- Name: ImportDisposition; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."ImportDisposition" AS ENUM (
    'create',
    'existing_match',
    'rejected'
);


--
-- Name: ImportFormat; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."ImportFormat" AS ENUM (
    'freehub',
    'corsizio'
);


--
-- Name: MigrationIssueDisposition; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."MigrationIssueDisposition" AS ENUM (
    'open',
    'accepted',
    'resolved',
    'quarantined'
);


--
-- Name: OrganizationRole; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."OrganizationRole" AS ENUM (
    'manager',
    'operator'
);


--
-- Name: ServiceType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."ServiceType" AS ENUM (
    'membership',
    'earn_a_bike',
    'class'
);


--
-- Name: VisitActivity; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE "public"."VisitActivity" AS ENUM (
    'project',
    'volunteering'
);


--
-- Name: freehub_archive_events_append_only(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."freehub_archive_events_append_only"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RAISE EXCEPTION 'person archive events are append only' USING ERRCODE = 'integrity_constraint_violation';
END $$;


--
-- Name: freehub_derive_person_display_name(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."freehub_derive_person_display_name"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW."displayName" := btrim(concat_ws(' ', NEW."firstName", NEW."lastName"));
  RETURN NEW;
END $$;


--
-- Name: freehub_enforce_visit_rules(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."freehub_enforce_visit_rules"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (NEW."staffSnapshot", NEW."memberSnapshot") IS DISTINCT FROM (OLD."staffSnapshot", OLD."memberSnapshot") THEN
    RAISE EXCEPTION 'visit snapshots are immutable' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW."arrivedAt" IS NULL AND current_setting('freehub.migration_mode', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'new visits require arrivedAt' USING ERRCODE = 'not_null_violation';
  END IF;
  RETURN NEW;
END $$;


--
-- Name: freehub_import_row_tenant_check(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."freehub_import_row_tenant_check"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE job_organization_id bigint;
BEGIN
  SELECT "organizationId" INTO job_organization_id FROM "ImportJob" WHERE id = NEW."importJobId";
  IF NEW."matchedPersonId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "Person" WHERE id = NEW."matchedPersonId" AND "organizationId" = job_organization_id) THEN RAISE EXCEPTION 'matched person must belong to import organization' USING ERRCODE = 'foreign_key_violation'; END IF;
  IF NEW."createdPersonId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "Person" WHERE id = NEW."createdPersonId" AND "organizationId" = job_organization_id) THEN RAISE EXCEPTION 'created person must belong to import organization' USING ERRCODE = 'foreign_key_violation'; END IF;
  RETURN NEW;
END $$;


--
-- Name: freehub_role_audit_append_only(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."freehub_role_audit_append_only"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN RAISE EXCEPTION 'role audit events are append only' USING ERRCODE = 'integrity_constraint_violation'; END $$;


--
-- Name: freehub_validate_timezone(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."freehub_validate_timezone"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = NEW."timezone") THEN
    RAISE EXCEPTION 'invalid IANA timezone: %', NEW."timezone" USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;


SET default_tablespace = '';

SET default_table_access_method = "heap";

--
-- Name: ImportJob; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."ImportJob" (
    "id" bigint NOT NULL,
    "organizationId" bigint NOT NULL,
    "format" "public"."ImportFormat" NOT NULL,
    "sourceSha256" character(64) NOT NULL,
    "status" character varying(16) NOT NULL,
    "createdByUserId" bigint NOT NULL,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "appliedAt" timestamp with time zone,
    CONSTRAINT "ImportJob_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['previewed'::character varying, 'applied'::character varying, 'failed'::character varying])::"text"[])))
);


--
-- Name: ImportJob_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."ImportJob_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ImportJob_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."ImportJob_id_seq" OWNED BY "public"."ImportJob"."id";


--
-- Name: ImportRow; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."ImportRow" (
    "id" bigint NOT NULL,
    "importJobId" bigint NOT NULL,
    "rowNumber" integer NOT NULL,
    "disposition" "public"."ImportDisposition" NOT NULL,
    "matchedPersonId" bigint,
    "createdPersonId" bigint,
    "matchReason" character varying(80),
    "warnings" "jsonb" NOT NULL,
    "errors" "jsonb" NOT NULL,
    "inputFingerprint" character(64) NOT NULL,
    CONSTRAINT "ImportRow_errors_array_check" CHECK (("jsonb_typeof"("errors") = 'array'::"text")),
    CONSTRAINT "ImportRow_warnings_array_check" CHECK (("jsonb_typeof"("warnings") = 'array'::"text"))
);


--
-- Name: ImportRow_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."ImportRow_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ImportRow_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."ImportRow_id_seq" OWNED BY "public"."ImportRow"."id";


--
-- Name: LegacyIdentity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."LegacyIdentity" (
    "id" bigint NOT NULL,
    "migrationRunId" bigint NOT NULL,
    "sourceTable" character varying(80) NOT NULL,
    "sourceId" bigint NOT NULL,
    "targetEntity" character varying(80) NOT NULL,
    "targetId" bigint NOT NULL
);


--
-- Name: LegacyIdentity_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."LegacyIdentity_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: LegacyIdentity_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."LegacyIdentity_id_seq" OWNED BY "public"."LegacyIdentity"."id";


--
-- Name: MigrationIssue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."MigrationIssue" (
    "id" bigint NOT NULL,
    "migrationRunId" bigint NOT NULL,
    "sourceTable" character varying(80) NOT NULL,
    "sourceId" bigint,
    "category" character varying(120) NOT NULL,
    "disposition" "public"."MigrationIssueDisposition" DEFAULT 'open'::"public"."MigrationIssueDisposition" NOT NULL,
    "payloadFingerprint" character(64) NOT NULL,
    "sanitizedDetail" "jsonb" NOT NULL,
    "resolvedByUserId" bigint,
    "resolvedAt" timestamp with time zone,
    CONSTRAINT "MigrationIssue_sanitizedDetail_object_check" CHECK (("jsonb_typeof"("sanitizedDetail") = 'object'::"text"))
);


--
-- Name: MigrationIssue_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."MigrationIssue_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: MigrationIssue_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."MigrationIssue_id_seq" OWNED BY "public"."MigrationIssue"."id";


--
-- Name: MigrationRun; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."MigrationRun" (
    "id" bigint NOT NULL,
    "sourceSha256" character(64) NOT NULL,
    "contractVersion" integer NOT NULL,
    "startedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "completedAt" timestamp with time zone,
    "reportSha256" character(64)
);


--
-- Name: MigrationRun_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."MigrationRun_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: MigrationRun_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."MigrationRun_id_seq" OWNED BY "public"."MigrationRun"."id";


--
-- Name: Note; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."Note" (
    "id" bigint NOT NULL,
    "organizationId" bigint NOT NULL,
    "personId" bigint,
    "visitId" bigint,
    "serviceId" bigint,
    "text" "text" NOT NULL,
    "createdByUserId" bigint,
    "updatedByUserId" bigint,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "note_one_target" CHECK ((((
CASE
    WHEN ("personId" IS NULL) THEN 0
    ELSE 1
END +
CASE
    WHEN ("visitId" IS NULL) THEN 0
    ELSE 1
END) +
CASE
    WHEN ("serviceId" IS NULL) THEN 0
    ELSE 1
END) = 1))
);


--
-- Name: Note_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."Note_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Note_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."Note_id_seq" OWNED BY "public"."Note"."id";


--
-- Name: Organization; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."Organization" (
    "id" bigint NOT NULL,
    "name" character varying(80) NOT NULL,
    "key" character varying(40) NOT NULL,
    "timezone" character varying(64) NOT NULL,
    "location" character varying(255),
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: OrganizationMembership; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."OrganizationMembership" (
    "id" bigint NOT NULL,
    "organizationId" bigint NOT NULL,
    "userId" bigint NOT NULL,
    "role" "public"."OrganizationRole" NOT NULL,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "startsAt" "date" DEFAULT CURRENT_DATE NOT NULL,
    "endsAt" "date",
    CONSTRAINT "OrganizationMembership_date_range" CHECK ((("endsAt" IS NULL) OR ("endsAt" >= "startsAt")))
);


--
-- Name: OrganizationMembership_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."OrganizationMembership_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: OrganizationMembership_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."OrganizationMembership_id_seq" OWNED BY "public"."OrganizationMembership"."id";


--
-- Name: Organization_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."Organization_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Organization_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."Organization_id_seq" OWNED BY "public"."Organization"."id";


--
-- Name: Person; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."Person" (
    "id" bigint NOT NULL,
    "organizationId" bigint NOT NULL,
    "firstName" character varying(120) NOT NULL,
    "lastName" character varying(120),
    "displayName" character varying(255) NOT NULL,
    "email" character varying(320),
    "normalizedEmail" character varying(320),
    "phone" character varying(80),
    "normalizedPhone" character varying(32),
    "staff" boolean DEFAULT false NOT NULL,
    "archivedAt" timestamp with time zone,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "emailOptOut" boolean DEFAULT false NOT NULL,
    "street1" character varying(255),
    "street2" character varying(255),
    "city" character varying(120),
    "state" character varying(120),
    "postalCode" character varying(40),
    "country" character(2),
    "yearOfBirth" smallint,
    "archivedByUserId" bigint,
    "createdByUserId" bigint,
    "updatedByUserId" bigint
);


--
-- Name: PersonArchiveEvent; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."PersonArchiveEvent" (
    "id" bigint NOT NULL,
    "organizationId" bigint NOT NULL,
    "personId" bigint NOT NULL,
    "actorUserId" bigint NOT NULL,
    "action" character varying(12) NOT NULL,
    "occurredAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "reason" "text",
    CONSTRAINT "PersonArchiveEvent_action_check" CHECK ((("action")::"text" = ANY ((ARRAY['archive'::character varying, 'restore'::character varying])::"text"[])))
);


--
-- Name: PersonArchiveEvent_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."PersonArchiveEvent_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: PersonArchiveEvent_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."PersonArchiveEvent_id_seq" OWNED BY "public"."PersonArchiveEvent"."id";


--
-- Name: PersonTag; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."PersonTag" (
    "id" bigint NOT NULL,
    "organizationId" bigint NOT NULL,
    "personId" bigint NOT NULL,
    "tagId" bigint NOT NULL,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: PersonTag_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."PersonTag_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: PersonTag_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."PersonTag_id_seq" OWNED BY "public"."PersonTag"."id";


--
-- Name: Person_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."Person_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Person_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."Person_id_seq" OWNED BY "public"."Person"."id";


--
-- Name: RoleAuditEvent; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."RoleAuditEvent" (
    "id" bigint NOT NULL,
    "organizationId" bigint NOT NULL,
    "userId" bigint NOT NULL,
    "actorUserId" bigint NOT NULL,
    "action" character varying(24) NOT NULL,
    "previousRole" "public"."OrganizationRole",
    "role" "public"."OrganizationRole",
    "previousStartsAt" "date",
    "startsAt" "date",
    "previousEndsAt" "date",
    "endsAt" "date",
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "RoleAuditEvent_action" CHECK ((("action")::"text" = ANY ((ARRAY['granted'::character varying, 'changed'::character varying, 'revoked'::character varying])::"text"[])))
);


--
-- Name: RoleAuditEvent_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."RoleAuditEvent_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: RoleAuditEvent_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."RoleAuditEvent_id_seq" OWNED BY "public"."RoleAuditEvent"."id";


--
-- Name: Service; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."Service" (
    "id" bigint NOT NULL,
    "organizationId" bigint NOT NULL,
    "personId" bigint NOT NULL,
    "type" "public"."ServiceType" NOT NULL,
    "startDate" "date",
    "endDate" "date",
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "paid" boolean DEFAULT false NOT NULL,
    "volunteered" boolean DEFAULT false NOT NULL,
    "createdByUserId" bigint,
    "updatedByUserId" bigint,
    CONSTRAINT "service_inclusive_dates" CHECK ((("endDate" IS NULL) OR ("startDate" IS NULL) OR ("endDate" >= "startDate")))
);


--
-- Name: Service_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."Service_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Service_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."Service_id_seq" OWNED BY "public"."Service"."id";


--
-- Name: Session; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."Session" (
    "id" "text" NOT NULL,
    "userId" bigint NOT NULL,
    "organizationId" bigint,
    "expiresAt" timestamp with time zone NOT NULL,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "tokenDigest" character(64) NOT NULL,
    "csrfTokenDigest" character(64),
    "revokedAt" timestamp with time zone
);


--
-- Name: Tag; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."Tag" (
    "id" bigint NOT NULL,
    "organizationId" bigint NOT NULL,
    "name" character varying(120) NOT NULL,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Tag_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."Tag_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Tag_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."Tag_id_seq" OWNED BY "public"."Tag"."id";


--
-- Name: User; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."User" (
    "id" bigint NOT NULL,
    "login" character varying(80) NOT NULL,
    "email" character varying(320) NOT NULL,
    "name" character varying(160) NOT NULL,
    "passwordDigest" character varying(255) NOT NULL,
    "passwordChangeRequired" boolean DEFAULT true NOT NULL,
    "platformAdministrator" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "disabledAt" timestamp with time zone
);


--
-- Name: User_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."User_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: User_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."User_id_seq" OWNED BY "public"."User"."id";


--
-- Name: Visit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."Visit" (
    "id" bigint NOT NULL,
    "organizationId" bigint NOT NULL,
    "personId" bigint NOT NULL,
    "activity" "public"."VisitActivity" NOT NULL,
    "arrivedAt" timestamp with time zone,
    "startedAt" timestamp with time zone,
    "endedAt" timestamp with time zone,
    "durationSeconds" integer,
    "staffSnapshot" boolean NOT NULL,
    "memberSnapshot" boolean NOT NULL,
    "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdByUserId" bigint,
    "updatedByUserId" bigint,
    CONSTRAINT "visit_end_not_before_start" CHECK ((("endedAt" IS NULL) OR ("startedAt" IS NULL) OR ("endedAt" >= "startedAt"))),
    CONSTRAINT "visit_nonnegative_duration" CHECK ((("durationSeconds" IS NULL) OR ("durationSeconds" >= 0)))
);


--
-- Name: Visit_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE "public"."Visit_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Visit_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE "public"."Visit_id_seq" OWNED BY "public"."Visit"."id";


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."_prisma_migrations" (
    "id" character varying(36) NOT NULL,
    "checksum" character varying(64) NOT NULL,
    "finished_at" timestamp with time zone,
    "migration_name" character varying(255) NOT NULL,
    "logs" "text",
    "rolled_back_at" timestamp with time zone,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "applied_steps_count" integer DEFAULT 0 NOT NULL
);


--
-- Name: ImportJob id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."ImportJob" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."ImportJob_id_seq"'::"regclass");


--
-- Name: ImportRow id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."ImportRow" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."ImportRow_id_seq"'::"regclass");


--
-- Name: LegacyIdentity id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."LegacyIdentity" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."LegacyIdentity_id_seq"'::"regclass");


--
-- Name: MigrationIssue id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."MigrationIssue" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."MigrationIssue_id_seq"'::"regclass");


--
-- Name: MigrationRun id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."MigrationRun" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."MigrationRun_id_seq"'::"regclass");


--
-- Name: Note id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Note" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."Note_id_seq"'::"regclass");


--
-- Name: Organization id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Organization" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."Organization_id_seq"'::"regclass");


--
-- Name: OrganizationMembership id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."OrganizationMembership" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."OrganizationMembership_id_seq"'::"regclass");


--
-- Name: Person id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Person" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."Person_id_seq"'::"regclass");


--
-- Name: PersonArchiveEvent id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."PersonArchiveEvent" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."PersonArchiveEvent_id_seq"'::"regclass");


--
-- Name: PersonTag id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."PersonTag" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."PersonTag_id_seq"'::"regclass");


--
-- Name: RoleAuditEvent id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."RoleAuditEvent" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."RoleAuditEvent_id_seq"'::"regclass");


--
-- Name: Service id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Service" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."Service_id_seq"'::"regclass");


--
-- Name: Tag id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Tag" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."Tag_id_seq"'::"regclass");


--
-- Name: User id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."User" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."User_id_seq"'::"regclass");


--
-- Name: Visit id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Visit" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."Visit_id_seq"'::"regclass");


--
-- Name: ImportJob ImportJob_organizationId_sourceSha256_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."ImportJob"
    ADD CONSTRAINT "ImportJob_organizationId_sourceSha256_key" UNIQUE ("organizationId", "sourceSha256");


--
-- Name: ImportJob ImportJob_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."ImportJob"
    ADD CONSTRAINT "ImportJob_pkey" PRIMARY KEY ("id");


--
-- Name: ImportRow ImportRow_importJobId_rowNumber_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."ImportRow"
    ADD CONSTRAINT "ImportRow_importJobId_rowNumber_key" UNIQUE ("importJobId", "rowNumber");


--
-- Name: ImportRow ImportRow_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."ImportRow"
    ADD CONSTRAINT "ImportRow_pkey" PRIMARY KEY ("id");


--
-- Name: LegacyIdentity LegacyIdentity_migrationRunId_sourceTable_sourceId_targetEn_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."LegacyIdentity"
    ADD CONSTRAINT "LegacyIdentity_migrationRunId_sourceTable_sourceId_targetEn_key" UNIQUE ("migrationRunId", "sourceTable", "sourceId", "targetEntity", "targetId");


--
-- Name: LegacyIdentity LegacyIdentity_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."LegacyIdentity"
    ADD CONSTRAINT "LegacyIdentity_pkey" PRIMARY KEY ("id");


--
-- Name: MigrationIssue MigrationIssue_migrationRunId_sourceTable_sourceId_category_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."MigrationIssue"
    ADD CONSTRAINT "MigrationIssue_migrationRunId_sourceTable_sourceId_category_key" UNIQUE ("migrationRunId", "sourceTable", "sourceId", "category");


--
-- Name: MigrationIssue MigrationIssue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."MigrationIssue"
    ADD CONSTRAINT "MigrationIssue_pkey" PRIMARY KEY ("id");


--
-- Name: MigrationRun MigrationRun_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."MigrationRun"
    ADD CONSTRAINT "MigrationRun_pkey" PRIMARY KEY ("id");


--
-- Name: Note Note_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Note"
    ADD CONSTRAINT "Note_pkey" PRIMARY KEY ("id");


--
-- Name: OrganizationMembership OrganizationMembership_organizationId_userId_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."OrganizationMembership"
    ADD CONSTRAINT "OrganizationMembership_organizationId_userId_key" UNIQUE ("organizationId", "userId");


--
-- Name: OrganizationMembership OrganizationMembership_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."OrganizationMembership"
    ADD CONSTRAINT "OrganizationMembership_pkey" PRIMARY KEY ("id");


--
-- Name: Organization Organization_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Organization"
    ADD CONSTRAINT "Organization_pkey" PRIMARY KEY ("id");


--
-- Name: PersonArchiveEvent PersonArchiveEvent_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."PersonArchiveEvent"
    ADD CONSTRAINT "PersonArchiveEvent_pkey" PRIMARY KEY ("id");


--
-- Name: PersonTag PersonTag_personId_tagId_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."PersonTag"
    ADD CONSTRAINT "PersonTag_personId_tagId_key" UNIQUE ("personId", "tagId");


--
-- Name: PersonTag PersonTag_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."PersonTag"
    ADD CONSTRAINT "PersonTag_pkey" PRIMARY KEY ("id");


--
-- Name: Person Person_organizationId_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Person"
    ADD CONSTRAINT "Person_organizationId_id_key" UNIQUE ("organizationId", "id");


--
-- Name: Person Person_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Person"
    ADD CONSTRAINT "Person_pkey" PRIMARY KEY ("id");


--
-- Name: RoleAuditEvent RoleAuditEvent_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."RoleAuditEvent"
    ADD CONSTRAINT "RoleAuditEvent_pkey" PRIMARY KEY ("id");


--
-- Name: Service Service_organizationId_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Service"
    ADD CONSTRAINT "Service_organizationId_id_key" UNIQUE ("organizationId", "id");


--
-- Name: Service Service_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Service"
    ADD CONSTRAINT "Service_pkey" PRIMARY KEY ("id");


--
-- Name: Session Session_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Session"
    ADD CONSTRAINT "Session_pkey" PRIMARY KEY ("id");


--
-- Name: Tag Tag_organizationId_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Tag"
    ADD CONSTRAINT "Tag_organizationId_id_key" UNIQUE ("organizationId", "id");


--
-- Name: Tag Tag_organizationId_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Tag"
    ADD CONSTRAINT "Tag_organizationId_name_key" UNIQUE ("organizationId", "name");


--
-- Name: Tag Tag_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Tag"
    ADD CONSTRAINT "Tag_pkey" PRIMARY KEY ("id");


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");


--
-- Name: Visit Visit_organizationId_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Visit"
    ADD CONSTRAINT "Visit_organizationId_id_key" UNIQUE ("organizationId", "id");


--
-- Name: Visit Visit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Visit"
    ADD CONSTRAINT "Visit_pkey" PRIMARY KEY ("id");


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."_prisma_migrations"
    ADD CONSTRAINT "_prisma_migrations_pkey" PRIMARY KEY ("id");


--
-- Name: Note_organizationId_personId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Note_organizationId_personId_idx" ON "public"."Note" USING "btree" ("organizationId", "personId");


--
-- Name: OrganizationMembership_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OrganizationMembership_active_idx" ON "public"."OrganizationMembership" USING "btree" ("organizationId", "userId", "startsAt", "endsAt");


--
-- Name: Organization_key_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Organization_key_key" ON "public"."Organization" USING "btree" ("key");


--
-- Name: PersonTag_organizationId_personId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PersonTag_organizationId_personId_idx" ON "public"."PersonTag" USING "btree" ("organizationId", "personId");


--
-- Name: Person_active_search_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Person_active_search_idx" ON "public"."Person" USING "btree" ("organizationId", "displayName") WHERE ("archivedAt" IS NULL);


--
-- Name: Person_organizationId_displayName_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Person_organizationId_displayName_idx" ON "public"."Person" USING "btree" ("organizationId", "displayName");


--
-- Name: Person_organizationId_normalizedEmail_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Person_organizationId_normalizedEmail_idx" ON "public"."Person" USING "btree" ("organizationId", "normalizedEmail");


--
-- Name: Person_organizationId_normalizedPhone_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Person_organizationId_normalizedPhone_idx" ON "public"."Person" USING "btree" ("organizationId", "normalizedPhone");


--
-- Name: RoleAuditEvent_organization_user_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RoleAuditEvent_organization_user_created_idx" ON "public"."RoleAuditEvent" USING "btree" ("organizationId", "userId", "createdAt");


--
-- Name: Service_organizationId_personId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Service_organizationId_personId_idx" ON "public"."Service" USING "btree" ("organizationId", "personId");


--
-- Name: Session_expiresAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Session_expiresAt_idx" ON "public"."Session" USING "btree" ("expiresAt");


--
-- Name: Session_tokenDigest_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Session_tokenDigest_key" ON "public"."Session" USING "btree" ("tokenDigest");


--
-- Name: Session_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Session_userId_idx" ON "public"."Session" USING "btree" ("userId");


--
-- Name: Tag_organizationId_name_lower_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Tag_organizationId_name_lower_unique" ON "public"."Tag" USING "btree" ("organizationId", "lower"(("name")::"text"));


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_email_key" ON "public"."User" USING "btree" ("email");


--
-- Name: User_login_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_login_key" ON "public"."User" USING "btree" ("login");


--
-- Name: Visit_organizationId_arrivedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Visit_organizationId_arrivedAt_idx" ON "public"."Visit" USING "btree" ("organizationId", "arrivedAt");


--
-- Name: organizations_key_lower_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "organizations_key_lower_unique" ON "public"."Organization" USING "btree" ("lower"(("key")::"text"));


--
-- Name: users_email_lower_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "users_email_lower_unique" ON "public"."User" USING "btree" ("lower"(("email")::"text"));


--
-- Name: users_login_lower_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "users_login_lower_unique" ON "public"."User" USING "btree" ("lower"(("login")::"text"));


--
-- Name: ImportRow ImportRow_tenant_match; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "ImportRow_tenant_match" BEFORE INSERT OR UPDATE ON "public"."ImportRow" FOR EACH ROW EXECUTE FUNCTION "public"."freehub_import_row_tenant_check"();


--
-- Name: Organization Organization_timezone_valid; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "Organization_timezone_valid" BEFORE INSERT OR UPDATE OF "timezone" ON "public"."Organization" FOR EACH ROW EXECUTE FUNCTION "public"."freehub_validate_timezone"();


--
-- Name: PersonArchiveEvent PersonArchiveEvent_append_only; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "PersonArchiveEvent_append_only" BEFORE DELETE OR UPDATE ON "public"."PersonArchiveEvent" FOR EACH ROW EXECUTE FUNCTION "public"."freehub_archive_events_append_only"();


--
-- Name: Person Person_displayName_derived; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "Person_displayName_derived" BEFORE INSERT OR UPDATE OF "firstName", "lastName" ON "public"."Person" FOR EACH ROW EXECUTE FUNCTION "public"."freehub_derive_person_display_name"();


--
-- Name: RoleAuditEvent RoleAuditEvent_append_only; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "RoleAuditEvent_append_only" BEFORE DELETE OR UPDATE ON "public"."RoleAuditEvent" FOR EACH ROW EXECUTE FUNCTION "public"."freehub_role_audit_append_only"();


--
-- Name: Visit Visit_contract_rules; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "Visit_contract_rules" BEFORE INSERT OR UPDATE ON "public"."Visit" FOR EACH ROW EXECUTE FUNCTION "public"."freehub_enforce_visit_rules"();


--
-- Name: ImportJob ImportJob_createdByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."ImportJob"
    ADD CONSTRAINT "ImportJob_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "public"."User"("id");


--
-- Name: ImportJob ImportJob_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."ImportJob"
    ADD CONSTRAINT "ImportJob_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id");


--
-- Name: ImportRow ImportRow_createdPersonId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."ImportRow"
    ADD CONSTRAINT "ImportRow_createdPersonId_fkey" FOREIGN KEY ("createdPersonId") REFERENCES "public"."Person"("id");


--
-- Name: ImportRow ImportRow_importJobId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."ImportRow"
    ADD CONSTRAINT "ImportRow_importJobId_fkey" FOREIGN KEY ("importJobId") REFERENCES "public"."ImportJob"("id") ON DELETE CASCADE;


--
-- Name: ImportRow ImportRow_matchedPersonId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."ImportRow"
    ADD CONSTRAINT "ImportRow_matchedPersonId_fkey" FOREIGN KEY ("matchedPersonId") REFERENCES "public"."Person"("id");


--
-- Name: LegacyIdentity LegacyIdentity_migrationRunId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."LegacyIdentity"
    ADD CONSTRAINT "LegacyIdentity_migrationRunId_fkey" FOREIGN KEY ("migrationRunId") REFERENCES "public"."MigrationRun"("id") ON DELETE CASCADE;


--
-- Name: MigrationIssue MigrationIssue_migrationRunId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."MigrationIssue"
    ADD CONSTRAINT "MigrationIssue_migrationRunId_fkey" FOREIGN KEY ("migrationRunId") REFERENCES "public"."MigrationRun"("id") ON DELETE CASCADE;


--
-- Name: MigrationIssue MigrationIssue_resolvedByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."MigrationIssue"
    ADD CONSTRAINT "MigrationIssue_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "public"."User"("id");


--
-- Name: Note Note_createdByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Note"
    ADD CONSTRAINT "Note_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "public"."User"("id");


--
-- Name: Note Note_personId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Note"
    ADD CONSTRAINT "Note_personId_fkey" FOREIGN KEY ("personId") REFERENCES "public"."Person"("id") ON DELETE CASCADE;


--
-- Name: Note Note_person_tenant_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Note"
    ADD CONSTRAINT "Note_person_tenant_fkey" FOREIGN KEY ("organizationId", "personId") REFERENCES "public"."Person"("organizationId", "id");


--
-- Name: Note Note_serviceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Note"
    ADD CONSTRAINT "Note_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "public"."Service"("id") ON DELETE CASCADE;


--
-- Name: Note Note_service_tenant_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Note"
    ADD CONSTRAINT "Note_service_tenant_fkey" FOREIGN KEY ("organizationId", "serviceId") REFERENCES "public"."Service"("organizationId", "id");


--
-- Name: Note Note_updatedByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Note"
    ADD CONSTRAINT "Note_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "public"."User"("id");


--
-- Name: Note Note_visitId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Note"
    ADD CONSTRAINT "Note_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "public"."Visit"("id") ON DELETE CASCADE;


--
-- Name: Note Note_visit_tenant_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Note"
    ADD CONSTRAINT "Note_visit_tenant_fkey" FOREIGN KEY ("organizationId", "visitId") REFERENCES "public"."Visit"("organizationId", "id");


--
-- Name: OrganizationMembership OrganizationMembership_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."OrganizationMembership"
    ADD CONSTRAINT "OrganizationMembership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE;


--
-- Name: OrganizationMembership OrganizationMembership_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."OrganizationMembership"
    ADD CONSTRAINT "OrganizationMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE;


--
-- Name: PersonArchiveEvent PersonArchiveEvent_actorUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."PersonArchiveEvent"
    ADD CONSTRAINT "PersonArchiveEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "public"."User"("id");


--
-- Name: PersonArchiveEvent PersonArchiveEvent_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."PersonArchiveEvent"
    ADD CONSTRAINT "PersonArchiveEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id");


--
-- Name: PersonArchiveEvent PersonArchiveEvent_personId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."PersonArchiveEvent"
    ADD CONSTRAINT "PersonArchiveEvent_personId_fkey" FOREIGN KEY ("personId") REFERENCES "public"."Person"("id") ON DELETE CASCADE;


--
-- Name: PersonArchiveEvent PersonArchiveEvent_person_tenant_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."PersonArchiveEvent"
    ADD CONSTRAINT "PersonArchiveEvent_person_tenant_fkey" FOREIGN KEY ("organizationId", "personId") REFERENCES "public"."Person"("organizationId", "id");


--
-- Name: PersonTag PersonTag_personId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."PersonTag"
    ADD CONSTRAINT "PersonTag_personId_fkey" FOREIGN KEY ("personId") REFERENCES "public"."Person"("id") ON DELETE CASCADE;


--
-- Name: PersonTag PersonTag_person_tenant_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."PersonTag"
    ADD CONSTRAINT "PersonTag_person_tenant_fkey" FOREIGN KEY ("organizationId", "personId") REFERENCES "public"."Person"("organizationId", "id");


--
-- Name: PersonTag PersonTag_tagId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."PersonTag"
    ADD CONSTRAINT "PersonTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "public"."Tag"("id") ON DELETE CASCADE;


--
-- Name: PersonTag PersonTag_tag_tenant_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."PersonTag"
    ADD CONSTRAINT "PersonTag_tag_tenant_fkey" FOREIGN KEY ("organizationId", "tagId") REFERENCES "public"."Tag"("organizationId", "id");


--
-- Name: Person Person_archivedByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Person"
    ADD CONSTRAINT "Person_archivedByUserId_fkey" FOREIGN KEY ("archivedByUserId") REFERENCES "public"."User"("id");


--
-- Name: Person Person_createdByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Person"
    ADD CONSTRAINT "Person_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "public"."User"("id");


--
-- Name: Person Person_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Person"
    ADD CONSTRAINT "Person_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id");


--
-- Name: Person Person_updatedByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Person"
    ADD CONSTRAINT "Person_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "public"."User"("id");


--
-- Name: RoleAuditEvent RoleAuditEvent_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."RoleAuditEvent"
    ADD CONSTRAINT "RoleAuditEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT;


--
-- Name: RoleAuditEvent RoleAuditEvent_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."RoleAuditEvent"
    ADD CONSTRAINT "RoleAuditEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT;


--
-- Name: Service Service_createdByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Service"
    ADD CONSTRAINT "Service_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "public"."User"("id");


--
-- Name: Service Service_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Service"
    ADD CONSTRAINT "Service_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id");


--
-- Name: Service Service_personId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Service"
    ADD CONSTRAINT "Service_personId_fkey" FOREIGN KEY ("personId") REFERENCES "public"."Person"("id");


--
-- Name: Service Service_person_tenant_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Service"
    ADD CONSTRAINT "Service_person_tenant_fkey" FOREIGN KEY ("organizationId", "personId") REFERENCES "public"."Person"("organizationId", "id");


--
-- Name: Service Service_updatedByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Service"
    ADD CONSTRAINT "Service_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "public"."User"("id");


--
-- Name: Session Session_membership_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Session"
    ADD CONSTRAINT "Session_membership_fkey" FOREIGN KEY ("organizationId", "userId") REFERENCES "public"."OrganizationMembership"("organizationId", "userId");


--
-- Name: Session Session_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Session"
    ADD CONSTRAINT "Session_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE SET NULL;


--
-- Name: Session Session_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Session"
    ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE;


--
-- Name: Tag Tag_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Tag"
    ADD CONSTRAINT "Tag_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id");


--
-- Name: Visit Visit_createdByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Visit"
    ADD CONSTRAINT "Visit_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "public"."User"("id");


--
-- Name: Visit Visit_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Visit"
    ADD CONSTRAINT "Visit_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id");


--
-- Name: Visit Visit_personId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Visit"
    ADD CONSTRAINT "Visit_personId_fkey" FOREIGN KEY ("personId") REFERENCES "public"."Person"("id");


--
-- Name: Visit Visit_person_tenant_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Visit"
    ADD CONSTRAINT "Visit_person_tenant_fkey" FOREIGN KEY ("organizationId", "personId") REFERENCES "public"."Person"("organizationId", "id");


--
-- Name: Visit Visit_updatedByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."Visit"
    ADD CONSTRAINT "Visit_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "public"."User"("id");


--
-- PostgreSQL database dump complete
--

\unrestrict fMIFeoAZNpkZFo6rcdDtNsmUo5O74l7VY9sUHNw7IZItVpubp1oPYmFRRegMCeH
