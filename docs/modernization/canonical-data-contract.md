# Canonical data and behavior contract

Status: Proposed by FH-005 pending acceptance of ADR-0002. The normative,
machine-readable companions are `canonical-schema.json` and
`migration-rules.json`; this document explains their cross-entity semantics.

## Contract boundary

The canonical model is independent of Rails, Prisma, Active Record, TypeBox, and
HTTP representation. Both architecture spikes must implement the same entity,
constraint, time, ownership, import, and migration semantics. PostgreSQL names and
framework migrations may differ, but a spike may not weaken this contract.

`canonical-schema.json` is a structured cross-stack contract, not JSON Schema,
database DDL, or a migration format. FH-009 must materialize it as versioned,
executable PostgreSQL migrations in the selected stack's conventional mechanism and
commit a generated PostgreSQL schema artifact plus a conformance check. The
executable migrations—not this document or JSON alone—become the database source of
truth after stack selection.

Every tenant record carries `organizationId`. Authorization starts from an
authenticated user membership and loads resources through that organization;
request parameters never establish tenancy. Cross-tenant foreign-key combinations
are rejected even when each referenced row exists independently.

## Identity, ownership, and audit

- Numeric legacy IDs are preserved as canonical primary keys when one valid source
  row maps to one target row and the value is collision-free. Every mapping is also
  recorded in `legacyIdentities` so reconciliation does not depend on coincidental
  primary-key equality.
- Fan-out transformations, notably global legacy tags becoming organization-owned
  tags, receive canonical IDs and retain one legacy-identity row per output.
- `createdByUserId` and `updatedByUserId` are nullable only for migration/system
  attribution. New interactive writes require an authenticated actor. A missing
  legacy audit user becomes null with a migration issue rather than an invented
  user.
- Archive and restore are reversible state changes with append-only
  `personArchiveEvents`. V1 has no bulk or automatic permanent deletion.

## Organizations, users, and roles

Organization keys and user login/email values are case-insensitively unique.
Organization timezones are stored as IANA identifiers. Accepted Rails labels are
mapped exactly as listed in `migration-rules.json`; unknown labels quarantine the
organization and therefore make dependent rows ineligible.

Users are global identities. Tenant permissions live only in explicit
`organizationMemberships`, whose roles are `manager` and `operator`. A supported
legacy organization `manager` becomes a manager membership. A valid global legacy
`admin` becomes `platformAdministrator=true`. Resource-level `owner` roles are
retired, not converted into tenant permission. Users without a surviving role may
be imported but receive an open migration issue and cannot enter an organization.

No SHA-1 digest, salt, activation/reset code, remember token, or other legacy
credential enters the canonical store. Cutover creates temporary maintained
password credentials and sets `passwordChangeRequired=true`.

## People, contacts, and archive state

`displayName` is derived from trimmed first and last names. Original contact
display values are retained; matching fields are separately normalized. Email is
trimmed and lowercased. Phone normalization retains digits and an optional leading
plus. These fields are indexed within an organization but deliberately not unique:
the supplied source contains a duplicate normalized phone, and import matching
must surface ambiguity rather than reject legitimate people.

Ordinary search, autocomplete, and check-in exclude archived people. Profiles,
reports, exports, migration reconciliation, and restore can address them. Archiving
does not alter visits, services, tags, notes, or historical snapshots.

## Time, visits, and membership

Stored instants use UTC-capable timestamps. Calendar inputs, report boundaries,
“today,” and membership dates are interpreted in the organization's IANA timezone.
A local date range is converted to a half-open instant range: start-of-first-day
inclusive through start-of-day-after-last exclusive. Daylight-saving transitions
therefore use timezone rules rather than fixed offsets.

Service start and end dates are both inclusive. A person is a member on local date
`d` when a membership service has `startDate <= d` (or no start) and `endDate >= d`
(or no end). Staff outranks membership only for current display-role selection.

At visit creation, `staffSnapshot` and `memberSnapshot` are copied from the person's
state and never recomputed. Reports use those snapshots, not current person/service
state. `durationSeconds` is integer seconds. New writes require arrival, reject
end-before-start and negative duration, and derive duration from start/end when
both exist. Historical anomalies are preserved with migration issues under the
explicit exceptions in the schema.

## Services, tags, and notes

The service enum is `membership`, `earn_a_bike`, or `class`. Tags are owned and
case-insensitively unique within an organization. Legacy global tags fan out through
valid Person taggings; tags with no valid organization are quarantined. Duplicate
names in one organization merge deterministically to the lowest canonical ID.

Notes use three explicit nullable target columns with an exactly-one constraint.
Their organization is derived from the Person, Visit, or Service target. Unsupported
polymorphic types and missing targets are quarantined; text from a quarantined note
is not copied into migration reports.

## Import contract

An import is organization-scoped and idempotent by source SHA-256. Preview and apply
share the same parser and matcher. Matching checks normalized email, normalized
phone, then normalized first-plus-last name within the organization. Zero matches
means `create`; exactly one means `existing_match`; conflicting or multiple matches
produce a rejected row. V1 never updates an existing person. Valid rows may be
applied while rejected rows remain downloadable as a sanitized rejection report.

`importRows` retain row number, fingerprints, disposition, match reason, warnings,
and errors—not unrestricted uploaded rows. Reapplying an already applied source is
a no-op returning the existing job.

## Preflight, migration, and reconciliation

The MariaDB source is read-only to all preflight and migration commands. Preflight
classifies every row exactly once as an import candidate or a quarantine category,
using first-match precedence from `migration-rules.json`. Warnings and
transformations may overlap candidates but never change the accounting equation:

```text
sourceCount = importCandidates + quarantined
```

The equation is checked independently for all ten source tables, including roles
and join tables. Reconciliation after migration additionally checks canonical row
counts through `legacyIdentities`, including tag fan-out. A migration cannot be
declared complete while any accounting equation fails or any open issue lacks an
explicit disposition.

The stack-neutral reconciliation ledger records imported source rows, quarantined
source rows, per-category quarantine counts, and legacy identity mappings for each
table. `bin/migration-reconcile` compares that ledger with a preflight report. One
imported source row requires at least one identity mapping; fan-out may create more,
as the edge fixture demonstrates for an organization-global tag.

The restored source enforces foreign keys for people/services/visits and audit-user
references, so non-null missing parents cannot occur in that dump. The preflight
retains those categories for null values and malformed future/import fixtures. Its
observed source quarantines are instead polymorphic notes and taggings, whose
relationships are not database-enforced.

Reports contain aggregate counts and contract hashes only. Per-row issue storage is
limited to source table/ID, category, payload fingerprint, and sanitized detail;
credentials and personal row payloads are forbidden.

## Supplied-source findings

The executable preflight report is authoritative. The restored sanitized source
currently contains 13,543 notes, not the earlier planning estimate of 6,538. It
classifies 11,346 notes with missing targets and 61 taggings with missing people for
quarantine. Three visits contain a zero `arrived_at` and remain candidates with that
value converted to null and recorded as issues. One organization-scoped normalized
phone is duplicated; both people remain candidates and the later source row receives
an ambiguity issue. No source content is embedded in the report or this document.

## Architecture-spike obligations

FH-006 and FH-007 must each:

1. materialize this schema without candidate-specific semantics;
2. run the same preflight report and an agreed migration slice;
3. demonstrate organization scoping, snapshot immutability, inclusive membership,
   ID mapping, quarantine persistence, and exact reconciliation; and
4. retain deterministic JSON evidence compatible with the fixtures introduced by
   FH-005.
