# Local development

Day-to-day commands, local MongoDB, connecting to a server database from your machine, and local
HTTPS through nginx. First-time setup is in [getting-started.en.md](./getting-started.en.md).

## Commands

```bash
pnpm dev:local          # dev server with .env.local, http://localhost:3000
pnpm lint / lint:fix    # ESLint
pnpm typecheck          # tsc --noEmit
pnpm test               # node --test via tsx, no database or Redis needed
pnpm gates              # scripts/check-*.mjs (agent contract, ratchets, docs, env reference)
pnpm format             # prettier over src/**/*.ts
make up-local           # MongoDB (+ nginx proxy) from docker-compose.dev.yml; make down-local to stop
make worker-local       # BullMQ worker in a second terminal (needs REDIS_URL)
```

Requires Node.js 22+ (`package.json` engines; `.nvmrc` pins 24) and pnpm. The lockfile is
`pnpm-lock.yaml`.

Pre-commit (husky): `typecheck` + `lint-staged` + `lint:fix`. Pre-push: `typecheck` + `test`.

## Local MongoDB

`make up-local` starts `mongo` from `docker-compose.dev.yml` on the port it maps (see the file) and
an nginx proxy to `host.docker.internal:3000`. With the app running on the host use
`MONGO_HOST=localhost` (or a `MONGO_URI` pointing at localhost) in `.env.local`. For an external
cluster set `MONGO_URI` and skip the container.

## Connecting to a server MongoDB from your machine

When MongoDB runs inside Docker on the server, its port is not published. Use an SSH tunnel to the
container IP.

1. On the server, find the container IP in the compose network:

   ```bash
   docker inspect mongo | jq -r '.[0].NetworkSettings.Networks["service-api-network"].IPAddress'
   # example: 172.18.0.2
   ```

2. On your machine, open the tunnel:

   ```bash
   ssh -L 27017:172.18.0.2:27017 user@your-server
   ```

3. Connect (CLI or Compass):

   ```text
   mongodb://MONGO_USER:MONGO_PASSWORD@localhost:27017/MONGO_DB?authSource=admin
   ```

From the server shell itself: `mongosh "mongodb://MONGO_USER:MONGO_PASSWORD@mongo:27017/MONGO_DB?authSource=admin"`.

## Local HTTPS via nginx (self-signed certificate)

Run Next.js on the host and put nginx with a self-signed certificate in front of it.

1. Map a local domain to localhost:

   ```bash
   sudo sh -c 'echo "127.0.0.1 tg-mini-app.local" >> /etc/hosts'
   ```

2. Generate the certificate:

   ```bash
   ./scripts/local-containers-run.sh generate-local-cert stage -d tg-mini-app.local
   ```

   Creates `certs/self-signed/tg-mini-app.local/{fullchain,privkey}.pem`.

3. `make up-local` — starts MongoDB and the `nextjs-nginx` proxy.
4. `pnpm dev:local` — then open `http://tg-mini-app.local` or `https://tg-mini-app.local` (accept
   the self-signed warning once).

The domain is set in the `Makefile` (`COMPOSE_DEV`); `init-project.sh` renames it for a fork.

## Bundle size

`pnpm analyze:webpack` builds with the bundle analyzer; the report is under
`.next/diagnostics/analyze/`. What to look for and how to cut weight —
[`../develop/bundle-optimization.en.md`](../develop/bundle-optimization.en.md). CI enforces budgets
for public pages with Lighthouse.
