# Current product specification

Status: reconstructed baseline; FH-004 will verify every statement against the running legacy system.

Freehub is a multi-organization community-bike-shop system used by authenticated shop users to find people, record visits and volunteer/project time, manage services, attach notes and tags, and generate reports.

## Core behavior

- A person belongs to one organization and requires a first name. Contact, address, birth year, staff status, and email opt-out are optional.
- A person is Staff when flagged as staff, a Member while a Membership service is current, and otherwise a Patron.
- A visit records arrival, sign-in, sign-out, project/volunteer status, duration, staff/member snapshots, and an optional note.
- Services are Membership, Earn-a-Bike/Digging Rights, or Class, with dates, paid/volunteered flags, and an optional note.
- Notes can belong to a person, visit, or service. A person profile aggregates all three kinds.
- Tags classify people and persist until removed.
- Reports cover people, visits, services, and daily/weekly visit summaries; the first three support CSV export.
- Organization timezone affects displayed and reported dates.

## Primary workflows

1. Log in and open an organization.
2. Search for a person or add one.
3. Open a profile and select Project or Volunteer to create a visit.
4. Sign the visit in and out from the daily shop list.
5. Add or renew services and attach notes/tags.
6. Filter reports and export CSV.
7. Managers update organization settings.

## Known legacy concerns

- Obsolete Ruby/Rails, SHA-1 passwords, old plugins, and MySQL-specific SQL.
- Several controllers load nested records globally rather than through organization scope.
- Public organization signup and external HTTP JavaScript dependencies.
- Inconsistent/incomplete data, including visits without full timestamps.
- Current branch dependency files do not match the legacy application source.
