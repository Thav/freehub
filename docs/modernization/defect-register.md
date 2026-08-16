# Legacy defect register

Status: FH-004 baseline findings. “Preserve presentation” means the screenshot may
show the legacy result for comparison; no defect below is a modern requirement.

| ID | Severity | Area | Evidence | Modern disposition |
| --- | --- | --- | --- | --- |
| DEF-001 | Critical | Tenant isolation | Nested controllers authorize the URL organization but use global `find` for people, visits, services, notes and taggings. | Fix before parity: scope every lookup and mutation through authenticated organization; add denial tests per resource. |
| DEF-002 | High | User privacy | `UsersController#show` has no owner/admin `permit`, so any authenticated user can view any user profile by ID. | Own-profile or platform-admin scope only. |
| DEF-003 | High | Authentication | SHA-1 salted password hashes, reset codes and remember tokens are legacy credentials. | Never migrate hashes/tokens; temporary forced-change passwords and maintained sessions. |
| DEF-004 | High | Services CSV | `Service#to_csv` uses reversed date ternaries and emits blank start/end dates when present. | Correct export contract and CSV tests; legacy download evidence identifies current behavior. |
| DEF-005 | High | People CSV | `Person#to_csv` overwrites the `yob` value with tag text while the header still says `yob`; no tag header exists. | Define canonical columns and exact header/row contract in FH-005/FH-016. |
| DEF-006 | Medium | Membership | `Service#current?` includes `end_date`; `Person#services.on` uses `end_date > date`, so profile role and visit member snapshot disagree on expiration day. | Canonical inclusive start/end dates everywhere. |
| DEF-007 | High | Data integrity | Database schema lacks foreign keys; supplied data includes orphaned notes/taggings, one zero-date and a duplicate normalized phone. | Explicit preflight, quarantine and source = imported + quarantined reconciliation. |
| DEF-008 | Medium | Reports | Services report calls `.collect` on missing `report[for_service_types]`; crafted/partial filter submissions can error. | Typed request validation and empty-selection semantics. |
| DEF-009 | Medium | Reporting | Visits report displays role from the current Person (`staff?`) even though the visit stores historical `staff`/`member` snapshots. | Reports use immutable visit snapshots. |
| DEF-010 | Medium | Time/duration | Visits allow incomplete/out-of-order timestamps and float duration; recalculation occurs only when both timestamps exist. | Validate temporal order where appropriate; integer duration seconds; reconcile incomplete history. |
| DEF-011 | Medium | Tags | Tags are globally stored and organization membership is inferred indirectly through tagged people. | Explicit organization ownership and uniqueness scope. |
| DEF-012 | Medium | Deletion | Manager UI permanently deletes people and dependent visits/services/notes. | Reversible archival; no V1 bulk permanent deletion. |
| DEF-013 | Medium | Provisioning/privacy | Public signup creates organizations/managers, while the public home enumerates organizations and recent activity. | Remove public provisioning and tenant directory. |
| DEF-014 | Low | Summary visual | Summary chart is a runtime Google Chart URL; it is external and cannot be a deterministic/private baseline dependency. | Local chart or table; capture blocks non-local requests and treats tables as evidence. |
| DEF-015 | Low | Validation/UI | User email format validation is disabled and some labels/markup are ambiguous or malformed. | Maintained form semantics and validation without changing established task flow. |
| DEF-016 | Medium | Account model | `User#organization` returns only the first managed object, preventing clear multi-organization selection. | Explicit memberships and organization chooser. |
| DEF-017 | Medium | Summary report | With no visits, `VisitsSummary#fill_empty_days` dereferences `days.first`; the view's intended `No visits for date range` state is unreachable. | Return a valid empty report and cover it in domain/system tests. |

Defects discovered during runtime capture must be added here before expanding ticket
scope or accepting a screenshot that could otherwise be mistaken for desired
behavior.
