-- Synthetic migration-only fixtures. No values originate in the supplied archive.
-- This file is loaded only into the isolated migration-db service.
SET sql_mode = 'NO_ENGINE_SUBSTITUTION';
SET time_zone = '+00:00';

DROP TABLE IF EXISTS roles_users, notes, taggings, tags, visits, services, people, roles, users, organizations;

CREATE TABLE organizations (
  id BIGINT PRIMARY KEY, name VARCHAR(255), `key` VARCHAR(255), timezone VARCHAR(255),
  location VARCHAR(255), created_at DATETIME, updated_at DATETIME
);
CREATE TABLE users (
  id BIGINT PRIMARY KEY, login VARCHAR(255), email VARCHAR(255), name VARCHAR(255),
  crypted_password VARCHAR(40), salt VARCHAR(40), remember_token VARCHAR(255),
  activation_code VARCHAR(40), reset_code VARCHAR(40), activated_at DATETIME,
  created_at DATETIME, updated_at DATETIME
);
CREATE TABLE roles (
  id BIGINT PRIMARY KEY, name VARCHAR(40), authorizable_type VARCHAR(40),
  authorizable_id BIGINT, created_at DATETIME, updated_at DATETIME
);
CREATE TABLE roles_users (
  user_id BIGINT, role_id BIGINT, created_at DATETIME, updated_at DATETIME
);
CREATE TABLE people (
  id BIGINT PRIMARY KEY, first_name VARCHAR(255), last_name VARCHAR(255), full_name VARCHAR(255),
  street1 VARCHAR(255), street2 VARCHAR(255), city VARCHAR(255), state VARCHAR(255),
  postal_code VARCHAR(255), country VARCHAR(255), email VARCHAR(255), email_opt_out BOOLEAN,
  phone VARCHAR(255), staff BOOLEAN, created_at DATETIME, updated_at DATETIME,
  created_by_id BIGINT, updated_by_id BIGINT, organization_id BIGINT, yob INT
);
CREATE TABLE visits (
  id BIGINT PRIMARY KEY, arrived_at DATETIME, volunteer BOOLEAN, created_at DATETIME,
  updated_at DATETIME, created_by_id BIGINT, updated_by_id BIGINT, person_id BIGINT,
  staff BOOLEAN, member BOOLEAN, start_at DATETIME, end_at DATETIME, duration DOUBLE
);
CREATE TABLE services (
  id BIGINT PRIMARY KEY, start_date DATE, end_date DATE, paid BOOLEAN, volunteered BOOLEAN,
  service_type_id VARCHAR(255), person_id BIGINT, created_at DATETIME, updated_at DATETIME,
  created_by_id BIGINT, updated_by_id BIGINT
);
CREATE TABLE notes (
  id BIGINT PRIMARY KEY, text TEXT, notable_id BIGINT, notable_type VARCHAR(255),
  created_by_id BIGINT, updated_by_id BIGINT, created_at DATETIME, updated_at DATETIME
);
CREATE TABLE tags (id BIGINT PRIMARY KEY, name VARCHAR(255));
CREATE TABLE taggings (
  id BIGINT PRIMARY KEY, tag_id BIGINT, taggable_id BIGINT, tagger_id BIGINT,
  tagger_type VARCHAR(255), taggable_type VARCHAR(255), context VARCHAR(255), created_at DATETIME
);

INSERT INTO organizations VALUES
  (1,'Edge Workshop','edge','Pacific Time (US & Canada)','Synthetic','2024-01-01','2024-01-01'),
  (2,NULL,'missing','Pacific Time (US & Canada)','Synthetic','2024-01-01','2024-01-01'),
  (3,'Duplicate Key','EDGE','Pacific Time (US & Canada)','Synthetic','2024-01-01','2024-01-01'),
  (4,'Unknown Zone','zone','Mars/Olympus','Synthetic','2024-01-01','2024-01-01'),
  (5,'Second Workshop','second','Eastern Time (US & Canada)','Synthetic','2024-01-01','2024-01-01');

INSERT INTO users (id,login,email,name,crypted_password,salt,created_at,updated_at) VALUES
  (1,'edge_manager','manager@fixtures.invalid','Edge Manager','legacy','legacy','2024-01-01','2024-01-01'),
  (2,NULL,'missing@fixtures.invalid','Missing Login','legacy','legacy','2024-01-01','2024-01-01'),
  (3,'EDGE_MANAGER','unique@fixtures.invalid','Duplicate Login','legacy','legacy','2024-01-01','2024-01-01'),
  (4,'unique_login','MANAGER@fixtures.invalid','Duplicate Email','legacy','legacy','2024-01-01','2024-01-01'),
  (5,'platform_admin','admin@fixtures.invalid','Platform Admin','legacy','legacy','2024-01-01','2024-01-01'),
  (6,'second_manager','second@fixtures.invalid','Second Manager','legacy','legacy','2024-01-01','2024-01-01'),
  (7,'no_membership','none@fixtures.invalid','No Membership','legacy','legacy','2024-01-01','2024-01-01');

INSERT INTO roles VALUES
  (1,'manager','Organization',1,'2024-01-01','2024-01-01'),
  (2,'mystery',NULL,NULL,'2024-01-01','2024-01-01'),
  (3,'owner','Person',1,'2024-01-01','2024-01-01'),
  (4,'manager',NULL,NULL,'2024-01-01','2024-01-01'),
  (5,'manager','Organization',999,'2024-01-01','2024-01-01'),
  (6,'admin',NULL,NULL,'2024-01-01','2024-01-01'),
  (7,'manager','Organization',5,'2024-01-01','2024-01-01'),
  (8,'manager','Organization',1,'2024-01-01','2024-01-01');
INSERT INTO roles_users VALUES
  (1,1,'2024-01-01','2024-01-01'),
  (1,1,'2024-01-02','2024-01-02'),
  (999,1,'2024-01-01','2024-01-01'),
  (1,999,'2024-01-01','2024-01-01'),
  (1,2,'2024-01-01','2024-01-01'),
  (5,6,'2024-01-01','2024-01-01'),
  (6,7,'2024-01-01','2024-01-01');

INSERT INTO people (id,first_name,last_name,full_name,email,email_opt_out,phone,staff,organization_id,yob,created_by_id,updated_by_id,created_at,updated_at) VALUES
  (1,'Edge','Person','Untrusted Name','edge.person@fixtures.invalid',0,'+1 (555) 0100',0,1,1990,1,1,'2024-01-01','2024-01-01'),
  (2,'Duplicate','Contact','Duplicate Contact',' EDGE.PERSON@fixtures.invalid ',0,'+1-555-0100',0,1,1800,999,999,'2024-01-01','2024-01-01'),
  (3,'Orphan','Organization','Orphan Organization','orphan@fixtures.invalid',0,NULL,0,999,1990,NULL,NULL,'2024-01-01','2024-01-01'),
  (4,NULL,'Missing','Missing First','missing.first@fixtures.invalid',0,NULL,0,1,1990,NULL,NULL,'2024-01-01','2024-01-01'),
  (5,'Second','Person','Second Person','second.person@fixtures.invalid',0,NULL,0,5,1990,6,6,'2024-01-01','2024-01-01');

INSERT INTO visits VALUES
  (1,'2024-01-01 09:00:00',0,'2024-01-01','2024-01-01',1,1,1,0,0,'2024-01-01 09:00:00','2024-01-01 10:00:00',5),
  (2,'2024-01-01 09:00:00',0,'2024-01-01','2024-01-01',NULL,NULL,999,0,0,NULL,NULL,0),
  (3,'0000-00-00 00:00:00',1,'2024-01-01','2024-01-01',999,999,1,0,0,NULL,NULL,-1),
  (4,'2024-01-01 10:00:00',0,'2024-01-01','2024-01-01',NULL,NULL,1,0,0,'2024-01-01 09:00:00','2024-01-01 11:00:00',7200),
  (5,'2024-01-01 09:00:00',0,'2024-01-01','2024-01-01',NULL,NULL,1,0,0,NULL,'2024-01-01 10:00:00',0),
  (6,'2024-01-01 09:00:00',0,'2024-01-01','2024-01-01',NULL,NULL,1,0,0,'2024-01-01 11:00:00','2024-01-01 10:00:00',0);

INSERT INTO services VALUES
  (1,'2024-01-01','2024-12-31',1,0,'MEMBERSHIP',1,'2024-01-01','2024-01-01',1,1),
  (2,'2024-01-01','2024-12-31',0,0,'CLASS',999,'2024-01-01','2024-01-01',NULL,NULL),
  (3,'2024-01-01','2024-12-31',0,0,'UNKNOWN',1,'2024-01-01','2024-01-01',NULL,NULL),
  (4,'2024-12-31','2024-01-01',0,1,'EAB',1,'2024-01-01','2024-01-01',999,999);

INSERT INTO notes VALUES
  (1,'Synthetic valid person note',1,'Person',999,999,'2024-01-01','2024-01-01'),
  (2,'Synthetic unsupported note',1,'Widget',NULL,NULL,'2024-01-01','2024-01-01'),
  (3,'Synthetic orphan note',999,'Person',NULL,NULL,'2024-01-01','2024-01-01'),
  (4,'Synthetic valid visit note',1,'Visit',NULL,NULL,'2024-01-01','2024-01-01'),
  (5,'Synthetic valid service note',1,'Service',NULL,NULL,'2024-01-01','2024-01-01');

INSERT INTO tags VALUES
  (1,'Shared'),
  (2,'   '),
  (3,'Unowned'),
  (4,'shared'),
  (5,'Fanout');
INSERT INTO taggings VALUES
  (1,1,1,NULL,NULL,'Person','tags','2024-01-01'),
  (2,1,1,NULL,NULL,'Person','tags','2024-01-02'),
  (3,1,1,NULL,NULL,'Service','tags','2024-01-01'),
  (4,999,1,NULL,NULL,'Person','tags','2024-01-01'),
  (5,1,999,NULL,NULL,'Person','tags','2024-01-01'),
  (6,4,1,NULL,NULL,'Person','tags','2024-01-01'),
  (7,5,1,NULL,NULL,'Person','tags','2024-01-01'),
  (8,5,5,NULL,NULL,'Person','tags','2024-01-01');
