-- This grants all privileges to the freehub user on all development databases
GRANT ALL PRIVILEGES ON freehub_development.* TO 'freehub'@'%';
GRANT ALL PRIVILEGES ON freehub_old.* TO 'freehub'@'%';
GRANT ALL PRIVILEGES ON freehub_test.* TO 'freehub'@'%';