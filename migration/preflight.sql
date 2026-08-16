-- Read-only aggregate preflight. Output columns are:
-- record_type, source_table, disposition, category, count
-- Do not add source values or row identifiers to this report.

SELECT 'total','organizations','source','source_count',COUNT(*) FROM organizations;
SELECT 'total','users','source','source_count',COUNT(*) FROM users;
SELECT 'total','roles','source','source_count',COUNT(*) FROM roles;
SELECT 'total','roles_users','source','source_count',COUNT(*) FROM roles_users;
SELECT 'total','people','source','source_count',COUNT(*) FROM people;
SELECT 'total','visits','source','source_count',COUNT(*) FROM visits;
SELECT 'total','services','source','source_count',COUNT(*) FROM services;
SELECT 'total','notes','source','source_count',COUNT(*) FROM notes;
SELECT 'total','tags','source','source_count',COUNT(*) FROM tags;
SELECT 'total','taggings','source','source_count',COUNT(*) FROM taggings;

WITH classified AS (
  SELECT CASE
    WHEN name IS NULL OR TRIM(name) = '' OR `key` IS NULL OR TRIM(`key`) = '' OR timezone IS NULL OR TRIM(timezone) = '' THEN 'missing_required'
    WHEN EXISTS (SELECT 1 FROM organizations prior WHERE LOWER(TRIM(prior.`key`)) = LOWER(TRIM(organizations.`key`)) AND prior.id < organizations.id) THEN 'duplicate_key'
    WHEN timezone NOT IN ('Pacific Time (US & Canada)','Mountain Time (US & Canada)','Central Time (US & Canada)','Eastern Time (US & Canada)','Alaska','Hawaii','UTC') THEN 'invalid_timezone'
    ELSE 'import_candidate' END AS category
  FROM organizations
)
SELECT 'account','organizations',IF(category='import_candidate','candidate','quarantine'),category,COUNT(*) FROM classified GROUP BY category ORDER BY category;

WITH classified AS (
  SELECT CASE
    WHEN login IS NULL OR TRIM(login) = '' OR email IS NULL OR TRIM(email) = '' OR name IS NULL OR TRIM(name) = '' THEN 'missing_required'
    WHEN EXISTS (SELECT 1 FROM users prior WHERE LOWER(TRIM(prior.login)) = LOWER(TRIM(users.login)) AND prior.id < users.id) THEN 'duplicate_login'
    WHEN EXISTS (SELECT 1 FROM users prior WHERE LOWER(TRIM(prior.email)) = LOWER(TRIM(users.email)) AND prior.id < users.id) THEN 'duplicate_email'
    ELSE 'import_candidate' END AS category
  FROM users
)
SELECT 'account','users',IF(category='import_candidate','candidate','quarantine'),category,COUNT(*) FROM classified GROUP BY category ORDER BY category;

WITH classified AS (
  SELECT CASE
    WHEN name IS NULL OR name NOT IN ('admin','manager','owner') THEN 'unknown_role'
    WHEN name = 'owner' THEN 'retired_owner_role'
    WHEN (name = 'admin' AND (authorizable_type IS NOT NULL OR authorizable_id IS NOT NULL))
      OR (name = 'manager' AND (authorizable_type <> 'Organization' OR authorizable_id IS NULL)) THEN 'invalid_scope'
    WHEN name = 'manager' AND NOT EXISTS (SELECT 1 FROM organizations o WHERE o.id = roles.authorizable_id) THEN 'orphan_scope'
    WHEN NOT EXISTS (SELECT 1 FROM roles_users ru JOIN users u ON u.id=ru.user_id WHERE ru.role_id=roles.id) THEN 'unassigned_role'
    ELSE 'import_candidate' END AS category
  FROM roles
)
SELECT 'account','roles',IF(category='import_candidate','candidate','quarantine'),category,COUNT(*) FROM classified GROUP BY category ORDER BY category;

WITH numbered AS (
  SELECT roles_users.*, ROW_NUMBER() OVER (PARTITION BY user_id,role_id ORDER BY created_at,updated_at,user_id,role_id) AS duplicate_number
  FROM roles_users
), classified AS (
  SELECT CASE
    WHEN NOT EXISTS (SELECT 1 FROM users u WHERE u.id = numbered.user_id) THEN 'orphan_user'
    WHEN NOT EXISTS (SELECT 1 FROM roles r WHERE r.id = numbered.role_id) THEN 'orphan_role'
    WHEN EXISTS (
      SELECT 1 FROM roles r WHERE r.id = numbered.role_id AND (
        r.name IS NULL OR r.name NOT IN ('admin','manager')
        OR (r.name = 'admin' AND (r.authorizable_type IS NOT NULL OR r.authorizable_id IS NOT NULL))
        OR (r.name = 'manager' AND (r.authorizable_type <> 'Organization' OR r.authorizable_id IS NULL))
        OR (r.name = 'manager' AND NOT EXISTS (SELECT 1 FROM organizations o WHERE o.id = r.authorizable_id))
      )
    ) THEN 'role_not_importable'
    WHEN duplicate_number > 1 THEN 'duplicate_join'
    ELSE 'import_candidate' END AS category
  FROM numbered
)
SELECT 'account','roles_users',IF(category='import_candidate','candidate','quarantine'),category,COUNT(*) FROM classified GROUP BY category ORDER BY category;

WITH classified AS (
  SELECT CASE
    WHEN organization_id IS NULL OR NOT EXISTS (SELECT 1 FROM organizations o WHERE o.id = people.organization_id) THEN 'orphan_organization'
    WHEN first_name IS NULL OR TRIM(first_name) = '' THEN 'missing_first_name'
    ELSE 'import_candidate' END AS category
  FROM people
)
SELECT 'account','people',IF(category='import_candidate','candidate','quarantine'),category,COUNT(*) FROM classified GROUP BY category ORDER BY category;

WITH classified AS (
  SELECT CASE
    WHEN person_id IS NULL OR NOT EXISTS (SELECT 1 FROM people p WHERE p.id = visits.person_id) THEN 'orphan_person'
    ELSE 'import_candidate' END AS category
  FROM visits
)
SELECT 'account','visits',IF(category='import_candidate','candidate','quarantine'),category,COUNT(*) FROM classified GROUP BY category ORDER BY category;

WITH classified AS (
  SELECT CASE
    WHEN person_id IS NULL OR NOT EXISTS (SELECT 1 FROM people p WHERE p.id = services.person_id) THEN 'orphan_person'
    WHEN service_type_id IS NULL OR service_type_id NOT IN ('MEMBERSHIP','EAB','CLASS') THEN 'unknown_service_type'
    ELSE 'import_candidate' END AS category
  FROM services
)
SELECT 'account','services',IF(category='import_candidate','candidate','quarantine'),category,COUNT(*) FROM classified GROUP BY category ORDER BY category;

WITH classified AS (
  SELECT CASE
    WHEN notable_type IS NULL OR notable_type NOT IN ('Person','Visit','Service') THEN 'unsupported_target_type'
    WHEN notable_id IS NULL
      OR (notable_type = 'Person' AND NOT EXISTS (SELECT 1 FROM people p WHERE p.id = notes.notable_id))
      OR (notable_type = 'Visit' AND NOT EXISTS (SELECT 1 FROM visits v WHERE v.id = notes.notable_id))
      OR (notable_type = 'Service' AND NOT EXISTS (SELECT 1 FROM services s WHERE s.id = notes.notable_id)) THEN 'orphan_target'
    ELSE 'import_candidate' END AS category
  FROM notes
)
SELECT 'account','notes',IF(category='import_candidate','candidate','quarantine'),category,COUNT(*) FROM classified GROUP BY category ORDER BY category;

WITH classified AS (
  SELECT CASE
    WHEN name IS NULL OR TRIM(name) = '' THEN 'blank_name'
    WHEN NOT EXISTS (
      SELECT 1 FROM taggings tg JOIN people p ON p.id = tg.taggable_id
      WHERE tg.tag_id = tags.id AND tg.taggable_type = 'Person' AND tg.context = 'tags'
    ) THEN 'unowned_tag'
    ELSE 'import_candidate' END AS category
  FROM tags
)
SELECT 'account','tags',IF(category='import_candidate','candidate','quarantine'),category,COUNT(*) FROM classified GROUP BY category ORDER BY category;

WITH numbered AS (
  SELECT taggings.*, ROW_NUMBER() OVER (PARTITION BY tag_id,taggable_id,taggable_type,context ORDER BY id) AS duplicate_number
  FROM taggings
), classified AS (
  SELECT CASE
    WHEN taggable_type IS NULL OR taggable_type <> 'Person' OR context IS NULL OR context <> 'tags' THEN 'unsupported_target'
    WHEN tag_id IS NULL OR NOT EXISTS (SELECT 1 FROM tags t WHERE t.id = numbered.tag_id) THEN 'orphan_tag'
    WHEN taggable_id IS NULL OR NOT EXISTS (SELECT 1 FROM people p WHERE p.id = numbered.taggable_id) THEN 'orphan_person'
    WHEN duplicate_number > 1 THEN 'duplicate_join'
    ELSE 'import_candidate' END AS category
  FROM numbered
)
SELECT 'account','taggings',IF(category='import_candidate','candidate','quarantine'),category,COUNT(*) FROM classified GROUP BY category ORDER BY category;

SELECT 'issue','users','warning','discard_legacy_credentials',COUNT(*) FROM users u WHERE
  u.login IS NOT NULL AND TRIM(u.login)<>'' AND u.email IS NOT NULL AND TRIM(u.email)<>'' AND u.name IS NOT NULL AND TRIM(u.name)<>''
  AND NOT EXISTS (SELECT 1 FROM users prior WHERE LOWER(TRIM(prior.login))=LOWER(TRIM(u.login)) AND prior.id<u.id)
  AND NOT EXISTS (SELECT 1 FROM users prior WHERE LOWER(TRIM(prior.email))=LOWER(TRIM(u.email)) AND prior.id<u.id);
SELECT 'issue','users','warning','user_without_membership',COUNT(*) FROM users u WHERE
  u.login IS NOT NULL AND TRIM(u.login)<>'' AND u.email IS NOT NULL AND TRIM(u.email)<>'' AND u.name IS NOT NULL AND TRIM(u.name)<>''
  AND NOT EXISTS (SELECT 1 FROM users prior WHERE LOWER(TRIM(prior.login))=LOWER(TRIM(u.login)) AND prior.id<u.id)
  AND NOT EXISTS (SELECT 1 FROM users prior WHERE LOWER(TRIM(prior.email))=LOWER(TRIM(u.email)) AND prior.id<u.id)
  AND NOT EXISTS (
  SELECT 1 FROM roles_users ru JOIN roles r ON r.id=ru.role_id
  WHERE ru.user_id=u.id AND (
    (r.name='admin' AND r.authorizable_type IS NULL AND r.authorizable_id IS NULL)
    OR (r.name='manager' AND r.authorizable_type='Organization' AND EXISTS (SELECT 1 FROM organizations o WHERE o.id=r.authorizable_id))
  ));
SELECT 'issue','people','warning','duplicate_normalized_email',COUNT(*) FROM people p
WHERE p.email IS NOT NULL AND TRIM(p.email)<>'' AND EXISTS (
  SELECT 1 FROM people prior WHERE prior.organization_id=p.organization_id AND prior.id<p.id
    AND LOWER(TRIM(prior.email))=LOWER(TRIM(p.email))
);
SELECT 'issue','people','warning','duplicate_normalized_phone',COUNT(*) FROM people p
WHERE p.phone IS NOT NULL AND REGEXP_REPLACE(p.phone,'[^0-9+]','')<>'' AND EXISTS (
  SELECT 1 FROM people prior WHERE prior.organization_id=p.organization_id AND prior.id<p.id
    AND REGEXP_REPLACE(prior.phone,'[^0-9+]','')=REGEXP_REPLACE(p.phone,'[^0-9+]','')
);
SELECT 'issue','people','warning','invalid_year_of_birth_to_null',COUNT(*) FROM people WHERE yob IS NOT NULL AND (yob<1900 OR yob>2026);
SELECT 'issue','people','warning','orphan_audit_user_to_null',COUNT(*) FROM people p WHERE
  (created_by_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id=p.created_by_id))
  OR (updated_by_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id=p.updated_by_id));
SELECT 'issue','visits','warning','orphan_audit_user_to_null',COUNT(*) FROM visits v WHERE
  (created_by_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id=v.created_by_id))
  OR (updated_by_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id=v.updated_by_id));
SELECT 'issue','services','warning','orphan_audit_user_to_null',COUNT(*) FROM services s WHERE
  (created_by_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id=s.created_by_id))
  OR (updated_by_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id=s.updated_by_id));
SELECT 'issue','notes','warning','orphan_audit_user_to_null',COUNT(*) FROM notes n WHERE
  (created_by_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id=n.created_by_id))
  OR (updated_by_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id=n.updated_by_id));
SELECT 'issue','visits','warning','zero_datetime_to_null',COUNT(*) FROM visits WHERE
  CAST(arrived_at AS CHAR) LIKE '0000-00-00%' OR CAST(start_at AS CHAR) LIKE '0000-00-00%' OR CAST(end_at AS CHAR) LIKE '0000-00-00%';
SELECT 'issue','visits','warning','negative_duration_to_null',COUNT(*) FROM visits WHERE duration<0;
SELECT 'issue','visits','warning','duration_timestamp_mismatch',COUNT(*) FROM visits WHERE
  start_at IS NOT NULL AND end_at IS NOT NULL
  AND CAST(start_at AS CHAR) NOT LIKE '0000-00-00%' AND CAST(end_at AS CHAR) NOT LIKE '0000-00-00%'
  AND ROUND(duration)<>TIMESTAMPDIFF(SECOND,start_at,end_at);
SELECT 'issue','visits','warning','visit_start_before_arrival',COUNT(*) FROM visits WHERE
  start_at IS NOT NULL AND arrived_at IS NOT NULL
  AND CAST(start_at AS CHAR) NOT LIKE '0000-00-00%' AND CAST(arrived_at AS CHAR) NOT LIKE '0000-00-00%'
  AND start_at<arrived_at;
SELECT 'issue','visits','warning','visit_end_without_start',COUNT(*) FROM visits WHERE end_at IS NOT NULL AND start_at IS NULL;
SELECT 'issue','visits','warning','visit_end_before_start',COUNT(*) FROM visits WHERE end_at IS NOT NULL AND start_at IS NOT NULL AND end_at<start_at;
SELECT 'issue','services','warning','service_end_before_start',COUNT(*) FROM services WHERE start_date IS NOT NULL AND end_date IS NOT NULL AND end_date<start_date;
WITH tag_organizations AS (
  SELECT DISTINCT t.id AS tag_id,p.organization_id,LOWER(TRIM(t.name)) AS normalized_name
  FROM tags t JOIN taggings tg ON tg.tag_id=t.id AND tg.taggable_type='Person' AND tg.context='tags'
  JOIN people p ON p.id=tg.taggable_id WHERE t.name IS NOT NULL AND TRIM(t.name)<>''
)
SELECT 'issue','tags','warning','merge_duplicate_tenant_tag_name',COUNT(*) FROM tag_organizations current
WHERE EXISTS (SELECT 1 FROM tag_organizations prior WHERE prior.organization_id=current.organization_id AND prior.normalized_name=current.normalized_name AND prior.tag_id<current.tag_id);
