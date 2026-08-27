# Modern visual parity plan

Status: active under FH-021. The approved FH-004 screenshots are behavioral and
information-architecture evidence, not a mandate to reproduce obsolete browser
chrome, external assets, permanent deletion, or hosting credits.

## Definition of parity

A retained screen is ready only when all of the following are true:

1. Existing information and actions are present unless a documented product
   decision explicitly replaces or retires them.
2. Heading hierarchy, field order, action placement, grouping, table columns,
   empty/error states, and default selections remain recognizable to a current
   user.
3. Modern safety changes (tenant scoping, archive instead of delete, local charts,
   accessible controls, and responsive layout) are preserved.
4. A deterministic modern capture at 1280×900 is reviewed beside the approved
   legacy image. Narrow-viewport behavior is tested separately.
5. Playwright asserts the meaningful labels, values, order, and task transition;
   pixel similarity alone is not sufficient.

## Owner feedback incorporated

- The header must show the logged-in user's login/name as well as Log Out.
- Person profiles must remain dashboards: sign-in panel and default activity,
  member/patron/staff summary, rolling hours, membership action, contact/tags,
  recent visits, recent services, and recent aggregated notes.
- Person create/edit restores year of birth and legacy field grouping/order.
- Reports retain the four report descriptions and use link/tab semantics rather
  than generic action buttons. One shared date range survives report-type changes.
- Service create/edit restores the single-column legacy order.
- Service detail uses a readable labeled-value layout and retains audit metadata
  when available.

## Screenshot-by-screenshot matrix

The `Initial audit` column records the state when FH-021 was claimed: `Gap` meant
missing information, route, state, or material structure; `Partial` meant the
workflow existed but needed parity work; and `Replacement` required a documented
modern behavior rather than a literal legacy screen. Completion evidence is
recorded by exact baseline ID in `modern/test/visual/parity-capture.spec.ts` and
summarized by screen family in `docs/modernization/parity-matrix.md`.

| Baseline ID | Modern target | Initial audit | Required parity work |
| --- | --- | --- | --- |
| `auth-login` | `/` | Partial | Keep familiar header/form order; add recovery guidance appropriate to provisioned accounts. |
| `auth-login-error` | `/` invalid submit | Partial | Preserve entered login and show the legacy-prominent inline error treatment. |
| `auth-forgot` | account recovery guidance | Replacement | Explain administrator reset/temporary-password flow; do not restore retired email-token reset. |
| `organization-home` | `/organizations/:id` | Partial | Keep queue-search prompt, blank initial value, autocomplete placement, and add-person path. |
| `organization-settings` | `/organizations/:id/settings` | Partial | Match field order and contextual help; use a timezone selector rather than unstructured text. |
| `organization-empty-home` | organization home with no people | Partial | Verify stable empty state without losing the add-person route. |
| `people-search-results` | organization home search | Partial | Present results as an attached suggestion list with person role context and Add Person fallback. |
| `people-new` | `/people/new` | Gap | Restore Name grouping, year of birth, second address line, country default, opt-out placement, and legacy order. |
| `people-validation` | invalid `/people/new` submit | Partial | Add field-associated error and summary while keeping entered values. |
| `workflow-person-create` | successful person create | Partial | Capture redirect to the complete person dashboard. |
| `person-current-member` | `/people/:id` | Gap | Full dashboard, current-membership status/expiry/renewal, rolling hours, recent aggregates, tags and sign-in panel. |
| `person-expired-member` | `/people/:id` | Gap | Same dashboard with expired membership status and renewal action. |
| `person-patron` | `/people/:id` | Gap | Same dashboard with patron/non-member language and Create Membership action. |
| `person-staff` | `/people/:id` | Gap | Same dashboard with Staff summary and Volunteer as the default sign-in activity. |
| `person-edit` | `/people/:id/edit` | Gap | Restore all person fields, year of birth, grouping/order, and archive replacement for legacy removal. |
| `person-tags-edit` | `/people/:id/tags` or inline profile editor | Partial | Preserve visible assigned tags, edit affordance, suggestions, create-new behavior, and removal. |
| `tag-people` | `/tags/:id` | Partial | Restore person membership/visit context columns rather than a names-only list. |
| `tag-pagination` | `/tags/:id?page=2` | Gap | Add deterministic pagination and preserve filter/tag context. |
| `visits-today` | `/visits/days/:day` | Partial | Restore queue search, project/volunteer grouping, row timing/note density, and day navigation. |
| `visits-historical` | `/visits/days/:day` | Partial | Make historical state and navigation as clear as the baseline. |
| `visits-empty` | `/visits/days/:day` empty | Partial | Preserve both empty groups and queue-search affordance. |
| `workflow-visit-queue` | profile → today's queue | Partial | Capture activity selection, optional note, and resulting queue row. |
| `workflow-visit-sign-in` | daily queue transition | Partial | Preserve in-place row action and changed timing state. |
| `workflow-visit-sign-out` | daily queue transition | Partial | Preserve in-place row action and completed timing state. |
| `visits-index` | `/people/:id/visits` | Gap | Replace the simple list with legacy columns, note visibility, and Show/Edit actions. |
| `visit-detail` | `/visits/:id` | Partial | Use labeled values, person context, snapshots, note, duration, audit, and correction actions. |
| `visit-new` | `/visits/new` | Partial | Restore activity-first/timestamp/note order and person breadcrumb. |
| `visit-edit` | `/visits/:id/edit` | Partial | Restore the same order with populated values and correction context. |
| `services-index` | `/people/:id/services` | Partial | Preserve person breadcrumb, service table columns, note summary, and Show/Edit actions. |
| `service-detail` | `/services/:id` | Gap | Render an aligned definition list for type, dates, flags, note, created/updated attribution, and Edit. |
| `service-new` | `/services/new` | Gap | Force single-column order: type, start, end, paid, volunteered, note, submit; add person breadcrumb. |
| `service-edit` | `/services/:id/edit` | Gap | Same stable order with populated values and update action. |
| `notes-index` | `/people/:id/notes` | Partial | Preserve reverse chronology, source/target context, author/time, and Show/Edit actions. |
| `note-detail` | `/notes/:id` | Gap | Restore retained detail view with target context and audit metadata. |
| `note-new` | `/notes/new` or accessible inline equivalent | Gap | Provide focused creation state while retaining modern supported-target rules. |
| `note-edit` | `/notes/:id/edit` | Gap | Restore authorized correction workflow and audit attribution. |
| `reports-index` | `/reports` | Gap | Retain People/Services/Visits/Summary descriptions instead of reducing the choice to four buttons. |
| `report-people` | `/reports`, People selected | Gap | Link/tab selector, shared date range, name and role filters, exact columns, pagination and export. |
| `report-people-empty` | People empty result | Partial | Keep filters visible and show an explicit valid empty state. |
| `report-services` | `/reports`, Services selected | Gap | Shared date range, service-type filters, exact columns, pagination and export. |
| `report-services-empty` | Services empty result | Partial | Keep filters visible and show an explicit valid empty state. |
| `report-visits` | `/reports`, Visits selected | Gap | Shared date range, snapshot classifications, exact timing/note columns, pagination and export. |
| `report-visits-empty` | Visits empty result | Partial | Keep filters visible and show an explicit valid empty state. |
| `report-summary` | `/reports`, Summary selected | Partial | Shared date range, locally rendered summary visualization, weekly/daily tables and exact categories. |
| `report-summary-empty-error` | Summary empty result | Replacement | Render a valid empty state; do not reproduce the legacy server error. |
| `csv-people` | People export | Behavioral | Preserve shared filters, documented columns, filename, authorization, and all-result export. |
| `csv-services` | Services export | Behavioral | Preserve shared filters, documented columns, filename, authorization, and all-result export. |
| `csv-visits` | Visits export | Behavioral | Preserve shared filters, documented columns, filename, authorization, and all-result export. |
| `user-profile` | own-account profile | Gap | Restore logged-in identity destination and safe own-account summary. |
| `user-edit` | own-account settings | Gap | Restore authorized name/login/email/password settings or document the precise maintained replacement. |

The authorization denial probe has no screenshot but remains a mandatory
cross-tenant browser/API assertion.

## Implementation order

### 1. Shared data and view primitives

- Extend the session response with the current user's safe display identity and
  link it to the own-account destination.
- Add reusable breadcrumb titles, action panels, field rows/groups, definition
  lists, compact data tables, empty states, and a real secondary report tab list.
- Add a modern capture manifest keyed to the legacy capture IDs. Candidates remain
  ignored until full-resolution personal-data and parity review.

### 2. People dashboard and forms

- Build the four profile states from one dashboard component.
- Return the rolling-hour and recent aggregate data needed by that dashboard.
- Restore all create/edit fields and validation, including `street2` and
  `yearOfBirth`, in legacy order; retain Archive/Restore instead of Remove.

### 3. Visits, services, notes, and tags

- Correct list/detail/form information architecture before fine styling.
- Add missing note detail/edit and tag pagination/context.
- Verify every role, empty state, and queue transition from the manifest.

### 4. Reports

- Show the four legacy report explanations on entry.
- Use semantic links/tabs for type selection; keep one date-range state while the
  user changes type, with type-specific filters below it.
- Restore documented filters, columns, pagination, exports, and summary empty state.

### 5. Modern-only screens and final review

- Apply the same primitives to Import and Manage People without pretending they
  have legacy screenshots.
- Capture every retained modern state at 1280×900 after a clean deterministic seed,
  compare side by side, record owner decisions, and update
  `docs/modernization/parity-matrix.md` with evidence rather than `Pending`.

## Verification gates

- API/integration coverage for newly exposed profile/session/audit data and all
  tenant/role boundaries.
- Playwright checks for information presence and DOM order on each retained screen.
- Desktop comparison captures for every PNG ID and behavioral coverage for probes,
  workflows, and CSV entries.
- Responsive smoke at 390×844 for each shared screen family.
- `npm run check`, the full Compose test and visual profiles,
  `bin/verify-modern-foundation`, `git diff --check`, and `bin/ralph validate`.

## Implementation checkpoint

2026-08-26, FH-021 active:

- Registered the dedicated ticket and made FH-019 depend on it.
- Restored the legacy layout shell, authenticated identity link, Log Out, and an
  own-account profile/settings screen backed by the existing scoped API.
- Restored `street2`, year of birth, country default, grouped person fields, and
  deliberate create/edit ordering.
- Rebuilt the person profile as a sign-in and recent-activity dashboard with role,
  membership, rolling project/volunteer hours, contact, tags, visits, services,
  notes, renewal/create-membership, archive, and restore treatments.
- Restored single-column service form order and a labeled service detail view with
  note and audit fields.
- Restored report descriptions, semantic tab selection, type-specific controls,
  and one date range that persists across report changes.
- Restored contextual, paginated tag results; visit/service history tables; a
  labeled visit detail; activity-first visit forms; and focused note index,
  create, detail, and edit routes.
- Restored the legacy header notice treatment for retained session, person,
  visit, service, note, organization, archive/restore, and renewal mutations.
  The four workflow candidates now execute their real create/queue/sign-in/
  sign-out transitions and assert the legacy success messages before capture.
- Added deterministic current, expired, patron, staff, empty-organization,
  current/historical visit, tag-page-two, service, and note fixtures.
- `parity-capture.spec.ts` fails if any FH-004 screenshot, probe, workflow, or CSV
  ID lacks an exact modern capture, behavioral record, or replacement decision.
  It writes 47 full-page owner-review candidates plus SHA-256 evidence beneath
  ignored `tmp/visual-review/modern-candidates/`.
- Full API/integration coverage and all 18 task-oriented Playwright workflows
  pass after the identity/session and screen-structure changes. Responsive checks
  cover the shell, profile, visit, service, report, import, and bulk families at
  390×844.
