# Старт проекта

English version: [getting-started.en.md](./getting-started.en.md)

Первый час после форка. Инфраструктура (Docker, CI, nginx) — в
[`../deploy/github-actions.en.md`](../deploy/github-actions.en.md); повседневные команды — в
[`local-development.en.md`](./local-development.en.md).

## 0. Одной командой

```bash
pnpm install
./scripts/init-project.sh    # только на свежем форке
```

Скрипт спросит slug / название / домен / автора, переименует захардкоженные плейсхолдеры
(`package.json`, `config/product.ts`, `prod-deploy.yml`, User-Agent в GitHub OAuth, `Makefile`),
создаст `.env.local` из `.env.example` со сгенерированными `JWT_SECRET`, `MFA_ENCRYPTION_KEY`,
`SEO_NOTIFY_SECRET` и VAPID, запишет их копию в gitignore-файл `.project-initialized` (оттуда — в
CI-секреты для прода) и прогонит `pnpm doctor`. Запускается один раз (guard-файл).

Каждый следующий раз — новая машина, новый человек в команде, новая переменная в шаблоне — это
`make setup`: доливает недостающие ключи из `.env.example`, заполняет только пустые и заканчивает
доктором. Непустые значения не трогает никогда.

## 1. Заполнить своё

| Шаг | Что |
|---|---|
| 1 | `.env.local`: Mongo (`MONGO_*` или `MONGO_URI`), `REDIS_URL`, `FIRST_ADMIN_*` — все переменные в [`../configure/env-reference.ru.md`](../configure/env-reference.ru.md) |
| 2 | `pnpm doctor` — согласованность env и флагов |
| 3 | [`config/product.ts`](../../config/product.ts) — описание, `author: null` для SaaS без публичного автора, PWA-цвета и иконки |
| 4 | `make up-local` (локальная Mongo) или внешний `MONGO_URI` |
| 5 | `pnpm dev:local` — http://localhost:3000 |
| 6 | Войти первым админом (`FIRST_ADMIN_*`, создаётся на старте) |

## 2. `config/product.ts` — паспорт продукта

Один файл для брендинга (не секреты):

- **name / shortName / description / defaultTitle** — metadata, Open Graph, PWA manifest (`src/app/manifest.ts`)
- **author** — `null` скрывает JSON-LD Person и byline статей
- **links.github / links.demo** — главная; `null` отключает schema SoftwareApplication
- **schema.person / schema.softwareApplication** — какие блоки JSON-LD рендерятся на главной
- **pwa** — цвета и иконки manifest
- **sitemapExtras** — статические URL вне `routes.ts` (например `/rss.xml`)

URL сайта **только из env**: `NEXT_PUBLIC_SITE_URL`. Соцсети организации:
`NEXT_PUBLIC_ORGANIZATION_SAME_AS`.

## 3. Маршруты и SEO

[`src/constants/routes.ts`](../../src/constants/routes.ts) — path, auth, **seo**:

```ts
seo: {
  sitemap: { priority: 0.9, changeFrequency: 'weekly' },
  breadcrumb: true,
  breadcrumbOrder: 2,
}
```

Из этого строятся XML sitemap (`src/lib/seo/sitemap.ts`) и breadcrumbs статей в JSON-LD
(`src/lib/seo/jsonld.tsx`). Новая публичная страница → route с `seo.sitemap`.

## 4. Файлы в `public/` (ручная замена)

| Файл | Назначение |
|---|---|
| `public/BingSiteAuth.xml` | верификация Bing Webmaster |
| `public/<indexnow-key>.txt` | IndexNow (имя = `INDEXNOW_API_KEY`) |
| `public/llms.txt` | подсказки для AI-краулеров |
| `public/images/*` | favicon, OG, PWA-иконки |

Статический `public/images/site.webmanifest` устарел — manifest отдаётся из `src/app/manifest.ts`.

## 5. Включение функций

Подробно: [`../configure/feature-flags.ru.md`](../configure/feature-flags.ru.md). Частый минимальный prod-набор:

```bash
AUTH_PASSWORD_CHANGE_ENABLED=1
AUTH_PASSWORD_FORGOT_ENABLED=1
AUTH_SESSIONS_ENABLED=1
NOTIFY_LOGIN_ENABLED=1
EMAIL_SEND_MODE=elastic
EMAIL_API_KEY=...
```

Онбординг, push, LLM, OAuth, API-токены / MCP — всё за флагами, по умолчанию выключено.

## 6. Перед первым деплоем

- Секреты репозитория: `WEB_ENV_PROD` (содержимое env-файла), SSH-доступ, `GHCR_*`, при желании
  `TG_*` для уведомлений — [`../deploy/github-actions.en.md`](../deploy/github-actions.en.md).
- `doctor_check_enabled: true` в `prod-deploy.yml` гоняет `pnpm doctor:prod` по собранному env до
  того, как что-то тронет сервер. Красный доктор — ошибка в env, а не в гейте.
- Работа с AI-агентами: контракт — [`../../AGENTS_RU.md`](../../AGENTS_RU.md); `pnpm gates`
  держит его в лимитах.

## 7. Дальше

- [`local-development.en.md`](./local-development.en.md) — команды, локальный HTTPS, подключение к серверной БД
- [`../configure/env-reference.ru.md`](../configure/env-reference.ru.md) — все переменные
- [`../security/account-security.ru.md`](../security/account-security.ru.md) — что реализовано в security-блоке
- [`../../CHANGELOG.md`](../../CHANGELOG.md) — release notes
