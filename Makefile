# Local dev: MongoDB + optional nginx proxy (docker-compose.dev.yml)

# None of these are files. Without this, a directory named e.g. `gates` would silently make the
# target «up to date» and the command would stop running with no error anywhere.
.PHONY: setup up-local down-local worker-local gates

# Compose v1/v2 compatibility: prefer the v2 plugin, fall back to the legacy binary.
DOCKER_COMPOSE ?= $(shell docker compose version >/dev/null 2>&1 && echo "docker compose" || echo "docker-compose")

COMPOSE_DEV = NGINX_MODE=http DOMAINS=tg-mini-app.local,www.tg-mini-app.local FIRST_DOMAIN=tg-mini-app.local $(DOCKER_COMPOSE) --env-file .env.local -f docker-compose.dev.yml

# Set up / refresh the LOCAL environment. Idempotent — run after every git pull: tops up new keys
# from .env.example and fills only EMPTY values, never touches non-empty ones. One-shot fork
# renaming is a different job: scripts/init-project.sh.
setup:
	./scripts/setup-local.sh

# Repository-wide gates (scripts/check-*.mjs): agent contract size, eslint-disable ratchet.
gates:
	pnpm run gates

up-local:
	$(COMPOSE_DEV) up -d

down-local:
	$(COMPOSE_DEV) down

# Second terminal after `pnpm run dev:local`: BullMQ background worker (scripts/worker.ts).
# Needs REDIS_URL in .env.local (e.g. redis://127.0.0.1:6380 from docker-compose.dev.yml).
worker-local:
	pnpm run worker:local
