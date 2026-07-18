# Конфигурация функций (v0.2.4)

Все feature flags и секреты — в [`config/env.ts`](../config/env.ts) (блоки `ACCOUNT_CONFIG`, `EMAIL_CONFIG`, `NOTIFICATION_CONFIG`, …).  
Брендинг и SEO-контент — в [`config/product.ts`](../config/product.ts).

Перед деплоем: `pnpm doctor`.

---

## Auth и JWT

| Переменная | Назначение |
|------------|------------|
| `JWT_SECRET` | Подпись access/refresh JWT |
| `JWT_ACCESS_EXPIRES_IN` | TTL access cookie (сек), по умолчанию 3600 |
| `JWT_REFRESH_EXPIRES_IN` | TTL refresh / сессии (сек), ~21 день |

Access token привязан к refresh-сессии (`sid` в JWT). Revoke сессии сразу отзывает API-доступ.

**Первый admin:** `FIRST_ADMIN_LOGIN`, `FIRST_ADMIN_PASSWORD` (при старте приложения).

---

## Регистрация

| Переменная | Значения |
|------------|----------|
| `REGISTRATION_MODE` | `email` — OTP на почту; пусто — без email-верификации |
| `REGISTRATION_CODE_PEPPER` | HMAC для кодов (fallback: `JWT_SECRET`) |

Требует рабочий email-канал при `REGISTRATION_MODE=email` (см. Email).

---

## Email

| `EMAIL_SEND_MODE` | Поведение |
|-------------------|-----------|
| `console` | Коды в логах сервера (dev) |
| `elastic` | Elastic Email API |
| `empty` | Отправка отключена |

| Переменная | Назначение |
|------------|------------|
| `EMAIL_API_KEY` | Ключ Elastic (обязателен при `elastic`) |
| `EMAIL_FROM` | Verified sender |
| `EMAIL_TEMPLATE_VERIFY_EMAIL_*` | Шаблоны sign-up |
| `EMAIL_TEMPLATE_PASSWORD_*` | Опционально; пусто → plain text из i18n |

Используется: sign-up OTP, password change/forgot, platform notifications (email channel).

---

## MFA (TOTP)

| Переменная | Назначение |
|------------|------------|
| `MFA_ENCRYPTION_KEY` | Шифрование TOTP secret в БД |

Self-service: setup / confirm / disable в профиле. Admin reset: `AUTH_ADMIN_ACCOUNT_RECOVERY_ENABLED=1`.

---

## Пароли и восстановление

| Флаг | Описание |
|------|----------|
| `AUTH_PASSWORD_CHANGE_ENABLED` | Блок смены пароля в `/profile` |
| `AUTH_PASSWORD_FORGOT_ENABLED` | `/forgot-password` |
| `AUTH_RECOVERY_STRICTNESS` | `strict` — email+MFA если оба есть; `flexible` — один фактор |
| `AUTH_ADMIN_ACCOUNT_RECOVERY_ENABLED` | Admin: сброс MFA + установка пароля |

Политика новых паролей: [`config/password-policy.ts`](../config/password-policy.ts) (UI + API).

После смены/сброса пароля: `logoutAll()` по умолчанию.

API capabilities: `GET /api/v1/auth/recovery/capabilities`.

---

## Сессии

| Флаг | Описание |
|------|----------|
| `AUTH_SESSIONS_ENABLED` | User + admin UI списка сессий |

Одна сессия = один `RefreshToken` с metadata (device, IP, lastSeenAt).  
Revoke через `/api/v1/auth/sessions`.

---

## Онбординг

| Флаг | Описание |
|------|----------|
| `ONBOARDING_ENABLED` | Серверный API |
| `NEXT_PUBLIC_ONBOARDING_ENABLED` | UI (модалка + карточка) |
| `ONBOARDING_PUSH_PROMPT_ENABLED` | Шаг push |
| `ONBOARDING_VERSION` | Bump → показать снова |

Модалка после логина: один раз на устройство (`localStorage`). Карточка в профиле — до явного dismiss.

---

## Push и уведомления

**Web Push (VAPID):**

| Переменная | Назначение |
|------------|------------|
| `VAPID_SUBJECT` | mailto: или https URL |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Публичный ключ |
| `VAPID_PRIVATE_KEY` | Серверный ключ |
| `NEXT_PUBLIC_PUSH_IOS_PWA_HINT_ENABLED` | Подсказка Add to Home Screen на iOS |

**Platform notifications (`NOTIFY_*`):**

```bash
NOTIFY_<EVENT>_ENABLED=1|0
NOTIFY_<EVENT>_CHANNELS=all|web_push|email
```

События: `ARTICLE`, `MFA`, `LOGIN`, `PASSWORD`.

---

## LLM (редактор статей)

| Флаг / переменная | Описание |
|-------------------|----------|
| `NEXT_PUBLIC_LLM_ENABLED` | UI в редакторе |
| `LLM_API_KEY` | OpenAI (server-only) |
| `LLM_CHAT_MODELS`, `LLM_IMAGE_MODELS` | Allowlist |
| `LLM_CHAT_RATE_LIMIT_*` | Rate limit |

---

## SEO и индексация

| Переменная | Назначение |
|------------|------------|
| `NEXT_PUBLIC_SITE_URL` | Canonical base |
| `NEXT_PUBLIC_ORGANIZATION_SAME_AS` | JSON-LD sameAs (comma-separated) |
| `INDEXNOW_API_KEY` | Ping при публикации |
| `INDEXNOW_KEY_LOCATION` | URL ключа |
| `GOOGLE_INDEXING_*` | Опционально (ограниченные типы) |

Маршруты sitemap/breadcrumb: `src/constants/routes.ts` → `seo.*`.

---

## Observability

| Переменная | Назначение |
|------------|------------|
| `RUM_ENABLED` / `NEXT_PUBLIC_RUM_*` | Web Vitals ingest |
| Security audit | `/admin/security-audit` (всегда при наличии admin) |

---

## Тема и i18n

| Переменная | Назначение |
|------------|------------|
| `DEFAULT_THEME_MODE` | SSR fallback |
| `NEXT_PUBLIC_DEFAULT_LOCALE` | `en` / `ru` |

---

## Связанные документы

- [`ENV_REFERENCE.md`](./ENV_REFERENCE.md) — полная таблица переменных
- [`GETTING_STARTED.md`](./GETTING_STARTED.md) — чеклист форка
- [`SECURITY_AND_ACCOUNT_ROADMAP.md`](./SECURITY_AND_ACCOUNT_ROADMAP.md) — детали security-фич
