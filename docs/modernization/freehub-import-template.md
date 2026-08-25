# Freehub CSV import template

Managers can download the current template from the Import page. The parser accepts
UTF-8 (with or without BOM), UTF-16 BOM exports, and Windows-1252 fallback text.
It follows CSV quoting rules, including commas and escaped quotes inside a value.

The Freehub header is:

```text
first_name,last_name,email,phone,street1,street2,city,state,postal_code,country,year_of_birth,staff,email_opt_out,service_type,service_start_date,service_end_date,service_paid,service_volunteered
```

`first_name` and `last_name` are required. `country` must be a two-letter code,
years must be 1880–2100, and dates use `YYYY-MM-DD`. Boolean columns accept
`yes`/`no`, `true`/`false`, or `1`/`0`. Service columns are optional; a manager can
choose an explicit default service when using the API, or provide a per-row
`membership`, `earn_a_bike`, or `class` service.

Corsizio exports are detected automatically using human-readable headers such as
`First Name`, `Last Name`, `Email Address`, `Phone Number`, `Street Address`,
`City`, `State`, and `Zip`. Arbitrary column mapping is intentionally not offered.

Preview matches only within the selected organization, in order: normalized email,
normalized phone, then normalized first-plus-last name. One match is skipped, not
updated. Ambiguous matches, duplicate input records, and invalid rows are rejected;
valid rows can still be confirmed. A rejection download contains row numbers and
sanitized validation messages, not uploaded personal data. Repeating a preview or
confirmation of the same source is idempotent. Import-job rows identify every
created person for later review; rollback must never delete a separately matched
or otherwise unrelated person.
