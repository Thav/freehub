# Feature parity matrix

Status: the FH-004 legacy baseline is **Approved** after full-resolution
personal-data review and two byte-identical captures from independent clean fixture
restores. Modern evidence is populated by FH-009 onward.

| Area / retained behavior | Legacy evidence definition | Legacy status | Modern evidence | Owner ticket |
| --- | --- | --- | --- | --- |
| Login and rejection | `auth-login`, `auth-login-error`; source `SessionsController` | Approved | FH-021 capture map; prominent rejection and entered-login browser assertions | FH-021 |
| Account settings / recovery replacement | `auth-forgot`, `user-profile`, `user-edit`; retired-flow decisions in product spec | Approved | FH-021 account capture; administrator-issued temporary-password guidance replaces email-token recovery | FH-021 |
| Organization navigation/settings | `organization-home`, `organization-empty-home`, `organization-settings` | Approved | FH-021 populated/empty captures; identity shell and timezone-selector browser assertions | FH-021 |
| Roles and tenant denial | `authorization-denied`, `role-matrix.md`, DEF-001/002 | Approved | Full role integration suite plus anonymous and cross-tenant browser probes | FH-021 |
| Person autocomplete/search | `people-search-results`; autocomplete expected labels | Approved | FH-021 attached scoped-result capture and browser workflow | FH-021 |
| Person create/validation/edit | `people-new`, `people-validation`, `workflow-person-create`, `person-edit` | Approved | FH-021 captures and browser assertions for grouping, retained fields, field summary, redirect, and archive replacement | FH-021 |
| Profile role/membership states | `person-current-member`, `person-expired-member`, `person-patron`, `person-staff` | Approved | Four deterministic FH-021 fixture captures and dashboard-content browser assertions | FH-021 |
| Tags | `person-tags-edit`, `tag-people`, `tag-pagination` | Approved | FH-021 assignment/context captures and deterministic page-two browser assertion | FH-021 |
| Aggregated notes | `notes-index`, `note-detail`, `note-new`, `note-edit`; attached notes visible in visit/service evidence | Approved | FH-021 reverse-chronology index and focused CRUD captures; aggregate/tenant integration coverage | FH-021 |
| Daily visits / empty / historical | `visits-today`, `visits-empty`, `visits-historical` | Approved | FH-021 populated, empty, and historical captures with grouped table and day navigation | FH-021 |
| Visit sign-in/out task | `workflow-visit-sign-in`, `workflow-visit-sign-out` after clean restore | Approved | Queue-transition browser workflow and seeded queued/active/completed candidate states | FH-021 |
| Visit history/detail/forms | `visits-index`, `visit-detail`, `visit-new`, `visit-edit` | Approved | FH-021 table/detail/form captures with order, snapshots, audit, note, pagination, Show/Edit assertions | FH-021 |
| Services and all service types | `services-index`, `service-detail`, `service-new`, `service-edit` | Approved | FH-021 table/detail/single-column form captures and browser assertions | FH-021 |
| People report/export | `report-people`, `report-people-empty`, `csv-people`; DEF-005 | Approved | FH-021 populated/empty captures; pagination and all-result CSV integration coverage | FH-021 |
| Service report/export | `report-services`, `report-services-empty`, `csv-services`; DEF-004/008 | Approved | FH-021 type-specific populated/empty captures and CSV integration coverage | FH-021 |
| Visit report/export | `report-visits`, `report-visits-empty`, `csv-visits`; DEF-009 | Approved | FH-021 snapshot-classified populated/empty captures and CSV integration coverage | FH-021 |
| Summary report | `report-summary`, `report-summary-empty-error`; DEF-014/017 | Approved | FH-021 weekly/daily captures; valid empty state explicitly replaces DEF-017 | FH-021 |
| CSV import | Explicitly absent from legacy | Not present / new feature | Shared shell plus preview/apply/result browser workflow | FH-021 |
| Bulk export/archive/restore | Export only; legacy permanent delete is excluded | Not present / new feature | Shared shell plus preview/export and reversible mutation coverage | FH-021 |

## Evidence contract

- Screenshot evidence: generated PNG, manifest record, response/final-path/label
  assertions, byte count and SHA-256, plus a per-image approved personal-data finding.
- Download evidence: response-triggered download, suggested filename, exact header,
  byte count and SHA-256. CSV bodies stay in ignored candidate output.
- Behavioral evidence: manifest action sequence and assertions, including real
  invalid submit, autocomplete, successful create, queue sign-in/out, exports, and
  role denial. Static screenshots alone do not prove those workflows.
- Determinism evidence: two captures, each beginning with a clean fixture restore,
  must match byte-for-byte and then match the committed approved baseline.
