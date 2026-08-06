# syntax=docker/dockerfile:1

FROM node:24-bookworm-slim AS dependency-installer

RUN apt-get update \
    && apt-get install --yes --no-install-recommends ca-certificates git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /site

COPY package.json package-lock.json ./
RUN npm ci


FROM dependency-installer AS production-dependency-installer

RUN npm prune --omit=dev


FROM node:24-bookworm-slim AS runtime

RUN groupadd --gid 10001 site \
    && useradd --uid 10001 --gid 10001 --create-home --shell /usr/sbin/nologin site \
    && install -d -o 10001 -g 10001 /site/logs

WORKDIR /site

COPY --chown=10001:10001 package.json package-lock.json gulpfile.js ./
COPY --chown=10001:10001 app ./app
COPY --chown=10001:10001 web ./web

EXPOSE 8080

USER 10001:10001


FROM runtime AS development

COPY --chown=10001:10001 eslint.config.js ./
COPY --from=dependency-installer --chown=10001:10001 /site/node_modules ./node_modules

CMD ["node", "app/start-dev.js"]


FROM runtime AS production

COPY --from=production-dependency-installer --chown=10001:10001 /site/node_modules ./node_modules

CMD ["node", "app/start.js"]
