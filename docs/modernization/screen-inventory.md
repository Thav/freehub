# Legacy screen inventory and capture map

Status: FH-004 source and fixture inventory. `test/legacy-visual/manifest.json` is
the executable source for exact fixtures, expected labels, 1280×900 viewport, and
task sequences. Screenshot filenames are `<capture-id>.png` unless noted.

## Retained screens and meaningful states

| Area | Route or route pattern | States and fixture prerequisites | Capture IDs |
| --- | --- | --- | --- |
| Authentication | `/session/new` | form; rejected credential | `auth-login`, `auth-login-error` |
| Recovery information | `/forgot` | email form; retained only as evidence for replacement planning | `auth-forgot` |
| Organization home | `/:organization_key` | populated manager search; empty tenant | `organization-home`, `organization-empty-home` |
| Organization settings | `/:organization_key/edit` | populated form | `organization-settings` |
| Tenant denial | protected organization route | authenticated user without role redirected away; machine probe because legacy has no denial screen | `authorization-denied` (no PNG) |
| Person search | organization home or today's visits | autocomplete suggestions after two characters | `people-search-results` |
| Person create | `/:org/people/new` | blank form; required-field error; successful create | `people-new`, `people-validation`, `workflow-person-create` |
| Person profile | `/:org/people/:id` | current member, expired member, patron/no service, staff/default volunteer | `person-current-member`, `person-expired-member`, `person-patron`, `person-staff` |
| Person edit | `/:org/people/:id/edit` | populated form and removal warning | `person-edit` |
| Inline tags | person profile | view and edit mode | profile captures, `person-tags-edit` |
| Tag results | `/:org/tags/:id` | populated results; second pagination page | `tag-people`, `tag-pagination` |
| Daily visits | `/:org/visits/:year/:month/:day` | today populated, today empty, historical populated | `visits-today`, `visits-empty`, `visits-historical` |
| Queue transitions | today's daily visits | open → signed in → signed out | `workflow-visit-sign-in`, `workflow-visit-sign-out` |
| Person visits | `/:org/people/:person_id/visits` | populated list | `visits-index` |
| Visit detail/form | nested `/visits/:id`, `/new`, `/:id/edit` | detail, new, edit | `visit-detail`, `visit-new`, `visit-edit` |
| Person services | `/:org/people/:person_id/services` | all three service types | `services-index` |
| Service detail/form | nested `/services/:id`, `/new`, `/:id/edit` | detail, new, edit | `service-detail`, `service-new`, `service-edit` |
| Person notes | `/:org/people/:person_id/notes` | aggregated person/visit/service notes | `notes-index` |
| Note detail/form | nested `/notes/:id`, `/new`, `/:id/edit` | detail, new, edit | `note-detail`, `note-new`, `note-edit` |
| Reports index | `/:org/reports` | four report choices | `reports-index` |
| People report | `/:org/reports/people` | populated filtered; empty | `report-people`, `report-people-empty` |
| Services report | `/:org/reports/services` | all types populated; empty | `report-services`, `report-services-empty` |
| Visits report | `/:org/reports/visits` | populated; empty | `report-visits`, `report-visits-empty` |
| Summary report | `/:org/reports/summary` | populated weekly/daily; empty-state server error | `report-summary`, `report-summary-empty-error` |
| CSV downloads | people/services/visits report `.csv` | header, size, filename and SHA evidence | `csv-people`, `csv-services`, `csv-visits` (no PNG) |
| Own account | `/users/:id`, `/users/:id/edit` | profile and settings form | `user-profile`, `user-edit` |

The manifest uses only the synthetic organizations, accounts, IDs and text created
by `legacy/fixture-data.sql`. Date tokens resolve today/yesterday in the fixture
organization's Eastern timezone. Report bounds deliberately cover the deterministic
fixtures instead of relying on each report's runtime-relative defaults.

## Historical screens that are not parity requirements

| Legacy screen | Route | Disposition and reason |
| --- | --- | --- |
| Marketing home and organization activity directory | `/` | Retired; leaks tenant/activity directory and is not an authenticated shop task. |
| Public organization registration | `/organizations/new` | Retired; platform administrators provision organizations. |
| Public standalone user signup | `/users/new` | Retired; access is provisioned and cutover uses temporary passwords. |
| Activation link | `/activate/:activation_code` | Retired with legacy activation email. |
| Password reset token form | `/reset/:reset_code` | Replaced by maintained authentication and forced-change flow. |
| Global user list/new/remove | `/users`, REST actions | Retired; no legacy admin fixture and no organization-manager need. |
| Quick demo movie | `/demo/summary.html` | Historical marketing asset, not an application workflow. |
| XML representations | resource `.xml` routes | Not a documented supported integration; modern contracts are explicit HTTP/OpenAPI. |

## Coverage rules

- “Every screen” means every retained HTML screen plus distinct empty, error,
  permission, pagination, role/membership, and queue-transition state above.
- CSV responses are behavioral artifacts rather than screenshots. Their evidence
  records filename, header, byte count, and SHA-256 without committing exports.
- Destructive Remove actions are documented but not exercised: permanent deletion
  is deliberately not retained. Create/sign-in/sign-out actions are exercised only
  against synthetic data and the database is restored before every full run.
- The approved baseline is valid only when every screenshot ID has an explicit
  approved finding in `personal-data-review.json`.
