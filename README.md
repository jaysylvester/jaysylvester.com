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
```

Leave that command attached to the development logs. In a second terminal, run:

```sh
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

`dev:start` and `dev:build` stay attached after starting the containers, showing
Citizen's startup output and live logs from the development stack. Press Ctrl+C
to stop the stack. `dev:logs` attaches to the retained full log history when the
stack was started elsewhere. `dev:stop` keeps the containers for a fast next
start. `dev:destroy` removes the containers and project network but preserves
the PostgreSQL data and logs.

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

## Production migration and operation

Production was migrated on 2026-08-12. The existing DigitalOcean Droplet now runs Debian 13 with the application, Nginx, and PostgreSQL 17 managed by Docker Compose; host Node, PM2, Nginx, and PostgreSQL are retired. Snapshot `REPLACE_ME_ROLLBACK_SNAPSHOT` remains the whole-disk rollback during the acceptance window.

The cutover used the powered-off DigitalOcean snapshot for whole-disk rollback and verified protected exports under `REPLACE_ME_PROTECTED_PRODUCTION_EXPORT_DIRECTORY/` as rebuild inputs. Rebuilding retained the Droplet and public IP while replacing its disk. The clean host restored only the `jay` account and authorized key, current `main` checkout, protected `.env`, final PostgreSQL dump, Let's Encrypt state, and required Docker/Certbot host directories. It did not restore host Node, PM2, Nginx, PostgreSQL, the legacy Citizen JSON, old APT sources, or the old SSH daemon configuration.

The production `.env` is mode `0600` and contains `NODE_ENV=production`, database name/user/password, mail password, `POSTGRES_IMAGE=postgres:17-bookworm`, UTF-8/en_US.UTF-8 initialization arguments, `POSTGRES_TIMEZONE=Etc/UTC`, and the loopback Postico port. Compose uses it for interpolation and to materialize the database/mail password secrets. It is never injected or mounted wholesale into `app`; the app receives only `NODE_ENV`, `DB_DATABASE`, `DB_USER`, and the two secret-file paths.

Define the production Compose command after SSH login:

```sh
cd /var/www/jaysylvester.com
pdc() { sudo docker compose --env-file .env -p jaysylvester-production -f compose.yaml -f compose.production.yaml "$@"; }
```

Routine deployment pulls the already reviewed lockfile, builds without refreshing Citizen, recreates the app, and then recreates Nginx so it resolves the new app-container address. It does not recreate PostgreSQL:

```sh
git status --short
git pull --ff-only origin main
pdc config --quiet
pdc build app proxy
pdc up -d --no-deps --force-recreate app
pdc ps app
pdc logs --tail=100 app
pdc up -d --no-deps --force-recreate proxy
pdc ps
SMOKE_PRODUCTION=true ./scripts/smoke-test https://jaysylvester.com
```

Docker replaces PM2. Production `db`, `app`, and `proxy` use `restart: unless-stopped`; the image runs `node app/start.js` directly. Use:

```sh
pdc ps app
pdc logs --tail=100 --follow app
sudo docker inspect --format '{{.RestartCount}}' "$(pdc ps -q app)"
sudo docker stats --no-stream "$(pdc ps -q app)"
```

Postico retains the existing SSH connection and connects to remote `127.0.0.1:5432`; PostgreSQL is never publicly published. Host Certbot retains `/etc/letsencrypt`, uses `/var/www/certbot` for HTTP-01, and installs `scripts/reload-production-proxy` as its deploy hook so a successful renewal reloads container Nginx. The certificate material is mounted read-only into `proxy` and is absent from Git and images. To repeat the staged renewal immediately rather than waiting through Certbot's timer-oriented random delay, use `sudo certbot renew --dry-run --run-deploy-hooks --no-random-sleep-on-renew`.

The rebuilt Droplet has both DigitalOcean agents: `droplet-agent.service` provides the normal browser console, while `do-agent.service` preserves host metrics. Both were verified enabled and active after the reboot rehearsal.

The Citizen dependency is pinned to the reviewed `2.0` branch commit in `package-lock.json`. Ordinary deployments consume that lock. To refresh Citizen, first run its complete suite under Node.js 22 and 24, deliberately update the HTTPS lock without SSH normalization, update the migration record, and pass development review before production deployment.

## Future Linux development hosts (untested)

Install Docker Engine and Compose from the distribution's official instructions, plus `mkcert` and the browser-specific trust dependency. Update `/etc/hosts`, account for firewall and privileged-port rules, and verify bind-mount ownership. If files written by the assets service need a Linux UID/GID override, review and add that override for the host rather than weakening repository permissions. This path remains untested until exercised.

## Future Windows development hosts (untested)

Use Docker Desktop with WSL 2, keep the checkout in the WSL filesystem, and run repository shell commands inside WSL. Install and trust `mkcert` for the Windows browser trust store, then record whether Windows or WSL owns the hosts-file entry. Preserve LF line endings and executable bits for `scripts/*`. This path remains untested until exercised.
