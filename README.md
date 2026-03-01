# Production Ready Next App Boilerplate

Minimal Next.js template with deploy (GitHub Actions), optional Docker stack (nginx, certbot, Redis, MongoDB, metrics), and auth + UI kit example.

**Detailed article:** [RU](https://github.com/Fedorrychkov/fedorrychkov/blob/main/articles/standalone-nextjs-production-ready-boilerplate/ARTICLE_RU.md) · [EN](https://github.com/Fedorrychkov/fedorrychkov/blob/main/articles/standalone-nextjs-production-ready-boilerplate/ARTICLE_EN.md)

## Demo

[View demo](https://nextjs-super-boilerplate.visn-ai.io)

---

## Local run

1. Install dependencies: `pnpm install` (or `npm install` / `yarn`).
2. Copy env: `cp .env.example .env.local` and set values (JWT, MongoDB, etc.).
3. (Optional) Start local MongoDB: `make up-local` — runs mongo from `docker-compose.dev.yml`. Use `MONGO_HOST=localhost` in `.env.local` when the app runs on the host. Stop: `make down-local`.
4. Start dev server: `pnpm run dev:local` (or `npm run dev:local`). App: http://localhost:3000.

To use an external MongoDB instead of local, set `MONGO_URI` in `.env.local` and skip step 3.

---

## Development

- **Lint:** `pnpm run lint` / `pnpm run lint:fix`
- **Typecheck:** `pnpm run typecheck`
- **Format:** `pnpm run format`

Requires **Node.js 22+** (see `package.json` engines). Lockfile in repo: `pnpm-lock.yaml` (no `package-lock.json`).

---

## Deploy

Deploy runs via GitHub Actions on push to the configured branch (`develop` → stage, `main` → prod). Workflow files: `.github/workflows/stage-deploy.yml`, `prod-deploy.yml`; shared logic: `reusable-deploy-config.yml`.

### Workflow parameters (inputs)

| Parameter | Description |
|-----------|-------------|
| `domain` | Target domain (e.g. `app.example.com`). Used by nginx and certbot. |
| `api_env` | Environment: `stage`, `prod`. |
| `env_file` | Env file path on server (e.g. `.env.stage`, `.env.prod`). |
| `nginx_mode` | `http` or `https`. |
| `certbot_test_mode` | Use Let's Encrypt staging (for testing). |
| `migrations_run` | Run DB migrations on deploy. |
| `blue_green_enabled` | Enable blue/green deployment. |
| `deploy_mode` | `default` = build on server; `registry` = build in CI, image from GHCR. |
| `node_version` | Node version in CI (e.g. `24`). Must match [.docker/Dockerfile](.docker/Dockerfile). |
| `registry_subname` | GHCR image name fragment (e.g. `web` → `ghcr.io/owner/web:sha`). |
| `notigy_enabled` | Telegram notifications (start/success/failure). |
| `tag` | Tag for Telegram messages. |
| `redis_enabled` | Start Redis container. |
| `metrics_enabled` | Start metrics stack (Prometheus, Grafana, Loki, etc.). |
| `mongo_enabled` | Start MongoDB container. If `false`, use `MONGO_URI` for external cluster. |
| `certbot_email` | Email for Let's Encrypt. |
| `grafana_admin_user` | Grafana admin user (when metrics enabled). |
| `grafana_admin_password` | Grafana admin password (when metrics enabled). |

### Workflow secrets

| Secret | Description |
|--------|-------------|
| `server_host` | Deploy server hostname or IP. |
| `server_username` | SSH username. |
| `server_password` | SSH password. |
| `env` | Contents of env file (appended to `env_file` on server). Use different secrets for stage/prod. |
| `database_certificate` | (Optional) DB certificate/key. |
| `ghcr_username`, `ghcr_token` | For `deploy_mode: registry` (GitHub Container Registry). |
| `tg_token`, `tg_chat_id`, `tg_thread_id` | Telegram bot and chat (if notifications enabled). For groups/supergroups, prefix chat id with `-100`. |
| `grafana_admin_user`, `grafana_admin_password` | (Optional) Pass via secrets instead of inputs. |

---

## Domain and DNS (A record)

1. **Buy a domain** (e.g. [Namecheap](https://www.namecheap.com), [Cloudflare](https://www.cloudflare.com/products/registrar/), [Reg.ru](https://www.reg.ru), or any registrar).
2. In the registrar’s DNS panel, add an **A record**:
   - **Name/host:** `app` (for `app.yourdomain.com`) or `@` (for root domain).
   - **Value:** your VPS public IP.
   - **TTL:** 300–3600 (or default).
3. Wait for propagation (from a few minutes to hours). Check: `dig app.yourdomain.com` or online DNS lookup tools.

Example: to serve the app at `app.myproject.com`, create A record `app` → `203.0.113.10` (your server IP).

---

## VPS requirements and setup

- **OS:** Ubuntu **22.04 LTS or newer** (recommended). The deploy scripts are tested on Ubuntu.
- **Docker & Docker Compose:** Required on the **server** for deploy. Install: [Docker Engine](https://docs.docker.com/engine/install/ubuntu/), [Docker Compose](https://docs.docker.com/compose/install/).
- **Local machine:** For running full stack or scripts that use Docker (e.g. `make up-local`, or deploy scripts if you run them locally), you need **Docker** and **docker-compose** installed and the Docker daemon running.

### Docker Hub rate limits

When the server (or CI) pulls many images, you can hit Docker Hub rate limits. To avoid that:

1. Create a [Docker Hub](https://hub.docker.com) account.
2. On the **server**, log in: `docker login` (enter username and password or access token).
3. Optionally use a [personal access token](https://docs.docker.com/docker-hub/access-tokens/) instead of a password.

Authenticated users get higher pull limits. For heavy use, consider mirroring images or using a private registry.

### Firewall

Open these ports so the server is reachable and nginx/certbot work:

- **22** — SSH (for deploy and admin).
- **80** — HTTP (certbot challenge and redirect to HTTPS).
- **443** — HTTPS.

Example (UFW on Ubuntu):

```bash
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
sudo ufw status
```

---

## License

[MIT](./LICENSE).
