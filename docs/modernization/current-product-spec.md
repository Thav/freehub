# Current product specification

Status: FH-004 reconstructed legacy behavior. Runtime evidence is defined by
`test/legacy-visual/manifest.json` and is approved only when the generated files in
`docs/modernization/visual-baseline/` include a completed personal-data review.

## Product boundary

Freehub is a multi-organization community-bike-shop system. An authenticated shop
manager finds or creates people, records project and volunteer visits, manages
services, notes and tags, and exports operational reports. The organization is the
tenant and supplies the timezone used for screens and report boundaries.

The modernization retains the shop workflows below, but does not preserve the
legacy marketing site, public organization provisioning, public user signup,
activation-email flow, global user administration, or permanent record deletion.
Platform administrators will provision organizations and access; temporary
passwords replace legacy activation/reset email at cutover.

## Identities, tenancy, and navigation

- A legacy user authenticates with a unique login and SHA-1 password, optionally
  setting a two-week remember-me cookie. Failed authentication retains the login
  screen and displays `Log in failed`.
- A user receives `manager` on a specific organization through `roles` and
  `roles_users`. The authorization plugin also recognizes global `admin` and
  resource `owner`; see `role-matrix.md` for observed access.
- Successful manager login opens the first organization managed by that user.
- The organization home and today's Visits page share an autocomplete field. Two
  or more characters return up to 15 organization-scoped people ordered by name;
  selecting a result opens its profile.
- Organization navigation exposes Home, Visits, Reports, and Settings. Account
  settings are reached from the signed-in login name. Displayed times use the
  selected organization's Rails timezone.
- The modern product retains authenticated organization selection and scoped
  navigation. It replaces the ambiguous legacy “first managed organization” rule
  with explicit selection and prohibits cross-tenant lookup by identifier.

## People

- A person belongs to exactly one organization. First name is required; last name,
  contact details, address, country, year of birth, staff status, and email opt-out
  are optional. Email is unique case-insensitively within an organization when
  present.
- Before save, surrounding whitespace is removed from names/email, names and
  addresses are title-cased, state may be upper-cased, email is lower-cased, and
  `full_name` is rebuilt from first and last name.
- Year of birth must be an integer strictly within the rolling range from 99 years
  ago through the current year. The default country is `US`.
- Display role is Staff when `staff` is true, Member when a Membership service is
  current, and Patron otherwise. A profile distinguishes current, expired, and no
  membership; shows rolling volunteer/project hours; and aggregates recent visits,
  services, notes, and tags.
- Managers can create, view, edit, and in the legacy app permanently remove people.
  Modern parity retains create/view/edit/search, replaces removal with reversible
  archive, and keeps archived records in reports and exports.
- Baseline states: current member 900001, expired member 900002, patron 900003,
  staff 900004, validation target 900005, and pagination people 900006–900026.

## Visits and shop queue

- A visit belongs to a person and records arrival, optional sign-in and sign-out,
  project/volunteer choice, optional note, duration, and staff/member snapshots.
- New visits default arrival to now and Project, except the profile quick-sign-in
  form defaults staff people to Volunteer. Creating from a profile redirects to
  today's shop queue.
- The daily queue groups visits into Projects and Volunteering. An open visit may
  be signed in; a signed-in visit may be signed out. Managers may also edit its
  timestamps/note or remove it.
- Saving records the person's current staff flag and membership status at arrival.
  When both start and end exist, duration is recalculated as seconds between them.
- Daily pages have previous/next navigation, and person profiles expose a paginated
  visit history plus detail/new/edit screens.
- Modern parity retains queue, history, create/edit, sign-in/out, notes, immutable
  role snapshots and duration seconds. Permanent removal is replaced by the
  archival/audit policy defined in later tickets.

## Services and membership

- A service belongs to a person and has type Membership, Earn a Bike/Digging
  Rights (`EAB`), or Class; start/end dates; paid and volunteered flags; and an
  optional note.
- New services default to today through one year from today. Type and person are
  required. The legacy `current?` presentation includes both start and end dates.
- The most recently ordered Membership controls the profile's current/expired
  presentation and the Renew/Create Membership action.
- Managers can list, view, create, edit, and permanently remove services in the
  legacy app. Modern parity retains the operational workflow but applies modern
  audit/deletion rules.

## Notes and tags

- Notes attach polymorphically to a Person, Visit, or Service. A person's Notes
  screen aggregates all three kinds in reverse creation order. Notes carry creator
  and updater stamps when the legacy callbacks have populated them.
- A visit or service form creates at most one attached note after discarding empty
  text. The profile quick-sign-in reveals its note field on demand.
- Tags classify people. The profile provides an inline editor for removing current
  tags, selecting another tag observed in the organization, or creating a new tag.
  A tag page lists matching organization people with membership/visit context and
  paginates.
- Modern parity retains these workflows but makes tags explicitly
  organization-owned and limits notes to supported attachment types.

## Reports and exports

- The report index links People, Services, Visits, and Summary.
- People filters by creation date range, a case-insensitive name fragment of at
  least three characters, and Staff/Patron/All. Results paginate and export CSV.
- Services filters by strict end-date bounds and one or more service types. Results
  paginate and export CSV.
- Visits filters by organization-local arrival date range. Results show the current
  person's Staff/Patron display plus stored visit values and export CSV.
- Summary groups visits by day and week and splits totals into staff, volunteer,
  member, patron, and total. It has no CSV export.
- Blank report bounds remove that constraint. Default report ranges are based on
  today/current month/current year and are therefore runtime-relative.
- Modern parity retains the report filters, pagination, columns and downloadable
  datasets after correcting the export defects in `defect-register.md`.

## Retained end-to-end tasks

1. Log in, select an organization, search by name, and open a profile.
2. Create a person and resolve required-field validation.
3. From a profile choose Project or Volunteer, add an optional note, create the
   visit, then sign it in and out on today's queue.
4. Inspect and edit visit history; add/renew a service; inspect the resulting
   member/patron state.
5. Add and inspect person/visit/service notes; edit person tags and browse a tag.
6. Filter People, Services, Visits, and Summary reports; paginate where applicable;
   download each supported CSV export.
7. Update organization and own-account settings within the role matrix.

Each retained task has one or more screenshot or download entries in the manifest.
The exact route, fixture prerequisite, viewport, expected labels, and ordered task
steps live with each entry so capture and documentation cannot drift independently.

## Deliberately retired legacy behavior

- Public organization registration and its implicit manager creation.
- Public standalone user signup, activation links, and email-dependent reset flow.
- Public organization/activity directory and global administrator user list.
- Permanent UI deletion as the normal response to duplicate or stale people.
- Cross-organization access accidentally enabled by global identifier lookup.
- External Google Chart rendering and other runtime-loaded third-party assets.

These screens remain listed in `screen-inventory.md` for historical completeness,
but they are not parity requirements and do not receive retained-workflow images.
