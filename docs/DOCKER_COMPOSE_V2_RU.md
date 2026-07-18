# Docker Compose v1 → v2: совместимость и чек-лист

Compose v1 (`docker-compose`, отдельный Python-бинарник) заменён на v2 (`docker compose`, плагин docker). Бойлерплейт поддерживает **обе версии одновременно**: все скрипты и CI сами определяют доступную и используют её.

## Что уже сделано в бойлерплейте

1. **Автоопределение версии** — в `scripts/lib/deploy-utils.sh`, `Makefile` и во всех script-блоках `reusable-deploy-config.yml`:

   ```sh
   if docker compose version >/dev/null 2>&1; then DOCKER_COMPOSE="docker compose"; else DOCKER_COMPOSE="docker-compose"; fi
   ```

   Все вызовы идут через `$DOCKER_COMPOSE`. Сами флаги (`up -d`, `stop`, `rm -f`, `exec -T`, `logs`, `restart`, `-f file.yml`) в v2 совместимы 1-в-1.

2. **Явные имена не зависят от версии.** Все сервисы в `docker-compose.local.yml` имеют явные `container_name:` (и `image:` где важно) — v1/v2-разница в автоименовании (`project_service_1` vs `project-service-1`) на них не влияет.

3. **Двойные фильтры образов.** Blue/green-cleanup ищет собранные образы и по `_`, и по `-`:

   ```sh
   docker images --filter "reference=app_new_*" --filter "reference=app_new-*" ...
   ```

   (несколько `--filter reference` работают как OR). Поправлено в `scripts/local-containers-run.sh` и в workflow.

4. **`version: '3.8'` удалён** из compose-файлов — v2 писал warning на каждый вызов.

5. **`COMPOSE_HTTP_TIMEOUT` оставлен** в CI: v2 его игнорирует (безвредно), v1 — использует.

## Установка Docker на сервере (с нуля)

Если сервер чистый — поставить Docker Engine + плагин compose v2 официальным скриптом (Ubuntu/Debian):

```sh
curl -fsSL https://get.docker.com | sh          # ставит docker + docker compose v2
sudo usermod -aG docker "$USER"                 # docker без sudo (перелогиниться после)
docker version && docker compose version        # проверка: обе команды отвечают
sudo systemctl enable --now docker              # автозапуск демона
```

На выходе доступна `docker compose` (v2, с пробелом). Бинарника `docker-compose` (v1, с дефисом)
скрипт НЕ ставит — если чужие скрипты/cron его зовут, добавь шим (см. ниже).

## Что сделать на сервере (не в репо)

**Шим вместо алиаса** — обязательно на каждом сервере, где остались чужие скрипты/cron с `docker-compose` (алиас не работает в скриптах, cron, CI, systemd):

```sh
sudo tee /usr/local/bin/docker-compose > /dev/null <<'EOF'
#!/bin/sh
exec docker compose "$@"
EOF
sudo chmod +x /usr/local/bin/docker-compose
docker-compose version   # должно показать v2.x
```

С автоопределением в скриптах БП шим не обязателен, но он страхует всё, что живёт вне репо.

## Грабли v2, о которых помнить

- **Лимиты памяти начинают реально работать.** v1 игнорировал `deploy.resources.limits` без `--compatibility`, v2 применяет всегда. После перехода контейнеры внезапно получают жёсткие лимиты → возможны OOM-kill'ы, которых раньше не было. В БП лимиты выставлены осознанно (`scripts/lib/memory-limits.sh` + inline-дефолты в compose), но перед переходом на живом проде сверь `docker stats` с лимитами в yml.
- **Именование по папке.** Имя compose-проекта берётся из имени папки в обеих версиях: один и тот же файл из `app` и `app_new` — разные проекты и разные префиксы (blue/green этим пользуется).
- **Баг v1 «KeyError: ContainerConfig»** при recreate в v2 исчез; костыли `stop + rm -f + up` вместо простого `up` больше не нужны (но и не мешают — в скриптах БП они остаются для v1-совместимости).
- **`exec` без `-T`**: v2 сам определяет отсутствие TTY; `-T` в скриптах оставлен — v1 без него падает в CI.

## Чек-лист при переносе в другой проект

1. Шим стоит на всех серверах, где ходят деплои/cron.
2. `grep -rn "docker-compose\|docker compose" scripts/ .github/ Makefile` — все вызовы через автоопределение или шим.
3. `grep -rn "reference=\|docker stop \|docker rm \|docker inspect \|_1\b" scripts/ .github/` — захардкоженные имена: либо двойные фильтры, либо явные `container_name:`/`image:`.
4. Сверить `deploy.resources.limits` с реальным потреблением (`docker stats`).
5. Удалить `version:` из compose-файлов.
6. Первый деплой после перехода — смотреть логи: warnings v2 подскажут остальное.
