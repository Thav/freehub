# Data dictionary

Status: initial reconstruction; FH-005 owns the canonical contract.

| Entity | Legacy purpose | Modern requirements |
|---|---|---|
| Organization | Tenant, slug, location, timezone | Unique slug; settings; scoped ownership |
| User | Login identity with SHA-1 password | Modern digest, forced-change flag, disabled state |
| Organization role | Manager authorization through roles tables | Explicit manager/operator join; platform admin separate |
| Person | Contact and shop-role record | Normalized match fields, audit data, archive timestamp |
| Visit | Attendance and time record | Arrival/start/end, duration seconds, volunteer and historical role snapshots |
| Service | Membership/EAB/Class entitlement | Typed service, inclusive dates, payment/volunteer flags |
| Note | Polymorphic text and user stamps | Explicit supported attachment and author audit |
| Tag | Person classification | Organization-scoped tag and join table |
| Import job/row | Not present | Preview, disposition, idempotency, rejection evidence |
| Migration issue | Not present | Source identity, category, sanitized payload, disposition |

Legacy source columns remain documented in `db/schema.rb`. The modern schema must preserve valid source IDs where safe and reconcile imported plus quarantined records to source totals.
