# Citizen 1.x to 2.0 migration record

Status: the original Citizen 2.0 environment-mapping implementation was superseded
upstream. The project-configuration-module transition and revised development Docker
acceptance passed on 2026-08-09. Production remains on its pre-migration host revision
until the coordinated Phase 2 Docker cutover.

## Framework source

- Target dependency: `git+https://github.com/jaysylvester/citizen.git#2.0-project-config-module`
- Upstream commit reviewed on 2026-08-09: `6bc03c6c7c906317954d5c02493fefc7dd70f8d4`
- Superseded accepted dependency commit: `49476d1102672d12696d1fa96bc23966e198ec80` from `2.0-env-file-config-revised`
- Citizen version at that commit: `2.0.0`
- Review result: 34 native tests passed under Node.js 22 and Node.js 24.
- Application lockfile: direct HTTPS branch dependency resolving exact commit `6bc03c6c7c906317954d5c02493fefc7dd70f8d4`.
- No Citizen source may be patched in this application or its images.

The HTTPS branch name remains in `package.json`; the exact commit in
`package-lock.json` is the reproducible `npm ci` input. Test the upstream commit before
refreshing the application lockfile and confirm both commits match.

## Revised configuration mapping

| Citizen 1.x source | Citizen 2.0/application target | Notes |
| --- | --- | --- |
| `host` | Removed | Deployment selection comes from the deployment's `.env` and Compose files. |
| `citizen.http.hostname` | `citizen.config.js` `http.hostname` | Set to `''` because development and production both run Citizen in Docker; proxy publishing controls host exposure. |
| `citizen.http.port` | `citizen.config.js` `http.port` | Typed number `8080` in both containers. |
| `citizen.layout.controller` | `citizen.config.js` `layout.controller` | Typed and exposed as `app.config.layout.controller`. |
| `citizen.templateEngine` | `citizen.config.js` `templateEngine` | Typed and exposed as `app.config.templateEngine`. |
| Startup mode | `.env` `NODE_ENV` | `development` on the Mac; `production` on the production Docker host. |
| Docker Desktop watcher | `citizen.config.js` `development.watcher` | Set `usePolling: true` and `interval: 500` as typed values. |
| `citizen.cors` | `citizen.config.js` `cors` | Keep the headers typed; read required deployment-specific `CORS_ALLOW_ORIGIN` from `.env`. |
| `db.*` | Development `.env`; production nonsecret environment plus Compose password secret | Application-owned values read through `requiredEnvironment(name, type)`; numeric values must be finite. |
| Existing/default database host | `.env` `DB_HOST` | `db` in both Docker deployments. |
| PostgreSQL server timezone | `.env` `POSTGRES_TIMEZONE` | Passed only to `db` as `TZ` before first initialization. |
| `mail.*` | Development `.env`; production nonsecret environment plus Compose password secret | Application-owned values read at the transport/contact consumers. |

No controller-level CORS configuration is needed. Citizen merges optional
controller/action overrides over the global config-module baseline and supports
`cors: false` where a route must opt out.

## Project configuration module transition plan

1. Retest the exact upstream branch commit under Node.js 22 and Node.js 24, update the HTTPS Citizen dependency, deliberately refresh the lockfile, and record the resolved commit.
2. Add committed root `citizen.config.js` with the typed HTTP, layout, template-engine, CORS, and development-watcher settings above. Import the existing environment helper only for `CORS_ALLOW_ORIGIN`; the helper must remain independent of initialized Citizen state.
3. Copy `citizen.config.js` to `/site` in the image and bind-mount it read-only in development so changes need an app restart, not `dev:build`.
4. Make `compose.yaml` neutral about application password delivery. Remove its entire current `app.environment` block and all app/database secret grants; development and production overlays supply their own environment and password mechanisms.
5. In `compose.dev.yaml`, restore `app.env_file: .env` and pass `DB_PASSWORD` to PostgreSQL as `POSTGRES_PASSWORD`. Do not use Compose secrets in normal development. Citizen should report that no project `.env` was loaded and that it is using the process environment, then report the loaded config module.
6. Remove every obsolete framework variable from the real protected development `.env` as well as `.env.example` and Compose. Add `NODE_ENV=development` and `CORS_ALLOW_ORIGIN`; keep the DB, mail, PostgreSQL, and asset variables.
7. Extend the single `requiredEnvironment(name, type)` helper with a `secret` type. It reads `${name}_FILE` when set, otherwise the named environment variable. Change both password consumers to that interface and remove the separate `requiredSecret` export.
8. In `compose.production.yaml`, explicitly pass only nonsecret DB/mail/application values, set `DB_PASSWORD_FILE` and `MAIL_AUTH_PASS_FILE` to service-scoped Compose secret paths, and use `POSTGRES_PASSWORD_FILE` for `db`. Define the two secrets from the protected production `.env`; do not give the file or secrets to `assets` or `proxy`.
9. Rebuild once for the dependency, Dockerfile, and Compose changes. Verify the normal development flow plus one focused production-target startup using dummy Compose secrets so the file-secret branch is tested before deployment.
10. Update the README and this record with the exact lock, commands, startup evidence, and results. Do not carry the container-oriented revision through the existing host-run production process.
11. During Phase 2, create the production `.env` with `NODE_ENV=production`, `DB_HOST=db`, the inventoried CORS origin, existing DB/mail credentials, and rehearsed PostgreSQL initialization settings. Compose uses it for interpolation and secret sources, but does not inject or mount the whole file into `app`. Deploy it and `citizen.config.js` with the app/proxy/database containers in one maintenance-window cutover.

The intended module shape is:

```js
import { requiredEnvironment } from './app/helpers/utility.js'

export default {
  cors: {
    'Access-Control-Allow-Origin': requiredEnvironment('CORS_ALLOW_ORIGIN'),
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
  },
  development: {
    watcher: {
      interval: 500,
      usePolling: true
    }
  },
  http: {
    hostname: '',
    port: 8080
  },
  layout: {
    controller: '_layout'
  },
  templateEngine: 'handlebars'
}
```

## Application behavior retained from the accepted migration

- Both start files use flat `app.config.directories.app` and call `app.start()` with no arguments.
- PostgreSQL pool options and the production mail transport are constructed from explicit application inputs; numeric PostgreSQL values are validated as finite.
- Citizen auto-discovers `app/helpers/utility.js`, and consumers use `app.helpers.utility` after startup.
- Contact addresses are read from the application environment where mail is sent.
- Development logging and PostgreSQL pool errors use the documented `app.log()` export.
- Framework mode reads use `app.config.mode` in JavaScript and `config.mode` in views.
- Application-owned cache-buster values live under `app.toolbox.cacheBuster` and are passed to `_head` as response data.
- Legacy JSON is excluded from images and rejected if it reappears in the active application.
- Development mounts the whole `app/` directory and editor-visible root `logs/` directory without masking image-owned `node_modules`.
- Continuous app/proxy HTTP health checks remain absent; PostgreSQL readiness and explicit smoke tests cover the actual needs.
- Contact owner mail is awaited; a confirmation-only failure is logged without returning an error that encourages a duplicate owner submission.

## Verification state

The revised contract passed on 2026-08-09:

- Citizen's 34-test native suite passed under Node.js 22 and Node.js 24 at commit `6bc03c6c7c906317954d5c02493fefc7dd70f8d4`; the application lock resolves that same commit through HTTPS.
- Development and production Docker targets built successfully with `npm ci` from the refreshed lockfile.
- Development startup reported `No project .env loaded (optional); using the process environment.` and `Loaded Citizen configuration: /site/citizen.config.js`, discovered `app/helpers/utility.js`, and ran in development mode.
- The startup configuration showed typed port `8080`, empty HTTP hostname, `_layout`, `handlebars`, the development CORS origin, and watcher polling at 500 milliseconds.
- The development app received `.env` through `env_file`, PostgreSQL received only its explicit inputs plus `POSTGRES_PASSWORD`, and `assets` received no database or mail values. No `.env` file existed in the app container.
- A one-shot production-target image test used separate dummy database and mail Compose secrets. Both values were read through `requiredEnvironment(name, 'secret')` while `DB_PASSWORD` and `MAIL_AUTH_PASS` were absent from the container environment; an empty secret also produced its focused validation error.
- No obsolete `CITIZEN_*` application input or separate `requiredSecret` helper remains.
- The route/static/CORS smoke test passed after the full rebuild and again after restarting only `app`, confirming the bind-mounted config-module lifecycle without rebuilding or recreating proxy.
- ESLint passed for `app/` and `citizen.config.js` inside the development image.
- BrowserSync was subsequently moved behind development Nginx: its generated client targets `https://dev.jaysylvester.com/browser-sync` without port 3000, the polling endpoint returned HTTP 200, its Socket.IO path completed an HTTP 101 WebSocket upgrade, and the site smoke test still passed. Ports 3000/8282 are not published, the UI is disabled, `assets` has no certificate mount or TLS inputs, and the ignored leaf key is mode `0600` for Nginx alone.

The earlier accepted PostgreSQL restore/data comparison, trusted HTTPS, watchers,
BrowserSync, contact logging, helper HMR, lifecycle persistence, and isolated
backup/restore results remain evidence for the unchanged portions of the stack.

## Reusable lessons

- Use one convention per concern: stable typed Citizen behavior belongs in committed `citizen.config.js`; application/deployment values and secrets belong in ignored `.env` or the deployment environment.
- Citizen can receive application values either by loading a project `.env` or from the process environment populated before import. In development, Compose `env_file` intentionally uses the latter path; a config module may explicitly read a deployment-specific framework input, but must not expose secrets through `app.config`.
- `CITIZEN_APP_PATH` is the sole framework-owned environment variable and must be set before import; the conventional `/site/app` layout does not need it.
- A bind-mounted config-module edit needs only an app restart. Compose `env_file` values are fixed when the container is created, so a development `.env` edit requires app recreation followed by proxy recreation, but no image rebuild.
- Preserve the direct HTTPS dependency string and exact lockfile commit. GitHub shorthand can resolve to SSH, which breaks unauthenticated image builds.
- Keep each container's inputs narrow: development grants the full environment only to `app` and explicitly maps required PostgreSQL values into `db`; production injects a nonsecret app allowlist and grants password secrets only to their consumers. `assets` and `proxy` receive neither.
- Development passwords supplied by `env_file` and `POSTGRES_PASSWORD` are visible to operators with Docker inspection access. This is an accepted workstation simplicity tradeoff. Production Compose secrets keep password values out of container environments, while still remaining readable by the authorized application processes.
- Keep the one typed required-environment helper and reject non-finite numeric values before passing them to libraries.
- Bind-mount the whole `app/` directory in development so entrypoint changes cannot be hidden behind a stale image, while leaving Linux `node_modules` image-owned.
- Keep development logs editor-visible, logical PostgreSQL backups protected outside Docker, and normal stop/destroy commands volume-preserving.
- Terminate development TLS only at Nginx. Keep BrowserSync on the private Compose network, proxy its client and Socket.IO path under the trusted site origin, and do not grant the assets container the leaf key.
- In BrowserSync snippet mode, a same-origin script URL is not sufficient: explicitly set `socket.domain` to the externally visible HTTPS origin or the generated client will still connect to the internal BrowserSync port.
- Recreate Nginx after recreating the app—or the development assets container it proxies for BrowserSync—because workers may retain a removed container's IP; a simple container restart does not change that IP.
- Do not add continuous app/proxy probes without a concrete alerting or recovery consumer.
