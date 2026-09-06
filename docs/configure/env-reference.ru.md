# Справочник переменных окружения

English version: [env-reference.en.md](./env-reference.en.md)

Источник правды — [`.env.example`](../../.env.example) (шаблон) и [`config/env.ts`](../../config/env.ts)
(чтение и дефолты). Разделы и порядок здесь те же, что в шаблоне; `pnpm gates`
(`check-env-reference`) не даёт им разойтись по именам. Проверка значений — `pnpm doctor`.

Легенда: **R** — обязательно в prod, **C** — условно (если фича включена), **O** — опционально.
«Дефолт» — что подставит код, если переменная пуста.

## App & site

| Переменная | Дефолт | Заметки |
|---|---|---|
| `APP_ENV` | development | `development` \| `stage` \| `production` |
| `NEXT_PUBLIC_APP_ENV` | development | Клиентский ярлык окружения |
| `NEXT_PUBLIC_SITE_URL` | http://localhost:3000 | **R** — канонический URL для metadata, sitemap, OAuth-редиректов |
| `APP_INTERNAL_ORIGIN` | http://127.0.0.1:3000 | O — серверные запросы к собственному API, когда публичный hostname из контейнера не резолвится |
| `COMMIT_HASH` | — | Проставляет CI; серверный, нужен для корреляции RUM и деплоев |

## Theme & i18n

| Переменная | Дефолт | Заметки |
|---|---|---|
| `DEFAULT_THEME_MODE` | dark | SSR-fallback, когда предпочтение ОС неизвестно: `dark` \| `light` |
| `NEXT_PUBLIC_DEFAULT_THEME_MODE` | dark | Клиентское зеркало |
| `NEXT_PUBLIC_DEFAULT_LOCALE` | en | `en` \| `ru` |
| `NEXT_PUBLIC_ORGANIZATION_SAME_AS` | — | O — JSON-LD `sameAs`, ссылки через запятую |

## Auth & JWT

| Переменная | Дефолт | Заметки |
|---|---|---|
| `JWT_SECRET` | заглушка | **R** — подпись access/refresh; `make setup` генерирует |
| `JWT_ACCESS_EXPIRES_IN` | 3600 | Секунды |
| `JWT_REFRESH_EXPIRES_IN` | 15724800 | ~21 день; TTL refresh-сессии |
| `MFA_ENCRYPTION_KEY` | — | **R**, если используется TOTP. Перегенерация обнуляет все подключённые MFA |
| `FIRST_ADMIN_LOGIN` | — | O — первый админ создаётся на старте, если пользователя нет |
| `FIRST_ADMIN_PASSWORD` | — | O |

## MongoDB

| Переменная | Дефолт | Заметки |
|---|---|---|
| `MONGO_URI` | — | **R** или поля ниже. Внешний кластер — полная строка. Локальный контейнер (`mongo_enabled: true`) — лучше оставить пустым: строка соберётся из полей с `authSource=admin` |
| `MONGO_HOST` | localhost | Имя сервиса compose `mongo` на сервере; `localhost` только при запуске на хосте. Внутри контейнера api `localhost` — это сам api |
| `MONGO_PORT` | 27017 | |
| `MONGO_USER` | — | Контейнер **всегда** создаётся с root-пользователем (`admin`/`password` по умолчанию compose) — задай свои |
| `MONGO_PASSWORD` | — | |
| `MONGO_DB` | app | |

`pnpm doctor` при `MONGO_ENABLED=true` (вход деплоя) ловит четыре ошибки: loopback-хост, URI без
кредов, креды без `authSource`, пустые `MONGO_USER`/`MONGO_PASSWORD` — `config/container-topology.ts`.

## Redis & rate limit

| Переменная | Дефолт | Заметки |
|---|---|---|
| `REDIS_URL` | — | **C** — rate limit, LLM-лимит, BullMQ-воркер. На сервере с `redis_enabled: true` — `redis://redis:6379`, не localhost (доктор при `REDIS_ENABLED=true` считает loopback ошибкой). Без Redis лимитер деградирует в память процесса |
| `RATE_LIMIT_POINTS` | 400 | Запросов в окно на клиента |

## Background worker

Отдельный headless-контейнер с кронами — [`../deploy/background-worker.ru.md`](../deploy/background-worker.ru.md).
Сам контейнер включается входом деплоя `worker_enabled`; переменные ниже гейтят джобы внутри.

| Переменная | Дефолт | Заметки |
|---|---|---|
| `WORKER_HEARTBEAT` | false | Пример-джоба (liveness-лог); замени своими в `scripts/worker.ts` |
| `WORKER_HEARTBEAT_INTERVAL_MS` | 300000 | |

## Registration & email

| Переменная | Дефолт | Заметки |
|---|---|---|
| `REGISTRATION_MODE` | — | `email` — OTP на почту; пусто — регистрация без подтверждения |
| `REGISTRATION_CODE_PEPPER` | JWT_SECRET | HMAC для кодов |
| `EMAIL_SEND_MODE` | empty | `console` (только лог) \| `elastic` (Elastic Email API) \| `empty` (не слать) |
| `EMAIL_API_KEY` | — | **C** elastic |
| `EMAIL_FROM` | Noreply \<noreply@localhost\> | **C** elastic — подтверждённый отправитель |
| `EMAIL_REPLY_TO` | — | O |
| `EMAIL_TEMPLATE_VERIFY_EMAIL_EN` | — | O — имя шаблона Elastic, merge-поле `code` |
| `EMAIL_TEMPLATE_VERIFY_EMAIL_RU` | — | O |
| `EMAIL_TEMPLATE_PASSWORD_CHANGE_EN` | — | O — пусто → plain-text из i18n |
| `EMAIL_TEMPLATE_PASSWORD_CHANGE_RU` | — | O |
| `EMAIL_TEMPLATE_PASSWORD_FORGOT_EN` | — | O |
| `EMAIL_TEMPLATE_PASSWORD_FORGOT_RU` | — | O |

## Account security & onboarding

Флаги `ACCOUNT_CONFIG`; поведение — [`feature-flags.ru.md`](./feature-flags.ru.md).

| Переменная | Дефолт | Заметки |
|---|---|---|
| `AUTH_PASSWORD_CHANGE_ENABLED` | 0 | Смена пароля в профиле |
| `AUTH_PASSWORD_FORGOT_ENABLED` | 0 | Восстановление пароля |
| `AUTH_RECOVERY_STRICTNESS` | strict | `strict` \| `flexible` |
| `AUTH_ADMIN_ACCOUNT_RECOVERY_ENABLED` | 0 | Сброс MFA/пароля админом |
| `AUTH_SESSIONS_ENABLED` | 0 | UI и API активных сессий; access-токен привязан к `sid` |
| `ONBOARDING_VERSION` | 0 | Увеличь, чтобы показать онбординг заново |
| `ONBOARDING_ENABLED` | 0 | API онбординга |
| `ONBOARDING_PUSH_PROMPT_ENABLED` | 0 | Шаг с push-подпиской |
| `NEXT_PUBLIC_ONBOARDING_ENABLED` | 0 | UI онбординга |
| `NEXT_PUBLIC_ONBOARDING_PUSH_PROMPT_ENABLED` | 0 | |
| `NEXT_PUBLIC_PUSH_IOS_PWA_HINT_ENABLED` | 0 | Подсказка про PWA на iOS |

## OAuth / social login

Устройство — [`oauth.ru.md`](./oauth.ru.md). Провайдер включается **тремя** вещами разом: имя в
списках, `AUTH_OAUTH_<X>_ENABLED=1`, client id/secret. Любое упущение — тишина без кнопки и без
ошибки; `pnpm doctor` — единственное, что об этом скажет.

| Переменная | Дефолт | Заметки |
|---|---|---|
| `AUTH_UI_MODE` | credentials_first | `credentials_first` \| `oauth_first` \| `credentials_only` \| `oauth_only` |
| `NEXT_PUBLIC_AUTH_UI_MODE` | — | Клиентское зеркало |
| `AUTH_OAUTH_SIGN_IN_PROVIDERS` | — | Через запятую: yandex, google, github, vk, discord |
| `AUTH_OAUTH_SIGN_UP_PROVIDERS` | — | |
| `AUTH_OAUTH_LINK_PROVIDERS` | — | Привязка/отвязка в профиле |
| `NEXT_PUBLIC_AUTH_OAUTH_SIGN_IN_PROVIDERS` | — | Публичные списки для UI |
| `NEXT_PUBLIC_AUTH_OAUTH_SIGN_UP_PROVIDERS` | — | |
| `NEXT_PUBLIC_AUTH_OAUTH_LINK_PROVIDERS` | — | |
| `AUTH_OAUTH_YANDEX_ENABLED` | 0 | |
| `YANDEX_OAUTH_CLIENT_ID` | — | **C** |
| `YANDEX_OAUTH_CLIENT_SECRET` | — | **C** — только сервер |
| `AUTH_OAUTH_GOOGLE_ENABLED` | 0 | |
| `GOOGLE_OAUTH_CLIENT_ID` | — | **C** |
| `GOOGLE_OAUTH_CLIENT_SECRET` | — | **C** |
| `AUTH_OAUTH_GITHUB_ENABLED` | 0 | |
| `GITHUB_OAUTH_CLIENT_ID` | — | **C** |
| `GITHUB_OAUTH_CLIENT_SECRET` | — | **C** |
| `AUTH_OAUTH_VK_ENABLED` | 0 | |
| `VK_OAUTH_CLIENT_ID` | — | **C** |
| `VK_OAUTH_CLIENT_SECRET` | — | **C** |
| `AUTH_OAUTH_DISCORD_ENABLED` | 0 | |
| `DISCORD_OAUTH_CLIENT_ID` | — | **C** |
| `DISCORD_OAUTH_CLIENT_SECRET` | — | **C** |

## Web push (VAPID)

| Переменная | Дефолт | Заметки |
|---|---|---|
| `VAPID_SUBJECT` | — | **C** — `mailto:` или https-URL |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | — | **C** — `make setup` генерирует пару |
| `VAPID_PRIVATE_KEY` | — | **C** |

## Notifications

`NOTIFICATION_CONFIG`. Каналы: `all` или список из `web_push`, `email`.

| Переменная | Дефолт | Заметки |
|---|---|---|
| `NOTIFY_ARTICLE_ENABLED` | 0 | Публикация статьи |
| `NOTIFY_ARTICLE_CHANNELS` | all | |
| `NOTIFY_MFA_ENABLED` | 0 | Включение/выключение MFA |
| `NOTIFY_MFA_CHANNELS` | all | |
| `NOTIFY_LOGIN_ENABLED` | 0 | Вход с нового устройства |
| `NOTIFY_LOGIN_CHANNELS` | email | |
| `NOTIFY_PASSWORD_ENABLED` | 0 | Смена/сброс пароля |
| `NOTIFY_PASSWORD_CHANNELS` | email | |

## LLM

| Переменная | Дефолт | Заметки |
|---|---|---|
| `NEXT_PUBLIC_LLM_ENABLED` | false | Чат и подсказки в редакторе статей |
| `LLM_API_KEY` | — | **C**, если LLM включён; только сервер |
| `LLM_CHAT_MODELS` | gpt-4o-mini,gpt-4o | O — allowlist чат-моделей |
| `LLM_IMAGE_MODELS` | gpt-image-1-mini,gpt-image-1.5 | O — allowlist для генерации картинок |
| `LLM_CHAT_RATE_LIMIT_POINTS` | 30 | Запросов пользователя в окно |
| `LLM_CHAT_RATE_DURATION_SEC` | 60 | |
| `PROXY_ACCESSES` | — | O — JSON-массив `"host:port:user:password[:geo]"`; на запрос берётся случайный |

## SEO & indexing

| Переменная | Дефолт | Заметки |
|---|---|---|
| `INDEXNOW_API_KEY` | — | O — ключ IndexNow (Bing, Yandex). Публичен по протоколу: отдаётся как `/<key>.txt`, может жить в Variables деплоя |
| `INDEXNOW_KEY_LOCATION` | — | O |
| `GOOGLE_INDEXING_CLIENT_EMAIL` | — | O — Google Indexing API (только JobPosting/BroadcastEvent) |
| `GOOGLE_INDEXING_PRIVATE_KEY` | — | O — приватный ключ в одну строку, `\n` → `\\n` |
| `SEO_NOTIFY_AUTH_ENABLED` | false | Защита `/api/v1/seo/*` заголовком `x-seo-notify-secret`. Включено + пустой секрет → 503 |
| `SEO_NOTIFY_SECRET` | — | **C**, если защита включена; `make setup` генерирует |

## RUM

| Переменная | Дефолт | Заметки |
|---|---|---|
| `RUM_ENABLED` | true | Серверный приём Web Vitals (`/api/v1/rum`) |
| `NEXT_PUBLIC_RUM_ENABLED` | true | Клиентская отправка |
| `NEXT_PUBLIC_RUM_SAMPLE_RATE` | 0.2 | Доля загрузок, которые репортят все vitals (0–1) |
| `NEXT_PUBLIC_SKIP_ANALYTICS_CONSENT` | false | Только dev: без баннера согласия |

## CDN (Uploadcare)

| Переменная | Дефолт | Заметки |
|---|---|---|
| `UPLOADCARE_PUBLIC_KEY` | — | O — загрузка медиа |
| `UPLOADCARE_SECRET_KEY` | — | O |

## Machine access: API tokens + MCP

`API_TOKENS_CONFIG`. Устройство — [`../../mcp/README.md`](../../mcp/README.md) и
[`../develop/mcp-server.ru.md`](../develop/mcp-server.ru.md).

| Переменная | Дефолт | Заметки |
|---|---|---|
| `API_TOKENS_ENABLED` | 0 | PAT-auth, `/api/v1/api-token/*`, удалённый MCP `/api/mcp`, страницы `/admin/api-tokens` и `/profile/api-tokens` |
| `NEXT_PUBLIC_API_TOKENS_ENABLED` | 0 | Пункты навигации |
| `MCP_SERVER_NAME` | nsb-mcp | Имя, которое MCP-сервер сообщает хостам |
| `NEXT_PUBLIC_API_TOKEN_BRAND` | nsb | Префиксы `<brand>_pat_`, `<brand>_oat_`, `<brand>_mcp_client_`. Меняется один раз при старте проекта |
| `MCP_OAUTH_ENABLED` | 0 | OAuth 2.1 поверх `/api/mcp` для коннекторов Claude; требует `API_TOKENS_ENABLED=1` — [`../develop/mcp-oauth-design.ru.md`](../develop/mcp-oauth-design.ru.md) |
| `MCP_OAUTH_ACCESS_TTL_MINUTES` | 60 | Короткоживущий access, refresh через `refresh_token` |
| `MCP_OAUTH_CLIENT_RETENTION_DAYS` | 30 | Ленивая чистка DCR-клиентов без грантов и активности |
| `API_TOKEN_USAGE_RETENTION_DAYS` | 30 | TTL ряда использования (`/admin/machine-access`). Менять на живой базе — сбрасывать TTL-индекс |

Переменные MCP-хоста (не приложения): `NSB_API_BASE_URL`, `NSB_API_TOKEN`.

<!-- env-gate: ignore -->
## Не в `.env`: входы деплоя и compose

Приходят из `prod-deploy.yml` → `reusable-deploy-config.yml`, а не из файла окружения.

| Имя | Откуда | Что делает |
|---|---|---|
| `MONGO_ENABLED`, `REDIS_ENABLED` | входы `mongo_enabled` / `redis_enabled` | Доктор перед деплоем проверяет топологию sibling-контейнеров |
| `WORKER_ENABLED` | вход `worker_enabled` | Поднимает контейнер воркера |
| `SERVER_MEMORY_MB`, `*_MEM_LIMIT`, `WORKER_NODE_OPTIONS` | входы бюджета памяти | `scripts/lib/memory-limits.sh` |
| `env_public` | Variables репозитория | Публичная часть окружения, дописывается после секрета — [`../deploy/ci-notifications-lighthouse.ru.md`](../deploy/ci-notifications-lighthouse.ru.md) |
<!-- /env-gate -->

## Не в `.env`: `config/product.ts`

| Поле | Назначение |
|---|---|
| `name`, `shortName`, `description` | Metadata, manifest |
| `author` | JSON-LD и byline статей (`null` — скрыть) |
| `links.github`, `links.demo` | Главная, schema |
| `schema.*` | Person / SoftwareApplication |
| `pwa` | Цвета и иконки manifest |
| `sitemapExtras` | Дополнительные URL sitemap |
