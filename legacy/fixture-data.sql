-- Synthetic data for the legacy visual and behavioral baseline.  The source
-- archive remains unmodified and is deliberately not represented here.
-- IDs in the 900000 range are reserved fixture identifiers.

SET time_zone = '+00:00';

DELETE FROM roles_users WHERE user_id IN (900001, 900002, 900003);
DELETE FROM roles WHERE id IN (900001, 900002);
DELETE FROM notes WHERE id BETWEEN 900001 AND 900010;
DELETE FROM taggings WHERE id BETWEEN 900001 AND 900100;
DELETE FROM tags WHERE id BETWEEN 900001 AND 900010;
DELETE FROM visits WHERE id BETWEEN 900001 AND 900010;
DELETE FROM services WHERE id BETWEEN 900001 AND 900010;
DELETE FROM people WHERE id BETWEEN 900001 AND 900040;
DELETE FROM users WHERE id IN (900001, 900002, 900003);
DELETE FROM organizations WHERE id IN (900001, 900002);

INSERT INTO organizations (id, name, `key`, timezone, location, created_at, updated_at)
VALUES
  (900001, 'Fixture Workshop', 'fixture-lab', 'Eastern Time (US & Canada)', 'Fixture City', '2024-01-01 00:00:00', '2024-01-01 00:00:00'),
  (900002, 'Fixture Empty Workshop', 'fixture-empty', 'Eastern Time (US & Canada)', 'Fixture City', '2024-01-01 00:00:00', '2024-01-01 00:00:00');

-- The password for all fixture accounts is the documented, non-secret value
-- "fixture-password".  The SHA-1 hash is required by the historical app.
INSERT INTO users (id, login, email, name, crypted_password, salt, activation_code, activated_at, created_at, updated_at)
VALUES
  (900001, 'fixture_manager', 'manager@fixtures.invalid', 'Fixture Manager', 'c03ae07cc25be257a6a66cc28be5135b3139932a', 'fixture-salt', NULL, '2024-01-01 00:00:00', '2024-01-01 00:00:00', '2024-01-01 00:00:00'),
  (900002, 'fixture_empty', 'empty@fixtures.invalid', 'Fixture Empty Manager', 'c03ae07cc25be257a6a66cc28be5135b3139932a', 'fixture-salt', NULL, '2024-01-01 00:00:00', '2024-01-01 00:00:00', '2024-01-01 00:00:00'),
  (900003, 'fixture_observer', 'observer@fixtures.invalid', 'Fixture Observer', 'c03ae07cc25be257a6a66cc28be5135b3139932a', 'fixture-salt', NULL, '2024-01-01 00:00:00', '2024-01-01 00:00:00', '2024-01-01 00:00:00');

INSERT INTO roles (id, name, authorizable_type, authorizable_id, created_at, updated_at)
VALUES
  (900001, 'manager', 'Organization', 900001, '2024-01-01 00:00:00', '2024-01-01 00:00:00'),
  (900002, 'manager', 'Organization', 900002, '2024-01-01 00:00:00', '2024-01-01 00:00:00');
INSERT INTO roles_users (user_id, role_id, created_at, updated_at)
VALUES
  (900001, 900001, '2024-01-01 00:00:00', '2024-01-01 00:00:00'),
  (900002, 900002, '2024-01-01 00:00:00', '2024-01-01 00:00:00');

INSERT INTO people (id, first_name, last_name, full_name, email, phone, staff, organization_id, created_at, updated_at)
VALUES
  (900001, 'Current', 'Member', 'Current Member', 'current.member@fixtures.invalid', '555-0101', 0, 900001, '2024-01-02 00:00:00', '2024-01-02 00:00:00'),
  (900002, 'Expired', 'Member', 'Expired Member', 'expired.member@fixtures.invalid', '555-0102', 0, 900001, '2024-01-03 00:00:00', '2024-01-03 00:00:00'),
  (900003, 'Patron', 'NoService', 'Patron NoService', 'patron@fixtures.invalid', '555-0103', 0, 900001, '2024-01-04 00:00:00', '2024-01-04 00:00:00'),
  (900004, 'Staff', 'Volunteer', 'Staff Volunteer', 'staff@fixtures.invalid', '555-0104', 1, 900001, '2024-01-05 00:00:00', '2024-01-05 00:00:00'),
  (900005, 'Validation', 'Target', 'Validation Target', 'validation@fixtures.invalid', '555-0105', 0, 900001, '2024-01-06 00:00:00', '2024-01-06 00:00:00'),
  (900006, 'Pagination', '01', 'Pagination 01', 'pagination01@fixtures.invalid', NULL, 0, 900001, '2024-02-01 00:00:00', '2024-02-01 00:00:00'),
  (900007, 'Pagination', '02', 'Pagination 02', 'pagination02@fixtures.invalid', NULL, 0, 900001, '2024-02-02 00:00:00', '2024-02-02 00:00:00'),
  (900008, 'Pagination', '03', 'Pagination 03', 'pagination03@fixtures.invalid', NULL, 0, 900001, '2024-02-03 00:00:00', '2024-02-03 00:00:00'),
  (900009, 'Pagination', '04', 'Pagination 04', 'pagination04@fixtures.invalid', NULL, 0, 900001, '2024-02-04 00:00:00', '2024-02-04 00:00:00'),
  (900010, 'Pagination', '05', 'Pagination 05', 'pagination05@fixtures.invalid', NULL, 0, 900001, '2024-02-05 00:00:00', '2024-02-05 00:00:00'),
  (900011, 'Pagination', '06', 'Pagination 06', 'pagination06@fixtures.invalid', NULL, 0, 900001, '2024-02-06 00:00:00', '2024-02-06 00:00:00'),
  (900012, 'Pagination', '07', 'Pagination 07', 'pagination07@fixtures.invalid', NULL, 0, 900001, '2024-02-07 00:00:00', '2024-02-07 00:00:00'),
  (900013, 'Pagination', '08', 'Pagination 08', 'pagination08@fixtures.invalid', NULL, 0, 900001, '2024-02-08 00:00:00', '2024-02-08 00:00:00'),
  (900014, 'Pagination', '09', 'Pagination 09', 'pagination09@fixtures.invalid', NULL, 0, 900001, '2024-02-09 00:00:00', '2024-02-09 00:00:00'),
  (900015, 'Pagination', '10', 'Pagination 10', 'pagination10@fixtures.invalid', NULL, 0, 900001, '2024-02-10 00:00:00', '2024-02-10 00:00:00'),
  (900016, 'Pagination', '11', 'Pagination 11', 'pagination11@fixtures.invalid', NULL, 0, 900001, '2024-02-11 00:00:00', '2024-02-11 00:00:00'),
  (900017, 'Pagination', '12', 'Pagination 12', 'pagination12@fixtures.invalid', NULL, 0, 900001, '2024-02-12 00:00:00', '2024-02-12 00:00:00'),
  (900018, 'Pagination', '13', 'Pagination 13', 'pagination13@fixtures.invalid', NULL, 0, 900001, '2024-02-13 00:00:00', '2024-02-13 00:00:00'),
  (900019, 'Pagination', '14', 'Pagination 14', 'pagination14@fixtures.invalid', NULL, 0, 900001, '2024-02-14 00:00:00', '2024-02-14 00:00:00'),
  (900020, 'Pagination', '15', 'Pagination 15', 'pagination15@fixtures.invalid', NULL, 0, 900001, '2024-02-15 00:00:00', '2024-02-15 00:00:00'),
  (900021, 'Pagination', '16', 'Pagination 16', 'pagination16@fixtures.invalid', NULL, 0, 900001, '2024-02-16 00:00:00', '2024-02-16 00:00:00'),
  (900022, 'Pagination', '17', 'Pagination 17', 'pagination17@fixtures.invalid', NULL, 0, 900001, '2024-02-17 00:00:00', '2024-02-17 00:00:00'),
  (900023, 'Pagination', '18', 'Pagination 18', 'pagination18@fixtures.invalid', NULL, 0, 900001, '2024-02-18 00:00:00', '2024-02-18 00:00:00'),
  (900024, 'Pagination', '19', 'Pagination 19', 'pagination19@fixtures.invalid', NULL, 0, 900001, '2024-02-19 00:00:00', '2024-02-19 00:00:00'),
  (900025, 'Pagination', '20', 'Pagination 20', 'pagination20@fixtures.invalid', NULL, 0, 900001, '2024-02-20 00:00:00', '2024-02-20 00:00:00'),
  (900026, 'Pagination', '21', 'Pagination 21', 'pagination21@fixtures.invalid', NULL, 0, 900001, '2024-02-21 00:00:00', '2024-02-21 00:00:00');

INSERT INTO services (id, start_date, end_date, paid, volunteered, service_type_id, person_id, created_at, updated_at)
VALUES
  (900001, DATE_SUB(CURDATE(), INTERVAL 30 DAY), DATE_ADD(CURDATE(), INTERVAL 365 DAY), 1, 0, 'MEMBERSHIP', 900001, '2024-03-01 00:00:00', '2024-03-01 00:00:00'),
  (900002, DATE_SUB(CURDATE(), INTERVAL 365 DAY), DATE_SUB(CURDATE(), INTERVAL 1 DAY), 1, 0, 'MEMBERSHIP', 900002, '2024-03-02 00:00:00', '2024-03-02 00:00:00'),
  (900003, DATE_SUB(CURDATE(), INTERVAL 10 DAY), DATE_ADD(CURDATE(), INTERVAL 10 DAY), 1, 1, 'EAB', 900004, '2024-03-03 00:00:00', '2024-03-03 00:00:00'),
  (900004, DATE_SUB(CURDATE(), INTERVAL 5 DAY), DATE_ADD(CURDATE(), INTERVAL 30 DAY), 0, 0, 'CLASS', 900003, '2024-03-04 00:00:00', '2024-03-04 00:00:00');

INSERT INTO visits (id, arrived_at, volunteer, person_id, staff, member, start_at, end_at, duration, created_at, updated_at)
VALUES
  (900001, CONCAT(CURDATE(), ' 09:00:00'), 0, 900001, 0, 1, CONCAT(CURDATE(), ' 09:00:00'), NULL, 0, CONCAT(CURDATE(), ' 09:00:00'), CONCAT(CURDATE(), ' 09:00:00')),
  (900002, CONCAT(CURDATE(), ' 10:00:00'), 1, 900004, 1, 0, CONCAT(CURDATE(), ' 10:00:00'), CONCAT(CURDATE(), ' 12:30:00'), 9000, CONCAT(CURDATE(), ' 10:00:00'), CONCAT(CURDATE(), ' 12:30:00')),
  (900003, DATE_SUB(CONCAT(CURDATE(), ' 11:00:00'), INTERVAL 1 DAY), 0, 900003, 0, 0, DATE_SUB(CONCAT(CURDATE(), ' 11:00:00'), INTERVAL 1 DAY), DATE_SUB(CONCAT(CURDATE(), ' 12:00:00'), INTERVAL 1 DAY), 3600, DATE_SUB(CONCAT(CURDATE(), ' 11:00:00'), INTERVAL 1 DAY), DATE_SUB(CONCAT(CURDATE(), ' 12:00:00'), INTERVAL 1 DAY));

INSERT INTO tags (id, name) VALUES (900001, 'fixture tag'), (900002, 'priority fixture'), (900003, 'fixture pagination');
INSERT INTO taggings (id, tag_id, taggable_id, taggable_type, context, created_at)
VALUES
  (900001, 900001, 900001, 'Person', 'tags', '2024-04-01 00:00:00'),
  (900002, 900002, 900004, 'Person', 'tags', '2024-04-01 00:00:00'),
  (900003, 900003, 900006, 'Person', 'tags', '2024-04-01 00:00:00'),
  (900004, 900003, 900007, 'Person', 'tags', '2024-04-01 00:00:00'),
  (900005, 900003, 900008, 'Person', 'tags', '2024-04-01 00:00:00'),
  (900006, 900003, 900009, 'Person', 'tags', '2024-04-01 00:00:00'),
  (900007, 900003, 900010, 'Person', 'tags', '2024-04-01 00:00:00'),
  (900008, 900003, 900011, 'Person', 'tags', '2024-04-01 00:00:00'),
  (900009, 900003, 900012, 'Person', 'tags', '2024-04-01 00:00:00'),
  (900010, 900003, 900013, 'Person', 'tags', '2024-04-01 00:00:00'),
  (900011, 900003, 900014, 'Person', 'tags', '2024-04-01 00:00:00'),
  (900012, 900003, 900015, 'Person', 'tags', '2024-04-01 00:00:00'),
  (900013, 900003, 900016, 'Person', 'tags', '2024-04-01 00:00:00'),
  (900014, 900003, 900017, 'Person', 'tags', '2024-04-01 00:00:00'),
  (900015, 900003, 900018, 'Person', 'tags', '2024-04-01 00:00:00'),
  (900016, 900003, 900019, 'Person', 'tags', '2024-04-01 00:00:00'),
  (900017, 900003, 900020, 'Person', 'tags', '2024-04-01 00:00:00'),
  (900018, 900003, 900021, 'Person', 'tags', '2024-04-01 00:00:00'),
  (900019, 900003, 900022, 'Person', 'tags', '2024-04-01 00:00:00'),
  (900020, 900003, 900023, 'Person', 'tags', '2024-04-01 00:00:00'),
  (900021, 900003, 900024, 'Person', 'tags', '2024-04-01 00:00:00'),
  (900022, 900003, 900025, 'Person', 'tags', '2024-04-01 00:00:00'),
  (900023, 900003, 900026, 'Person', 'tags', '2024-04-01 00:00:00');
INSERT INTO notes (id, text, notable_id, notable_type, created_at, updated_at)
VALUES
  (900001, 'Synthetic person note for the visual baseline.', 900001, 'Person', '2024-04-01 00:00:00', '2024-04-01 00:00:00'),
  (900002, 'Synthetic completed-visit note.', 900002, 'Visit', '2024-04-01 00:00:00', '2024-04-01 00:00:00'),
  (900003, 'Synthetic service note.', 900003, 'Service', '2024-04-01 00:00:00', '2024-04-01 00:00:00');
