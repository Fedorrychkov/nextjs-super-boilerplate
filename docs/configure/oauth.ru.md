# OAuth & Social Auth — спецификация (v0.2.2)

Планируемое расширение credential-based auth: вход и регистрация через внешние провайдеры, **ручная привязка** аккаунтов в профиле, гибкая конфигурация через env.

**Статус:** 📋 спецификация (код ещё не реализован).  
**Версия цели:** v0.2.2  
**Связанные документы:** [`docs/security/account-security.ru.md`](../security/account-security.ru.md), [`docs/configure/feature-flags.ru.md`](./feature-flags.ru.md), [`docs/configure/env-reference.ru.md`](./env-reference.ru.md)

---

## Содержание

1. [Цели и принципы](#цели-и-принципы)
2. [Связь с текущим auth](#связь-с-текущим-auth)
3. [Провайдеры](#провайдеры)
4. [MFA и email-верификация](#mfa-и-email-верификация)
5. [Способы входа у одного пользователя](#способы-входа-у-одного-пользователя)
6. [Три сценария: sign-up, sign-in, link](#три-сценария-sign-up-sign-in-link)
7. [Коллизии email (без автолинка)](#коллизии-email-без-автолинка)
8. [Состояния аккаунта и пароль](#состояния-аккаунта-и-пароль)
9. [Конфигурация env](#конфигурация-env)
10. [Модель данных](#модель-данных)
11. [API (план)](#api-план)
12. [Структура кода (план)](#структура-кода-план)
13. [Admin anti-fraud](#admin-anti-fraud)
14. [Особенности провайдеров](#особенности-провайдеров)
15. [Валидация `pnpm doctor`](#валидация-pnpm-doctor)
16. [Фазы реализации](#фазы-реализации)
17. [FAQ / edge cases](#faq--edge-cases)

---

## Цели и принципы

### Зачем

- Baseline ожидание 2026: вход через Google / GitHub / Яндекс и т.д.
- **Self-hosted** без vendor lock-in: провайдеры включаются env-флагами, не переписывая auth.
- Сохранить **session-bound JWT** (`sid` → `RefreshToken`): revoke сессии = немедленный 401.
- Максимальная **пластичность форка**: отдельные списки «кто на login/register» и «кто в профиле для link».

### Жёсткие правила

| # | Правило |
|---|---------|
| 1 | **Нет автолинка по email** — ни при sign-in, ни при sign-up, ни при link. |
| 2 | Identity провайдера = пара **`(provider, providerUserId)`**, не email. |
| 3 | **Sign-in через OAuth** только если `OAuthAccount` уже привязан к пользователю (кроме sign-up, который создаёт первую привязку). |
| 4 | **Link** только из залогиненного профиля (authenticated flow). |
| 5 | Все успешные входы → тот же pipeline: `createAuthTokensForUser()` → HttpOnly cookies + `sid`. |
| 6 | Провайдер = **плагин** с общим интерфейсом + env per provider. |

### Что не делаем в v0.2.2

- **ЕСИА / Госуслуги** — отдельная бюрократия (КЭП, типовое решение, ГОСТ-подпись). Вне scope.
- Twitter/X, Facebook, Reddit — не в целевом списке v0.2.2.

---

## Связь с текущим auth

Уже реализовано (см. [`docs/security/account-security.ru.md`](../security/account-security.ru.md)):

| Компонент | Роль для OAuth |
|-----------|----------------|
| `AuthService.generateAuthResponse()` | Единая выдача access/refresh после любого способа входа |
| `sid` в JWT | Привязка access к `RefreshToken`; revoke = мгновенный logout |
| `setAuthCookies()` | HttpOnly cookies |
| `assertActiveAccessSession()` | Проверка живой сессии на каждый API-запрос |
| MFA (TOTP) | После OAuth sign-in — **тот же челлендж**, если MFA включён |
| `REGISTRATION_MODE=email` | OTP при credential sign-up; **не применяется** к OAuth sign-up |
| `notifyNewLogin()` | Срабатывает и после OAuth login |
| Rate limit | На все auth routes |

OAuth **не заменяет** NextAuth/Lucia целиком — добавляется нативно поверх существующего `AuthService`, чтобы не ломать `sid`-модель.

---

## Провайдеры

### Целевой список v0.2.2

| ID | Название | Протокол | Sign-up / Sign-in | Link в профиле |
|----|----------|----------|-------------------|----------------|
| `yandex` | Яндекс | OAuth 2.0 | ✅ | ✅ |
| `google` | Google | OIDC | ✅ | ✅ |
| `github` | GitHub | OAuth 2.0 | ✅ | ✅ |
| `apple` | Apple | OIDC | ✅ | ✅ |
| `vk` | VK ID | OAuth 2.0 | ✅ | ✅ |
| `telegram` | Telegram | Login Widget | ✅ | ✅ |
| `microsoft` | Microsoft | OIDC | ✅ | ✅ |
| `discord` | Discord | OAuth 2.0 | ✅ | ✅ |

Списки **sign-in/sign-up** и **link** задаются env отдельно. Пример: на `/register` только `yandex,google`, в профиле link ещё и `github` (для будущих GitHub API / pipelines).

### Расширение в будущем (registry, не v0.2.2)

| ID | Зачем |
|----|-------|
| `oidc` | Generic OIDC — Keycloak, Authentik, корпоративный IdP одним env-блоком |
| `linkedin` | B2B SaaS |

---

## MFA и email-верификация

### Регистрация через соцсеть

- **Email OTP не нужен** — внешний IdP уже подтвердил контакт (или выдал идентификатор без email, см. Apple relay).
- `REGISTRATION_MODE=email` **не блокирует** OAuth sign-up.

### Вход через соцсеть

| Условие | Поведение |
|---------|-----------|
| У пользователя **MFA выключен** | OAuth callback → сразу tokens + cookies |
| У пользователя **MFA включён** | OAuth callback → `challengeId` → `MfaCodeBlock` → tokens (как после email+password) |

OAuth доказывает «ты у Яндекса/Google». TOTP доказывает «это твой аккаунт в нашей системе с 2FA». Оба слоя независимы.

### Другие действия (как сейчас + OAuth)

| Действие | MFA / re-auth |
|----------|----------------|
| Link провайдера в профиле | TOTP если включён (или подтверждение паролем) |
| Unlink провайдера | TOTP если включён |
| Установить пароль (oauth-only) | TOTP если включён |
| Смена / forgot пароля | Только если пароль уже есть; MFA по текущим правилам |
| Revoke сессий | По текущим правилам |

---

## Способы входа у одного пользователя

Один `User` может иметь **несколько независимых способов входа**:

```
User
├── email + password     (если password установлен)
├── OAuthAccount yandex  (если привязан)
├── OAuthAccount google  (если привязан)
├── OAuthAccount github  (если привязан)
└── …
```

- Вход по паролю — если `password != null`.
- Вход через Яндекс — только если в БД есть `OAuthAccount(provider=yandex, providerUserId=…)`.
- Первый OAuth при **sign-up** создаёт `User` + первый `OAuthAccount` — это не «link», а первичная регистрация.

---

## Три сценария: sign-up, sign-in, link

### Sign-up (регистрация через OAuth)

```
GET /api/v1/auth/oauth/{provider}/start?flow=signUp&next=/
  → state + PKCE в Redis
  → redirect на IdP

GET /api/v1/auth/oauth/{provider}/callback?flow=signUp
  → exchange code → profile(providerUserId, email?, …)
  → OAuthAccount(provider, providerUserId) уже есть?
       да → ошибка «аккаунт уже существует, войдите»
  → email занят другим User (credential или другой OAuth user)?
       да → email_collision, лог, ошибка (см. ниже)
  → иначе: создать User (password=null, emailOrigin=oauth) + OAuthAccount
  → MFA включён у нового user? (обычно нет) → tokens
```

### Sign-in (вход через OAuth)

```
GET /api/v1/auth/oauth/{provider}/start?flow=signIn&next=/

GET /api/v1/auth/oauth/{provider}/callback?flow=signIn
  → OAuthAccount(provider, providerUserId) найден?
       нет → «Аккаунт не найден. Зарегистрируйтесь или войдите по паролю»
       да  → загрузить User
             → mfaEnabled? → MFA challenge → tokens
             → иначе → tokens
```

**Важно:** sign-in **не создаёт** пользователя и **не линкует** по email.

### Link (привязка в профиле)

Только для **аутентифицированного** пользователя (`accessToken` + живая сессия `sid`).

```
GET /api/v1/auth/oauth/{provider}/link/start
  → state привязан к currentUserId (+ PKCE)

GET /api/v1/auth/oauth/{provider}/link/callback
  → OAuthAccount(provider, providerUserId) уже у другого userId?
       да → ошибка «этот аккаунт {Provider} уже привязан к другому пользователю»
  → иначе: создать OAuthAccount для currentUserId
  → опционально сохранить scopes / encrypted tokens для API (GitHub)
```

После link пользователь может **входить через этот провайдер** на `/login` (sign-in flow).

### Unlink

```
DELETE /api/v1/auth/oauth/{provider}
  → запретить, если после unlink не останется способа входа:
     (нет password И это последний OAuthAccount)
  → TOTP если включён
```

---

## Коллизии email (без автолинка)

Email используется для **UX и антифрода**, не для слияния аккаунтов.

### Сценарии

| # | Ситуация | Действие |
|---|----------|----------|
| A | Есть `User` с паролем `ivan@gmail.com`. Sign-up Google с тем же email | **Блок.** Лог `email_collision`. Сообщение: войдите по паролю и подключите Google в профиле. |
| B | Зарегистрировался через Яндекс. В профиле link Google (другой email) | **OK.** Два провайдера, один User. |
| C | Зарегистрировался через Яндекс. Sign-up Google с email, совпадающим с Яндекс-user | **Блок** (email уже занят User A). Не второй аккаунт. |
| D | Google `providerUserId` уже привязан к User A. User B пытается link тот же Google | **Блок** по `providerUserId`. |
| E | Одна почта в Яндексе и в Google (ivan@gmail.com везде) | Первый sign-up → один User. Второй провайдер — **только link из профиля**, не sign-up. |

### Сообщения пользователю (i18n)

- `auth.errors.oauthAccountNotFound` — sign-in, привязки нет
- `auth.errors.oauthEmailCollision` — sign-up, email занят
- `auth.errors.oauthProviderAlreadyLinked` — providerUserId у другого user
- `auth.errors.oauthCannotUnlinkLastMethod` — unlink заблокирован

---

## Состояния аккаунта и пароль

### Типы аккаунта

| Состояние | password | OAuthAccount | Вход |
|-----------|----------|--------------|------|
| `credentials_only` | ✅ | 0 | email + password |
| `oauth_only` | ❌ | ≥1 | только привязанные провайдеры |
| `hybrid` | ✅ | ≥1 | пароль + любой привязанный провайдер |

### Установить пароль (oauth_only → hybrid)

Доступно в профиле:

1. Пользователь залогинен (любым способом).
2. MFA пройден, если включён.
3. `assertPasswordPolicy`.
4. `User.password` устанавливается; `emailOrigin` не меняется.

После этого доступны: вход по паролю, forgot password (если включён env), смена пароля.

### Смена / forgot пароля

| Состояние | Смена пароля | Forgot password |
|-----------|--------------|-----------------|
| `credentials_only` | ✅ | ✅ (если `AUTH_PASSWORD_FORGOT_ENABLED`) |
| `oauth_only` | скрыто | скрыто; подсказка «войдите через …» |
| `hybrid` | ✅ | ✅ |

### OAuth-only и безопасность

- Нет пароля → нет credential brute-force на этот аккаунт.
- Восстановление — через IdP + link в профиле (если потерял доступ к IdP — admin recovery по [`docs/security/account-security.ru.md`](../security/account-security.ru.md)).
- Установка пароля — осознанное действие в профиле с MFA, не при первом OAuth sign-up.

---

## Конфигурация env

Планируемый блок: `config/auth-oauth.ts` (парсинг) + переменные в `.env`.

### Глобальные

```env
# Раскладка UI на /login и /register
# credentials_first | oauth_first | credentials_only | oauth_only
AUTH_UI_MODE=credentials_first
NEXT_PUBLIC_AUTH_UI_MODE=credentials_first

# Кто показывается на входе и регистрации (comma-separated provider ids)
AUTH_OAUTH_SIGN_IN_PROVIDERS=yandex,google,github
AUTH_OAUTH_SIGN_UP_PROVIDERS=yandex,google,github
NEXT_PUBLIC_AUTH_OAUTH_SIGN_IN_PROVIDERS=yandex,google,github
NEXT_PUBLIC_AUTH_OAUTH_SIGN_UP_PROVIDERS=yandex,google,github

# Кто доступен в профиле «Подключить аккаунт»
AUTH_OAUTH_LINK_PROVIDERS=yandex,google,github,apple,vk,telegram,microsoft,discord
NEXT_PUBLIC_AUTH_OAUTH_LINK_PROVIDERS=yandex,google,github
```

**Правило:** провайдер в списке `SIGN_IN_*` / `LINK_*` должен быть `AUTH_OAUTH_{PROVIDER}_ENABLED=1` и иметь credentials — иначе `pnpm doctor` → error.

### Per-provider (шаблон)

```env
AUTH_OAUTH_YANDEX_ENABLED=1
YANDEX_OAUTH_CLIENT_ID=
YANDEX_OAUTH_CLIENT_SECRET=
# опционально; default: {NEXT_PUBLIC_SITE_URL}/api/v1/auth/oauth/yandex/callback

AUTH_OAUTH_GOOGLE_ENABLED=1
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=

AUTH_OAUTH_GITHUB_ENABLED=1
GITHUB_OAUTH_CLIENT_ID=
GITHUB_OAUTH_CLIENT_SECRET=

AUTH_OAUTH_APPLE_ENABLED=0
APPLE_OAUTH_CLIENT_ID=
APPLE_OAUTH_TEAM_ID=
APPLE_OAUTH_KEY_ID=
APPLE_OAUTH_PRIVATE_KEY=

AUTH_OAUTH_VK_ENABLED=0
VK_OAUTH_CLIENT_ID=
VK_OAUTH_CLIENT_SECRET=

AUTH_OAUTH_TELEGRAM_ENABLED=0
TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_USERNAME=

AUTH_OAUTH_MICROSOFT_ENABLED=0
MICROSOFT_OAUTH_CLIENT_ID=
MICROSOFT_OAUTH_CLIENT_SECRET=
MICROSOFT_OAUTH_TENANT=common

AUTH_OAUTH_DISCORD_ENABLED=0
DISCORD_OAUTH_CLIENT_ID=
DISCORD_OAUTH_CLIENT_SECRET=
```

### Пример форка (RU-first, GitHub только link)

```env
AUTH_UI_MODE=oauth_first
AUTH_OAUTH_SIGN_IN_PROVIDERS=yandex,google
AUTH_OAUTH_SIGN_UP_PROVIDERS=yandex,google
AUTH_OAUTH_LINK_PROVIDERS=yandex,google,github

AUTH_OAUTH_YANDEX_ENABLED=1
AUTH_OAUTH_GOOGLE_ENABLED=1
AUTH_OAUTH_GITHUB_ENABLED=1
```

На `/login` — Яндекс и Google. GitHub подключается в профиле для API / pipelines, после link — вход через GitHub тоже доступен.

---

## Модель данных

### `OAuthAccount` (новая коллекция)

```ts
{
  userId: ObjectId              // ref User
  provider: OAuthProviderId     // 'yandex' | 'google' | ...
  providerUserId: string        // стабильный id у IdP
  providerEmail?: string | null // snapshot, не для линка
  providerLogin?: string | null // github login, telegram username, …
  scopes?: string[]
  accessTokenEnc?: string | null   // опционально, для API (GitHub)
  refreshTokenEnc?: string | null
  tokenExpiresAt?: Date | null
  linkedAt: Date
  lastUsedAt?: Date | null
}
// unique index: { provider: 1, providerUserId: 1 }
// index: { userId: 1 }
```

### Изменения `User`

```ts
{
  email: string                 // unique, lowercase
  password?: string | null      // optional — для oauth_only
  emailOrigin: 'credentials' | 'oauth' | 'admin'
  emailTrust?: 'native' | 'external' | 'disputed' | null  // admin-only
  // role, status, languageCode, … без изменений
}
```

| Поле | Назначение |
|------|------------|
| `emailOrigin=credentials` | Регистрация по паролю / admin |
| `emailOrigin=oauth` | Первый вход через OAuth |
| `emailTrust=disputed` | Админ: на email был credential-user, были попытки OAuth (антифрод) |
| `emailTrust=native` | Админ: email считаем «родным» |
| `emailTrust=external` | Админ: email пришёл только из IdP |

Pre-save hook: если `password` задан — bcrypt; если `null` — пропуск хеширования.

### `OAuthAttemptLog` (антифрод, admin)

```ts
{
  provider: OAuthProviderId
  providerUserId: string
  providerEmail?: string | null
  flow: 'signIn' | 'signUp' | 'link'
  outcome: 'success' | 'email_collision' | 'provider_taken' | 'not_found' | 'error'
  collisionUserId?: ObjectId | null
  actorUserId?: ObjectId | null   // для link
  ip?: string | null
  userAgent?: string | null
  createdAt: Date
}
```

---

## API (план)

| Method | Path | Auth | Описание |
|--------|------|------|----------|
| GET | `/api/v1/auth/oauth/{provider}/start` | — | `flow=signIn\|signUp`, redirect IdP |
| GET | `/api/v1/auth/oauth/{provider}/callback` | — | Обработка code, cookies или MFA challenge |
| GET | `/api/v1/auth/oauth/{provider}/link/start` | ✅ | Начало link из профиля |
| GET | `/api/v1/auth/oauth/{provider}/link/callback` | ✅ | Завершение link |
| DELETE | `/api/v1/auth/oauth/{provider}` | ✅ | Unlink |
| GET | `/api/v1/auth/oauth/accounts` | ✅ | Список привязанных провайдеров |
| GET | `/api/v1/admin/oauth-attempts` | admin | Лог коллизий / попыток |

Redirect URI по умолчанию:

```
{NEXT_PUBLIC_SITE_URL}/api/v1/auth/oauth/{provider}/callback
{NEXT_PUBLIC_SITE_URL}/api/v1/auth/oauth/{provider}/link/callback
```

### State / PKCE

- `state` — CSRF, одноразовый, Redis TTL ~10 min.
- PKCE — для провайдеров, где требуется (Apple, и др.).
- Link-flow: в state также `userId` + `intent=link`.

---

## Структура кода (план)

```
config/auth-oauth.ts                 # парсинг env, getEnabledProviders()
lib/oauth/
  types.ts                           # OAuthProvider interface, OAuthProviderId
  registry.ts                          # реестр провайдеров
  oauth-flow.service.ts              # start/callback signIn|signUp
  oauth-link.service.ts              # link/unlink/list
  oauth-collision.service.ts         # логирование, политики
  providers/
    yandex.provider.ts
    google.provider.ts
    github.provider.ts
    apple.provider.ts
    vk.provider.ts
    telegram.provider.ts
    microsoft.provider.ts
    discord.provider.ts
lib/db/models/OAuthAccount.ts
lib/db/models/OAuthAttemptLog.ts

src/app/api/v1/auth/oauth/[provider]/start/route.ts
src/app/api/v1/auth/oauth/[provider]/callback/route.ts
src/app/api/v1/auth/oauth/[provider]/link/start/route.ts
src/app/api/v1/auth/oauth/[provider]/link/callback/route.ts
src/app/api/v1/auth/oauth/[provider]/route.ts          # DELETE unlink
src/app/api/v1/auth/oauth/accounts/route.ts

src/components/Views/Auth/OAuthProviderButtons.tsx
src/components/Views/User/Profile/ConnectedAccountsSection.tsx
```

### Интерфейс провайдера

```ts
interface OAuthProvider {
  id: OAuthProviderId
  displayName: string
  getAuthorizationUrl(params: {
    redirectUri: string
    state: string
    pkce?: { codeChallenge: string; method: 'S256' }
    scopes: string[]
    flow: 'signIn' | 'signUp' | 'link'
  }): string | Promise<string>

  exchangeCode(params: {
    code: string
    redirectUri: string
    pkce?: { codeVerifier: string }
  }): Promise<OAuthTokenSet>

  getProfile(tokens: OAuthTokenSet): Promise<OAuthProfile>

  defaultSignInScopes: string[]
  defaultLinkScopes: string[]
  extendedLinkScopes?: string[]   // GitHub: repo, workflow — опционально
}

type OAuthProfile = {
  providerUserId: string
  email?: string | null
  emailVerified?: boolean
  name?: string | null
  avatarUrl?: string | null
  login?: string | null
}
```

---

## Admin anti-fraud

В админке (`/admin/users` или отдельная вкладка):

| Функция | Описание |
|---------|----------|
| Колонка **Email origin** | `credentials` / `oauth` / `admin` |
| Фильтр **Disputed** | `emailTrust=disputed` |
| Лента **OAuth attempts** | `OAuthAttemptLog`, фильтр по `email_collision` |
| Действие **Пометить email** | `native` / `external` / `disputed` (без автолинка!) |

Цель: видеть попытки «зайти через Яндекс на чужой email», не сливая аккаунты автоматически.

---

## Особенности провайдеров

| Provider | Заметки |
|----------|---------|
| **Yandex** | `oauth.yandex.ru`, userinfo `login.yandex.ru/info` |
| **Google** | OIDC; стандартные scopes `openid email profile` |
| **GitHub** | Email может быть private — запросить scope `user:email`; link scopes для API: `repo`, `read:user` |
| **Apple** | Обязателен `response_mode=form_post`; private relay email; JWT client secret |
| **VK** | VK ID OAuth 2.0 (не legacy API) |
| **Telegram** | [Login Widget](https://core.telegram.org/widgets/login) + проверка HMAC подписи; не redirect OAuth |
| **Microsoft** | Tenant: `common` / `organizations` / GUID; Azure App Registration |
| **Discord** | Стандартный OAuth2; email scope |

---

## Валидация `pnpm doctor`

| Проверка | Уровень |
|----------|---------|
| Провайдер в `SIGN_IN_PROVIDERS`, но `AUTH_OAUTH_*_ENABLED=0` | error |
| Провайдер enabled, пустой `CLIENT_ID` или `CLIENT_SECRET` | error |
| `AUTH_UI_MODE=oauth_only`, но нет ни одного sign-in провайдера | error |
| `LINK_PROVIDERS` содержит id без реализации в registry | warn |
| Telegram enabled без `TELEGRAM_BOT_TOKEN` | error |
| Apple enabled без key/team/id | error |

---

## Фазы реализации

| Фаза | Содержание | Приоритет |
|------|------------|-----------|
| **0** | `config/auth-oauth.ts`, модели, optional password, collision log, doctor, этот документ | ✅ spec |
| **1** | Registry + Yandex + Google + GitHub | MVP |
| **2** | UI: кнопки login/register + Connected accounts + MFA после OAuth | MVP |
| **3** | Set password, unlink rules, admin collisions UI | ✅ MVP |
| **4** | Apple, VK, Microsoft, Discord, Telegram |
| **5** | Encrypted token storage для GitHub API, extended link scopes |

---

## FAQ / edge cases

### Можно ли войти через GitHub, если привязал его только в профиле?

**Да.** Link создаёт `OAuthAccount` → sign-in через GitHub ищет эту запись → тот же `User`.

### Зарегистрировался через Яндекс, хочу тот же аккаунт в Google (та же почта)

Войти по Яндексу → Профиль → Подключить Google. **Не** делать sign-up через Google.

### Включён MFA. Вхожу через Яндекс первый раз после включения TOTP

После callback — экран TOTP (как после пароля).

### OAuth sign-up, а потом хочу пароль

Профиль → Установить пароль (с MFA если включён) → состояние `hybrid`.

### Unlink Яндекс — единственный способ входа, пароля нет

**Запрещено.** Сначала установить пароль или привязать другой провайдер.

### `REGISTRATION_MODE=email` и OAuth

OTP только для **credential** sign-up. OAuth sign-up OTP не требует.

### Legacy JWT без `sid`

Без изменений — см. [`docs/security/account-security.ru.md`](../security/account-security.ru.md). OAuth всегда выдаёт токены с `sid`.

---

## Changelog документа

| Дата | Изменение |
|------|-----------|
| 2026-06-07 | Первая версия спецификации v0.2.2 (без ESIA; MFA на OAuth sign-in; без автолинка) |
