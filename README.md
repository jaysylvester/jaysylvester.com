# jaysylvester.com

Personal site built with citizen 2.0. Development and production run Node.js,
PostgreSQL, and Nginx through Docker Compose.

## Development

Open <https://dev.jaysylvester.com>. The local hostname must resolve to
`127.0.0.1`; `scripts/dev` creates or refreshes its ignored `mkcert` certificate.
On the first start with no database volume, it also asks for a `postgres`
administrator password at a hidden prompt. The one-off initializer creates the
existing `jaysylvester` application role with the password already in `.env`,
then removes the administrator password from the normal container configuration.

```sh
./scripts/dev start             # Start attached to live logs
./scripts/dev start --build     # Rebuild images, then start
./scripts/dev stop              # Stop while retaining containers
./scripts/dev restart
./scripts/dev status
./scripts/dev logs              # Follow retained and new logs
./scripts/dev test
./scripts/dev destroy           # Remove containers/network; keep volumes
./scripts/dev postgres-password # Change the postgres password at hidden prompts
./scripts/dev compose ARGS      # Raw development Compose command
```

`start` remains attached; Ctrl+C stops the stack. Run status, tests, and other
commands from another terminal. Host Node and npm are not required, although
the existing npm development commands remain as aliases.

Application source, `citizen.config.js`, and `.env` are mounted into the app.
After changing `.env` or `citizen.config.js`, restart the app and rerun the smoke
test:

```sh
./scripts/dev compose restart app
./scripts/dev test
```

If an app or assets container is recreated, recreate the proxy afterward so
Nginx resolves the current container address. Ordinary source changes handled
by the running watchers do not require this.

```sh
./scripts/dev compose up -d --no-deps --force-recreate proxy
```

citizen file logs are available under `logs/`. Postico connects to
`127.0.0.1:${DB_CLIENT_PORT:-5432}`.

Use `postgres` for administration; keep its password in Postico/password manager.
The existing `jaysylvester` app login and password remain, with CRUD-only privileges.
Existing environments need the [role migration](docs/migrations/database-app-role.md)
before using the separated Compose configuration.

### Running alongside other projects

Only one stack can own loopback 80/443, so two projects cannot both publish them.
To run several dev stacks at once, set `DEV_EDGE=true` in `.env`. `scripts/dev` then
adds `compose.dev.edge.yaml`, which drops the proxy's published ports and joins the
shared `dev-edge` network as `jaysylvester-proxy`; a single edge proxy in
`~/Projects/dev-edge` (outside every repository) owns 80/443 and forwards each
`dev.*` hostname to its project by TLS server name. `scripts/dev start` starts the
edge for you if it isn't running, and Docker restarts it after a reboot; see
`~/Projects/dev-edge/README.md` for the manual commands and how to add a project.

Leave `DEV_EDGE` unset to run this project standalone with its own published ports;
a fresh clone needs nothing from the edge. Each project's `DB_CLIENT_PORT` must
differ (5432 here) so the databases can be published at the same time.

### Database backup and restore

Backups are stored in a protected directory outside the repository. Set
`DEV_DB_BACKUP_PARENT` to override the default location.

```sh
./scripts/dev db-backup
./scripts/dev stop
export POSTGRES_VOLUME=jaysylvester-postgres-restore-YYYYMMDD
./scripts/dev db-restore /absolute/path/to/backup.dump
```

Restore validates the archive, requires interactive `RESTORE` confirmation,
and only writes to an empty database. Stop app/proxy first and select a new
`POSTGRES_VOLUME`; the populated volume remains intact as the rollback copy.
After accepting the restored database, put its volume name in `.env`. The
PostgreSQL volume survives both `stop` and `destroy`.

### Theme testing

The site follows the operating-system theme. Temporarily override it in the
browser console:

```js
document.documentElement.dataset.theme = 'dark'
document.documentElement.dataset.theme = 'light'
delete document.documentElement.dataset.theme
```

## Production

Connect and enter the checkout:

```sh
ssh jaysylvester.com
cd /var/www/jaysylvester.com
```

Deploy the latest `main`:

```sh
./scripts/prod deploy
```

Deployment requires a clean `main` checkout, pulls with `--ff-only`, builds the
app and proxy images, recreates app before proxy, and runs the production smoke
test. It does not recreate PostgreSQL.

Operational commands:

```sh
./scripts/prod start             # Detached; safe to log out afterward
./scripts/prod stop
./scripts/prod restart
./scripts/prod status
./scripts/prod logs
./scripts/prod test
./scripts/prod postgres-password # Change the postgres password at hidden prompts
./scripts/prod compose ARGS      # Raw production Compose command
```

There is intentionally no production `destroy` command. Production services
use `restart: unless-stopped`; Docker replaces the former PM2 supervision.

Postico connects to production `127.0.0.1:5432` through its SSH tunnel. To test
certificate renewal and the proxy reload hook:

```sh
sudo certbot renew --dry-run --run-deploy-hooks --no-random-sleep-on-renew
```

## Configuration notes

- `citizen.config.js` contains typed, non-secret citizen, database, and mail
  settings.
- The ignored `.env` contains secrets and deployment-specific inputs.
- Development loads `.env` directly. Production exposes passwords only through
  service-scoped Compose secret files.
- CORS is intentionally unset and fails closed because the site has no
  cross-origin browser client.
- Normal deployments use the citizen revision pinned in `package-lock.json`;
  refreshing citizen is a separate reviewed change.

Detailed migration history and recovery procedures remain in
[the Docker migration plan](docs/plans/docker-migration.md) and
[the citizen 2.0 migration record](docs/migrations/citizen-2.md).
