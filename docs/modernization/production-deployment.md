# Running Freehub on a server

This guide is for the person who looks after the server running Freehub. You do
not need to be a software developer. It covers the common jobs you may need to
do after signing in to the server: checking Freehub, reading its logs, managing
users, making backups, and restarting or updating it.

Freehub runs as three isolated services:

- `app` is the Freehub website.
- `database` stores all Freehub records.
- `caddy` receives public web traffic, provides HTTPS encryption, and passes
  requests to the private `app` service.

The services are packaged as Docker containers. In plain language, a container
is a self-contained copy of a program and everything it needs to run. You will
use the commands below to work with them; you do not need to understand Docker
internals.

## Before you begin

You need:

1. An account that can sign in to the server using SSH.
2. Permission to run `docker` commands on that server.
3. The location of the Freehub folder. This guide assumes you have already
   changed into that folder. If you do not know it, ask whoever set up the
   server. A common location would be `/opt/freehub`.

After signing in, change to that folder. Replace `/opt/freehub` if your server
uses a different location:

```sh
cd /opt/freehub
```

The health-check examples below assume the standard local port, `3001`. If the
person who set up your server chose another port, ask them which value to use in
place of `3001`.

Important safety rules:

- Do not copy passwords, secret files, or database backups into email, chat, or
  Git.
- Do not edit the database directly unless a recovery procedure specifically
  tells you to.
- Do not delete Docker containers or storage volumes to solve a problem. That
  can destroy the database.
- Access to Docker gives an administrator extensive control over the server.
  Only named server administrators should have it.

## Check whether Freehub is running

Run:

```sh
docker compose --env-file deploy/.env -f deploy/compose.yaml ps
```

All three services should say `Up` or `running`. The `app` and `database`
services should also say `healthy`. The database is intentionally not assigned
a public port.

Then ask the website for its basic health response:

```sh
curl --fail http://127.0.0.1:3001/up
```

A healthy response is:

```json
{"status":"ok"}
```

This address works from the server itself. From your own computer, use the
normal public Freehub address in a web browser.

If the command reports that it could not connect, read the application logs in
the next section before restarting anything.

## Read the logs

Logs are the running record of what each service has been doing. Reading them
does not change anything.

Show the most recent website messages:

```sh
docker compose --env-file deploy/.env -f deploy/compose.yaml logs --tail=200 app
```

Watch new website messages as they happen. Press `Ctrl+C` when finished:

```sh
docker compose --env-file deploy/.env -f deploy/compose.yaml logs --follow app
```

Show the most recent database messages:

```sh
docker compose --env-file deploy/.env -f deploy/compose.yaml logs --tail=200 database
```

Show messages about public web requests and HTTPS certificates:

```sh
docker compose --env-file deploy/.env -f deploy/compose.yaml logs --tail=200 caddy
```

Logs can contain names or other private information. Share only the relevant
lines through an approved private channel. Freehub removes passwords and login
cookies from its normal application logs.

## Start or restart Freehub

To start the services after a server reboot:

```sh
docker compose --env-file deploy/.env -f deploy/compose.yaml up -d --wait database app caddy
```

The command waits for the services to start and for Freehub and its database to
become healthy. It does not keep the terminal occupied.

To restart only the website, leaving the database alone:

```sh
docker compose --env-file deploy/.env -f deploy/compose.yaml restart app
docker compose --env-file deploy/.env -f deploy/compose.yaml ps
curl --fail http://127.0.0.1:3001/up
```

Restarting the website briefly disconnects users but does not remove their
records. Avoid restarting the database during normal troubleshooting.

## Manage users from the command line

Most user management should happen through Freehub's administration screens.
The following commands are for account recovery or when the website cannot be
used.

In the examples, replace `LOGIN` with the person's actual login name. Do not
type the word `LOGIN` literally.

List users and their current status:

```sh
docker compose --env-file deploy/.env -f deploy/compose.yaml --profile ops run --rm admin users list
```

Give a user a new temporary password:

```sh
docker compose --env-file deploy/.env -f deploy/compose.yaml --profile ops run --rm admin users reset-password LOGIN
```

The temporary password is shown once. Give it to the user through an approved
secure channel. They must change it when they next sign in. The command also
signs the user out of any existing sessions.

Disable or re-enable an account:

```sh
docker compose --env-file deploy/.env -f deploy/compose.yaml --profile ops run --rm admin users disable LOGIN
docker compose --env-file deploy/.env -f deploy/compose.yaml --profile ops run --rm admin users enable LOGIN
```

Both commands sign the user out of existing sessions.

Emergency only: make an existing user a platform administrator:

```sh
docker compose --env-file deploy/.env -f deploy/compose.yaml --profile ops run --rm admin users promote LOGIN
```

Record who approved this change and why. This command grants access across all
organizations in Freehub.

## Make a database backup

A backup is a separate copy of all Freehub records. Run:

```sh
backup=$(bin/production-backup)
echo "Backup created at: $backup"
```

The backup command refuses to replace a file that already exists. Check that
the new file can be read:

```sh
docker compose --env-file deploy/.env -f deploy/compose.yaml exec -T database \
  pg_restore --list < "$backup" >/dev/null && echo "Backup check passed"
```

Seeing `Backup check passed` means the file has a readable backup structure. It
does not prove that every future restore will work, so restores must also be
practiced periodically.

The backup is initially stored on the same server. That is not enough: a lost
or damaged server could take the backup with it. Copy the file to the approved,
encrypted off-server backup location, then follow your organization's retention
policy. Database backups contain private information.

## Restore a backup

Warning: restoring replaces the current database contents with the contents of
the selected backup. It stops the website while the restore runs. Confirm the
correct server and backup file with another responsible person before starting.

Run the restore, replacing the example path with the real backup path:

```sh
FREEHUB_ALLOW_RESTORE=yes bin/production-restore /secured/path/freehub.dump
```

After it finishes, check:

```sh
curl --fail http://127.0.0.1:3001/up
docker compose --env-file deploy/.env -f deploy/compose.yaml logs --tail=100 app
```

Then use the public website to verify all of the following before telling users
that service is restored:

1. Sign in.
2. Open the expected organization.
3. Open a recently changed person and visit.
4. Download one report.

If the restore fails, leave the website stopped and contact the technical
maintainer. Do not repeatedly rerun it against different files.

## Update Freehub

An update should come with a new `FREEHUB_IMAGE` value from the technical
maintainer. This value identifies the exact tested version of Freehub. Do not
guess it or use a moving value such as `latest`.

Before an update:

1. Tell users about the maintenance period.
2. Make and validate a fresh backup using the previous section.
3. Record the current version:

   ```sh
   grep '^FREEHUB_IMAGE=' deploy/.env
   ```

4. Put the approved new value on the `FREEHUB_IMAGE=` line in `deploy/.env`.

Download the approved version, prepare the database, and replace the website:

```sh
docker compose --env-file deploy/.env -f deploy/compose.yaml --profile release --profile ops pull
docker compose --env-file deploy/.env -f deploy/compose.yaml --profile release run --rm release
docker compose --env-file deploy/.env -f deploy/compose.yaml up -d --no-deps --force-recreate --wait app
curl --fail http://127.0.0.1:3001/up
```

The `release` step safely applies any database changes required by the new
version. If it fails, stop and contact the technical maintainer; do not start
the new website version.

After a successful update, sign in and check an organization, a person, a
visit, and a report. Also check the latest application logs.

## Roll back a failed update

If the new website fails but the release step succeeded, contact the technical
maintainer before rolling back. Some database changes cannot safely be used by
an older version.

When the maintainer confirms a simple rollback is safe:

1. Restore the previous `FREEHUB_IMAGE=` value in `deploy/.env`.
2. Run:

   ```sh
   docker compose --env-file deploy/.env -f deploy/compose.yaml up -d --no-deps --force-recreate --wait app
   curl --fail http://127.0.0.1:3001/up
   ```

If a simple rollback is not safe, the maintainer will need the backup made
immediately before the update. Never allow the old and new databases to accept
changes at the same time.

## Open a service shell during an incident

These commands give direct access inside a service. They are useful for an
experienced administrator investigating a problem, but are not needed for
routine operation.

Open a limited shell inside the website service:

```sh
docker compose --env-file deploy/.env -f deploy/compose.yaml exec app sh
```

Type `exit` to leave it. The website service runs as an unprivileged user and
cannot save changes to its container.

Open the database console:

```sh
docker compose --env-file deploy/.env -f deploy/compose.yaml exec database \
  sh -c 'exec psql --username="$POSTGRES_USER" --dbname="$POSTGRES_DB"'
```

Type `\q` to leave it. Reading data here can still expose private information,
and changing data directly can bypass Freehub's safety checks and audit trail.

## First-time server setup

This section is for the person initially building the server, not routine
operators. [`deploy/compose.yaml`](../../deploy/compose.yaml) runs the website,
database, and Caddy separately on one Linux server. The database cannot be
reached from the public network. Caddy is included in this setup, so no separate
nginx installation is needed. Caddy automatically obtains and renews the HTTPS
certificate for the public Freehub address.

Before starting, create a DNS record that points the public Freehub name, such
as `freehub.example.org`, to the server's public IP address. Set that exact name
as `FREEHUB_DOMAIN` in `deploy/.env`. Caddy cannot obtain the certificate until
the name points to the server and public ports 80 and 443 reach it.

Prepare the settings and secrets:

```sh
cp deploy/.env.example deploy/.env
install -d -m 700 deploy/secrets
db_password=$(openssl rand -hex 32)
printf '%s\n' "$db_password" > deploy/secrets/database_password
printf 'postgresql://freehub:%s@database:5432/freehub?schema=public\n' "$db_password" > deploy/secrets/database_url
unset db_password
chmod 600 deploy/.env deploy/secrets/database_password deploy/secrets/database_url
```

Set the approved `FREEHUB_IMAGE` value in `deploy/.env`, then start the server:

```sh
docker compose --env-file deploy/.env -f deploy/compose.yaml up -d --wait database
docker compose --env-file deploy/.env -f deploy/compose.yaml --profile release run --rm release
docker compose --env-file deploy/.env -f deploy/compose.yaml up -d --wait app caddy
curl --fail http://127.0.0.1:3001/up
```

For an Oracle Free Tier pilot, allow incoming TCP traffic to SSH port 22, HTTP
port 80, and HTTPS port 443 in both Oracle's network rules and the server
firewall. Caddy uses port 80 to obtain certificates and redirect visitors to
HTTPS. Optionally allow UDP port 443 for newer HTTP/3 connections. Do not open
the database port or port 3001.

The initial setup does not create example users. Production users are created
during the migration and launch process described by ticket FH-020.

## Technical hosting requirements

This section records the contract for technical maintainers and hosting
providers.

- Freehub uses one ordinary OCI image with no hosting-company-specific code.
- The same image runs the website, `npm run release`, and admin commands.
- The VPS Compose setup uses the official Caddy container as its public HTTPS
  entry point. Caddy stores certificates in its own Docker volume and sends
  requests to the application over the private Docker network.
- The hosting platform supplies `PORT` and `DATABASE_URL` as environment
  settings. The server setup above may instead mount `DATABASE_URL_FILE` as a
  secret file.
- `GET /up` is the automated health check.
- Logs go to standard output and standard error, where Docker or the hosting
  platform collects them.
- The application keeps no permanent files. PostgreSQL is its only permanent
  storage.
- Email is optional. The current application is intentionally SMTP-disabled
  and needs no mail-server settings to start.
- A database reached over a network must use a verified encrypted connection.
  A typical PostgreSQL address ends with `sslmode=require`; never disable
  certificate checks to work around a connection problem.
- A managed PostgreSQL service should have automatic backups and point-in-time
  recovery (PITR) enabled. PITR means the provider can rebuild the database as
  it existed at a chosen time between full backups.
- Test every new version against a separate staging database before production.
  Check migration, health, login, a read and write, CSV export, logs, backup
  restore, and operation without email.

The single-server setup is suitable for a pilot, but the server and its database
storage can fail together. A production recovery target that requires PITR
should use a managed PostgreSQL service with encrypted connections and backups.

Technical maintainers can run the complete disposable deployment and recovery
test with:

```sh
bin/verify-production-deployment
```

The test creates temporary services and storage, exercises release, health,
logs, backup, restore, user recovery commands, and version rollback, then
removes its temporary resources.

## Short glossary

- **Backup:** A separate copy of the database used for recovery.
- **Container:** An isolated package containing a running program.
- **Database migration:** A controlled change to the database structure needed
  by a new Freehub version.
- **Docker image:** The packaged, unchanging copy of a Freehub version.
- **HTTPS/TLS:** Encryption that protects traffic between computers.
- **OCI image:** The technical standard used for a Docker image.
- **PITR:** Point-in-time recovery; restoring a database to a selected time.
- **PostgreSQL:** The database program used by Freehub.
- **Reverse proxy:** The HTTPS web server that receives public requests and
  passes them to Freehub on the same server. Caddy fills this role here.
- **SMTP:** The standard used to send email.
- **SSH:** The secure method used to sign in to a server terminal.
- **Staging:** A private test installation used before updating the live site.
