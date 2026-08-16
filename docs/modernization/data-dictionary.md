# Legacy data dictionary

Status: FH-004 behavioral dictionary. `db/schema.rb` is authoritative for physical
legacy columns; FH-005 defines canonical modern types, constraints, reconciliation,
and ownership.

All legacy primary keys are integer IDs. Timestamps are stored as MySQL datetimes.
The restored dump declares InnoDB foreign keys for people/services/visits and their
audit-user references, but leaves polymorphic note targets, taggings, roles, and
role joins unenforced. `db/schema.rb` omits those physical foreign keys and is not
complete as a dump-schema reference.

## `organizations`

| Column | Legacy type/default | Meaning and observed rules |
| --- | --- | --- |
| `id` | integer PK | Tenant identity. |
| `name` | string | Required, 3–40 characters. |
| `key` | string, unique index | Required URL slug, 3–20 word characters, case-insensitively validated unique by Rails. |
| `timezone` | string | Required Rails timezone name; defaults to Pacific. Controls displayed/report dates. |
| `location` | string | Optional public display location. |
| `created_at`, `updated_at` | datetime | Rails lifecycle timestamps. |

The model source documents a historical `display_start_end` flag that is absent
from the checked-in schema. People are deleted when their organization is deleted.

## `users`

| Column | Legacy type/default | Meaning and observed rules |
| --- | --- | --- |
| `id` | integer PK | Login identity. |
| `login` | string | Required, unique ignoring case, 3–40 characters. |
| `email` | string | Required, unique ignoring case, 3–100 characters; format validation is disabled. |
| `name` | string | Required display name. |
| `crypted_password` | string(40) | Salted SHA-1 digest; never migrate. |
| `salt` | string(40) | Per-user SHA-1 salt input; never migrate. |
| `remember_token`, `remember_token_expires_at` | string, datetime | Optional two-week persistent login credential; never migrate. |
| `activation_code`, `activated_at` | string(40), datetime | Legacy email activation state. Authentication requires `activated_at`. |
| `reset_code` | string(40) | Legacy password-reset bearer credential; never migrate. |
| `created_at`, `updated_at` | datetime | Rails lifecycle timestamps. |

`User#organization` is computed as the first object for which the user is manager;
there is no `organization_id` column despite the stale association declaration.

## `roles` and `roles_users`

| Column | Legacy type/default | Meaning and observed rules |
| --- | --- | --- |
| `roles.id` | integer PK | Authorization role identity. |
| `roles.name` | string(40) | Observed expressions use `admin`, `manager`, and virtual resource `owner`. |
| `authorizable_type`, `authorizable_id` | string(40), integer | Optional polymorphic scope; managers are scoped to Organization. |
| `roles_users.user_id`, `role_id` | integer | HABTM membership; table has no PK or unique constraint. |
| lifecycle timestamps | datetime | Present on both tables. |

Modern roles are platform administrator, organization manager, and organization
operator. FH-005 must map legacy organization managers deliberately and must not
infer access from orphaned or duplicate joins.

## `people`

| Column(s) | Legacy type/default | Meaning and observed rules |
| --- | --- | --- |
| `id` | integer PK | Person identity; preserve when safe. |
| `organization_id` | integer, indexed | Required tenant owner in Rails; database permits null, while the restored dump's FK rejects a non-null missing organization. |
| `first_name`, `last_name`, `full_name` | strings | First required; names trim/titleize; full name is derived before save. |
| `email`, `email_opt_out` | string, boolean false | Optional email, lower-cased and unique within tenant; opt-out is retained. |
| `phone` | string | Optional unnormalized display value. |
| `street1`, `street2`, `city`, `state`, `postal_code`, `country` | strings | Optional address; country defaults `US`; selected fields title/upper-case. |
| `staff` | boolean false | Current staff flag; outranks membership in display role. |
| `yob` | integer | Optional year of birth with rolling 100-year validation window. |
| `created_by_id`, `updated_by_id` | integer, indexed | Optional userstamp references; the restored dump has FKs to users. |
| `created_at`, `updated_at` | datetime | Lifecycle and people-report creation filters. |

Model comments mention `volunteer_hours` and `project_hours` columns not present in
the schema; the application calculates both from visits. Modern matching adds
normalized email/phone/name fields without changing legacy display values.

## `visits`

| Column(s) | Legacy type/default | Meaning and observed rules |
| --- | --- | --- |
| `id` | integer PK | Visit identity. |
| `person_id` | integer, indexed | Required parent in Rails; database permits null, while the restored dump's FK rejects a non-null missing person. |
| `arrived_at` | datetime | Required queue/report date; incomplete source rows exist. |
| `start_at`, `end_at` | datetime | Optional sign-in/out timestamps. |
| `duration` | float, 0 | Recomputed as end minus start in seconds only when both exist. |
| `volunteer` | boolean false | False means Project; true means Volunteering. |
| `staff`, `member` | booleans | Historical snapshots taken from the person at save/arrival. |
| `created_by_id`, `updated_by_id` | integer, indexed | Optional userstamp references; the restored dump has FKs to users. |
| `created_at`, `updated_at` | datetime | Lifecycle timestamps. |

One Note may attach polymorphically. Modern duration is an integer seconds field;
snapshot fields become immutable historical facts after creation.

## `services`

| Column(s) | Legacy type/default | Meaning and observed rules |
| --- | --- | --- |
| `id` | integer PK | Service identity. |
| `person_id` | integer, indexed | Required parent in Rails; database permits null, while the restored dump's FK rejects a non-null missing person. |
| `service_type_id` | string | Required enum-like value: `MEMBERSHIP`, `EAB`, or `CLASS`. |
| `start_date`, `end_date` | date | Optional in schema; new form defaults today through next year. |
| `paid`, `volunteered` | booleans false | How the service was received. |
| `created_by_id`, `updated_by_id` | integer, indexed | Optional userstamp references; the restored dump has FKs to users. |
| `created_at`, `updated_at` | datetime | Lifecycle timestamps. |

One Note may attach polymorphically. Membership presentation uses inclusive start
and end dates; another snapshot helper uses an exclusive end comparison, recorded
as DEF-006.

## `notes`

| Column(s) | Legacy type/default | Meaning and observed rules |
| --- | --- | --- |
| `id` | integer PK | Note identity. |
| `text` | text | Optional content; empty visit/service notes are discarded. |
| `notable_type`, `notable_id` | string, integer, composite index | Required by Rails; supported types are Person, Visit, Service. |
| `created_by_id`, `updated_by_id` | integer, indexed | Optional userstamp references; the restored dump has FKs to users. The polymorphic notable target has no FK. |
| `created_at`, `updated_at` | datetime | Lifecycle timestamps and aggregate ordering. |

Preflight counts 13,543 source notes: 2,197 valid attachments and 11,346 missing
targets. Migration imports valid attachments and quarantines every invalid/orphaned
row so the categories equal the source total.

## `tags` and `taggings`

| Column(s) | Legacy type/default | Meaning and observed rules |
| --- | --- | --- |
| `tags.id`, `tags.name` | integer PK, string | Globally stored tag identity/name; no organization owner. |
| `taggings.id`, `tag_id` | integer PK, integer indexed | Tag assignment identity and tag reference. |
| `taggable_id`, `taggable_type` | integer, string, composite index | Polymorphic target; retained UI uses Person. |
| `context` | string | Retained UI uses `tags`. |
| `tagger_id`, `tagger_type` | integer, string | Optional actor polymorphism. |
| `created_at` | datetime | Assignment creation timestamp. |

Organization tags are inferred through tagged people, which allows global-name and
orphan ambiguity. Modern tags require explicit organization ownership. The source
contains 61 orphaned taggings that must be quarantined and reconciled. Four of the
eight source tags have no valid organization after those taggings are removed and
are quarantined as unowned.

## Modern-only records

| Entity | Required purpose |
| --- | --- |
| Membership/role join | Explicit user-to-organization role, inclusive effective start/end dates. |
| Import job and row | Source format, preview disposition, match reason, warnings/errors, idempotency and rejection evidence. |
| Migration issue | Source table/ID, category, sanitized payload or fingerprint, disposition and resolution audit. |
| Archive audit | Person archive/restore actor and time; no V1 bulk permanent deletion. |

FH-005 owns canonical naming, database constraints and exact conversion rules. It
must reconcile each source table as `source = imported + quarantined`, convert the
three zero arrival datetimes to null with issues, and preserve source IDs where safe.
