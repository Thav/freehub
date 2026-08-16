# Legacy and target role matrix

Status: FH-004 source-derived authorization map with denial capture. `permit`
expressions come from the legacy controllers and the authorization compatibility
initializer used by the reference container.

Legend: **Yes** is intended/declared access, **Own** is resource ownership only,
**No** is denied, and **Public** skips login. “Legacy gap” means controller lookup
can violate the apparent organization boundary and must not be copied.

| Capability | Public | Authenticated/no org role | Organization manager | Global legacy admin | Modern target |
| --- | --- | --- | --- | --- | --- |
| Login / forgot-password form | Public | Public | Public | Public | Public login; maintained recovery or admin reset |
| Marketing org directory | Public | Yes | Yes | Yes | Removed |
| Public organization/user signup | Public | Public | Public | Public | Removed |
| Organization home/settings | No | No | Yes, own org | Yes | Manager/operator scoped by membership; settings manager-only |
| Organization removal | No | No | No | Yes | Platform administrator lifecycle, not routine delete |
| Person search/profile/create/edit/remove | No | No | Yes, own org expression | Yes | Scoped manager/operator; archive replaces remove |
| Visit queue/history/create/edit/sign/remove | No | No | Yes, own org expression | Yes | Scoped manager/operator; audited removal policy |
| Service list/detail/create/edit/remove | No | No | Yes, own org expression | Yes | Scoped manager/operator; audited removal policy |
| Notes and tags | No | No | Yes, own org expression | Yes | Scoped manager/operator |
| Reports and CSV export | No | No | Yes, own org expression | Yes | Scoped manager/operator |
| View user profile | No | Yes for any ID | Yes for any ID | Yes | Own profile; platform admin only for others |
| Edit/update/remove user | No | Own | Own | Yes | Own safe settings; role/account lifecycle by authorized admin |
| List all users | No | No | No | Yes | Platform administrator only, with tenant-aware UI |

## Target role interpretation

- **Platform administrator** provisions organizations, manages account/membership
  lifecycle, and may perform explicitly audited support actions across tenants.
- **Organization manager** performs all shop workflows and manages organization
  settings and membership assignments.
- **Organization operator** performs person, visit, service, note, tag, report, and
  export workflows but cannot change organization or role settings.
- Membership is inclusive of effective start and end dates. A user with no active
  membership has no organization resource access.

## Critical legacy gap

Most nested controllers authorize against the organization in the URL and then load
the target Person, Visit, Service, Note, or Tagging globally by numeric ID. A manager
can therefore pair their authorized organization key with another tenant's target
ID. This is recorded as DEF-001 and is explicitly excluded from parity. Every modern
resource lookup must begin through the authenticated organization scope.
