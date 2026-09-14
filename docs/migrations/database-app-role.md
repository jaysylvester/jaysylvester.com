# Separate application and administrator database roles

Status: applied and accepted in development on 2026-09-13; production remains
pending explicit approval. This supersedes the original shared-superuser setup
and the earlier assumption that the existing application role could be demoted
in place.

## Target

- `postgres`: administrator and database/table owner. Choose its password
  interactively and keep it only in Postico/password manager.
- `jaysylvester`: existing app login with its existing password in each
  environment. Both `DB_USER` and `DB_PASSWORD` remain unchanged.
- App grants: CONNECT, public-schema USAGE, table SELECT/INSERT/UPDATE/DELETE,
  sequence USAGE/SELECT. No ownership, superuser, database/role creation,
  replication, RLS bypass, schema CREATE, or TRUNCATE grants.
- Compose uses `POSTGRES_USER: postgres` for readiness and local-socket
  backup/restore commands. Normal app and db containers never receive an admin
  password. Production retains the app's existing db-password secret.

No app code change is needed. Backup/restore already use POSTGRES_USER inside
db, which will select postgres after container recreation.

## Existing databases

Rehearse in development first. SQL execution and service changes require
explicit approval; all production interaction requires separate approval.
Normal deploy does not perform this migration or recreate db.

1. Preserve a verified backup. Inventory roles, memberships, ownership, explicit
   and default privileges, and PUBLIC grants across ALL databases/schemas.
   Confirm the application uses public tables. Resolve unexpected elevated
   memberships, grants outside public, or PUBLIC privileges before proceeding.
2. Identify whether the application login is PostgreSQL's OID 10 bootstrap
   superuser. The bootstrap superuser cannot be demoted. This project's
   development inventory found `jaysylvester` at OID 10, owning the system
   catalogs, every database, both built-in tablespaces, and the application
   objects, with no `postgres` role. Production must be inventoried independently
   and must match this topology before reusing the same SQL.

   Do not use `REASSIGN OWNED` to rewrite an OID 10 cluster. Rename that role to
   `postgres`; ownership follows its unchanged OID automatically. The migration
   then creates a new CRUD-only `jaysylvester` role using the existing encrypted
   password verifier. PostgreSQL accepts an existing SCRAM or MD5 verifier when
   creating a role, so the application password remains unchanged and is never
   printed or added to a command.
3. Stop app/proxy, close Postico sessions using `jaysylvester`, and start only
   the existing database container without recreating it. Create a temporary
   passwordless superuser reachable only through trusted connections inside the
   database container:

   ```sh
   ./scripts/dev compose stop app proxy
   ./scripts/dev compose start db
   ./scripts/dev compose exec db sh -c \
     'psql -X -U jaysylvester -d "$POSTGRES_DB" \
       -v ON_ERROR_STOP=1 \
       -c "CREATE ROLE jaysylvester_role_migrator LOGIN SUPERUSER PASSWORD NULL;"'
   ```

   The role exists only because PostgreSQL forbids renaming the current session
   user. It has no password, must never be exposed outside the local socket, and
   must be dropped immediately after the transaction.
4. Run the guarded migration as the temporary role, then remove it as the newly
   renamed `postgres` role:

   ```sh
   ./scripts/dev compose exec -T db sh -c \
     'psql -X -U jaysylvester_role_migrator -d "$POSTGRES_DB"' \
     < scripts/sql/separate-db-roles.sql

   ./scripts/dev compose exec -T db \
     psql -X -U postgres -d postgres -v ON_ERROR_STOP=1 \
     -c 'DROP ROLE jaysylvester_role_migrator;'
   ```

   The transaction requires the exact reviewed topology, renames the OID 10 role
   to `postgres`, copies its encrypted password to a new non-privileged
   `jaysylvester` login, clears the renamed administrator's old app password,
   and installs existing/future CRUD grants. A failure rolls back the entire
   transaction; remove the temporary role with whichever bootstrap name still
   exists before investigating.
5. Choose a new administrator password through psql's hidden prompt, save it in
   Postico/password manager, and verify a new TCP login as `postgres` before
   continuing:

   ```sh
   ./scripts/dev postgres-password
   ```

   Use `./scripts/prod postgres-password` for the approved production migration.
   Use a password different from the unchanged app password. The administrator
   password remains absent from `.env`, Compose, project files, and images.
6. Validate Compose with config --quiet, then recreate db on its existing volume
   to change POSTGRES_USER and remove the old password environment/secret.
   Recreate app/proxy so all app connections are fresh:

   ```sh
   ./scripts/dev compose up -d --no-deps --force-recreate --wait db
   ./scripts/dev compose up -d --no-deps --force-recreate app
   ./scripts/dev compose up -d --no-deps --force-recreate proxy
   ./scripts/dev test
   ```

   For approved production execution, use the corresponding
   `./scripts/prod compose exec` commands and `./scripts/prod test`.
   No app image change is needed solely for this migration. Never delete the volume.
7. Verify actual TCP app authentication with the unchanged password, role flags,
   effective grants, and absence of unexpected ownership/memberships across the
   cluster. Rehearse CRUD, generated IDs, future postgres-created object grants,
   and denial of DDL/TRUNCATE/CREATE ROLE/CREATE DATABASE in a disposable database.
   Do not use live tables for destructive permission probes. Rehearse
   backup/restore as postgres and run smoke tests. Confirm Postico uses postgres
   and its password is absent from project configuration, container environments,
   secret mounts, and image layers.

Changing `POSTGRES_USER` does not create or change a role on an existing volume.
Complete and verify the role migration before recreating db.

The accepted development rehearsal and execution used PostgreSQL 17. The
protected pre-change archive verified successfully; the application tables kept
row counts 7/75/12. The real app password authenticated the new app role but not
postgres, postgres remained OID 10 with a separately set password, the normal db
container contained no `POSTGRES_PASSWORD`, and CRUD/default privileges plus
DDL, TRUNCATE, CREATE ROLE, and CREATE DATABASE denials passed. The complete
development smoke test then passed. A new post-migration logical backup was
validated and restored into a disposable empty volume; ownership, role flags,
and the same 7/75/12 row counts passed before that test volume was removed. The
operator then restarted the development stack, confirmed the site worked, and
verified Postico TCP connections with both the `postgres` administrator and
`jaysylvester` application accounts.

## Fresh volumes and restores

In development, `./scripts/dev start` detects an absent named volume and asks for
the `postgres` administrator password twice with terminal echo disabled. It
passes that password only to a one-off PostgreSQL initializer. The initializer
creates the database and the non-superuser `jaysylvester` role using the existing
app password from `.env`, installs CRUD default privileges, then is stopped and
removed. The normal db container is recreated without `POSTGRES_PASSWORD`; the
admin password remains only in Postico/password manager.

The guarded restore command restores as postgres and reapplies
`scripts/sql/grant-app-role.sql`, ensuring restored and future postgres-owned
tables and sequences remain available to the app. It never changes either role's
password. It refuses a database containing user relations: select a new
`POSTGRES_VOLUME` for every restore and retain the populated prior volume as the
rollback copy. It does not replace an accepted database in place.

Production has no automatic first-volume initializer because its current volume
already exists. Disaster recovery must bootstrap postgres with a separately
supplied temporary admin secret, create the app role with its existing protected
password, restore as postgres with `--no-owner --no-privileges`, and apply
`scripts/sql/grant-app-role.sql` before starting app/proxy. Never store the admin
password in `.env`, Compose, a project file, or an image layer.

Logical backups omit roles/privileges. Recreate this setup on fresh clusters.
Restores on the existing cluster retain defaults granting CRUD on recreated
tables. No role mutation happens on ordinary startup.

## Failure recovery

SQL failure rolls back its transaction; drop the temporary migrator through the
still-existing bootstrap role. After a successful transaction, `postgres` has no
password until the hidden password step, but local-socket administration remains
available. Leave app stopped until acceptance passes. Do not put administrator
passwords in app configuration. Keep the volume and protected backup intact.

References: [ALTER ROLE](https://www.postgresql.org/docs/17/sql-alterrole.html),
[CREATE ROLE](https://www.postgresql.org/docs/17/sql-createrole.html), and
[default privileges](https://www.postgresql.org/docs/17/sql-alterdefaultprivileges.html).
