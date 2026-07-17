# Local dev: MongoDB + optional nginx proxy (docker-compose.dev.yml)

# Compose v1/v2 compatibility: prefer the v2 plugin, fall back to the legacy binary.
DOCKER_COMPOSE ?= $(shell docker compose version >/dev/null 2>&1 && echo "docker compose" || echo "docker-compose")

COMPOSE_DEV = NGINX_MODE=http DOMAINS=tg-mini-app.local,www.tg-mini-app.local FIRST_DOMAIN=tg-mini-app.local $(DOCKER_COMPOSE) --env-file .env.local -f docker-compose.dev.yml

up-local:
	$(COMPOSE_DEV) up -d

down-local:
	$(COMPOSE_DEV) down

# Second terminal after `pnpm run dev:local`: BullMQ background worker (scripts/worker.ts).
# Needs REDIS_URL in .env.local (e.g. redis://127.0.0.1:6380 from docker-compose.dev.yml).
worker-local:
	pnpm run worker:local
