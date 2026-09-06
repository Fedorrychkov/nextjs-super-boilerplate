# CI Quality Gate + E2E (RU) — дизайн-док

Статус: **частично реализовано** (quality gate + общий кеш; E2E отложен по решению — не разворачиваем инфраструктуру). Область: `.github/workflows/`.

> **Сделано:**
> - `.github/workflows/ci.yml` — на `pull_request` (+ push в `develop`/`main`), `concurrency` с отменой устаревших прогонов, matrix-джобы `lint` / `typecheck` / `test` (параллельно), `pnpm/action-setup@v4` + `actions/setup-node@v4` с **`cache: pnpm`** (pnpm-стор в repo-scoped Actions-кеше по хешу `pnpm-lock.yaml` — общий для джоб, PR, ре-ранов и других воркфлоу).
> - `reusable-deploy-config.yml` (registry-режим) — **Docker-слоевой кеш**: `docker/setup-buildx-action` + `docker buildx build` с `--cache-from/--cache-to type=registry` (один перезаписываемый тег `:buildcache` в GHCR). Слои `pnpm install` / `next build` переиспользуются между запусками и **рестартами деплоя** → режет косты и время.
> **Структура (финал):** проверки вынесены в reusable `quality.yml` (`workflow_call`, matrix lint/typecheck/test + pnpm-кеш). `ci.yml` зовёт его на PR/push. `prod-deploy.yml` зовёт его job'ом `quality` и деплой-job `needs: [quality]` — прод не задеплоится, пока проверки не прошли (работает и на push в `main`, и на ручной `workflow_dispatch`). `stage-deploy.yml` **удалён** (дублировал test, реального деплоя не было).
> **Отложено:** E2E (Playwright + mongo/redis сервисы) — по решению не делаем. `build`-джоба в PR-гейте — опционально позже. Остаётся: включить `lint`/`typecheck`/`test` как required checks в настройках ветки форка (документировать в `GETTING_STARTED`).

## Проблема

Сейчас в `.github/workflows/` есть только деплой-воркфлоу:

- `stage-deploy.yml` — триггер `push` в `develop`, из проверок запускает **только** `pnpm run test` (юниты); нет `lint`, нет `typecheck`.
- `prod-deploy.yml`, `reusable-deploy-config.yml` — деплой.

Нет ни одного воркфлоу на `pull_request`. Полный набор проверок (`typecheck` + `lint` + `test`) живёт только в husky-хуках (`.husky/pre-push`: `typecheck && test`; `.husky/pre-commit`: `typecheck && lint-staged && lint:fix`) — локально и **обходится** (`--no-verify`, коммит через веб-UI, forks). Для бойлерплейта, который форкают, это значит: у форков нет никакой серверной гарантии качества до мержа. E2E-тестов нет вообще (в репозитории 9 юнит-файлов `*.test.ts`, запускаемых `node --test` через tsx).

## Цель

1. **PR quality gate** — воркфлоу на `pull_request`, блокирующий мерж при провале `lint`, `typecheck` или `test`. Из коробки для всех форков.
2. **Каркас E2E (Playwright)** — базовые сценарии (auth-логин, публикация статьи, рендер публичной статьи) + инфраструктура запуска в CI. Держим отдельно от юнитов, чтобы не замедлять быстрый PR-гейт.

Существующие скрипты (`package.json`): `lint` (`eslint .`), `typecheck` (`tsc --noEmit`), `test` (`node --import tsx --test ...`). Тулинг: **pnpm 10**, **Node 24**, `--frozen-lockfile`.

## Часть 1 — PR quality gate

### Новый воркфлоу `.github/workflows/ci.yml`

Триггеры:

```yaml
on:
  pull_request:
    branches: [develop, main]
  push:
    branches: [develop, main]   # опционально: гейт и на прямых пушах
```

Параметры:

- `concurrency: { group: ci-${{ github.ref }}, cancel-in-progress: true }` — отменять устаревшие прогоны.
- Общий сетап (переиспользовать между джобами): checkout → `pnpm/action-setup@v4` (pnpm 10) → `actions/setup-node@v4` (node 24, `cache: pnpm`) → `pnpm install --frozen-lockfile`.

Джобы (параллельно):

| Джоба | Команда | Зависимости |
|-------|---------|-------------|
| `lint` | `pnpm run lint` | — |
| `typecheck` | `pnpm run typecheck` | — |
| `test` | `pnpm run test` | — |

Чтобы не дублировать установку зависимостей в каждой джобе, варианты:

- **Вариант A (просто):** три независимые джобы, каждая делает свой install (кэш pnpm store делает это дёшево). Максимальная параллельность, минимум связности.
- **Вариант B (DRY):** одна джоба `setup` кэширует `node_modules`/store, остальные `needs: [setup]`. Меньше сетевого трафика, но сложнее.

Рекомендация — **Вариант A**.

### Build-check (опционально)

`next build` требует валидного окружения (`JWT_SECRET`, `MONGO_URI`, VAPID и т.п.). Варианты:

- Отдельная джоба `build` с `.env.ci` из безопасных заглушек (без реальных секретов), собранного из `.env.example`. Ловит ошибки типов на этапе сборки и битые импорты серверных модулей.
- Либо отложить до E2E-джобы (там окружение всё равно поднимается).

Рекомендация: добавить лёгкий `build` только если он стабильно проходит без внешних сервисов; иначе полагаться на `typecheck` + E2E.

### Branch protection

Документировать в `docs/` (и в `GETTING_STARTED`) шаг настройки форка: сделать джобы `lint`/`typecheck`/`test` **required status checks** в настройках ветки `develop`/`main`.

## Часть 2 — E2E (Playwright)

### Зачем отдельно

`pnpm test` использует нативный `node --test` — это раннер юнитов, не браузерный. Playwright — отдельный раннер и отдельные скрипты, чтобы:

- быстрый PR-гейт (lint/typecheck/unit) не ждал поднятия Mongo/Redis/сервера;
- E2E можно гонять как отдельную джобу (по метке PR или nightly).

### Установка и структура

- Dev-зависимость: `@playwright/test`.
- `playwright.config.ts` в корне: `testDir: './e2e'`, `webServer` (см. ниже), `use.baseURL`, трейсы `on-first-retry`.
- Каталог `e2e/` с помощниками (логин через API/форму, сид тестового админа).
- Скрипты в `package.json`: `test:e2e` (`playwright test`), `test:e2e:ui` (`playwright test --ui`).

### Поднятие приложения в CI

Приложению нужны **MongoDB** и **Redis**. В GitHub Actions — через `services:`:

```yaml
services:
  mongo:
    image: mongo:7
    ports: ['27017:27017']
  redis:
    image: redis:7
    ports: ['6379:6379']
```

- `.env.ci` (или инъекция env в джобе) с локальными `MONGO_URI`/`REDIS_URL`, тестовым `JWT_SECRET`, `FIRST_ADMIN_LOGIN`/`FIRST_ADMIN_PASSWORD`, `MFA_ENCRYPTION_KEY`, dev VAPID-ключами. LLM/OAuth/push — выключены флагами (`NEXT_PUBLIC_LLM_ENABLED=false` и т.п.), чтобы E2E не зависели от внешних вендоров.
- `webServer` в конфиге Playwright: `command: pnpm build:local && pnpm start:local` (или `pnpm dev:local` для скорости), `url: http://localhost:3000`, `reuseExistingServer: !process.env.CI`.
- Первый админ создаётся приложением из `FIRST_ADMIN_*` при старте — это точка входа для сценариев, требующих роли ADMIN/EDITOR.

### Стартовый набор сценариев

1. **Auth:** логин первым админом (`FIRST_ADMIN_*`) → редирект в кабинет; невалидный пароль → ошибка + учёт brute-force не роняет флоу.
2. **Публикация статьи:** создать draft (`/admin/articles/create`) → заполнить контент/SEO → опубликовать ревизию → публичная статья доступна на `/article/[slug]` и не `noindex`.
3. **Публичный рендер + агенты:** `/article/[slug]` отдаёт HTML; с `Accept: text/markdown` — Markdown + YAML front matter и заголовок `Vary: Accept` (уже реализовано в `src/proxy.ts`) — регрессионная защита.
4. **Sidebar (связка с `docs/develop/sidebar-navigation.ru.md`):** состояние секций переживает смену лейаута.

### Джоба E2E

Отдельный воркфлоу `e2e.yml` или джоба `e2e` в `ci.yml`:

- Триггер: `pull_request` + `workflow_dispatch`; тяжёлые прогоны — по метке (`label: e2e`) или nightly `schedule`, чтобы каждый PR не платил полную цену.
- Шаги: setup → `pnpm exec playwright install --with-deps chromium` → поднять services → `pnpm run test:e2e`.
- Артефакты: загружать `playwright-report/` и трейсы при падении (`actions/upload-artifact`).

## Файлы под создание/изменение

- `.github/workflows/ci.yml` — **новый** (lint/typecheck/test на PR).
- `.github/workflows/e2e.yml` — **новый** (Playwright) *или* джоба в `ci.yml`.
- `playwright.config.ts` — **новый**.
- `e2e/**` — **новый** (сценарии + хелперы).
- `.env.ci` (или `.env.example` секция для CI) — **новый**.
- `package.json` — скрипты `test:e2e`, `test:e2e:ui`; devDep `@playwright/test`.
- `docs/GETTING_STARTED.md` — раздел «branch protection / required checks для форка».
- `.gitignore` — `playwright-report/`, `test-results/`.

## Критерии готовности

- PR с ошибкой lint/type/unit → красный чек, мерж заблокирован.
- `pnpm run test:e2e` локально и в CI проходит стартовый набор на чистой БД.
- Отчёт Playwright доступен как артефакт при падении.
- Форк получает всё это «из коробки» после клонирования (документирован лишь шаг включения required checks).

## Открытые вопросы

- Гонять E2E на **каждом** PR или по метке/nightly? (Рекомендация: смоук на каждом PR, полный набор — nightly.)
- Добавлять ли `build`-джобу в PR-гейт (стоимость времени против ранней ловли ошибок сборки)?
- Матрица Node (только 24, или 22+24 под `engines: >= 22`)?
