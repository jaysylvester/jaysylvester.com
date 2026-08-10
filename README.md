# jaysylvester.com

Jay Sylvester's personal site, built with Citizen 2.0. Development uses Docker Compose for Node.js, PostgreSQL, Nginx, Gulp, and BrowserSync; no host Node installation is required.

## macOS development (supported)

### Prerequisites

Install Docker Desktop, `mkcert`, and the optional Firefox trust-store helper:

```sh
brew install --cask docker
brew install mkcert
brew install nss
open -a Docker
mkcert -install
docker version
docker compose version
```

Add the development hostname to `/etc/hosts`:

```text
127.0.0.1 dev.jaysylvester.com
```

Then flush macOS name resolution:

```sh
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder
dscacheutil -q host -a name dev.jaysylvester.com
```

### First clone and protected inputs

```sh
git clone https://github.com/jaysylvester/jaysylvester.com.git
cd jaysylvester.com
cp .env.example .env
chmod 600 .env
```

Git does not supply credentials, certificates, or database data. Populate `.env` with the protected secrets and deployment inputs described in [docs/migrations/citizen-2.md](docs/migrations/citizen-2.md); stable typed application settings are already committed in `citizen.config.js`. Before starting PostgreSQL for the first time, inventory the source PostgreSQL major, encoding, collation, character type, and timezone; select the tested `POSTGRES_IMAGE`, set `POSTGRES_INITDB_ARGS`, and set `POSTGRES_TIMEZONE` accordingly.

Obtain the authoritative custom-format dump outside this checkout and verify its checksum and archive:

```sh
shasum -a 256 -c jaysylvester.dump.sha256
pg_restore --list jaysylvester.dump >/dev/null
```

The development Compose project is `jaysylvester-dev`; its database volume is `jaysylvester-dev-postgres`. Do not create that final volume until the PostgreSQL image and locale have been rehearsed.

```sh
dc() { ./scripts/dev-compose "$@"; }

dc config --quiet
dc up -d db
dc exec -T db sh -c 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
dc exec -T db sh -c \
  'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --exit-on-error --single-transaction --no-owner --no-privileges' \
  < /absolute/private/path/jaysylvester.dump
dc exec -T db sh -c \
  'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -c "ANALYZE;"'
```

The commands read the database name and user already mapped into the `db` container; they do not print the password. Compare the source and target schema objects, row counts, maximum IDs, sequence values, and representative application queries before accepting the restore.

### Start, verify, and stop

When host npm is available, the friendly development commands check or create
the ignored `mkcert` leaf certificate and manage the development stack:

```sh
npm run dev:build
npm run dev:test
```

Host Node is optional. The equivalent Node-free startup command is
`./scripts/dev-up --build`, and the smoke test is available directly as
`./scripts/smoke-test https://dev.jaysylvester.com`.

Open <https://dev.jaysylvester.com>. The certificate covers `dev.jaysylvester.com`, `localhost`, `127.0.0.1`, and `::1`. Its private key is development-only and is never the mkcert CA key.

Useful commands:

```sh
npm run dev:start
npm run dev:stop
npm run dev:restart
npm run dev:destroy
npm run dev:db:backup
npm run dev:db:restore -- /absolute/path/to/backup.dump
npm run dev:status
npm run dev:logs
npm run dev:test
```

`dev:stop` keeps the containers for a fast next start. `dev:destroy` removes the
containers and project network but preserves the PostgreSQL data and logs.

`dev:db:backup` requires the development database to be running. It creates a
timestamped, custom-format PostgreSQL archive and SHA-256 checksum under the
protected `REPLACE_ME_PROTECTED_DEVELOPMENT_BACKUP_DIRECTORY/` directory.
The command writes through a mode `0600` temporary file, verifies the archive,
and publishes it only after verification succeeds. The backup directory remains
mode `0700`.

`dev:db:restore` accepts one explicit archive path, validates it before changing
the database, and requires `RESTORE` confirmation in an interactive terminal.
The restore uses a single transaction, temporarily stops running app and proxy
services, and returns those services and PostgreSQL to their previous running
state. Archives must remain outside Docker so deleting the named volume cannot
delete its backups. The original VM dump is only the migration baseline; use
fresh backups to preserve later development changes.

Postico connects to `127.0.0.1:${POSTICO_PORT:-5432}` with the existing development database credentials. PostgreSQL and the development HTTP/HTTPS proxy are published only on loopback, and database data survives both `npm run dev:stop` and `npm run dev:destroy`.

### Configuration and file watching

Citizen resolves configuration when it is imported. Committed `citizen.config.js` contains namespaced framework settings under `citizen` and typed, non-secret application settings under top-level `db` and `mail` properties. The ignored project-root `.env` contains only secrets and deployment inputs. Development bind-mounts it read-only at `/site/.env` so Citizen loads it natively, while Compose maps the required PostgreSQL values explicitly into `db`. Development does not use Compose secrets. No `app/config/*.json` file may be active.

Both Docker targets run the shared `app/start.js`. Citizen's resolved mode selects the development mail logger and direct development database password, or the production Nodemailer transport and service-scoped password files. Passwords are passed only to their consumers and never added to `app.config`.

Citizen's CORS configuration is intentionally unset because the application has no known cross-origin browser consumer. Cross-origin requests and preflights fail closed with `403` and no CORS response headers. `BROWSERSYNC_ORIGIN` is a separate development-only assets input for the same-origin BrowserSync proxy.

The development app, log rotation, and Gulp watchers use polling for Docker Desktop. The development image includes the root `.browserslistrc`, so containerized Autoprefixer uses the repository's browser targets. BrowserSync runs as plain HTTP only on the Compose network; Nginx proxies its client and WebSocket traffic under the public development origin. The `assets` service receives only that nonsecret origin and Gulp watcher variables—not certificates, database values, or mail credentials. Only Nginx ports 80/443 and the Postico port are published, all on loopback.

Nginx resolves both `app` and the development-only `assets` hostname when its workers start. Recreate `proxy` after recreating either container; ordinary source changes handled by the running watchers do not require container recreation.

Citizen's development file logs are written to the ignored root-level `logs/`
directory, so `logs/email.log` and `logs/error.log` are directly available in
the editor. Production continues to use its persistent Docker log volume.

After changing application values in `.env`, restart `app`; the bind-mounted file is reread without recreating the container or changing its IP. Rotating `DB_PASSWORD` also requires changing the PostgreSQL role password and recreating `db`; editing `.env` alone does not change an existing database volume. A `citizen.config.js` edit likewise needs only an app restart because the file is bind-mounted read-only in development.

```sh
dc restart app
npm run dev:test
```

## Production during Phase 1

Production remains on its pre-migration host application, Nginx, PostgreSQL, and Certbot until Phase 2. Do not deploy this branch's container-oriented `citizen.config.js` revision through the existing host process; it intentionally binds Citizen for the private Docker network and expects Docker deployment inputs.

Phase 2 will add the Debian production Compose overlay, service-scoped database/mail password secrets, production Nginx configuration, Certbot reload hook, ordered app/proxy deployment, and Docker-era Postico notes after the effective production host configuration has been inventoried. The production `.env` will provide Compose interpolation and secret source values but will not be injected or mounted wholesale into `app`.

The Citizen dependency is pinned to the reviewed `2.0-project-config-module-revised` branch commit in `package-lock.json`. At any future dependency refresh, first run Citizen's complete suite under Node.js 22 and 24, deliberately refresh the lockfile without allowing npm to normalize the HTTPS source to SSH, and update the migration record.

## Future Linux development hosts (untested)

Install Docker Engine and Compose from the distribution's official instructions, plus `mkcert` and the browser-specific trust dependency. Update `/etc/hosts`, account for firewall and privileged-port rules, and verify bind-mount ownership. If files written by the assets service need a Linux UID/GID override, review and add that override for the host rather than weakening repository permissions. This path remains untested until exercised.

## Future Windows development hosts (untested)

Use Docker Desktop with WSL 2, keep the checkout in the WSL filesystem, and run repository shell commands inside WSL. Install and trust `mkcert` for the Windows browser trust store, then record whether Windows or WSL owns the hosts-file entry. Preserve LF line endings and executable bits for `scripts/*`. This path remains untested until exercised.
