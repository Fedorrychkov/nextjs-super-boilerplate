# Local dev: MongoDB + optional nginx proxy (docker-compose.dev.yml)
COMPOSE_DEV = NGINX_MODE=http DOMAINS=tg-mini-app.local,www.tg-mini-app.local FIRST_DOMAIN=tg-mini-app.local docker-compose --env-file .env.local -f docker-compose.dev.yml

up-local:
	$(COMPOSE_DEV) up -d

down-local:
	$(COMPOSE_DEV) down
