# Infra Hardening Playbook — перенос правок в БП и дочерние проекты

Инфраструктурные правки деплоя и memory-лимитов, адаптированные под этот бойлерплейт (БП).
Родом из соседнего проекта (quickping, июль 2026); здесь **убран рудимент uptime-воркера**
(BullMQ) — в БП его нет, поэтому воркер-специфичные части исключены, а системный
hardening (redis, лимиты, rate-limiter, деплой, nginx, pnpm) сохранён.

Готовый патч: `patch/infra-hardening-memory-limits-bluegreen.patch` (10 файлов).
Патч — это `git diff` поверх коммита с security-правками (он должен быть применён/влит первым;
в этом репозитории он уже в HEAD).

```bash
git apply --check patch/infra-hardening-memory-limits-bluegreen.patch   # сухая проверка
git apply patch/infra-hardening-memory-limits-bluegreen.patch
rm -f pnpm-lock.yaml && pnpm install    # Dockerfile теперь на --frozen-lockfile
# дальше — раздел «Адаптация под проект»
```

Если проект разошёлся с БП и патч не ложится — применяй по разделам ниже, каждый самодостаточен.

---

## 1. Контекст: что и почему падало (в проекте-источнике)

Симптом: прод периодически «умирал» без самовосстановления. Каскад: BullMQ по умолчанию
вечно хранит завершённые джобы → redis рос неограниченно → host-level OOM убивал redis-server
(у хоста мало RAM, swap отсутствовал) → у redis не было restart-политики → rate-limiter
«fail-closed» (любая ошибка Redis = HTTP 429) → все пользователи получали 429, а healthcheck
был зелёным (curl с localhost обходит лимитер).

**В этом БП BullMQ-воркера нет**, поэтому первопричина (утечка джобов) неактуальна. Но все
защитные звенья каскада полезны сами по себе и вошли в патч: restart/healthcheck/maxmemory
у redis, memory-лимиты, fail-open rate-limiter, безопасный деплой, nginx resolver.

---

## 2. Правки по слоям

### 2.1 Rate-limiter — `lib/security/rate-limit.ts`

**Проблема:** `RateLimiterRedis` без страховки: недоступный Redis = reject = middleware
отдаёт 429 на весь трафик («fail-closed»).

**Правка:** `insuranceLimiter: new RateLimiterMemory({points, duration})` — при падении Redis
лимитер прозрачно работает в памяти процесса.

### 2.2 Compose (рантайм) — `docker-compose.local.yml`

| Сервис | Было | Стало |
|---|---|---|
| core-api | без restart, limit 2g константой, анонимный том node_modules | `restart: unless-stopped`, лимит `${API_MEM_LIMIT:-2g}`, `NODE_OPTIONS=${API_NODE_OPTIONS:-}`, том убран |
| redis | без restart/healthcheck/maxmemory | `restart: unless-stopped`, healthcheck `redis-cli ping`, `--maxmemory ${REDIS_MAXMEMORY:-0} --maxmemory-policy ${REDIS_MAXMEMORY_POLICY:-noeviction}`, лимит `${REDIS_MEM_LIMIT:-0}` |
| mongo | дефолтный WiredTiger cache (~50% RAM хоста) | `--wiredTigerCacheSizeGB ${MONGO_CACHE_GB:-0.5}`, лимит `${MONGO_MEM_LIMIT:-0}` |
| nginx | без restart | `restart: unless-stopped` |
| метрик-стек | лимиты константами | `${PROMETHEUS_MEM_LIMIT:-512M}` и т.д. |

Принципы:
- **Анонимный том `node_modules` удалён у core-api**: compose переиспользует анонимные тома при
  recreate → после деплоя нового образа мог остаться старый node_modules («Cannot find module»).
- **Redis-политика вытеснения настраиваемая** (`REDIS_MAXMEMORY_POLICY`, дефолт `noeviction`).
  В этом БП redis обслуживает rate-limit + кэш; при `maxmemory 0` (дефолт) политика не влияет.
  Если используешь redis как кэш с жёстким лимитом — поставь `allkeys-lru`.
- Все дефолты `${VAR:-...}` = поведение до правок: патч без настройки лимиты не меняет.

### 2.3 Бюджетирование памяти — `scripts/lib/memory-limits.sh` (новый файл)

Одна входная точка: `SERVER_MEMORY_MB` (общий RAM сервера). Из неё считаются лимиты контейнеров,
heap Node (`--max-old-space-size` ≈ 2/3 лимита), maxmemory Redis, WiredTiger cache. Явные
оверрайды всегда сильнее расчёта.

Бюджет **без воркера** (адаптировано под БП):
- без метрик: **api 48% / mongo 32% / redis 10%** (~10% системе);
- с метриками (`METRICS_ENABLED=true`): **api 34% / mongo 22% / redis 8% / метрики 29%**
  (внутри: prometheus 30, loki 20, grafana 15, telegraf 10, promtail 10, cadvisor 8, экспортеры по 3.5).

Подключение: сорсится в `local-containers-run.sh` при старте и в inline-блоках ssh-скрипта
воркфлоу (**обязательно в обоих местах** — иначе inline `up -d` увидит другой конфиг и
пересоздаст redis/mongo с дефолтными лимитами).

Ручки (env или инпуты воркфлоу): `SERVER_MEMORY_MB`, `API_MEM_LIMIT`, `API_MEM_RESERVATION`,
`API_NODE_OPTIONS`, `REDIS_MEM_LIMIT`, `REDIS_MAXMEMORY`, `MONGO_MEM_LIMIT`, `MONGO_CACHE_GB`,
`PROMETHEUS_MEM_LIMIT`, `LOKI_MEM_LIMIT`, `GRAFANA_MEM_LIMIT`, `TELEGRAF_MEM_LIMIT`,
`PROMTAIL_MEM_LIMIT`, `CADVISOR_MEM_LIMIT`, `EXPORTER_MEM_LIMIT`.

Ориентир: метрик-стек комфортен от 4GB RAM; на 2GB включать можно, но api останется ~696M.

### 2.4 nginx — `.docker/nginx/nginx.conf.template.{http,https}`

**Проблема:** `upstream backend { server api-service:3000; }` резолвится один раз при старте
nginx → пересозданный api-контейнер (новый IP) = 502 до ручного рестарта.

**Правка:** `resolver 127.0.0.11 valid=10s ipv6=off;` + `set $backend_upstream
http://api-service:3000; proxy_pass $backend_upstream;` — nginx перерезолвит DNS сам.
Важно: `envsubst` в команде nginx подставляет только `DOMAINS`/`FIRST_DOMAIN`, nginx-переменные
не трогает. Правка согласована с security-патчем (client-IP из `$realip_remote_addr`).

### 2.5 Сборка — `.docker/Dockerfile`

**Проблема:** fallback на `npm install` без lock-файла (package-lock.json нет, проект на pnpm) =
нерепродуцируемые сборки.

**Правка:** `npm install -g pnpm@10` → `pnpm install --frozen-lockfile` (билд падает при
рассинхроне lock) → `pnpm run test` → `pnpm run build:$API_ENV` → `pnpm prune --prod`.
CMD переведён на `pnpm run start:*`. Копируется и `pnpm-workspace.yaml` (в нём overrides).

Нюанс pnpm 10: postinstall-скрипты зависимостей по умолчанию не выполняются. Есть нативные
модули (sharp, bcrypt и т.п.) → добавить `pnpm.onlyBuiltDependencies` в package.json.

### 2.6 GitHub Actions — `.github/workflows/*`

- `cancel-in-progress: false` (prod-deploy и reusable): отмена деплоя посередине оставляла
  сервер с наполовину снесёнными контейнерами. Новый пуш теперь ждёт.
- `timeout-minutes: 30` на ssh-шаге (было 15 при `command_timeout: 25m` — GitHub убивал шаг
  раньше внутреннего таймаута).
- **Удалён `docker volume prune -f`** из cleanup-шага (`if: always()`): при упавшем деплое он
  мог снести mongo_data / redis_data / letsencrypt_certs. (Заодно убран `docker network prune`.)
- Cold-путь и BG-свап больше не делают stop/rm redis+mongo (каждый деплой устраивал мини-аварию
  БД под живым API). Принудительно пересоздаются только stateless-помощники; `up -d` сам
  пересоздаёт stateful при изменении конфига.
- Новые инпуты: `server_memory_mb` (+ пробрасывается в ssh-env) и `api/redis/mongo_mem_limit`.
- CI-шаги установки: `npm install -g pnpm@10 && pnpm install --frozen-lockfile`.

### 2.7 Деплой-скрипт — `scripts/local-containers-run.sh`

- Сорсит `memory-limits.sh` при старте.
- Ожидания healthy через `docker inspect api-service --format '{{.State.Health.Status}}'` вместо
  `docker ps --filter name=...` (фильтр — substring, матчил и `api-service-green`).
- Blue/green: валидация green — только `api-service-green` (`up -d --no-deps core-api`), он
  говорит с живыми blue redis/mongo. Справка `--help` дополнена переменными памяти.

### 2.8 Blue/green (готов к включению: `blue_green_enabled: true`)

1. **Валидация:** из `app_new` поднимается только `api-service-green` (SUFFIX=-green),
   подключается к живым blue redis/mongo — ровно то окружение, что будет после свапа.
   Никогда не поднимать redis-green/mongo-green (пустые тома + недетерминированный DNS).
2. **Свап:** пересоздаётся только core-api; redis/mongo не трогаются. Ожидание healthy нового
   api → рестарт nginx (страховка поверх resolver) → green гасится.
3. **Фоллбеки:** нет healthy api / нет app_new / провал валидации → cold-деплой.

Рекомендация: включать после суток на обычном cold-деплое с правками.

---

## 3. Адаптация под конкретный проект

1. **prod-deploy.yml:** `domain`, `registry_subname`, `tag` — проектные; `server_memory_mb` —
   реальный RAM сервера (0 = лимиты как раньше).
2. **Появился фоновый воркер?** Тогда добавь его сервис в compose, верни воркеру долю в
   `memory-limits.sh` (уменьшив api/mongo) и `WORKER_*` ручки, и включи его в списки BG-свапа.
3. **pnpm:** `pnpm-lock.yaml` актуален (`pnpm install`), не в `.dockerignore`. Нативные модули →
   `onlyBuiltDependencies`.
4. **Rate-limiter:** другой путь/реализация — перенеси идею insuranceLimiter.
5. **Compose-версия сервера:** v2+ (`docker-compose version`).

## 4. Разовые операции на сервере (не в патче)

```bash
# swap — обязателен на хостах <= 4GB (пик = замедление, а не труп процесса)
fallocate -l 1G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# если redis уже раздут — почистить дамп ПЕРЕД первым деплоем с правками
docker run --rm -v app_redis_data:/data alpine sh -c 'rm -f /data/dump.rdb /data/appendonly*.aof'
```

## 5. Чек-лист после первого деплоя с правками

```bash
docker ps                                   # всё Up, api healthy
docker stats --no-stream                    # лимиты соответствуют бюджету
docker inspect redis --format '{{.HostConfig.Memory}}'
docker exec redis redis-cli INFO memory | grep used_memory_human
```

Диагностика при падении:

```bash
docker inspect <name> --format 'exit={{.State.ExitCode}} oom={{.State.OOMKilled}}'
dmesg -T | grep -iE 'killed process|out of memory' | tail
free -h && docker stats --no-stream
```

`exit=137 oom=true` = cgroup-лимит; `oom=false` при 137 = host-OOM (см. dmesg) или внешний kill.

## 6. Известные ограничения

- Healthcheck api «слепой» к состоянию Redis/Mongo (curl с localhost обходит rate-limiter). С
  fail-open лимитером это уже не 429-авария, но для честного мониторинга стоит научить
  `/api/v1/healthcheck` проверять зависимости и отдавать 503.
- Метрик-стек на 2GB — впритык; комфортно от 4GB.
- `version: '3.8'` в compose устарел (warning на v2+), безвреден.
