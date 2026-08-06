# jaysylvester.com

Jay Sylvester's personal site, built with Citizen 2.0. Local development uses Docker Compose for Node.js, PostgreSQL, Nginx, Gulp, and BrowserSync; no host Node installation is required.

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

Add the local hostname to `/etc/hosts`:

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

Git does not supply credentials, certificates, or database data. Populate `.env` from the protected Citizen 1.x configuration using the mapping in [docs/migrations/citizen-2.md](docs/migrations/citizen-2.md). Preserve the existing values. Before starting PostgreSQL for the first time, inventory the source PostgreSQL major, encoding, collation, and character type; select the tested `POSTGRES_IMAGE` and set `POSTGRES_INITDB_ARGS` accordingly.

Obtain the authoritative custom-format dump outside this checkout and verify its checksum and archive:

```sh
shasum -a 256 -c jaysylvester.dump.sha256
pg_restore --list jaysylvester.dump >/dev/null
```

The local Compose project is `jaysylvester-local`; its database volume is `jaysylvester-local-postgres`. Do not create that final volume until the PostgreSQL image and locale have been rehearsed.

```sh
dc() { docker compose --env-file .env -p jaysylvester-local -f compose.yaml -f compose.local.yaml "$@"; }

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

`local-up` checks or creates the ignored `mkcert` leaf certificate, then starts the stack:

```sh
./scripts/local-up --build
./scripts/smoke-test https://dev.jaysylvester.com
```

Open <https://dev.jaysylvester.com>. The certificate covers `dev.jaysylvester.com`, `localhost`, `127.0.0.1`, and `::1`. Its private key is local-only and is never the mkcert CA key.

Useful commands:

```sh
dc() { docker compose --env-file .env -p jaysylvester-local -f compose.yaml -f compose.local.yaml "$@"; }
dc ps
dc logs -f app proxy assets
dc down
```

Postico connects to `127.0.0.1:${POSTICO_PORT:-5432}` with the existing local database credentials. PostgreSQL is published only on loopback, and its data survives `dc down`.

### Configuration and file watching

Citizen resolves framework configuration when it is imported. Compose injects the ignored project-root `.env` into `app`; `CITIZEN_*` settings, including the JSON `CITIZEN_CORS` policy, become typed values under `app.config`, while database and mail values remain strings read from `process.env`. No `app/config/*.json` file may be active.

The local app and Gulp watchers use polling for Docker Desktop. The `assets` service receives only BrowserSync certificate/host and watcher variables—not database or mail credentials. BrowserSync ports 3000 and 8282 and the Postico port are loopback-only.

After changing `.env`, recreate `app` so Compose injects the new environment, then recreate `proxy` so Nginx resolves the current app container:

```sh
dc up -d --no-deps --force-recreate app
dc up -d --no-deps --force-recreate proxy
./scripts/smoke-test https://dev.jaysylvester.com
```

## Production during Phase 1

Production remains host-based during the interval before Phase 2: Node.js 24 and Citizen 2.0 run the application, while Nginx, PostgreSQL, and Certbot remain host services. The protected production `.env` retains the inventoried loopback Citizen binding and `DB_HOST=127.0.0.1`; it must not use the local Docker endpoints.

Deploy application changes with the recorded production branch and systemd service:

```sh
cd /var/www/jaysylvester.com
git status --short
git pull --ff-only
PATH=/opt/node24/bin:/usr/local/bin:/usr/bin:/bin npm ci --omit=dev  # when dependencies changed
sudo systemctl restart REPLACE_WITH_INVENTORIED_APP_SERVICE
sudo systemctl status REPLACE_WITH_INVENTORIED_APP_SERVICE --no-pager
curl -fsS https://jaysylvester.com/ >/dev/null
```

Ordinary deployments use the Citizen commit already recorded in `package-lock.json`. To consume a newer commit from `2.0-env-file-config-revised`, first run Citizen's complete suite under Node.js 22 and 24, deliberately refresh this lockfile, and update the migration record.

Phase 2 will add the Debian production Compose overlay, production Nginx configuration, Certbot reload hook, ordered app/proxy deployment, and Docker-era Postico notes after the effective production host configuration has been inventoried. Until then, do not use the local Compose files to replace production host services.

## Future Linux development hosts (untested)

Install Docker Engine and Compose from the distribution's official instructions, plus `mkcert` and the browser-specific trust dependency. Update `/etc/hosts`, account for firewall and privileged-port rules, and verify bind-mount ownership. If files written by the assets service need a Linux UID/GID override, review and add that override for the host rather than weakening repository permissions. This path remains untested until exercised.

## Future Windows development hosts (untested)

Use Docker Desktop with WSL 2, keep the checkout in the WSL filesystem, and run repository shell commands inside WSL. Install and trust `mkcert` for the Windows browser trust store, then record whether Windows or WSL owns the hosts-file entry. Preserve LF line endings and executable bits for `scripts/*`. This path remains untested until exercised.
