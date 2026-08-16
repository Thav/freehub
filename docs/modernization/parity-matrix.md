# Feature parity matrix

Status: the FH-004 legacy baseline is **Approved** after full-resolution
personal-data review and two byte-identical captures from independent clean fixture
restores. Modern evidence is populated by FH-009 onward.

| Area / retained behavior | Legacy evidence definition | Legacy status | Modern evidence | Owner ticket |
| --- | --- | --- | --- | --- |
| Login and rejection | `auth-login`, `auth-login-error`; source `SessionsController` | Approved | Pending | FH-010 |
| Account settings / recovery replacement | `auth-forgot`, `user-profile`, `user-edit`; retired-flow decisions in product spec | Approved | Pending | FH-010 |
| Organization navigation/settings | `organization-home`, `organization-empty-home`, `organization-settings` | Approved | Pending | FH-011 |
| Roles and tenant denial | `authorization-denied`, `role-matrix.md`, DEF-001/002 | Approved | Pending denial suite | FH-011 |
| Person autocomplete/search | `people-search-results`; autocomplete expected labels | Approved | Pending | FH-012 |
| Person create/validation/edit | `people-new`, `people-validation`, `workflow-person-create`, `person-edit` | Approved | Pending | FH-012 |
| Profile role/membership states | `person-current-member`, `person-expired-member`, `person-patron`, `person-staff` | Approved | Pending | FH-012/FH-015 |
| Tags | `person-tags-edit`, `tag-people`, `tag-pagination` | Approved | Pending | FH-013 |
| Aggregated notes | `notes-index`, `note-detail`, `note-new`, `note-edit`; attached notes visible in visit/service evidence | Approved | Pending | FH-013 |
| Daily visits / empty / historical | `visits-today`, `visits-empty`, `visits-historical` | Approved | Pending | FH-014 |
| Visit sign-in/out task | `workflow-visit-sign-in`, `workflow-visit-sign-out` after clean restore | Approved | Pending | FH-014 |
| Visit history/detail/forms | `visits-index`, `visit-detail`, `visit-new`, `visit-edit` | Approved | Pending | FH-014 |
| Services and all service types | `services-index`, `service-detail`, `service-new`, `service-edit` | Approved | Pending | FH-015 |
| People report/export | `report-people`, `report-people-empty`, `csv-people`; DEF-005 | Approved | Pending corrected contract | FH-016 |
| Service report/export | `report-services`, `report-services-empty`, `csv-services`; DEF-004/008 | Approved | Pending corrected contract | FH-016 |
| Visit report/export | `report-visits`, `report-visits-empty`, `csv-visits`; DEF-009 | Approved | Pending snapshot-based report | FH-016 |
| Summary report | `report-summary`, `report-summary-empty-error`; DEF-014/017 | Approved | Pending local rendering and valid empty state | FH-016 |
| CSV import | Explicitly absent from legacy | Not present / new feature | Pending | FH-017 |
| Bulk export/archive/restore | Export only; legacy permanent delete is excluded | Not present / new feature | Pending | FH-018 |

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
