# Docker Migration and Production Deployment Plan

Status: Draft

Target: one Docker Compose architecture for local development and the DigitalOcean production server

## 1. Goal

Replace the local VM runtime and the production host-installed Node/PostgreSQL/Nginx runtime with the same Docker Compose application stack. The permanent local target is Docker running directly on the developer workstation; the local VM is only a migration source and will be decommissioned after acceptance.

```text
Browser
  |
  v
proxy (Nginx; host ports 80 and 443)
  |
  v
app (Node/Citizen; internal port 8080)
  |
  v
db (PostgreSQL; internal port 5432)
  |
  v
named PostgreSQL volume
```

Migrate each environment's existing live PostgreSQL database into its own Docker volume. Keep local and production data, configuration, certificates, volumes, and Compose project names separate.

The completed local architecture is:

```text
Developer workstation
  ├─ browser and trusted mkcert CA
  ├─ Git checkout and generated development certificate
  └─ Docker Compose: proxy + app + db + named volumes

Local VM: deleted after migration, observation, and backup verification
```

On macOS or Windows, Docker Desktop may internally manage its own Linux virtualization layer. That is Docker-managed infrastructure shared by all projects, not a custom per-project VM; no project setup, certificate, database, or deployment procedure may depend on manually administering it.

The production workflow will remain SSH plus `git pull`, followed by documented Compose build and deployment commands. DNS stays pointed at the existing DigitalOcean server.

## 2. Scope and Explicit Decisions

This plan includes:

- Docker artifacts shared by local development and production.
- A local development override and a production override.
- Migration of the current local VM database to a local Docker PostgreSQL instance.
- Secure one-time transfer of the ignored Citizen configuration from the VM to the workstation.
- Shutdown, observation, and final removal of the local VM.
- Migration of the current DigitalOcean database to a production Docker PostgreSQL instance.
- Local HTTPS using automatically generated, locally trusted certificates.
- Production HTTPS using the existing Let's Encrypt certificate and renewal process.
- Step-by-step preparation, migration, validation, cutover, ongoing deployment, backup, and rollback commands.

This plan does not include:

- Credential rotation. Reuse each environment's existing database and SendGrid credentials during this migration.
- Moving configuration values into environment variables inside the application. Citizen's static JSON configuration model remains in place.
- Adding application health routes. Startup ordering uses PostgreSQL's `pg_isready` check, and readiness is verified against existing public routes.
- Changing production DNS or moving away from DigitalOcean.
- Changing application features or upgrading Citizen and other application dependencies.
- Horizontal scaling. Citizen's in-process caches and optional sessions are not shared between application containers.
- Containerizing Certbot in the initial migration. The existing host Certbot installation remains responsible for renewal.

Do not combine credential changes, application dependency upgrades, or unrelated schema changes with either cutover.

### Cross-project workstation port decision

Only one process can own workstation ports 80 and 443 on a given address. Before migrating a second local project, choose and document one of these workstation-wide models:

1. Run only one project's proxy at a time. Each project can publish 80/443 and most closely mirror production. The commands in this plan use this model initially.
2. If multiple projects must run concurrently, create one shared workstation gateway Compose project that alone publishes 80/443, owns local certificate automation, and routes by hostname to project proxies over a deliberately named external Docker network. In that model, remove host port publication from every project's local override; do not assign arbitrary public database or application ports.

Do not independently publish 80/443 from multiple project stacks. A shared gateway is workstation infrastructure only; production retains this project's own Nginx edge and Let's Encrypt configuration. Add the chosen model to the VM-wide retirement checklist so all project plans use the same convention.

## 3. Environment Labels and Command Conventions

Every command block is labeled with the environment where it must run:

- `[WORKSTATION]`: the Git checkout where Docker files are implemented and committed.
- `[LOCAL VM]`: the current local Debian VM, used only as the migration source until it is deleted.
- `[LOCAL DOCKER HOST]`: the workstation; this is not the old VM.
- `[PRODUCTION]`: the DigitalOcean server reached over SSH.
- `[BROWSER HOST]`: the same workstation and trust store as `[LOCAL DOCKER HOST]`.

The three labels `[WORKSTATION]`, `[LOCAL DOCKER HOST]`, and `[BROWSER HOST]` intentionally refer to the same physical computer. They identify the role relevant to a command, not separate machines. The final local setup must not require SSH to, shared folders from, or services running inside the old VM.

Before running a block:

1. Verify the shell prompt and hostname.
2. Read the block completely.
3. Replace every `REPLACE_ME` value.
4. Do not paste placeholder values into a live command.
5. Keep database dumps outside the repository.
6. Never run `docker compose down --volumes` during migration, deployment, or rollback.
7. Do not put a database password directly on a command line. Use the existing local PostgreSQL authentication for dumps and an ignored Compose environment file for the target.

Commands assume the application database and role are both named `jaysylvester`. Phase 1 verifies those names before they are used.

For Linux hosts where the current user is not authorized to use Docker, prefix local `docker` commands with `sudo`. Production commands intentionally use `sudo docker`.

## 4. Framework and Repository Constraints

The implementation must respect the following Citizen behavior:

- Citizen reads JSON configuration when `require('citizen')` runs, before `app.start()`.
- Citizen selects the JSON file whose `host` property equals `os.hostname()`, falling back to `app/config/citizen.json`.
- This application constructs Nodemailer and its PostgreSQL pool from `app.config` before `app.start()`. Startup options cannot replace those values without restructuring application startup.
- The application image must therefore retain hostname-selected, static configuration.
- Citizen derives its default `app`, `web`, and `logs` paths relative to the installed `node_modules/citizen` package. Preserve this layout:

```text
/site/
  app/
  web/
  logs/
  node_modules/
    citizen/
```

- Both entry points read `web/min/site.css` and `web/min/site.js` during startup to calculate cache-buster values. Those files must exist in the application image even when Nginx serves them.
- Citizen logs to files in production mode. The non-root application process needs a writable, persistent logs mount.
- Citizen does not expose a documented server close method. Do not add a signal handler that intercepts `SIGTERM` unless it also guarantees bounded HTTP shutdown and closes the database pool.
- `resources/data.sql` was used for initial setup and is not a migration source. The two live PostgreSQL databases are authoritative; migrate each one directly with `pg_dump` and `pg_restore` so its complete current schema and data are preserved.

No custom configuration renderer or runtime mutation of Citizen configuration is required for this migration.

## 5. Target Files and Architecture

Implement and commit:

- `Dockerfile`: application image with the required `/site` layout and non-root user.
- `docker/nginx/Dockerfile`: proxy image containing the shared Nginx configuration and built static assets.
- `.dockerignore`: exclude Git data, `node_modules`, logs, dumps, configuration, environment files, and certificates.
- `compose.yaml`: common `db`, `app`, and `proxy` service definitions with no environment-specific public bindings.
- `compose.local.yaml`: local hostnames, local configuration mount, local TLS mount, source mounts/watch behavior, ports 80/443, and a loopback-only PostgreSQL binding for Postico.
- `compose.production.yaml`: production hostname, production configuration mount, Let's Encrypt mounts, ports 80/443, a loopback-only PostgreSQL binding for tunneled Postico access, and production restart/logging policy.
- `docker/nginx/common.conf` plus environment-specific server configuration or narrowly rendered templates.
- `docker/config.example.json`: sanitized example outside `app/config`.
- `docker/env.example`: sanitized PostgreSQL/Compose variable example.
- `scripts/local-cert`: idempotently install/check local trust and generate the development certificate.
- `scripts/local-up`: run `scripts/local-cert` and then start the local Compose project.
- `scripts/smoke-test`: test existing routes; it must not rely on a new health endpoint.
- `scripts/db-compare.sql`: repeatable row-count, maximum-ID, sequence, and schema checks.
- `scripts/test-db-restore`: restore a selected dump into a uniquely named disposable Compose project and compare it without touching the live local volume.
- `scripts/reload-production-proxy`: Certbot deploy hook that reloads the Nginx container after a successful renewal.
- Updated project README with daily operations and recovery commands.
- A tracked `package-lock.json` so the application image can use `npm ci`.

Keep untracked and ignored:

- `app/config/docker-local.json`.
- `app/config/docker-production.json`.
- `.env.local` and `.env.production`.
- `docker/local-certs/*`.
- Database dumps.
- Let's Encrypt material.
- Log contents.

Use different Compose project names so volumes cannot collide:

- Local: `jaysylvester-local`.
- Production: `jaysylvester-production`.

### Common Compose behavior

The `db` service must:

- Use the PostgreSQL version proven by the local rehearsal. Rehearse PostgreSQL 13 to a currently supported major version first; use a temporary PostgreSQL 13 container only if a compatibility issue blocks cutover.
- Store `/var/lib/postgresql/data` in a named volume.
- Have a `pg_isready` health check.
- Have no host-published port by default.
- Be published by both environment overrides as `127.0.0.1:5432:5432` for Postico. This is loopback-only and must never bind PostgreSQL to `0.0.0.0`.
- Initialize the database and role from the ignored environment file only when the volume is empty.
- Set a restart policy and bounded Docker log rotation.

The `app` service must:

- Build the same image locally and in production.
- Use `hostname: jaysylvester-local` or `hostname: jaysylvester-production` in its override.
- Mount exactly one ignored JSON configuration file read-only under `/site/app/config/`.
- Reach PostgreSQL at host `db`.
- Wait on `db` with `condition: service_healthy`.
- Mount a writable logs volume.
- Expose 8080 only on the internal Compose network.
- Run `app/start-dev.js` locally and `app/start.js` in production.

The `proxy` service must:

- Use the same Nginx image in both environments.
- Serve static files copied into the proxy image and proxy dynamic requests to `http://app:8080`.
- Allow the local override to bind-mount `web/` read-only for immediate development updates; production must use the immutable files in the image rather than a host source mount.
- forward `Host`, `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`, and a correct standardized `Forwarded` header.
- Redirect HTTP to HTTPS, except production's `/.well-known/acme-challenge/` path.
- Publish only ports 80 and 443.
- Mount certificates read-only.
- Wait for `app` to start, without claiming that `service_started` proves application readiness.

## 6. Phase 1 — Inventory Both Source Environments

Complete and save the output before implementing a cutover.

### 6.1 Local VM inventory

`[LOCAL VM]`

```sh
hostname
cat /etc/os-release
node --version
npm --version
nginx -v
psql --version
sudo systemctl status nginx postgresql --no-pager
sudo ss -lntp
```

Record how the Node process is started and stopped:

```sh
systemctl list-units --type=service --all | grep -Ei 'citizen|node|jay'
ps -ef | grep -E '[n]ode|[n]pm'
```

Inventory the source database:

```sh
sudo -u postgres psql -Atqc "SELECT version();"
sudo -u postgres psql -Atqc "SELECT datname, pg_size_pretty(pg_database_size(datname)) FROM pg_database ORDER BY datname;"
sudo -u postgres psql -d jaysylvester -Atqc "SHOW server_encoding; SHOW lc_collate; SHOW lc_ctype; SHOW timezone;"
sudo -u postgres psql -d jaysylvester -Atqc "SELECT extname || ' ' || extversion FROM pg_extension ORDER BY extname;"
sudo -u postgres psql -d jaysylvester -Atqc "SELECT current_user, current_database();"
sudo -u postgres psql -d jaysylvester -Atqc "SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' ORDER BY table_name, ordinal_position;"
```

Capture baseline application-table counts:

```sh
sudo -u postgres psql -d jaysylvester -v ON_ERROR_STOP=1 <<'SQL'
SELECT 'case_studies' AS table_name, count(*) AS row_count, max(id) AS max_id FROM case_studies
UNION ALL
SELECT 'screens', count(*), max(id) FROM screens
UNION ALL
SELECT 'work_history', count(*), max(id) FROM work_history
ORDER BY table_name;
SQL
```

Because the end goal is to delete the VM, inventory machine-wide dependencies, not only this repository:

```sh
sudo find /var/www -mindepth 1 -maxdepth 2 -type d -print
sudo -u postgres psql -Atqc "SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname;"
systemctl list-unit-files --type=service --state=enabled
systemctl list-units --type=service --state=running
crontab -l 2>/dev/null || true
sudo crontab -l 2>/dev/null || true
sudo find /etc/cron.d /etc/cron.daily /etc/cron.hourly -maxdepth 1 -type f -print
sudo ss -lntup
sudo find /etc/nginx/sites-enabled -maxdepth 1 -type l -print
```

Create a VM retirement checklist containing every other project, database, service, timer/cron job, shared directory, and local hostname discovered. This plan can migrate jaysylvester.com, but the VM deletion gate in section 10.6 stays closed until every checklist item has been migrated or explicitly retired.

### 6.2 Production inventory

Connect using the existing SSH/tunnel workflow.

`[WORKSTATION]`

```sh
ssh REPLACE_ME_PRODUCTION_SSH_ALIAS
```

`[PRODUCTION]`

```sh
cd /var/www/jaysylvester.com
hostname
cat /etc/os-release
uname -m
git status --short
node --version
npm --version
nginx -v
psql --version
sudo certbot --version
sudo systemctl status nginx postgresql --no-pager
sudo systemctl list-timers --all | grep -Ei 'certbot|letsencrypt'
sudo ss -lntp
df -h
```

Discover and record the exact Node service/process command. Set `APP_SERVICE` only if the app is managed by systemd:

```sh
systemctl list-units --type=service --all | grep -Ei 'citizen|node|jay'
ps -ef | grep -E '[n]ode|[n]pm'
APP_SERVICE=REPLACE_ME_OR_RECORD_NON_SYSTEMD_STOP_COMMAND
```

Run the same database version, size, locale, extension, schema, and baseline-count commands from section 6.1 against production. Save the local and production results separately; their data is not expected to match each other.

The application only reads from PostgreSQL. Database changes are performed manually. Pause manual database administration from the start of each environment's final dump until that environment's Docker cutover has been accepted; the application may continue serving reads during the dump and restore.

### 6.3 Let's Encrypt inventory

`[PRODUCTION]`

```sh
sudo certbot certificates
sudo find /etc/letsencrypt/renewal -maxdepth 1 -type f -name '*.conf' -print
sudo grep -RE '^(authenticator|installer|webroot_path|server)[[:space:]]*=' /etc/letsencrypt/renewal
sudo systemctl cat certbot.timer 2>/dev/null
```

Record:

- The exact certificate name used for `jaysylvester.com`.
- The `live` certificate path referenced by current Nginx.
- Whether renewal uses `nginx`, `webroot`, or another authenticator.
- The active renewal timer/service.
- The current Nginx certificate and key directives.

Do not delete or replace the existing certificate. The production container will read the same `/etc/letsencrypt` tree.

## 7. Phase 2 — Implement and Validate the Repository Artifacts

### 7.1 Preserve Citizen configuration

Create separate ignored configurations by copying, not replacing, each environment's working configuration. This leaves the old host configuration intact during the observation window. Because the local file is ignored by Git, transfer it once from the VM to the workstation over SSH.

Verify the source without printing its secrets:

`[LOCAL VM]`

```sh
SOURCE_CONFIG=/var/www/jaysylvester.com/app/config/jaysylvester.json
test -f "$SOURCE_CONFIG"
stat "$SOURCE_CONFIG"
```

`[LOCAL DOCKER HOST]`

```sh
LOCAL_REPO=/absolute/path/to/jaysylvester.com
cd "$LOCAL_REPO"
umask 077
scp REPLACE_ME_VM_SSH_ALIAS:/var/www/jaysylvester.com/app/config/jaysylvester.json app/config/docker-local.json
chmod 600 app/config/docker-local.json
${EDITOR:-vi} app/config/docker-local.json
```

This is the only application-configuration transfer from the VM. Do not copy the old snake-oil certificates, logs, `node_modules`, PostgreSQL data directory, or VM Nginx configuration into the workstation runtime.

Change only the container-specific values:

- `host` to `jaysylvester-local`.
- `citizen.http.hostname` to the empty string so Node listens on all container interfaces.
- `citizen.http.port` to `8080`.
- `db.host` to `db`.
- `db.port` to `5432`.
- `db.max` to `10` initially.
- CORS origins, if present, to include the exact local HTTPS origin already used: `https://dev.jaysylvester.com`.
- Keep the existing local database and mail credentials.

`[PRODUCTION]`, after the deployment commit is pulled:

```sh
cd /var/www/jaysylvester.com
SOURCE_CONFIG=app/config/REPLACE_ME_EXISTING_PRODUCTION_CONFIG.json
test -f "$SOURCE_CONFIG"
install -m 600 "$SOURCE_CONFIG" app/config/docker-production.json
${EDITOR:-vi} app/config/docker-production.json
```

Make the equivalent production changes:

- `host` to `jaysylvester-production`.
- Citizen HTTP hostname/port to `""` and `8080`.
- Database host/port to `db` and `5432`.
- Initial pool maximum to `10`.
- Keep the current production database password, SendGrid credential, mail addresses, CORS values, and all other framework settings unchanged.

Create ignored Compose environment files from the sanitized example:

`[LOCAL DOCKER HOST]`

```sh
LOCAL_REPO=/absolute/path/to/jaysylvester.com
cd "$LOCAL_REPO"
umask 077
cp docker/env.example .env.local
${EDITOR:-vi} .env.local
```

`[PRODUCTION]`

```sh
cd /var/www/jaysylvester.com
umask 077
cp docker/env.example .env.production
${EDITOR:-vi} .env.production
```

Set the target `POSTGRES_DB` and `POSTGRES_USER` to the verified source names. Set `POSTGRES_PASSWORD` to the same per-environment password used by that environment's Citizen JSON. This is reuse, not rotation.

Verify that none of these files can be committed:

```sh
git check-ignore -v app/config/docker-local.json .env.local docker/local-certs/dev-key.pem
git status --short
```

Run the equivalent check for `docker-production.json` and `.env.production` on production.

### 7.2 Image/version policy

During implementation:

1. Pin the application image to the same Node major version currently proven in production.
2. Use `npm ci` with the committed lockfile.
3. Do not update dependency ranges.
4. Test a supported Node LTS as a separately reviewable follow-up if the current runtime is unsupported.
5. Rehearse restoring PostgreSQL 13 into a supported PostgreSQL target. Do not silently downgrade the image after a successful rehearsal.
6. Pin base-image tags and record resolved digests after validation.

### 7.3 Compose validation

After artifacts exist:

`[WORKSTATION or LOCAL DOCKER HOST]`

```sh
docker compose --env-file .env.local -p jaysylvester-local -f compose.yaml -f compose.local.yaml config --quiet
docker compose --env-file .env.local -p jaysylvester-local -f compose.yaml -f compose.local.yaml config > /tmp/jaysylvester-local-compose.txt
docker build --pull -t jaysylvester-app:migration .
```

Inspect the rendered configuration without publishing it or pasting it into tickets because it may contain secrets:

```sh
chmod 600 /tmp/jaysylvester-local-compose.txt
docker image inspect jaysylvester-app:migration --format '{{json .Config.User}} {{json .Config.WorkingDir}}'
docker run --rm --entrypoint sh jaysylvester-app:migration -c 'test -f /site/app/start.js && test -f /site/web/min/site.css && test -f /site/web/min/site.js && test -d /site/node_modules/citizen'
```

Confirm that `docker history jaysylvester-app:migration` and the image filesystem contain no `app/config/*.json`, `.env*`, private keys, or dumps.

## 8. Phase 3 — Replace Manual Local HTTPS with mkcert

Use `mkcert` on the workstation to create a private local certificate authority, install that CA in the workstation's browser trust stores, and generate a certificate specifically for the development names. The CA private key must remain in mkcert's external CA directory and must never enter the repository or a container.

Docker, the repository, mkcert, and the browser all run on the workstation. The certificate is generated directly into the ignored bind-mounted directory. No certificate is copied from or to the old VM.

Do not use Let's Encrypt for local development. Public ACME validation is unnecessary and would make local startup depend on public DNS and inbound reachability.

### 8.1 Install mkcert once

`[BROWSER HOST — macOS]`

```sh
brew install mkcert
brew install nss
mkcert -install
```

The `nss` package is needed only for Firefox's separate trust store.

`[BROWSER HOST — Debian/Ubuntu]`

```sh
sudo apt update
sudo apt install libnss3-tools
```

Install the current mkcert binary using the official mkcert installation instructions, then run:

```sh
mkcert -install
```

`[BROWSER HOST — Windows PowerShell as Administrator]`

```powershell
choco install mkcert
mkcert -install
```

Scoop is an acceptable alternative if already used. In all cases, verify that the command is FiloSottile's mkcert:

```sh
mkcert -version
mkcert -CAROOT
```

Never copy, commit, mount, or share `rootCA-key.pem` from the reported CA root.

### 8.2 Map the development name locally

Verify the current resolution:

`[BROWSER HOST]`

```sh
getent hosts dev.jaysylvester.com 2>/dev/null || nslookup dev.jaysylvester.com
```

Add this entry to `/etc/hosts` on Linux/macOS, or the Windows hosts file, if the name does not already resolve to the local Docker host:

```text
127.0.0.1 dev.jaysylvester.com
```

The final hosts entry always points to the workstation loopback address because Docker runs there. Remove any old entry that points `dev.jaysylvester.com` at the VM. Do not change public production DNS.

### 8.3 Generate and maintain the certificate

The tracked `scripts/local-cert` script must:

1. Fail with installation guidance if `mkcert` is unavailable.
2. Run `mkcert -install` idempotently.
3. Create ignored `docker/local-certs/` with restrictive permissions.
4. Generate:
   - `docker/local-certs/dev-cert.pem`
   - `docker/local-certs/dev-key.pem`
5. Include SANs for `dev.jaysylvester.com`, `localhost`, `127.0.0.1`, and `::1`.
6. Set the private key to mode 600.
7. Use `openssl x509 -checkend` and hostname verification to keep an existing valid certificate.
8. Regenerate it automatically when missing, invalid for `dev.jaysylvester.com`, or within 30 days of expiry.
9. Never copy or mount mkcert's root CA private key.
10. Print a clear reminder to restart/reload the proxy when it generates a new leaf certificate.

Run it directly once:

`[LOCAL DOCKER HOST / BROWSER HOST]`

```sh
LOCAL_REPO=/absolute/path/to/jaysylvester.com
cd "$LOCAL_REPO"
./scripts/local-cert
openssl x509 -in docker/local-certs/dev-cert.pem -noout -subject -issuer -dates
openssl x509 -in docker/local-certs/dev-cert.pem -noout -checkhost dev.jaysylvester.com
```

The local Compose override mounts `docker/local-certs` read-only at `/etc/nginx/tls`. Local Nginx references `/etc/nginx/tls/dev-cert.pem` and `dev-key.pem`.

The tracked `scripts/local-up` command must call `scripts/local-cert` before `docker compose up`. Normal startup becomes:

`[LOCAL DOCKER HOST]`

```sh
./scripts/local-up --build
```

This removes the current `_dev-certs` copy step. The existing snake-oil certificate directory can remain untouched until the Docker migration is accepted, then be removed in a separate cleanup change.

### 8.4 Verify local trust and HTTPS

Do not use `curl -k` for acceptance; bypassing certificate verification would hide a broken trust setup.

`[BROWSER HOST]`

```sh
curl -fsS -o /dev/null https://dev.jaysylvester.com/
openssl s_client -connect dev.jaysylvester.com:443 -servername dev.jaysylvester.com </dev/null 2>/dev/null | openssl x509 -noout -subject -issuer -dates
```

Open the site in every browser used for development and confirm no certificate warning. If only Firefox warns, install `nss` and rerun `mkcert -install`. When moving to a new workstation or after resetting the OS trust store, rerun the installation and certificate script; do not transfer a CA private key between machines.

## 9. Phase 4 — Install Docker Where Needed

Use Docker Desktop on macOS/Windows. On Linux, use Docker's official Engine repository rather than an obsolete distribution package. Verify the workstation and production operating systems independently; do not infer either from the old VM.

`[WORKSTATION — macOS]`

```sh
brew install --cask docker
open -a Docker
docker version
docker compose version
docker run --rm hello-world
```

Wait for Docker Desktop to report that the engine is running before the verification commands.

`[WORKSTATION — Windows PowerShell]`

```powershell
winget install --exact --id Docker.DockerDesktop
docker version
docker compose version
docker run --rm hello-world
```

Complete any WSL 2/restart prompts from the installer, launch Docker Desktop, and then run the verification commands in a new PowerShell session.

`[WORKSTATION — Linux, and PRODUCTION]`

```sh
cat /etc/os-release
dpkg --print-architecture
```

For Debian, run the current commands from Docker's Debian installation page:

```sh
sudo apt update
sudo apt install ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
sudo tee /etc/apt/sources.list.d/docker.sources >/dev/null <<EOF
Types: deb
URIs: https://download.docker.com/linux/debian
Suites: $(. /etc/os-release && echo "$VERSION_CODENAME")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF
sudo apt update
sudo apt install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
sudo docker run --rm hello-world
sudo docker compose version
```

For Ubuntu, use the Ubuntu repository rather than the Debian repository:

```sh
sudo apt update
sudo apt install ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
sudo tee /etc/apt/sources.list.d/docker.sources >/dev/null <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF
sudo apt update
sudo apt install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
sudo docker run --rm hello-world
sudo docker compose version
```

Run only the block matching `/etc/os-release`.

Docker-published ports can bypass some host firewall rules. Confirm the DigitalOcean cloud firewall and host firewall expose only SSH, 80, and 443 publicly. PostgreSQL may bind only to production loopback for the existing SSH/Postico workflow; Citizen remains internal-only.

## 10. Phase 5 — Rehearse and Cut Over Local Development

### 10.1 Create a protected source dump

`[LOCAL VM]`

```sh
MIGRATION_STAMP=$(date -u +%Y%m%dT%H%M%SZ)
MIGRATION_DIR="REPLACE_ME_PROTECTED_PRODUCTION_STAGING_DIRECTORY/docker-migration-local-$MIGRATION_STAMP"
sudo install -d -m 0700 -o "$(id -un)" -g "$(id -gn)" "$MIGRATION_DIR"
sudo -u postgres pg_dump -Fc --no-owner --no-acl -d jaysylvester > "$MIGRATION_DIR/jaysylvester.dump"
sha256sum "$MIGRATION_DIR/jaysylvester.dump" > "$MIGRATION_DIR/jaysylvester.dump.sha256"
sha256sum -c "$MIGRATION_DIR/jaysylvester.dump.sha256"
pg_restore --list "$MIGRATION_DIR/jaysylvester.dump" >/dev/null
printf '%s\n' "$MIGRATION_DIR"
```

Also save the inventory/count output in this protected directory. Transfer the dump and checksum from the soon-to-be-retired VM to a protected workstation directory outside the Git checkout:

`[LOCAL DOCKER HOST]`

```sh
MIGRATION_DIR=/absolute/private/path/outside-the-repository/docker-migration-local
mkdir -p "$MIGRATION_DIR"
chmod 700 "$MIGRATION_DIR"
scp REPLACE_ME_VM_SSH_ALIAS:/absolute/source/path/jaysylvester.dump "$MIGRATION_DIR/"
scp REPLACE_ME_VM_SSH_ALIAS:/absolute/source/path/jaysylvester.dump.sha256 "$MIGRATION_DIR/"
cd "$MIGRATION_DIR"
sha256sum -c jaysylvester.dump.sha256 2>/dev/null || shasum -a 256 -c jaysylvester.dump.sha256
```

### 10.2 Restore into a fresh local volume

`[LOCAL DOCKER HOST]`

```sh
LOCAL_REPO=/absolute/path/to/jaysylvester.com
cd "$LOCAL_REPO"
dc() { docker compose --env-file .env.local -p jaysylvester-local -f compose.yaml -f compose.local.yaml "$@"; }
dc config --quiet
dc up -d db
dc ps
dc exec -T db pg_isready -U jaysylvester -d jaysylvester
```

Verify that this is a new target volume. If a `jaysylvester-local` database volume already contains data, stop and identify it; do not overwrite or delete it casually.

Restore:

```sh
LOCAL_DUMP=/absolute/path/to/jaysylvester.dump
test -r "$LOCAL_DUMP"
dc exec -T db pg_restore -U jaysylvester -d jaysylvester --exit-on-error --single-transaction --no-owner --no-privileges < "$LOCAL_DUMP"
dc exec -T db psql -U jaysylvester -d jaysylvester -v ON_ERROR_STOP=1 -c 'ANALYZE;'
```

Run `scripts/db-compare.sql` against the source VM and target container. Compare schema columns, row counts, maximum IDs, sequences, indexes, constraints, extensions, encoding, collation, and timezone. Any unexplained mismatch blocks cutover.

### 10.3 Start and validate the local stack

If another workstation process already owns ports 80/443, stop it only after identifying it. If it belongs to another Dockerized project that must remain running, implement the shared gateway decision above instead of stopping projects ad hoc.

`[LOCAL DOCKER HOST]`

```sh
if command -v ss >/dev/null 2>&1; then
  sudo ss -lntp | grep -E ':(80|443)[[:space:]]'
else
  lsof -nP -iTCP:80 -iTCP:443 -sTCP:LISTEN
fi
./scripts/local-up --build
dc ps
dc logs --tail=200 db app proxy
```

`[BROWSER HOST]`

```sh
for route in / /case-studies /work-samples /resume /contact; do
  curl -fsS -o /dev/null "https://dev.jaysylvester.com$route"
done
```

Also verify:

- Known case-study detail routes.
- CSS, JavaScript, images, downloads, MIME types, and cache-busters.
- HTTP redirects to HTTPS.
- Citizen receives the original HTTPS scheme and host.
- Expected 404 and 500 rendering.
- The contact form and confirmation email using the local environment's existing mail configuration.
- Postico connects directly to `127.0.0.1:5432` using the existing local database name and credentials.
- Container restart and recreation retain database data.
- `scripts/local-up` starts successfully after the certificate files are removed and regenerated on a test workstation.
- Browser trust succeeds without `-k`.

### 10.4 Final local cutover

The direct dump from section 10.1 is the migration source. The old Node application can continue serving because it only reads the database.

1. Pause manual database administration on the VM.
2. If any manual database change occurred after the dump in section 10.1, create a new dump and checksum with the same commands.
3. Restore the final dump into a new empty target volume. Never restore a full dump over an already populated database.
4. Run the complete comparison again.
5. Point `dev.jaysylvester.com` at workstation loopback.
6. Start the full stack and rerun all smoke tests.
7. Resume manual database administration against the Docker `db` service only.
8. Shut the old VM down for the observation period after the Docker stack passes validation; do not keep using it as a development fallback.

### 10.5 Local rollback

`[LOCAL DOCKER HOST]`

```sh
dc logs --no-color > /tmp/jaysylvester-local-rollback.log
dc down
```

Do not add `--volumes`. During the limited observation period only, power the VM back on, restore the previous hosts entry, then restart its PostgreSQL, Node application, and Nginx using the commands recorded in inventory. Rerun the existing routes against the VM. Diagnose and correct the Docker migration before beginning a new observation period.

### 10.6 Decommission the local VM

The VM is not part of the target architecture. Decommission it only after all of these gates pass:

- The complete route, mail, static asset, HTTPS, database, restart, and backup-restore tests pass on the workstation.
- The workstation has been used for normal development throughout the agreed observation period.
- A final database dump and checksum exist on the workstation and in a second backup location.
- The ignored Citizen configuration is present with mode 600 on the workstation and is included in an approved encrypted secrets backup.
- Every item in the VM-wide retirement checklist from section 6.1 has been migrated or explicitly retired. No other project, database, cron job, service, shared file, or hostname still depends on the VM.
- The local Docker backup-restore procedure in section 14.2 has been tested from an empty disposable database volume.

Begin the observation period by shutting down the VM:

`[LOCAL VM]`

```sh
sudo shutdown -h now
```

`[WORKSTATION]`, after the VM is off:

```sh
LOCAL_REPO=/absolute/path/to/jaysylvester.com
cd "$LOCAL_REPO"
./scripts/local-up
./scripts/smoke-test https://dev.jaysylvester.com
docker compose --env-file .env.local -p jaysylvester-local -f compose.yaml -f compose.local.yaml ps
```

Verify that `dev.jaysylvester.com` resolves to `127.0.0.1`, the VM is unreachable, and normal edit/build/restart/database workflows do not reference its hostname, IP address, shared folders, or SSH alias.

After the observation period and final checklist sign-off:

1. Take or retain the final logical database backup according to the backup policy; do not treat the VM disk image as the database backup.
2. Remove the VM through the hypervisor's normal delete operation.
3. Remove its virtual disks and snapshots only after confirming the logical backup and encrypted configuration backup are recoverable. This is the irreversible step.
4. Remove the obsolete VM IP from the workstation hosts file and remove its SSH alias if no other migration needs it.
5. Remove any VM-specific port forwarding, shared folders, and startup automation.
6. Rerun `scripts/local-up`, the smoke test, and a local database backup.

After VM deletion, local rollback means restoring the Docker database from a logical backup and rebuilding containers from Git. It no longer means returning to the VM.

## 11. Phase 6 — Prepare Production Without Downtime

### 11.1 Pull the Docker implementation safely

Before the first pull that makes `package-lock.json` tracked, protect any ignored server copy:

`[PRODUCTION]`

```sh
cd /var/www/jaysylvester.com
git status --short --ignored package-lock.json
if test -f package-lock.json && ! git ls-files --error-unmatch package-lock.json >/dev/null 2>&1; then
  mv package-lock.json "../package-lock.pre-docker.$(date -u +%Y%m%dT%H%M%SZ).json"
fi
git pull --ff-only
git status --short
```

Do not proceed if `git pull` would overwrite unrelated production changes. The existing ignored Citizen configuration remains untouched.

Create `docker-production.json` and `.env.production` using section 7.1. Install Docker using section 9 if needed.

Define a shell helper for the documented production project:

`[PRODUCTION]`

```sh
cd /var/www/jaysylvester.com
pdc() { sudo docker compose --env-file .env.production -p jaysylvester-production -f compose.yaml -f compose.production.yaml "$@"; }
pdc config --quiet
pdc config > /tmp/jaysylvester-production-compose.txt
sudo chmod 600 /tmp/jaysylvester-production-compose.txt
pdc build --pull app proxy
```

Building does not bind ports and can run while the old deployment remains live.

Verify no final production volume was accidentally initialized:

```sh
sudo docker volume ls --filter name=jaysylvester-production
```

A previously used matching database volume must be identified and backed up before proceeding. The cutover restore assumes an empty target.

### 11.2 Prepare production certificate mounts

Create the ACME webroot that both host Certbot and container Nginx will use:

`[PRODUCTION]`

```sh
sudo install -d -m 0755 /var/www/certbot/.well-known/acme-challenge
sudo test -r /etc/letsencrypt/live/REPLACE_ME_CERT_NAME/fullchain.pem
sudo test -r /etc/letsencrypt/live/REPLACE_ME_CERT_NAME/privkey.pem
```

The production Compose override must mount:

- `/etc/letsencrypt:/etc/letsencrypt:ro` into `proxy`, preserving `live` symlinks into `archive`.
- `/var/www/certbot:/var/www/certbot:ro` into `proxy`.

The Nginx production server must:

- Serve `/.well-known/acme-challenge/` from `/var/www/certbot` over port 80.
- Redirect all other HTTP traffic to HTTPS.
- Reference the exact existing certificate name under `/etc/letsencrypt/live/`.
- Proxy HTTPS traffic normally.

Review the tracked deploy hook and its fixed repository and Compose paths during preparation, but do not install it yet. Before installation, the proxy container does not exist, so an otherwise successful renewal would end with a failed reload hook.

`[PRODUCTION]`

```sh
sed -n '1,200p' scripts/reload-production-proxy
```

The hook must `cd /var/www/jaysylvester.com` and run the equivalent of:

```sh
/usr/bin/docker compose --env-file .env.production -p jaysylvester-production -f compose.yaml -f compose.production.yaml exec -T proxy nginx -s reload
```

It must run only as a Certbot deploy hook after successful renewal, not as a pre-hook.

## 12. Phase 7 — Production Database Migration and Cutover

Schedule a maintenance window. Production will be unavailable while the source database is dumped, restored, and validated. This deliberately simpler cutover allows host PostgreSQL and container PostgreSQL to use the same loopback port and keeps the Postico tunnel unchanged.

### 12.1 Pre-cutover checks

`[PRODUCTION]`

```sh
cd /var/www/jaysylvester.com
pdc() { sudo docker compose --env-file .env.production -p jaysylvester-production -f compose.yaml -f compose.production.yaml "$@"; }
pdc config --quiet
pdc build app proxy
sudo certbot certificates
sudo ss -lntp | grep -E ':(80|443|5432|8080)[[:space:]]'
df -h
```

Confirm:

- The final target database volume is empty/new.
- The source baseline and schema inventory are saved.
- The exact old app stop/start commands are recorded.
- Rollback service commands are ready.
- The current certificate and private key are readable by root.
- Ports 80 and 443 remain reachable through the DigitalOcean firewall.
- No manual database administration will occur during the dump, restore, comparison, or traffic switch.

### 12.2 Stop the old stack and create the final production dump

Begin the maintenance window. Pause manual database administration and stop the old application using the command recorded in Phase 1. If it is managed by systemd:

`[PRODUCTION]`

```sh
APP_SERVICE=REPLACE_ME_RECORDED_SYSTEMD_SERVICE
test "$APP_SERVICE" != REPLACE_ME_RECORDED_SYSTEMD_SERVICE
sudo systemctl stop "$APP_SERVICE"
! sudo systemctl is-active --quiet "$APP_SERVICE"
```

For a non-systemd application, use its recorded stop command and verify the process is gone. Stop host Nginx:

```sh
sudo nginx -t
sudo systemctl stop nginx
! sudo systemctl is-active --quiet nginx
```

Create a protected direct dump from the live host PostgreSQL database:

`[PRODUCTION]`

```sh
MIGRATION_STAMP=$(date -u +%Y%m%dT%H%M%SZ)
MIGRATION_DIR="REPLACE_ME_PROTECTED_PRODUCTION_STAGING_DIRECTORY/docker-migration-$MIGRATION_STAMP"
sudo install -d -m 0700 -o "$(id -un)" -g "$(id -gn)" "$MIGRATION_DIR"
sudo -u postgres pg_dump -Fc --no-owner --no-acl -d jaysylvester > "$MIGRATION_DIR/jaysylvester-production.dump"
sha256sum "$MIGRATION_DIR/jaysylvester-production.dump" > "$MIGRATION_DIR/jaysylvester-production.dump.sha256"
cd "$MIGRATION_DIR"
sha256sum -c jaysylvester-production.dump.sha256
pg_restore --list jaysylvester-production.dump >/dev/null
```

Capture the final source database comparisons in the same directory.

Stop host PostgreSQL and verify that loopback port 5432 is free for the container:

```sh
sudo systemctl stop postgresql
! sudo systemctl is-active --quiet postgresql
sudo ss -lntp | grep -E ':5432[[:space:]]' || true
```

### 12.3 Restore into the production container

Host PostgreSQL is now stopped, so the Docker database can take over `127.0.0.1:5432` for Postico and the existing production SSH tunnel.

`[PRODUCTION]`

```sh
cd /var/www/jaysylvester.com
pdc up -d db
pdc ps
pdc exec -T db pg_isready -U jaysylvester -d jaysylvester
PRODUCTION_DUMP=REPLACE_ME_PROTECTED_PRODUCTION_STAGING_DIRECTORY/REPLACE_ME_FINAL_DIRECTORY/jaysylvester-production.dump
test -r "$PRODUCTION_DUMP"
pdc exec -T db pg_restore -U jaysylvester -d jaysylvester --exit-on-error --single-transaction --no-owner --no-privileges < "$PRODUCTION_DUMP"
pdc exec -T db psql -U jaysylvester -d jaysylvester -v ON_ERROR_STOP=1 -c 'ANALYZE;'
```

Run `scripts/db-compare.sql` and the complete schema/data comparison. Investigate every mismatch before starting the application.

### 12.4 Start and validate the Docker stack

Start the Docker application and proxy:

`[PRODUCTION]`

```sh
pdc up -d app proxy
pdc ps
pdc logs --tail=200 db app proxy
```

Do not proceed if the application or proxy restarts, Citizen selects the wrong configuration, static bundles/logs are unreadable, or the app cannot connect to `db`.

Validate from both the server and an external workstation:

`[PRODUCTION]`

```sh
for route in / /case-studies /work-samples /resume /contact; do
  curl -fsS -o /dev/null "https://jaysylvester.com$route"
done
curl -fsSI http://jaysylvester.com/ | sed -n '1,8p'
```

`[WORKSTATION]`

```sh
for route in / /case-studies /work-samples /resume /contact; do
  curl -fsS -o /dev/null "https://jaysylvester.com$route"
done
```

Manually validate known detail pages, static assets, downloads, 404 behavior, certificate chain/name/expiry, the production contact/confirmation email, and the saved Postico SSH connection to remote `127.0.0.1:5432`.

Resume manual database administration through the Docker-backed Postico connection only.

Do not disable or uninstall the old services until the observation period passes.

### 12.5 Prove Let's Encrypt renewal

First verify that the challenge path is public:

`[PRODUCTION]`

```sh
ACME_TEST=/var/www/certbot/.well-known/acme-challenge/docker-migration-test
printf '%s\n' docker-migration-test | sudo tee "$ACME_TEST" >/dev/null
curl -fsS http://jaysylvester.com/.well-known/acme-challenge/docker-migration-test
sudo rm -f "$ACME_TEST"
```

Now that the proxy container is live, install its reload hook:

`[PRODUCTION]`

```sh
sudo install -m 0755 /var/www/jaysylvester.com/scripts/reload-production-proxy /etc/letsencrypt/renewal-hooks/deploy/reload-jaysylvester-proxy
```

If the existing certificate uses the Nginx authenticator, change it to webroot so host Certbot no longer expects host Nginx configuration. With a current Certbot:

```sh
CERT_NAME=REPLACE_ME_CERT_NAME
sudo certbot reconfigure --cert-name "$CERT_NAME" --webroot --webroot-path /var/www/certbot
```

If `certbot reconfigure` is unavailable in the installed version, update Certbot through its existing supported installation channel before changing renewal settings; do not improvise by overwriting renewal files.

Test renewal regardless of whether the certificate was already using webroot:

```sh
sudo certbot renew --dry-run
```

Confirm the deploy hook reloaded container Nginx and inspect renewal status:

```sh
sudo journalctl -u certbot --since today --no-pager
pdc logs --since=10m proxy
sudo systemctl list-timers --all | grep -Ei 'certbot|letsencrypt'
```

Let's Encrypt HTTP-01 renewal requires public port 80. Keep it reachable and keep the challenge exception ahead of the HTTP-to-HTTPS redirect.

## 13. Production Rollback

Rollback remains possible because the old host configuration and database were not changed.

If validation fails before any Docker-side write:

`[PRODUCTION]`

```sh
cd /var/www/jaysylvester.com
pdc() { sudo docker compose --env-file .env.production -p jaysylvester-production -f compose.yaml -f compose.production.yaml "$@"; }
pdc logs --no-color > "/tmp/jaysylvester-production-rollback-$(date -u +%Y%m%dT%H%M%SZ).log"
pdc down
sudo systemctl start postgresql
sudo systemctl start REPLACE_ME_RECORDED_APP_SERVICE
sudo systemctl start nginx
sudo systemctl --no-pager --full status postgresql nginx REPLACE_ME_RECORDED_APP_SERVICE
```

For a non-systemd application, use its recorded start command instead. Rerun public route and certificate smoke tests.

Do not delete the Docker volume or final dump. Preserve both for diagnosis.

Because the application is read-only and manual database administration is paused during migration, the stopped host database remains a complete rollback source throughout the observation window. Do not make manual changes independently in both databases.

## 14. Ongoing Commands After Migration

### 14.1 Local development

`[LOCAL DOCKER HOST]`

```sh
LOCAL_REPO=/absolute/path/to/jaysylvester.com
cd "$LOCAL_REPO"
./scripts/local-up
docker compose --env-file .env.local -p jaysylvester-local -f compose.yaml -f compose.local.yaml ps
docker compose --env-file .env.local -p jaysylvester-local -f compose.yaml -f compose.local.yaml logs -f app proxy
docker compose --env-file .env.local -p jaysylvester-local -f compose.yaml -f compose.local.yaml down
```

The shutdown command keeps the database volume. The next `scripts/local-up` checks certificate validity and renews the local leaf certificate when needed.

### 14.2 Local database backup and restore test

The retired VM cannot be the backup. Create workstation logical backups outside the repository:

`[WORKSTATION]`

```sh
LOCAL_REPO=/absolute/path/to/jaysylvester.com
LOCAL_BACKUP_ROOT=/absolute/private/backup/path/jaysylvester
BACKUP_STAMP=$(date -u +%Y%m%dT%H%M%SZ)
BACKUP_DIR="$LOCAL_BACKUP_ROOT/$BACKUP_STAMP"
mkdir -p "$BACKUP_DIR"
chmod 700 "$LOCAL_BACKUP_ROOT" "$BACKUP_DIR"
cd "$LOCAL_REPO"
dc() { docker compose --env-file .env.local -p jaysylvester-local -f compose.yaml -f compose.local.yaml "$@"; }
dc exec -T db pg_dump -U jaysylvester -Fc --no-owner --no-acl -d jaysylvester > "$BACKUP_DIR/jaysylvester.dump"
if command -v sha256sum >/dev/null 2>&1; then
  sha256sum "$BACKUP_DIR/jaysylvester.dump" > "$BACKUP_DIR/jaysylvester.dump.sha256"
else
  shasum -a 256 "$BACKUP_DIR/jaysylvester.dump" > "$BACKUP_DIR/jaysylvester.dump.sha256"
fi
dc exec -T db pg_restore --list < "$BACKUP_DIR/jaysylvester.dump" >/dev/null
printf '%s\n' "$BACKUP_DIR"
```

Copy the dump and checksum to a second backup location. Periodically prove restoration without touching the live `jaysylvester-local` volume:

```sh
./scripts/test-db-restore /absolute/private/backup/path/jaysylvester/REPLACE_ME_TIMESTAMP/jaysylvester.dump
```

The restore-test script must generate a unique Compose project name, start only a fresh test database, restore with `--exit-on-error --single-transaction`, run `scripts/db-compare.sql`, and print the exact test project/volume names. It must refuse to operate on `jaysylvester-local` or `jaysylvester-production`. Cleanup of the disposable test volume must be a separate, explicit command after successful review.

### 14.3 Postico connections

No database command-line maintenance workflow is required. Both Compose overrides bind PostgreSQL to host loopback port 5432 for Postico while keeping it inaccessible from the public network.

Update the saved Postico connection for local development to:

- Host: `127.0.0.1`.
- Port: `5432`.
- URL form: `postgresql://127.0.0.1:5432/jaysylvester`.
- Database and user: the existing local values.
- Password: the existing local credential.

For production, retain the existing SSH host/tunnel and set its database destination to:

- Remote database host: `127.0.0.1`.
- Remote database port: `5432`.
- Database, user, and password: the existing production values.

When Postico manages SSH itself, no separate local tunnel port needs to be reserved. If a manual SSH tunnel is used while the local Docker database is running, choose a different workstation-side port such as 55432, forward it to production `127.0.0.1:5432`, and use `postgresql://127.0.0.1:55432/jaysylvester` in that Postico favorite. Port 55432 is only the workstation end of the tunnel; production PostgreSQL still binds to loopback port 5432.

Citizen does not use the host binding. Its JSON configuration continues to use `db:5432` on the internal Compose network. After cutover, make manual changes only through the Docker-backed Postico connection, not the stopped host PostgreSQL instance.

### 14.4 Routine production deployment

The post-migration production deployment becomes:

`[PRODUCTION]`

```sh
cd /var/www/jaysylvester.com
git status --short
git pull --ff-only
sudo docker compose --env-file .env.production -p jaysylvester-production -f compose.yaml -f compose.production.yaml config --quiet
sudo docker compose --env-file .env.production -p jaysylvester-production -f compose.yaml -f compose.production.yaml build --pull app proxy
sudo docker compose --env-file .env.production -p jaysylvester-production -f compose.yaml -f compose.production.yaml up -d --remove-orphans
sudo docker compose --env-file .env.production -p jaysylvester-production -f compose.yaml -f compose.production.yaml ps
sudo docker compose --env-file .env.production -p jaysylvester-production -f compose.yaml -f compose.production.yaml logs --tail=100 app proxy
```

Then run `scripts/smoke-test https://jaysylvester.com`. A tracked deployment wrapper may encapsulate these exact commands after the first successful manual deployment.

Do not automatically run database initialization or restore during ordinary deploys. The named database volume persists independently of image rebuilds.

### 14.5 Production backup

Create logical backups from the container using the target PostgreSQL version:

`[PRODUCTION]`

```sh
BACKUP_STAMP=$(date -u +%Y%m%dT%H%M%SZ)
BACKUP_DIR="REPLACE_ME_PROTECTED_PRODUCTION_STAGING_DIRECTORY/$BACKUP_STAMP"
sudo install -d -m 0700 -o "$(id -un)" -g "$(id -gn)" "$BACKUP_DIR"
sudo docker compose --env-file /var/www/jaysylvester.com/.env.production -p jaysylvester-production -f /var/www/jaysylvester.com/compose.yaml -f /var/www/jaysylvester.com/compose.production.yaml exec -T db pg_dump -U jaysylvester -Fc --no-owner --no-acl -d jaysylvester > "$BACKUP_DIR/jaysylvester.dump"
sha256sum "$BACKUP_DIR/jaysylvester.dump" > "$BACKUP_DIR/jaysylvester.dump.sha256"
pg_restore --list "$BACKUP_DIR/jaysylvester.dump" >/dev/null
```

Add retention, off-server copy, monitoring, and periodic test restores. A Docker volume is persistence, not a backup.

### 14.6 Certificate operations

`[PRODUCTION]`

```sh
sudo certbot certificates
sudo certbot renew --dry-run
sudo systemctl list-timers --all | grep -Ei 'certbot|letsencrypt'
```

After an actual renewal, the deploy hook reloads Nginx inside `proxy`. No Compose restart and no certificate copy are required.

## 15. Acceptance Criteria

The migration is complete only when:

- A clean checkout plus ignored per-environment config can build the same application/proxy images locally and in production.
- The developer workstation is the sole local application host; Docker, the browser, mkcert, the repository, and local named volumes run there without a VM dependency.
- Citizen selects `docker-local.json` locally and `docker-production.json` in production by exact container hostname.
- Citizen's expected `/site/app`, `web`, `logs`, and `node_modules` layout is preserved.
- No secret, private certificate, CA private key, environment file, or database dump exists in Git or any image layer.
- Local HTTPS works at `https://dev.jaysylvester.com` without browser warnings or manual certificate copying.
- `scripts/local-up` generates/checks local certificates before starting Nginx.
- Production keeps the existing Let's Encrypt certificate, public HTTPS, automatic renewal, and post-renewal Nginx reload.
- Only proxy ports 80/443 are publicly exposed in production; PostgreSQL is bound only to `127.0.0.1:5432` for the SSH/Postico connection.
- Each live database was restored from its own final `pg_dump` into a separate named volume.
- Schema, rows, maximum IDs, sequences, extensions, and application queries match their respective live source databases.
- Existing routes—not custom health routes—pass startup and post-deployment smoke tests.
- Contact email works in both intended environments without exposing credentials.
- Postico reaches local PostgreSQL at `127.0.0.1:5432` and production PostgreSQL through the existing SSH connection to remote `127.0.0.1:5432`.
- Database and log data survive container recreation.
- Local logical backups are stored outside the repository and a restore into a disposable Compose project has passed.
- Local and production rollback procedures have been rehearsed without deleting Docker volumes.
- Production's SSH, `git pull`, Compose deployment, backup, and certificate-renewal commands are documented in the README.
- The old production services are retained, stopped but recoverable, through the agreed observation period.
- The VM-wide retirement checklist is empty, the powered-off observation period has passed, and the local VM, obsolete hosts entry, SSH alias, virtual disks, snapshots, shared folders, and port-forwarding rules have been removed.

## 16. References

- Citizen configuration: `node_modules/citizen/README.md`.
- Citizen config loader: `node_modules/citizen/init/config.js`.
- Citizen startup merge: `node_modules/citizen/lib/server.js`.
- mkcert official repository and installation guidance: <https://github.com/FiloSottile/mkcert>
- Docker Compose production overrides: <https://docs.docker.com/compose/how-tos/production/>
- Docker Compose merge behavior: <https://docs.docker.com/compose/how-tos/multiple-compose-files/merge/>
- Docker Compose startup ordering: <https://docs.docker.com/compose/how-tos/startup-order/>
- Docker Desktop on macOS: <https://docs.docker.com/desktop/setup/install/mac-install/>
- Docker Desktop on Windows: <https://docs.docker.com/desktop/setup/install/windows-install/>
- Docker Engine on Debian: <https://docs.docker.com/engine/install/debian/>
- Docker Engine on Ubuntu: <https://docs.docker.com/engine/install/ubuntu/>
- Certbot renewal and deploy hooks: <https://eff-certbot.readthedocs.io/en/stable/using.html>
- Let's Encrypt port 80 guidance: <https://letsencrypt.org/docs/allow-port-80/>
- PostgreSQL versioning policy: <https://www.postgresql.org/support/versioning/>
- PostgreSQL `pg_dump`: <https://www.postgresql.org/docs/current/app-pgdump.html>
