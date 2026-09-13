-- Run as the temporary jaysylvester_role_migrator superuser while app/proxy
-- are stopped. The existing OID 10 bootstrap role becomes postgres; a new
-- CRUD-only jaysylvester login receives the existing password verifier.
\set ON_ERROR_STOP on

BEGIN;

DO $guard$
BEGIN
  IF current_user <> 'jaysylvester_role_migrator' OR NOT EXISTS (
    SELECT FROM pg_catalog.pg_roles
    WHERE rolname = current_user
      AND rolcanlogin
      AND rolsuper
  ) THEN
    RAISE EXCEPTION 'Run this migration as the temporary jaysylvester_role_migrator superuser.';
  END IF;

  IF EXISTS (
    SELECT FROM pg_catalog.pg_roles
    WHERE rolname = 'postgres'
  ) THEN
    RAISE EXCEPTION 'The postgres role already exists; review the cluster before migration.';
  END IF;

  IF NOT EXISTS (
    SELECT FROM pg_catalog.pg_authid
    WHERE oid = 10
      AND rolname = 'jaysylvester'
      AND rolcanlogin
      AND rolsuper
      AND rolcreatedb
      AND rolcreaterole
      AND rolreplication
      AND rolbypassrls
      AND rolpassword IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Expected password-enabled jaysylvester to be the OID 10 bootstrap superuser.';
  END IF;

  IF EXISTS (
    SELECT FROM pg_catalog.pg_auth_members
    WHERE member = 10
  ) THEN
    RAISE EXCEPTION 'Review and remove bootstrap-role memberships before migration.';
  END IF;
END
$guard$;

SELECT rolpassword AS app_password_verifier
FROM pg_catalog.pg_authid
WHERE oid = 10
  AND rolname = 'jaysylvester'
\gset

ALTER ROLE jaysylvester RENAME TO postgres;

CREATE ROLE jaysylvester
  LOGIN
  NOSUPERUSER
  NOCREATEDB
  NOCREATEROLE
  INHERIT
  NOREPLICATION
  NOBYPASSRLS
  CONNECTION LIMIT -1
  PASSWORD :'app_password_verifier';

\unset app_password_verifier

-- Do not leave the application password valid for the administrator. A new
-- postgres password is chosen with psql's hidden \password prompt afterward.
ALTER ROLE postgres PASSWORD NULL;

SELECT current_database() AS app_database
\gset

REVOKE ALL PRIVILEGES ON DATABASE :"app_database" FROM PUBLIC;
REVOKE ALL PRIVILEGES ON DATABASE :"app_database" FROM jaysylvester;
GRANT CONNECT ON DATABASE :"app_database" TO jaysylvester;

ALTER SCHEMA public OWNER TO postgres;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE ALL PRIVILEGES ON SCHEMA public FROM jaysylvester;
GRANT USAGE ON SCHEMA public TO jaysylvester;

REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM PUBLIC;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC;
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM jaysylvester;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM jaysylvester;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO jaysylvester;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO jaysylvester;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO jaysylvester;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO jaysylvester;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM PUBLIC;

COMMIT;
