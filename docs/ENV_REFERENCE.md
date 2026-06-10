# Справочник переменных окружения

Источник правды: [`.env.example`](../.env.example) и [`config/env.ts`](../config/env.ts).  
Проверка: `pnpm doctor`.

Легенда: **R** = обязательно в prod, **C** = условно (если фича включена), **O** = опционально.

---

## App & site

| Variable | Default | Notes |
|----------|---------|-------|
| `APP_ENV` | development | `development` \| `stage` \| `production` |
| `NEXT_PUBLIC_APP_ENV` | development | Клиентский env label |
| `NEXT_PUBLIC_SITE_URL` | http://localhost:3000 | **R** prod — canonical URL |
| `APP_INTERNAL_ORIGIN` | — | Self-fetch в Docker (см. README) |
| `COMMIT_HASH` | — | CI inject для RUM/deploy |

## Theme & i18n

| Variable | Default | Notes |
|----------|---------|-------|
| `DEFAULT_THEME_MODE` | dark | `dark` \| `light` |
| `NEXT_PUBLIC_DEFAULT_THEME_MODE` | dark | |
| `NEXT_PUBLIC_DEFAULT_LOCALE` | en | `en` \| `ru` |
| `NEXT_PUBLIC_ORGANIZATION_SAME_AS` | — | O — JSON-LD sameAs, comma-separated |

## JWT & auth

| Variable | Default | Notes |
|----------|---------|-------|
| `JWT_SECRET` | placeholder | **R** — сменить в prod |
| `JWT_ACCESS_EXPIRES_IN` | 3600 | Секунды |
| `JWT_REFRESH_EXPIRES_IN` | 15724800 | ~21 день |
| `FIRST_ADMIN_LOGIN` | — | O — seed admin |
| `FIRST_ADMIN_PASSWORD` | — | O |

## MongoDB

| Variable | Default | Notes |
|----------|---------|-------|
| `MONGO_URI` | — | **R** или host-поля ниже |
| `MONGO_HOST` | localhost / mongo | |
| `MONGO_PORT` | 27017 | |
| `MONGO_USER` | — | |
| `MONGO_PASSWORD` | — | |
| `MONGO_DB` | app | |

## Redis & rate limit

| Variable | Default | Notes |
|----------|---------|-------|
| `REDIS_URL` | — | C — rate limit / LLM limit |
| `RATE_LIMIT_POINTS` | 400 | Запросов в окно |

## MFA

| Variable | Default | Notes |
|----------|---------|-------|
| `MFA_ENCRYPTION_KEY` | — | **R** если MFA используется |

## Registration & email

| Variable | Default | Notes |
|----------|---------|-------|
| `REGISTRATION_MODE` | — | `email` или пусто |
| `REGISTRATION_CODE_PEPPER` | JWT_SECRET | |
| `EMAIL_SEND_MODE` | empty | `console` \| `elastic` \| `empty` |
| `EMAIL_API_KEY` | — | **C** elastic |
| `EMAIL_FROM` | — | **C** elastic |
| `EMAIL_REPLY_TO` | — | O |
| `EMAIL_TEMPLATE_VERIFY_EMAIL_EN/RU` | — | O |
| `EMAIL_TEMPLATE_PASSWORD_CHANGE_EN/RU` | — | O — fallback i18n |
| `EMAIL_TEMPLATE_PASSWORD_FORGOT_EN/RU` | — | O |

## Account security (`ACCOUNT_CONFIG`)

| Variable | Default | Feature |
|----------|---------|---------|
| `AUTH_PASSWORD_CHANGE_ENABLED` | 0 | Profile password change |
| `AUTH_PASSWORD_FORGOT_ENABLED` | 0 | Forgot password flow |
| `AUTH_RECOVERY_STRICTNESS` | strict | `strict` \| `flexible` |
| `AUTH_ADMIN_ACCOUNT_RECOVERY_ENABLED` | 0 | Admin MFA/password reset |
| `AUTH_SESSIONS_ENABLED` | 0 | Sessions UI + API |
| `ONBOARDING_ENABLED` | 0 | Onboarding API |
| `ONBOARDING_PUSH_PROMPT_ENABLED` | 0 | Push step |
| `ONBOARDING_VERSION` | 0 | Bump to re-show |
| `NEXT_PUBLIC_ONBOARDING_ENABLED` | 0 | Onboarding UI |
| `NEXT_PUBLIC_ONBOARDING_PUSH_PROMPT_ENABLED` | 0 | |
| `NEXT_PUBLIC_PUSH_IOS_PWA_HINT_ENABLED` | 0 | iOS PWA hint |

## OAuth (`OAUTH_CONFIG`)

See [`AUTH_OAUTH.md`](./AUTH_OAUTH.md). `pnpm doctor` validates provider lists vs credentials.

| Variable | Default | Notes |
|----------|---------|-------|
| `AUTH_UI_MODE` | credentials_first | `credentials_first` \| `oauth_first` \| `credentials_only` \| `oauth_only` |
| `NEXT_PUBLIC_AUTH_UI_MODE` | — | Client mirror of `AUTH_UI_MODE` |
| `AUTH_OAUTH_SIGN_IN_PROVIDERS` | — | Comma-separated: yandex, google, github, … |
| `AUTH_OAUTH_SIGN_UP_PROVIDERS` | — | |
| `AUTH_OAUTH_LINK_PROVIDERS` | — | Profile link/unlink |
| `NEXT_PUBLIC_AUTH_OAUTH_*_PROVIDERS` | — | Public lists for UI |
| `AUTH_OAUTH_{PROVIDER}_ENABLED` | 0 | Per provider |
| `{PROVIDER}_OAUTH_CLIENT_ID` | — | Yandex / Google / GitHub |
| `{PROVIDER}_OAUTH_CLIENT_SECRET` | — | C — server only |

## Push (VAPID)

| Variable | Default | Notes |
|----------|---------|-------|
| `VAPID_SUBJECT` | — | C — mailto: or https |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | — | C |
| `VAPID_PRIVATE_KEY` | — | C |

## Notifications (`NOTIFICATION_CONFIG`)

| Variable | Default | Notes |
|----------|---------|-------|
| `NOTIFY_ARTICLE_ENABLED` | 0 | |
| `NOTIFY_ARTICLE_CHANNELS` | all | `all` \| `web_push` \| `email` |
| `NOTIFY_MFA_ENABLED` | 0 | |
| `NOTIFY_MFA_CHANNELS` | all | |
| `NOTIFY_LOGIN_ENABLED` | 0 | |
| `NOTIFY_LOGIN_CHANNELS` | email | |
| `NOTIFY_PASSWORD_ENABLED` | 0 | |
| `NOTIFY_PASSWORD_CHANNELS` | email | |

## LLM

| Variable | Default | Notes |
|----------|---------|-------|
| `LLM_API_KEY` | — | **C** if `NEXT_PUBLIC_LLM_ENABLED=true` |
| `NEXT_PUBLIC_LLM_ENABLED` | false | |
| `LLM_CHAT_MODELS` | — | O allowlist |
| `LLM_IMAGE_MODELS` | — | O |
| `LLM_CHAT_RATE_LIMIT_POINTS` | 30 | |
| `LLM_CHAT_RATE_DURATION_SEC` | 60 | |
| `PROXY_ACCESSES` | — | O OpenAI proxy JSON |

## SEO / indexing

| Variable | Default | Notes |
|----------|---------|-------|
| `INDEXNOW_API_KEY` | — | O |
| `INDEXNOW_KEY_LOCATION` | — | O |
| `GOOGLE_INDEXING_CLIENT_EMAIL` | — | O |
| `GOOGLE_INDEXING_PRIVATE_KEY` | — | O |

## RUM

| Variable | Default | Notes |
|----------|---------|-------|
| `RUM_ENABLED` | true | Server ingest |
| `NEXT_PUBLIC_RUM_ENABLED` | false | Client flag |
| `NEXT_PUBLIC_RUM_SAMPLE_RATE` | 0.2 | |
| `NEXT_PUBLIC_SKIP_ANALYTICS_CONSENT` | false | Dev only |

## CDN (Uploadcare)

| Variable | Default | Notes |
|----------|---------|-------|
| `UPLOADCARE_PUBLIC_KEY` | — | O |
| `UPLOADCARE_SECRET_KEY` | — | O |

---

## Не в env: `config/product.ts`

| Field | Purpose |
|-------|---------|
| `name`, `shortName`, `description` | Metadata, manifest |
| `author` | JSON-LD / article byline (`null` = hide) |
| `links.github`, `links.demo` | Homepage, schema |
| `schema.*` | Toggle Person / SoftwareApplication |
| `pwa` | Manifest colors & icons |
| `sitemapExtras` | Extra sitemap URLs |
