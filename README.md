# Production Ready Next App Boilerplate

Minimal Next.js template with deploy (GitHub Actions), optional Docker stack (nginx, certbot, Redis, MongoDB, metrics), and auth + UI kit example.

**Detailed article:** [RU](https://github.com/Fedorrychkov/fedorrychkov/blob/main/articles/standalone-nextjs-production-ready-boilerplate/ARTICLE_RU.md) · [EN](https://github.com/Fedorrychkov/fedorrychkov/blob/main/articles/standalone-nextjs-production-ready-boilerplate/ARTICLE_EN.md)

## Table of contents

- [Demo](#demo)
- [Local run](#local-run)
- [Development](#development)
- [Deploy](#deploy)
- [Infrastructure roadmap](#infrastructure-roadmap)
- [Domain and DNS](#domain-and-dns-a-record)
- [VPS requirements and setup](#vps-requirements-and-setup)
- [Bundle optimization and monitoring](#bundle-optimization-and-monitoring)
- [Troubleshooting](#troubleshooting)
- [License](#license)

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

### Connecting to MongoDB from your dev machine

When MongoDB runs inside Docker on the server (or locally via `docker-compose`), you can connect to it from your dev machine using either CLI or GUI tools.

- **From the server shell (inside Docker network)**:

  ```bash
  mongosh "mongodb://MONGO_USER:MONGO_PASSWORD@mongo:27017/MONGO_DB"
  ```

- **From your dev machine via SSH tunnel to the Mongo container IP (recommended when the port is not published)**:

  1. On the server, get the Mongo container IP in the `service-api-network`:

     ```bash
     docker inspect mongo | jq -r '.[0].NetworkSettings.Networks["service-api-network"].IPAddress'
     # example: 172.18.0.2
     ```

  2. On your dev machine, open an SSH tunnel:

     ```bash
     ssh -L 27017:172.18.0.2:27017 user@your-server
     ```

     where `172.18.0.2` is the IP from step 1.

  3. Then connect locally (CLI or GUI) using:

     ```text
     mongodb://MONGO_USER:MONGO_PASSWORD@localhost:27017/MONGO_DB?authSource=admin
     ```

- **MongoDB Compass example**:

  1. Open MongoDB Compass → `New Connection`.
  2. In the connection string field, paste:

     ```text
     mongodb://MONGO_USER:MONGO_PASSWORD@localhost:27017/MONGO_DB?authSource=admin
     ```

     (works if you have an SSH tunnel as above; for local docker-compose with published port `27017:27017` you can use the same string).
  3. Click `Connect` and verify that the `MONGO_DB` database is visible.

### Local HTTPS via nginx (self-signed certificate)

For local development you can run Next.js on the host (`pnpm run dev:local`) and put nginx in front of it with HTTPS and a self-signed certificate.

1. **Map local domain to localhost** (on your dev machine):

   ```bash
   # macOS / Linux
   sudo sh -c 'echo "127.0.0.1 tg-mini-app.local" >> /etc/hosts'
   ```

2. **Generate a self-signed certificate** for the local domain:

   ```bash
   ./scripts/local-containers-run.sh generate-local-cert stage -d tg-mini-app.local
   ```

   This will create:

   - `certs/self-signed/tg-mini-app.local/fullchain.pem`
   - `certs/self-signed/tg-mini-app.local/privkey.pem`

3. **Start local MongoDB (and nginx proxy) via Docker**:

   ```bash
   make up-local
   ```

   - `docker-compose.dev.yml` will:
     - run `mongo` for local development;
     - run `nextjs-nginx` which proxies requests to `host.docker.internal:3000`.

4. **Run the Next.js dev server on the host**:

   ```bash
   pnpm run dev:local
   ```

   You can now open:

   - `http://tg-mini-app.local` (HTTP)
   - `https://tg-mini-app.local` (HTTPS with self-signed cert — your browser will show a warning once, accept it).

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
 - **CPU recommendation:** For the full metrics stack (Prometheus + Grafana + Loki + exporters) use at least **2 vCPUs**. On a single‑core VPS the metrics stack can easily saturate CPU and disk I/O; consider running only the core app without metrics in that case.

### Manual monitoring on the server

On a running VPS (after deploy), you can quickly check CPU, memory, disk, and Docker containers with standard Linux tools.

- **CPU usage**

  ```bash
  # Overall usage (press q to exit)
  top

  # Nicer, grouped view (if installed)
  htop

  # Very compact per‑CPU stats
  mpstat 1 10        # from sysstat package
  ```

- **Memory usage**

  ```bash
  free -h            # total / used / free RAM and swap
  cat /proc/meminfo  # detailed breakdown (advanced)
  ```

- **Disk usage and I/O**

  ```bash
  df -h              # disk usage per filesystem
  df -h /            # quickly check root filesystem

  # Find heavy directories under /var/lib/docker (Docker data)
  sudo du -h /var/lib/docker | sort -h | tail

  # Realtime disk I/O per device (if installed)
  iostat -xz 1       # from sysstat package
  ```

- **Docker containers and their resources**

  ```bash
  docker ps -a                       # list all containers
  docker stats                       # live CPU/memory/IO for containers
  docker stats api-service grafana   # stats for specific containers

  docker logs -f core-nginx-service  # stream nginx logs
  docker logs -f app_grafana_1       # stream Grafana logs
  ```

- **System logs (Ubuntu)**

  ```bash
  # Journal (systemd)
  sudo journalctl -xe                # last errors with context
  sudo journalctl -u docker          # Docker daemon logs

  # Classic log files
  ls -lh /var/log
  tail -n 200 /var/log/syslog
  tail -n 200 /var/log/auth.log
  ```

For more advanced monitoring, you can enable the built‑in metrics stack (`metrics_enabled: true` in the deploy workflow) to get Prometheus + Grafana + Loki with dashboards for CPU, memory, disk, nginx, and application logs.

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

## Bundle optimization and monitoring

The template includes sensible defaults for bundle size, but you can further optimize and inspect what ships to the browser.

- **Analyze the bundle locally**

  ```bash
  # Build with Webpack + bundle analyzer
  pnpm run analyze     # or: npm run analyze
  ```

  This runs `next build --webpack` with `@next/bundle-analyzer` enabled (`ANALYZE=true`) and generates a report under `.next/diagnostics/analyze/`.  
  Open `index.html` from that folder in a browser to see a treemap of client and server bundles.

- **What to look for in the analyzer**

  - Large third‑party libraries (`framer-motion`, `cmdk`, `react-json-pretty`, `lucide-react`, etc.).
  - Components that pull many icons or demo UI into common chunks.
  - Pages that import heavy modules in layouts or shared providers.

- **Recommended techniques**

  - **Lazy‑load heavy, rarely used components** with `next/dynamic`:

    ```ts
    import dynamic from 'next/dynamic'

    const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
      ssr: false,
    })
    ```

  - **Keep heavy libs local to pages that need them** (e.g. `ui-kit` demo), instead of importing them in root layouts or global providers.
  - Use Next 16 `optimizePackageImports` (already enabled) to avoid importing entire packages when only a few exports are used:

    ```ts
    // next.config.ts (already configured)
    experimental: {
      optimizePackageImports: ['framer-motion', 'cmdk', 'lucide-react'],
    }
    ```

  - Prefer native JS or small utilities over pulling full `lodash` when possible.

- **HTTP‑level optimizations (already wired)**

  - Nginx configs enable **gzip** for JS/CSS/HTML/fonts.
  - Static Next.js assets under `/_next/static/` are served with:

    ```text
    Cache-Control: public, max-age=2592000, immutable
    ```

    which leverages hashed filenames for long‑lived browser caching.

- **Metrics stack resource considerations**

  - The full metrics stack (Prometheus, Grafana, Loki, Promtail, Telegraf, exporters) is quite heavy for a **single‑core VPS**.  
    On 1 vCPU you may see frequent 80–100% CPU usage and high disk I/O when exploring logs or wide time ranges in Grafana.
  - Recommended configurations:
    - **Small VPS (1 vCPU, <2 GB RAM):** run only core services (nginx + app + DB). Keep `metrics_enabled: false` in deploy workflows and use manual CLI monitoring (`top`, `docker stats`, `journalctl`, etc.).
    - **Diagnostics mode on small VPS:** temporarily enable `metrics_enabled: true`, keep Grafana queries narrow (short time ranges, filtered by container), disable system log scraping in Promtail/Telegraf, then turn metrics off again when done.
    - **Normal monitoring:** for always‑on metrics/logs, use **2+ vCPUs** and enough disk. On such servers you can safely increase detail: lower `scrape_interval` in `grafana/prometheus/prometheus.yml` and enable additional log/system inputs in `grafana/promtail-config.yml` and `grafana/telegraf/telegraf.conf` if you need more granular data.


## Troubleshooting

Common issues and fixes are described in the FAQ (see links above). Summary:

| Problem | What to do |
|--------|------------|
| **Certbot:** "example@example.com is an invalid email" | Use a real email: set GitHub secret `CERTBOT_EMAIL` or `certbot_email` in the workflow. |
| **Nginx:** Broken or leftover containers, wrong names | On the server run `./scripts/local-containers-run.sh clean`, then redeploy or run `https` again. |
| **MongoDB:** Registration fails, "Access control is not enabled", wrong user/password | Mongo init runs only on first start with empty data. Remove mongo volume, fix `MONGO_USER`/`MONGO_PASSWORD` in the GitHub `env` secret, then redeploy. See [FAQ](./docs/FAQ_EN.md#mongodb-wrong-init-data). |
| **Env vars not in container** | Ensure the GitHub secret for `.env` content (e.g. `WEB_ENV_PROD`) includes all keys; redeploy so `.env.prod` is recreated. |
| **No styles on prod** | Do not exclude `.next`/`out`/`build` from the image; they are built inside the Dockerfile. |
| **Disk full: many ghcr.io images** | After each deploy the workflow prunes old app images on the server. To run manually: `./scripts/local-containers-run.sh prune-images`. For GHCR, see [FAQ](./docs/FAQ_EN.md#cleaning-old-docker-images). |
| **Build: "no space left on device"** | Free disk on the server: `./scripts/local-containers-run.sh prune-images`, then `docker system prune -a -f`. Or use `deploy_mode: registry` to build in CI. See [FAQ](./docs/FAQ_EN.md#build-on-server-no-space-left-on-device). |
| **Metrics stack overloads 1‑core VPS (CPU 100%, 502 on Grafana)** | Either disable metrics (`metrics_enabled: false`) and use only core services, or move to a VPS with 2+ vCPUs. If metrics must run on 1 vCPU, keep Prometheus scrape intervals high, limit Promtail/Telegraf inputs, and keep Grafana queries short and filtered. |

For step-by-step instructions (Mongo reset, clean script, certbot email), see [docs/FAQ_RU.md](./docs/FAQ_RU.md) or [docs/FAQ_EN.md](./docs/FAQ_EN.md).

---

## Infrastructure roadmap

For a high-level overview of the current deployment approach and two evolution paths:

- **Plan A – Hardened single-server stack (Terraform + better ops)**
- **Plan B – Cluster-ready Kubernetes stack (K8s + ingress + GitOps)**

see:

- English: [`INFRASTRUCTURE_PLAN.md`](./INFRASTRUCTURE_PLAN.md)
- Russian: [`INFRASTRUCTURE_PLAN_RU.md`](./INFRASTRUCTURE_PLAN_RU.md)

---

## License

[MIT](./LICENSE).
