# CI Pipeline Update — гайд по применению (RU)

Патч: `ci-pipeline-update.patch`. Обновляет GitHub Actions: единый quality gate (lint + typecheck + test), общий кеш (pnpm + Docker слоевой), гейтинг прод-деплоя на успешные проверки. Затрагивает только `.github/workflows/`.

## Что меняет патч

| Файл | Действие | Суть |
|------|----------|------|
| `.github/workflows/quality.yml` | **новый** | Reusable (`workflow_call`) quality gate: matrix `lint` / `typecheck` / `test`, pnpm-стор кеш. Проверки определены **один раз**. |
| `.github/workflows/ci.yml` | **новый** | На `pull_request` + `push` в `develop`/`main` зовёт `quality.yml`. `concurrency` отменяет устаревшие прогоны. |
| `.github/workflows/prod-deploy.yml` | правка | Добавлен job `quality` (зовёт `quality.yml`) и `call-reusable: needs: [quality]` — деплой не стартует, пока проверки не прошли. Работает и на `push` в `main`, и на ручной `workflow_dispatch`. |
| `.github/workflows/reusable-deploy-config.yml` | правка | (1) pnpm-стор кеш в non-registry install (`pnpm/action-setup@v4` + `setup-node@v4 cache: pnpm`). (2) Docker **слоевой кеш** в registry-сборке: `docker/setup-buildx-action` + `docker buildx build --cache-from/--cache-to type=registry` (тег `:buildcache` в GHCR). |
| `.github/workflows/stage-deploy.yml` | **удаление** | Дублировал `test` из `ci.yml` на push в develop, реального деплоя не было. |

### Зачем кеш

- **pnpm-стор** (Actions cache по хешу `pnpm-lock.yaml`) — общий между воркфлоу и ре-ранами: install → near-instant restore.
- **Docker слоевой** (`:buildcache` в GHCR) — не привязан к скоупу веток Actions-кеша, доступен всем деплоям и **рестартам**. Слои `pnpm install` / `next build` не пересобираются, если `package.json` / lockfile / исходники не менялись → режет косты и время прод-деплоя.

## Предпосылки в целевом проекте

- `package.json` содержит скрипты `lint`, `typecheck`, `test` (иначе адаптируй имена в `quality.yml`).
- Пакетный менеджер — **pnpm** (`pnpm-lock.yaml`). Если npm/yarn — замени setup и install.
- Для эффективности Docker-кеша `Dockerfile` должен ставить зависимости **до** `COPY . .` (сначала `COPY package.json pnpm-lock.yaml … && pnpm install`, потом `COPY . .`). Если так — кеш deps работает из коробки.
- Деплой в registry-режиме пушит образ в **GHCR** (`ghcr.io`), есть `packages: write` в permissions.

## Как применить

### Вариант A — если воркфлоу целевого проекта совпадают (форк того же бойлерплейта)

```bash
cd <target-repo>
git checkout -b chore/ci-pipeline-update
git apply --check ci-pipeline-update.patch   # проверка без изменений
git apply ci-pipeline-update.patch            # применить
# или, чтобы сразу закоммитить с авторством из патча:
# git am < ci-pipeline-update.patch
```

Если `git apply --check` ругается на конфликты — воркфлоу отличаются, иди по варианту B.

### Вариант B — если воркфлоу отличаются (обычный случай)

Применяй по частям:

1. **Скопируй как есть** `quality.yml` и `ci.yml` из патча (они почти проектонезависимые). Проверь в `quality.yml`: `node-version` (24), `version` pnpm (10), имена скриптов (`lint`/`typecheck`/`test`), список веток в `ci.yml` (`develop`/`main`).
2. **prod-deploy.yml** — добавь job проверок и `needs` перед деплой-job'ом:
   ```yaml
   jobs:
     quality:
       uses: ./.github/workflows/quality.yml
     call-reusable:            # ← твой существующий деплой-job
       needs: [quality]
       uses: ./.github/workflows/reusable-deploy-config.yml
       with: ...
   ```
3. **reusable-deploy-config.yml** — перенеси два блока из патча:
   - в `steps` замени `Setup node` на `pnpm/action-setup@v4` + `setup-node@v4 cache: pnpm`, из install-шага убери `npm install -g pnpm`;
   - шаг сборки образа: добавь `docker/setup-buildx-action@v3` (в registry-режиме) и замени `docker build … && docker push` на `docker buildx build … --cache-from/--cache-to type=registry,ref=$CACHE_REF … --push`. `CACHE_REF` — тег `:buildcache` в твоём GHCR-репозитории образа.
4. **stage-deploy** — удаляй только если у тебя нет реального stage-деплоя (в исходнике он был пустой). Если stage реальный — **не удаляй**.

## Адаптация под целевой проект

- `registry_subname`, `domain`, `env_file`, `api_env`, все `secrets.*` в `prod-deploy.yml` — свои.
- `node-version` / версия pnpm — под целевой проект.
- Имена скриптов в `quality.yml` — под `package.json` целевого проекта.
- GHCR: `CACHE_REF` строится из `github.repository_owner` + имени образа; если реестр другой (Docker Hub и т.п.) — поправь ref кеша под него.

## Проверка после применения

```bash
# синтаксис YAML
python3 -c "import yaml,glob; [yaml.safe_load(open(f)) for f in glob.glob('.github/workflows/*.yml')]; print('YAML OK')"
```

- Открой PR → должны появиться чеки `lint` / `typecheck` / `test`.
- Push в `main` (или ручной Run workflow) → сначала `quality`, затем деплой (деплой не стартует при упавших проверках).
- Второй прогон install заметно быстрее (pnpm-кеш); повторный прод-деплой без изменений зависимостей — быстрее (Docker слоевой кеш).
- В настройках ветки включи `lint`/`typecheck`/`test` как **required status checks** (это разово, в UI GitHub).
