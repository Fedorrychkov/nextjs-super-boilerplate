# Старт проекта (v0.2.4)

Краткий чеклист после форка или первого развёртывания. Инфраструктура (Docker, CI, nginx) — в корневом [`README.md`](../README.md) и [`INFRASTRUCTURE_PLAN_RU.md`](./INFRASTRUCTURE_PLAN_RU.md).

## 0. Быстрый старт одной командой

```bash
pnpm install
./scripts/init-project.sh
```

Скрипт спросит slug / название / домен / автора, переименует захардкоженные плейсхолдеры
(`package.json`, `config/product.ts`, `prod-deploy.yml`, User-Agent в GitHub OAuth, `Makefile`),
сгенерит `JWT_SECRET` / `MFA_ENCRYPTION_KEY` / `SEO_NOTIFY_SECRET` / VAPID в `.env.local`,
запишет их копию в gitignore-файл `.project-initialized` (оттуда — в CI-секреты для прода)
и прогонит `pnpm doctor`. Запускается один раз (guard-файл). Ручные значения (Mongo, Redis,
admin, Uploadcare, ключи провайдеров) заполняешь сам. Таблица ниже — ручной путь и что осталось.

## 1. Первый час

| Шаг | Что сделать |
|-----|-------------|
| 1 | `./scripts/init-project.sh` (или вручную: `cp .env.example .env.local` + секреты, см. [`ENV_REFERENCE.md`](./ENV_REFERENCE.md)) |
| 2 | `pnpm doctor` — проверить согласованность env и флагов |
| 3 | Дозаполнить [`config/product.ts`](../config/product.ts) — описание, `author: null` для SaaS, PWA-цвета/иконки |
| 4 | Заполнить Mongo (`MONGO_*` / `MONGO_URI`), `REDIS_URL`, `FIRST_ADMIN_*` |
| 5 | Поднять Mongo (`make up-local` или внешний `MONGO_URI`) |
| 6 | `pnpm run dev:local` |
| 7 | Создать первого admin (`FIRST_ADMIN_*` или вручную в БД) |

## 2. `config/product.ts` — паспорт продукта

Один файл для брендинга (не секреты):

- **name / shortName / description / defaultTitle** — metadata, Open Graph, PWA manifest (`src/app/manifest.ts`)
- **author** — `null` для SaaS без публичного автора → JSON-LD и byline статей скрываются
- **links.github / links.demo** — homepage; `null` отключает SoftwareApplication schema
- **schema.person / schema.softwareApplication** — какие блоки JSON-LD на главной
- **pwa** — цвета и иконки manifest
- **sitemapExtras** — статические URL вне `routes.ts` (например `/rss.xml`)

URL сайта **только из env**: `NEXT_PUBLIC_SITE_URL`.

Соцсети организации: `NEXT_PUBLIC_ORGANIZATION_SAME_AS` (через env, не в product.ts).

## 3. Маршруты и SEO

[`src/constants/routes.ts`](../src/constants/routes.ts) — path, auth, **seo**:

```ts
seo: {
  sitemap: { priority: 0.9, changeFrequency: 'weekly' },
  breadcrumb: true,
  breadcrumbOrder: 2,
}
```

Из этого автоматически строятся:

- XML sitemap (`src/lib/seo/sitemap.ts`)
- breadcrumbs в JSON-LD статей (`src/lib/seo/jsonld.tsx`)

Новая публичная страница → добавьте route с `seo.sitemap` при необходимости.

## 4. Файлы в `public/` (ручная замена)

Не генерируются из конфига — **замените под свой домен**:

| Файл | Назначение |
|------|------------|
| `public/BingSiteAuth.xml` | верификация Bing Webmaster |
| `public/<indexnow-key>.txt` | IndexNow (имя = `INDEXNOW_API_KEY`) |
| `public/llms.txt` | подсказки для AI-краулеров |
| `public/images/*` | favicon, OG, PWA icons |

Статический `public/images/site.webmanifest` **устарел** — manifest отдаётся из `src/app/manifest.ts`.

## 5. Включение функций

Подробно: [`CONFIGURATION.md`](./CONFIGURATION.md).

Минимальный prod-набор часто включает:

```bash
AUTH_PASSWORD_CHANGE_ENABLED=1
AUTH_PASSWORD_FORGOT_ENABLED=1
AUTH_SESSIONS_ENABLED=1
NOTIFY_LOGIN_ENABLED=1
EMAIL_SEND_MODE=elastic
EMAIL_API_KEY=...
```

Онбординг, push, LLM — по необходимости, все за флагами.

## 6. Полезные команды

```bash
pnpm doctor              # проверка .env.local
pnpm doctor:prod         # проверка .env.prod
pnpm run typecheck
pnpm run test
```

## 7. Дальше

- [`CONFIGURATION.md`](./CONFIGURATION.md) — auth, email, MFA, sessions, onboarding
- [`ENV_REFERENCE.md`](./ENV_REFERENCE.md) — все переменные окружения
- [`SECURITY_AND_ACCOUNT_ROADMAP.md`](./SECURITY_AND_ACCOUNT_ROADMAP.md) — что реализовано в security-блоке
- [`CHANGELOG.md`](../CHANGELOG.md) — release notes
