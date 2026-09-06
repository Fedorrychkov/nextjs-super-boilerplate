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

make setup                  # повторяемая локальная настройка (scripts/setup-local.sh): долив ключей, заполнение пустых, doctor
pnpm gates                  # scripts/check-*.mjs — контракт агента, храповик eslint-disable, структура доков, справочник env (CI `quality`)
pnpm lint / lint:fix        # ESLint
pnpm typecheck              # tsc --noEmit
pnpm test                   # node --test через tsx (*.test.ts, scripts/**/*.test.mjs) — без инфраструктуры
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

mcp/             MCP stdio-сервер для AI-агентов (server.ts, registry.ts, tools/*.mcp.ts) — см. mcp/README.md

.docker/         Dockerfile'ы (app, nginx, certbot), конфиги nginx, supervisor
.github/workflows/  ci.yml + quality.yml (gates/lint/typecheck/test), prod-deploy.yml (деплой на VPS),
                 lighthouse.yml, notify-telegram.yml, ci-secret-scan.yml — см. docs/deploy/ci-notifications-lighthouse.ru.md
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

Три окружения: `.env.local`, `.env.stage`, `.env.prod` (скрипты через `env-cmd`). Шаблон — `.env.example`, справочник всех переменных — `docs/configure/env-reference.ru.md`. Ключевые: `JWT_SECRET`, `MONGO_URI` (или MONGO_HOST/USER/PASSWORD/DB), `REDIS_URL`, VAPID-ключи (push), `MFA_ENCRYPTION_KEY`, `FIRST_ADMIN_LOGIN/PASSWORD`, OAuth-ключи, `NEXT_PUBLIC_LLM_ENABLED` + OpenAI. После правки env — `pnpm doctor`.

Секреты никогда не коммитятся; серверные ключи (OpenAI и т.п.) не попадают на клиент — только `NEXT_PUBLIC_*` публичны.

## Конвенции кода

- TypeScript strict; ESLint flat config (`eslint.config.mjs`): next/core-web-vitals + typescript, prettier, simple-import-sort, import, jsdoc, react-refresh
- Prettier: `.prettierrc` (semi: false и т.д.) — форматирование через ESLint-плагин
- Тесты: нативный `node --test` через tsx, файлы `*.test.ts` рядом с кодом
- Санитизация UGC: `isomorphic-dompurify` (`src/lib/sanitize`)
- Ошибки API: кастомные ошибки `lib/error/custom-errors.ts` + `lib/middleware/api-error-handler.ts`
- Rate limiting на API-роутах через `lib/middleware/rate-limit-middleware.ts`

## Инфраструктура и деплой

- Деплой: GitHub Actions (`prod-deploy.yml` на push в `main`; stage-workflow — его копия с `develop` + `.env.stage`) на VPS через Docker Compose
- Compose-файлы: `docker-compose.dev.yml` (локальный mongo/nginx), `docker-compose.local.yml` (полный стек локально)
- Стек в проде: app + nginx + certbot (Let's Encrypt) + Redis + MongoDB (опц.) + метрики (Prometheus, Grafana, Loki)
- Blue-green деплой и memory limits — см. `docs/deploy/hardening-playbook.ru.md`

## Документация — куда смотреть

- `docs/README.md` — индекс всей документации; папки по темам, суффикс языка `.ru.md` / `.en.md` (RU канонический, EN у входных документов)
- `docs/start/getting-started.ru.md` / `.en.md` — первый час после форка; `docs/start/local-development.en.md` — команды, локальная Mongo, локальный HTTPS
- `docs/deploy/github-actions.en.md` — входы и секреты деплоя, VPS, troubleshooting
- `docs/configure/feature-flags.ru.md` (RU) — feature-флаги: auth, email, MFA, сессии, onboarding, push, LLM
- `docs/configure/env-reference.ru.md` / `.en.md` — все env-переменные в порядке `.env.example` (под гейтом)
- `docs/decisions/journal.ru.md` — журнал решений: почему сделано так (только дописывается, с датами)
- `docs/agents/review.ru.md`, `docs/agents/triage.ru.md` — как ревьюить PR, как заводить issue
- `docs/plans/README.md` — планы крупной работы
- `docs/deploy/ci-notifications-lighthouse.ru.md` — CI: уведомления в Telegram, бюджеты Lighthouse, скан секретов, гейты
- `docs/configure/oauth.ru.md`, `docs/security/account-security.ru.md` — авторизация/безопасность (реализовано)
- `docs/security/hardening-playbook.ru.md`, `docs/security/security-seo-audit.ru.md` — hardening
- Роадмапы: `docs/roadmaps/product.en.md`, `docs/roadmaps/ai-features.en.md`, `docs/roadmaps/geo-discoverability.en.md`

## MCP-сервер и машинная авторизация (PAT)

В репозитории есть MCP stdio-сервер (`mcp/`), отдающий домены статей и медиа как tools для MCP-хостов (Claude Desktop, Cursor, Claude Code). Авторизация — Personal Access Token (`nsb_pat_…`), выдаётся в `/admin/api-tokens` (флаг `API_TOKENS_ENABLED`) и отправляется как `Authorization: Bearer` в обычный REST `/api/v1/*` — scopes (`articles:read|write|publish|seo`, `media:read|write`), per-token rate-limit и аудит в `SecurityAuditLog` применяются на сервере через `withApiTokenOrAuth` (`lib/middleware/api-token-middleware.ts`).

Добавляя новый домен, доступный через MCP: добавь scopes в `src/api/api-token/model.ts`, оберни роуты `withApiTokenOrAuth('<scope>')` (точечные проверки — `hasApiTokenScope`), создай `mcp/tools/<домен>.mcp.ts` и зарегистрируй в `mcp/tools/index.ts`. Tools — тонкие обёртки над REST, без бизнес-логики в `mcp/`. Подробнее: `mcp/README.md`, дизайн-док `docs/develop/mcp-server.ru.md`.

## Правила для агентов

Этот файл — единственный контракт для людей и агентов (Claude, Codex, Cursor). `CLAUDE.md` —
тонкий адаптер Claude Code: импортирует контракт и добавляет только особенности рантайма; правила
проекта живут здесь, не в адаптерах. Бюджет: меньше 28 КБ и без `@file`-импортов — это проверяет
`pnpm gates` (`check-agent-contract`), потому что Codex молча обрезает инструкции после 32 КБ и не
раскрывает импорты. Здесь нет того, что уже ловят eslint, tsc и CI: их сообщение — источник
правды, а пересказ расходится с проверкой при первой же правке.

### Что побеждает при конфликте (сверху вниз)

1. **Ничего необратимого или внешне видимого без явного слова владельца именно на эту
   операцию:** `git push`, ручной деплой (`workflow_dispatch`), любая команда с `.env.prod` /
   `.env.stage`, запись в боевую базу, восстановление из бэкапа, отправка наружу, ротация
   секретов. Разрешение на одну операцию не распространяется на следующую. Всё внутреннее — код,
   файлы, поиск, установка зависимостей, read-only запросы — делай сам и отчитайся.
2. **Прямая инструкция владельца в текущей сессии.**
3. **Корректность и безопасность:** проверки auth и ролей, скоуп по пользователю, секреты не в
   логах и не в клиентских DTO, валидация на сервере.
4. **Правда о состоянии.** Не выдавай непрогнанное за прогнанное, ненайденное за отсутствующее,
   предположение за проверенное. Красный отчёт дешевле зелёного, который врёт.
5. **Дисциплина документации** (ниже). Уступает срочности — но тогда об этом говорится вслух.
6. Всё остальное: стиль, дефолты, предпочтения.

Если просьба конфликтует с пунктами 1–3, работа не продолжается молча: скажи, в чём конфликт, и
дождись ответа. С 4–6 — сделай и назови отступление.

### Сначала оцени размер работы

| Размер | Что это | Чем обойтись |
|---|---|---|
| Мелкая | текст, i18n, вёрстка, комментарий, переименование в одном файле | правка + `pnpm typecheck`; остальное пропусти и **не объясняй, почему пропустил** |
| Средняя | несколько файлов внутри одного домена | самая узкая проверка, покрывающая изменение + тест на новую чистую логику |
| Крупная | новая сущность или домен, схема Mongo, контракт наружу (API, MCP-тул, вебхук), конечный автомат, миграция данных, auth-флоу | сначала план (`docs/plans/`) и согласование, потом код |

### Сделано и достаточно

- «Сделано» доказывает свежий вывод команды в текущем запуске, а не «должно работать». Падающий
  тест приводится вместе с выводом, пропущенный шаг явно называется пропущенным. Для текста,
  i18n и вёрстки `tsc` доказательством не является — доказательство это поднятый `dev:local` и
  увиденный экран либо честное «глазами не проверял».
- Не добавляй guard, слой, абстракцию или fallback, которых никто не просил и до которых система
  не может дойти. Пропускай их без объяснений, почему пропустил.
- Не оборачивай обязательную зависимость в `try/catch`: Mongo или Redis не поднялись — пусть
  падает громко.
- Никаких переименований и переформатирования мимо задачи: они раздувают дифф, который владелец
  смотрит глазами, и прячут в нём настоящее изменение.
- Комментарии — только там, где запутается читатель, уже понимающий следующую строку, и только
  про *почему*. Обоснование решения — в тело коммита или в `docs/decisions/journal.ru.md`.
- Никогда молча не сокращай scope. Нашёл баг мимо задачи — почини и скажи об этом отдельно либо
  назови его.
- Гарантия зелёного теста неприкосновенна: нельзя ослаблять ожидание, подгонять expected под
  новый вывод, выключать тест или сводить его к проверке mock.

### Тесты

Новый код приходит с тестом, если поведение проверяемо без инфраструктуры. Тесты лежат рядом с
кодом (`*.test.ts`, `scripts/**/*.test.mjs`) и гоняются нативным `node --test` через tsx.
`pnpm test` обязан оставаться запускаемым без базы, Redis и сети — сюита, которой нужна
инфраструктура, однажды скипнется и будет светить зелёным. Фронт тестируется через вынос
чистого; рендер-тесты не заведены сознательно. Хуки на твоём пути не сработают: `pre-push` —
никогда (ты не пушишь), `pre-commit` тестов не запускает — `pnpm test` гоняй сам до показа
диффа. Если проверке нужна инфраструктура, которой нет (`make up-local`), скажи, что не
проверено: `ECONNREFUSED` — неподнятый стенд, а не дефект кода.

### Что уже ловится машинно

Падение гейта — повод спросить, почему правило существует, а не обойти его; список известных
исключений может только сокращаться.

| Проверка | Где | Что не даст сделать |
|---|---|---|
| `check-agent-contract` | `pnpm gates` | `AGENTS.md` больше 28 КБ или с `@file`-импортами; `CLAUDE.md` без `@AGENTS.md` или больше 4 КБ |
| `check-eslint-disable-ratchet` | `pnpm gates` | Новый `eslint-disable` (baseline `scripts/eslint-disable-ratchet-baseline.txt`; уменьшать через `--update`) |
| `check-docs-structure` | `pnpm gates` | Документ вне `docs/<тема>/<имя>.<ru\|en>.md`, документ без строки в `docs/README.md`, битая относительная ссылка в любом `.md` |
| `check-env-reference` | `pnpm gates` | Переменная в `.env.example` без строки в `docs/configure/env-reference.{ru,en}.md`, или описанная переменная, которой в шаблоне больше нет |
| eslint `no-restricted-syntax` | `pnpm lint` | Сырые `<input>/<select>/<textarea>` вне `src/components/ui`; голый `<span>` с текстом вместо `Typography` |
| `gitleaks` | workflow `Secret scan` | Новый секрет в отслеживаемых файлах |
| `Lighthouse` | `lighthouse.yml` | Публичные страницы тяжелее бюджетов `lighthouserc.json` (вес и CLS ломают, тайминги предупреждают) |
| `guard-external.sh` | Claude Code `PreToolUse` (`.claude/settings.json`) | Запуск `git push`, любой `pnpm <script>:prod` / `:stage` (build, start, worker, doctor), команды с именем `.env.prod` / `.env.stage`, запуск `restore-mongo.sh` / `mongorestore` |

### Дисциплина документации

Правка кода без правки доки — незакрытая задача.

- Решение, которое кто-то захочет отменить → запись с датой в `docs/decisions/journal.ru.md` (почему так и почему не иначе)
- Новая переменная окружения → `.env.example` (комментарий не длиннее строки) + строка в `docs/configure/env-reference.ru.md` **и** `.en.md`, в той же секции; `pnpm gates` сверяет имена
- План крупной работы → `docs/plans/`
- Новый документ → `docs/<тема>/<kebab-имя>.<ru|en>.md` + строка в `docs/README.md`; `pnpm gates` проверяет и то и другое
- `AGENTS.md` и `AGENTS_RU.md` синхронизируются

### Соглашения проекта

- Начиная новую фичу, смотри существующий домен-образец (например, `article`): api → query → app/api/v1 → services → models
- Если новый домен должен быть доступен AI-агентам — выведи его через MCP-реестр (см. «MCP-сервер и машинная авторизация» выше)
- Не менять `pnpm-workspace.yaml` overrides без причины — это security-фиксы транзитивных зависимостей
- При форке под новый продукт первым делом правится `config/product.ts` и `.env.local`, затем `pnpm doctor`; повторная настройка (новая машина, новые ключи в шаблоне) — `make setup`
- Перед коммитом: `pnpm gates`, `pnpm lint`, `pnpm typecheck`, `pnpm test`
