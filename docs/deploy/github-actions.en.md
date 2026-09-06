# Deploy: GitHub Actions → VPS

Push to `main` runs `.github/workflows/prod-deploy.yml`: the `quality` gate (gates, lint,
typecheck, test), then `reusable-deploy-config.yml` builds the image in CI, pushes it to GHCR,
copies the repo to the server and (re)starts the Docker stack. A stage environment is the same
caller workflow with `develop`, `api_env: stage` and `.env.stage`.

Related: CI notifications, Lighthouse, secret scan —
[`ci-notifications-lighthouse.ru.md`](./ci-notifications-lighthouse.ru.md) (RU); memory limits and
blue/green — [`hardening-playbook.ru.md`](./hardening-playbook.ru.md) (RU); backups —
[`mongo-backups.ru.md`](./mongo-backups.ru.md) (RU).

## Workflow inputs

| Input | Description |
|---|---|
| `domain` | Target domain (`app.example.com`), used by nginx and certbot |
| `api_env` | `stage` or `prod` |
| `env_file` | Env file path on the server (`.env.stage`, `.env.prod`) |
| `env_public` | Public (non-secret) env lines from the caller's **Variables** (`${{ vars.WEB_ENV_PUBLIC_PROD }}`). Appended after the `env` secret, so it wins on overlap (overlaps are printed by name). Names ending in `_SECRET/_PASSWORD/_TOKEN/_KEY…` fail the deploy — Variables are not masked in logs. Empty = everything still comes from the secret |
| `doctor_check_enabled` | Run `pnpm doctor:<api_env>` on the assembled env file in CI before touching the server. Catches `localhost` inside a container, missing keys, inconsistent flags |
| `nginx_mode` | `http` or `https` |
| `certbot_test_mode` | Use the Let's Encrypt staging CA |
| `certbot_email` | Email for Let's Encrypt (a real one, or certbot refuses) |
| `migrations_run` | Run DB migrations on deploy |
| `blue_green_enabled` | Validate the new api in a green container before swapping |
| `deploy_mode` | `default` = build on the server; `registry` = build in CI, image from GHCR (recommended) |
| `node_version` | Node in CI; must match `.docker/Dockerfile` |
| `registry_subname` | GHCR image name fragment (`web` → `ghcr.io/owner/web:sha`) |
| `notify_enabled`, `tag` | Telegram deploy notifications and their hashtag |
| `redis_enabled`, `mongo_enabled`, `worker_enabled`, `metrics_enabled` | Which containers to run. `mongo_enabled: false` = external cluster via `MONGO_URI` |
| `mongo_backup_enabled`, `mongo_backup_cron`, `mongo_backup_retention` | Nightly `mongodump` cron for the local mongo |
| `server_memory_mb`, `*_mem_limit` | Memory budget; per-container limits are derived from the total (`scripts/lib/memory-limits.sh`). Below ~4 GB keep metrics off |
| `grafana_admin_user`, `grafana_admin_password` | Grafana credentials (or pass as secrets) |

## Workflow secrets

| Secret | Description |
|---|---|
| `server_host`, `server_username`, `server_password` | SSH access to the VPS |
| `env` | Contents of the env file (appended to `env_file` on the server). One secret per environment, e.g. `WEB_ENV_PROD` |
| `database_certificate` | Optional DB certificate |
| `ghcr_username`, `ghcr_token` | For `deploy_mode: registry`; the token needs `read:packages` |
| `tg_token`, `tg_chat_id`, `tg_thread_id` | Telegram bot and chat (prefix group ids with `-100`). The same repository secrets `TG_TOKEN` / `TG_CHAT_ID` / `TG_THREAD_ID` feed the PR / review / CI-failure / Lighthouse notifications |
| `grafana_admin_user`, `grafana_admin_password` | Optional, instead of inputs |
| `certbot_email` | Optional, instead of the input |

## Domain and DNS

Add an **A record** at your registrar: name `app` (for `app.yourdomain.com`) or `@` (root), value
= the VPS public IP, TTL 300–3600. Check propagation with `dig app.yourdomain.com`.

## VPS requirements

- Ubuntu 22.04 LTS or newer; Docker Engine and Docker Compose (v2 plugin or legacy v1 — the scripts
  detect both, see [`docker-compose-v2.ru.md`](./docker-compose-v2.ru.md)).
- 2+ vCPUs and 4+ GB if the metrics stack is on; 1 vCPU / 2 GB is enough for app + nginx + DB.
- Firewall: 22 (SSH), 80 (certbot challenge, redirect), 443:

  ```bash
  sudo ufw allow 22 && sudo ufw allow 80 && sudo ufw allow 443 && sudo ufw enable
  ```

- Docker Hub rate limits: `docker login` on the server with an account or access token.

## Manual monitoring on the server

```bash
top / htop                           # CPU
free -h                              # memory
df -h; sudo du -h /var/lib/docker | sort -h | tail   # disk
docker ps -a; docker stats           # containers
docker logs -f api-service           # app logs (core-nginx-service, grafana, …)
sudo journalctl -xe; sudo journalctl -u docker
```

With `metrics_enabled: true` Grafana at `https://<domain>/grafana` shows CPU, memory, disk, nginx and
application logs.

## Mongo backups (local mongo)

Nightly `mongodump` for deploys with `mongo_enabled: true`; the cron is installed and removed by
the deploy itself. Design and restore — [`mongo-backups.ru.md`](./mongo-backups.ru.md).

```bash
ENV_FILE=.env.prod API_ENV=prod ~/app/scripts/backup-mongo.sh        # manual backup
ls -lh ~/db-backups/ && crontab -l | grep bp-mongo-backup             # list, check the cron
ENV_FILE=.env.prod ~/app/scripts/restore-mongo.sh ~/db-backups/mongo_prod_<stamp>.archive.gz   # DESTRUCTIVE
```

## Troubleshooting

| Problem | What to do |
|---|---|
| Certbot: "example@example.com is an invalid email" | Set the `CERTBOT_EMAIL` secret or the `certbot_email` input |
| nginx: broken or leftover containers, wrong names | On the server: `./scripts/local-containers-run.sh clean`, then redeploy |
| MongoDB: registration fails, "Access control is not enabled", wrong user/password | Mongo init runs only on the first start with an empty volume. Remove the volume, fix `MONGO_USER`/`MONGO_PASSWORD` in the `env` secret, redeploy. See [FAQ](../start/faq.en.md#mongodb-wrong-init-data) |
| `MONGO_URI=mongodb://localhost…` on the server | Inside the api container `localhost` is the api. Use the service name `mongo`; the pre-deploy doctor rejects loopback |
| Env vars missing in the container | The `env` secret must contain every key; redeploy so the env file is recreated |
| Deploy fails on "pull denied" | The GHCR token on the server lacks `read:packages` or package access. Nothing was stopped: the pull is a preflight |
| Disk full: many ghcr.io images | The deploy prunes old images; manually `./scripts/local-containers-run.sh prune-images` |
| Build: "no space left on device" | `prune-images`, `docker system prune -a -f`, or `deploy_mode: registry` |
| Metrics stack overloads a small VPS (CPU 100 %, Grafana 502 / restart loop) | `metrics_enabled: false`, or a bigger box with the real `server_memory_mb` |

Step-by-step recipes: [`../start/faq.en.md`](../start/faq.en.md) · [RU](../start/faq.ru.md).

## Status pages

[Docker](https://www.dockerstatus.com/) · [npm](https://status.npmjs.org/) · [GitHub](https://www.githubstatus.com/) ·
[TimeWeb](https://timeweb.cloud/live) · [DigitalOcean](https://status.digitalocean.com/) · [Firebase](https://status.firebase.google.com/)

Security checks for a deployed site: [Mozilla Observatory](https://developer.mozilla.org/en-US/observatory) ·
[SSL Labs](https://www.ssllabs.com/ssltest/).
