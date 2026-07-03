# AGENTS_RU.md — контекст проекта для AI-агентов

English (canonical) version: [AGENTS.md](./AGENTS.md)

## Что это

**nextjs-super-boilerplate** — production-ready бойлерплейт на Next.js 16 (App Router) для быстрого старта новых проектов. Из коробки: инфраструктура (Docker, CI/CD, nginx, HTTPS), JWT-авторизация + OAuth, CMS для статей (редактор, превью, публикация), SEO (metadata, JSON-LD, sitemap, RSS, IndexNow), уведомления (web-push, email, Telegram), LLM-фичи, аналитика (RUM, AI-referrals), метрики (Prometheus/Grafana/Loki), i18n, админка.

Это standalone Next.js приложение (не монорепо в смысле workspaces), self-hosted стек: не включает Stripe/billing и multi-tenant SaaS.

Демо: https://nextjs-super-boilerplate.visn-ai.io

## Стек

- **Runtime:** Node.js ≥ 22 (engines), `.nvmrc` пинит v24; пакетный менеджер **pnpm** (`pnpm-lock.yaml`, overrides безопасности — в `pnpm-workspace.yaml`)
- **Framework:** Next.js 16 (App Router), React 19, TypeScript 5 (strict)
- **Данные:** MongoDB (mongoose), Redis (ioredis) — кэш и rate limiting (`rate-limiter-flexible`)
- **UI:** Tailwind CSS 4, Radix UI / shadcn-style компоненты (`src/components/ui`), lucide-react, framer-motion, SCSS
- **Редактор:** TipTap 3 (+ Yjs collaboration)
- **Данные на клиенте:** react-query v3, react-hook-form, axios
- **Auth:** JWT (access + refresh, `jsonwebtoken`), bcryptjs, TOTP MFA (`otplib`), OAuth (Yandex, Google, GitHub) с PKCE
- **LLM:** OpenAI SDK, серверные ключи, флаг `NEXT_PUBLIC_LLM_ENABLED`

## Команды

```bash
pnpm install                # зависимости
cp .env.example .env.local  # env, затем заполнить значения
pnpm doctor                 # валидация .env.local (scripts/doctor.ts)
make up-local               # локальный MongoDB (docker-compose.dev.yml); make down-local — стоп
pnpm dev:local              # dev-сервер, http://localhost:3000

pnpm lint / lint:fix        # ESLint
pnpm typecheck              # tsc --noEmit
pnpm test                   # node --test через tsx (*.test.ts)
pnpm format                 # prettier по src/**/*.ts
pnpm build:local|stage|prod # сборка с env-cmd под нужный env
```

Pre-commit: husky + lint-staged (`pnpm lint:src` по staged-файлам в `src/`).

## Структура

```
config/          конфигурация продукта (правится при форке)
  product.ts     брендинг, автор, PWA, sitemap extras — первая точка кастомизации
  env.ts         чтение всех env-переменных, feature-флаги (ACCOUNT_CONFIG и др.)
  auth-oauth.ts, password-policy.ts, notification-events.ts

lib/             серверный код (вне src): БД, сервисы, безопасность
  db/            client.ts + mongoose-модели (User, Article, RefreshToken, OAuthAccount,
                 PushSubscription, SecurityAuditLog, LlmChatSession, RumWebVital, ...)
  services/      бизнес-логика: auth, registration, password, email, llm, media,
                 notifications, security-audit, i18n, rum-dashboard, ...
  security/      rate-limit, bruteforce, totp, login-challenge, llm-rate-limit
  oauth/         полный OAuth-флоу: state, PKCE, providers, collision handling
  middleware/    auth-middleware, rate-limit-middleware, api-error-handler
  jwt/, redis.ts, cache.ts, cookies.ts, server-action/, validation/, error/

src/
  app/           App Router: страницы + API-роуты (app/api/v1/*), sitemap, robots, rss, manifest
  api/           клиентский API-слой (axios-клиенты, model.ts/types.ts по доменам)
  query/         react-query хуки (query/mutation) по тем же доменам
  components/    ui (базовые), Blocks, Views, Layouts, Fields, Guard, ...
  lib/           клиент/шаред-утилиты: auth, seo, i18n, editor, sanitize, theme, routes
  providers/     React-провайдеры: auth, theme, i18n, push, notify, query, Rum
  constants/routes.ts   пути + seo.sitemap / seo.breadcrumb
  proxy.ts       Next.js proxy (Content-Signal и др.)

.docker/         Dockerfile'ы (app, nginx, certbot), конфиги nginx, supervisor
.github/workflows/  stage-deploy.yml, prod-deploy.yml (деплой на VPS)
docs/            вся документация (см. docs/README.md — индекс)
scripts/         doctor.ts (валидация env), local-containers-run.sh, notify-telegram.sh
patch/           git-патчи с историей крупных фич (справочно)
skills/          NSB_SETUP_SKILL.md — скилл настройки бойлерплейта
```

API-роуты живут в `src/app/api/v1/*` (auth, article, llm, media, notification, push, rum, seo, user, admin, healthcheck, ...). Паттерн домена: `src/api/<домен>` (HTTP-клиент) → `src/query/<домен>` (react-query хуки) → компоненты; серверная логика — в `lib/services`.

## Алиасы путей (tsconfig)

- `@config/*` → `./config/*`
- `@lib/*` → `./lib/*`
- `~/*` → `./src/*`

## Env и окружения

Три окружения: `.env.local`, `.env.stage`, `.env.prod` (скрипты через `env-cmd`). Шаблон — `.env.example`, справочник всех переменных — `docs/ENV_REFERENCE.md`. Ключевые: `JWT_SECRET`, `MONGO_URI` (или MONGO_HOST/USER/PASSWORD/DB), `REDIS_URL`, VAPID-ключи (push), `MFA_ENCRYPTION_KEY`, `FIRST_ADMIN_LOGIN/PASSWORD`, OAuth-ключи, `NEXT_PUBLIC_LLM_ENABLED` + OpenAI. После правки env — `pnpm doctor`.

Секреты никогда не коммитятся; серверные ключи (OpenAI и т.п.) не попадают на клиент — только `NEXT_PUBLIC_*` публичны.

## Конвенции кода

- TypeScript strict; ESLint flat config (`eslint.config.mjs`): next/core-web-vitals + typescript, prettier, simple-import-sort, import, jsdoc, react-refresh
- Prettier: `.prettierrc` (semi: false и т.д.) — форматирование через ESLint-плагин
- Тесты: нативный `node --test` через tsx, файлы `*.test.ts` рядом с кодом
- Санитизация UGC: `isomorphic-dompurify` (`src/lib/sanitize`)
- Ошибки API: кастомные ошибки `lib/error/custom-errors.ts` + `lib/middleware/api-error-handler.ts`
- Rate limiting на API-роутах через `lib/middleware/rate-limit-middleware.ts`

## Инфраструктура и деплой

- Деплой: GitHub Actions (`stage-deploy.yml` / `prod-deploy.yml`) на VPS через Docker Compose
- Compose-файлы: `docker-compose.dev.yml` (локальный mongo/nginx), `docker-compose.local.yml` (полный стек локально)
- Стек в проде: app + nginx + certbot (Let's Encrypt) + Redis + MongoDB (опц.) + метрики (Prometheus, Grafana, Loki)
- Blue-green деплой и memory limits — см. `docs/INFRA_HARDENING_PLAYBOOK_RU.md`

## Документация — куда смотреть

- `docs/README.md` — индекс всей документации
- `docs/GETTING_STARTED.md` (RU) — чеклист форка: product.ts, env, verification-файлы
- `docs/CONFIGURATION.md` (RU) — feature-флаги: auth, email, MFA, сессии, onboarding, push, LLM
- `docs/ENV_REFERENCE.md` — все env-переменные
- `docs/AUTH_OAUTH.md`, `docs/SECURITY_AND_ACCOUNT_ROADMAP.md` — авторизация/безопасность (реализовано)
- `docs/SECURITY_HARDENING_PLAYBOOK_RU.md`, `docs/SECURITY_SEO_AUDIT.md` — hardening
- Роадмапы: `PRODUCT_ROADMAP.md`, `AI_FEATURES_ROADMAP.md`, `IMPROVEMENTS_ROADMAP.md`

## Правила для агентов

- Начиная новую фичу, смотри существующий домен-образец (например, `article`): api → query → app/api/v1 → services → models
- Не менять `pnpm-workspace.yaml` overrides без причины — это security-фиксы транзитивных зависимостей
- При форке под новый продукт первым делом правится `config/product.ts` и `.env.local`, затем `pnpm doctor`
- Перед коммитом: `pnpm lint`, `pnpm typecheck`, `pnpm test`
- При изменении AGENTS.md / AGENTS_RU.md — синхронизировать обе версии
