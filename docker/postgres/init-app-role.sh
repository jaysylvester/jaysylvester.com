#!/bin/sh

set -eu

: "${DB_USER:?DB_USER is required}"
: "${POSTGRES_DB:?POSTGRES_DB is required}"
: "${POSTGRES_USER:?POSTGRES_USER is required}"
: "${POSTGRES_TIMEZONE:?POSTGRES_TIMEZONE is required}"

if test "$DB_USER" = "$POSTGRES_USER"; then
  echo 'The application role must be separate from the PostgreSQL bootstrap administrator.' >&2
  exit 1
fi

if test -n "${DB_PASSWORD_FILE:-}"; then
  # Preserve whitespace; remove only one final LF or CRLF, as the app does.
  # The sentinel preserves other trailing newlines during command substitution.
  DB_PASSWORD=$(cat -- "$DB_PASSWORD_FILE" && printf '.')
  DB_PASSWORD=${DB_PASSWORD%.}
  line_feed='
'
  case "$DB_PASSWORD" in
    *"$line_feed")
      DB_PASSWORD=${DB_PASSWORD%"$line_feed"}
      DB_PASSWORD=${DB_PASSWORD%"$(printf '\r')"}
      ;;
  esac
fi

: "${DB_PASSWORD:?DB_PASSWORD or DB_PASSWORD_FILE is required}"

psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  --set=app_user="$DB_USER" \
  --set=app_password="$DB_PASSWORD" \
  --set=database_name="$POSTGRES_DB" \
  --set=database_timezone="$POSTGRES_TIMEZONE" <<'SQL'
\set ON_ERROR_STOP on

SELECT format('CREATE ROLE %I LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD %L', :'app_user', :'app_password')
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = :'app_user')
\gexec

SELECT format('ALTER ROLE %I LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD %L', :'app_user', :'app_password')
\gexec

SELECT format('REVOKE ALL ON DATABASE %I FROM PUBLIC', :'database_name')
\gexec

SELECT format('GRANT CONNECT ON DATABASE %I TO %I', :'database_name', :'app_user')
\gexec

SELECT format('GRANT USAGE ON SCHEMA public TO %I', :'app_user')
\gexec

REVOKE CREATE ON SCHEMA public FROM PUBLIC;

SELECT format('REVOKE CREATE ON SCHEMA public FROM %I', :'app_user')
\gexec

SELECT format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO %I', current_user, :'app_user')
\gexec

SELECT format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO %I', current_user, :'app_user')
\gexec

SELECT format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC', current_user)
\gexec

SELECT format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE ALL ON SEQUENCES FROM PUBLIC', current_user)
\gexec

SELECT format('ALTER DATABASE %I SET timezone TO %L', :'database_name', :'database_timezone')
\gexec
SQL
