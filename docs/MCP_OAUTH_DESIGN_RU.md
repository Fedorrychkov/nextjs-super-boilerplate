# OAuth-слой для MCP: дизайн

Статус: реализовано (v1). Цель — подключение кастомного коннектора в Claude.ai / Claude Desktop / Cowork **одним URL**, без `mcp-remote`, без Node.js на машине юзера и без ручного копирования PAT. PAT-контур не меняется и остаётся для headless-сценариев.

## 1. Проблема

Текущий remote endpoint `/api/mcp` (Streamable HTTP, stateless) принимает только `Authorization: Bearer nsb_pat_…`. Матрица хостов:

| Хост | Сейчас | После OAuth |
| --- | --- | --- |
| Cursor, Claude Code, Codex (URL + headers/env) | ✅ PAT напрямую | ✅ без изменений (плюс опционально OAuth в Claude Code) |
| Claude Messages API (`mcp_servers[].authorization_token`) | ✅ PAT напрямую | ✅ без изменений |
| **Claude.ai / Desktop / mobile / Cowork — custom connector** | ❌ только через `npx mcp-remote` (нужен Node) | ✅ URL → браузер → логин → consent |

Custom connectors в Claude не поддерживают вставку статического Bearer-токена (`static_bearer` — «not yet supported» в доках). Единственный казуальный путь — OAuth. Поля «OAuth Client ID / Secret» в диалоге Claude опциональны: при поддержке DCR юзер вводит **только URL**.

Требования Claude (актуально на июль 2026, [docs](https://claude.com/docs/connectors/building/authentication)):

- Спеки MCP auth [2025-03-26](https://modelcontextprotocol.io/specification/2025-03-26/basic/authorization), [2025-06-18](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization), [2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization).
- DCR (RFC 7591) или CIMD; `client_credentials` без юзера не поддерживается — всегда есть consent.
- Redirect URI hosted-поверхностей: `https://claude.ai/api/mcp/auth_callback`. Claude Code — loopback `http://localhost/callback` и `http://127.0.0.1/callback` **с игнорированием порта** (RFC 8252).
- Refresh: реактивно по 401 + проактивно за ≤5 минут до expiry; на мёртвый refresh отвечать строго `invalid_grant`.
- Входящий трафик Anthropic: `160.79.104.0/21` (если появится IP-allowlist).

## 2. Ключевое решение

**Приложение само становится Authorization Server (AS), а `/api/mcp` — Resource Server (RS). Access token — это внутренний `ApiToken` с `kind: 'oauth'`.**

Токен, выданный через OAuth, имеет префикс `<brand>_oat_…` (бренд из env, см. п. 7), хранится sha256-хэшем в той же коллекции. Следствия:

- `verifyApiToken`, scopes, `ApiTokenRolePolicy`, per-token rate-limit, мгновенная ревокация и аудит работают **без изменений** — RS-слой не трогаем вообще, кроме заголовка `WWW-Authenticate`.
- Юзер видит OAuth-подключения на существующей странице `/profile/api-tokens` и отзывает их той же кнопкой.
- Понижение роли владельца / отключение политики роли мгновенно гасит OAuth-сессии Claude — как и PAT.

Никакой внешний IdP не нужен: аутентификация на `/authorize` — обычная сессия приложения (JWT + существующие OAuth-провайдеры логина).

## 3. Endpoints

Все новые роуты включаются флагом `MCP_OAUTH_ENABLED=1` (поверх `API_TOKENS_ENABLED=1`).

### 3.1 Discovery

| Роут | RFC | Ответ |
| --- | --- | --- |
| `GET /.well-known/oauth-protected-resource` | 9728 | `{ resource: "https://site.com/api/mcp", authorization_servers: ["https://site.com"] }` |
| `GET /.well-known/oauth-protected-resource/api/mcp` | 9728 | то же самое (path-inserted вариант — часть клиентов строит URL из пути ресурса, а не из `WWW-Authenticate`) |
| `GET /.well-known/oauth-authorization-server` | 8414 | метаданные AS, см. ниже |

Метаданные AS:

```json
{
  "issuer": "https://site.com",
  "authorization_endpoint": "https://site.com/oauth/mcp/authorize",
  "token_endpoint": "https://site.com/api/oauth/mcp/token",
  "registration_endpoint": "https://site.com/api/oauth/mcp/register",
  "revocation_endpoint": "https://site.com/api/oauth/mcp/revoke",
  "response_types_supported": ["code"],
  "grant_types_supported": ["authorization_code", "refresh_token"],
  "code_challenge_methods_supported": ["S256"],
  "token_endpoint_auth_methods_supported": ["none"],
  "scopes_supported": ["articles:read", "articles:write", "articles:publish", "media:read", "media:write"]
}
```

`scopes_supported` берём из `API_TOKEN_SCOPES`, не хардкодим. `token_endpoint_auth_methods_supported: ["none"]` — клиенты публичные (PKCE вместо секрета); это же требование CIMD.

Next.js: оба роута — `src/app/.well-known/*/route.ts`, `Cache-Control: public, max-age=3600`. Origin строим через существующий `resolvePublicOrigin` (x-forwarded-proto + host).

### 3.2 Сигнал на RS

`/api/mcp` при 401 добавляет:

```
WWW-Authenticate: Bearer resource_metadata="https://site.com/.well-known/oauth-protected-resource"
```

Это единственное изменение существующего кода — Claude по нему находит AS. Прямой Bearer-PAT продолжает работать как раньше.

### 3.3 DCR — `POST /api/oauth/mcp/register`

RFC 7591, без аутентификации (стандарт для MCP), но под `withGlobalRateLimit` + отдельный жёсткий лимит (например 10/час с IP).

Валидация запроса: `redirect_uris` обязательны; каждый URI — либо `https:` с exact-match хостом, либо loopback (`http://localhost/...`, `http://127.0.0.1/...`). `grant_types` ⊆ `[authorization_code, refresh_token]`, `token_endpoint_auth_method` = `none`.

Ответ: `client_id` (случайный, `<brand>_mcp_client_…`, см. п. 7), без `client_secret`, `client_id_issued_at`. Секрет не выдаём — публичный клиент с PKCE; тогда поля Client ID/Secret в UI Claude юзеру не нужны совсем.

Анти-разрастание (Claude регистрирует нового клиента на каждое свежее подключение): TTL-индекс на клиентах без выданных грантов (например 30 дней с `lastUsedAt`), клиенты с активными грантами не чистятся.

### 3.4 Authorize — `GET /oauth/mcp/authorize` (страница, не API)

Параметры: `response_type=code`, `client_id`, `redirect_uri`, `state`, `code_challenge`, `code_challenge_method=S256`, `scope` (опц.), `resource` (RFC 8707, опц.).

Проверки **до** рендера (ошибка валидации client_id/redirect_uri — рендерим ошибку, НЕ редиректим):

1. `client_id` существует; `redirect_uri` ∈ зарегистрированных. Loopback-URI сравниваем игнорируя порт (требование Claude Code), `https:` — exact match.
2. `code_challenge` обязателен, метод только `S256`.
3. `resource`: по спеке 2025-06-18 клиент обязан слать его и в authorize, и в token — Claude шлёт всегда. Валидируем строго при наличии (равен канонич. URI `https://site.com/api/mcp`), но отсутствие не считаем ошибкой — ради клиентов на спеке 2025-03-26.

Дальше:

4. Нет сессии → редирект на существующий `/auth/login?returnUrl=…`, после логина назад.
5. Права: та же логика, что при создании PAT — `resolveApiTokenPermissions` / `ApiTokenRolePolicy`. Роль запрещена политикой → человекочитаемый отказ. Запрошенные scopes пересекаем с разрешёнными (`filterApiTokenScopes`); если `scope` не передан — дефолтные scopes политики.
6. Consent-экран: имя клиента (из DCR-метаданных), список scopes чекбоксами (в пределах политики), срок жизни гранта (клампится `clampExpiresDays`). Кнопки «Разрешить» / «Отклонить» (→ `error=access_denied`).
7. «Разрешить» → одноразовый `code` (случайные 32 байта, храним sha256), TTL 60 сек, привязан к `client_id`, `redirect_uri`, `code_challenge`, `userId`, утверждённым scopes. Редирект `redirect_uri?code=…&state=…`.

### 3.5 Token — `POST /api/oauth/mcp/token`

`application/x-www-form-urlencoded`. Два гранта:

**`authorization_code`**: проверяем code (не истёк, не использован — повторное использование = немедленная ревокация всего, что по нему выдано), `client_id`, `redirect_uri`, PKCE (`sha256(code_verifier) == code_challenge`), `resource` если был. Выдаём:

- `access_token` — минтим `ApiToken` `kind: 'oauth'` через существующий сервис: role = capped роль юзера, scopes = утверждённые, `expiresAt` = now + `MCP_OAUTH_ACCESS_TTL` (дефолт 1 час), `name` = `"Claude connector (<client name>)"`.
- `refresh_token` — отдельная сущность (см. модели), TTL = срок гранта с consent-экрана.
- Ответ: `{ access_token, token_type: "Bearer", expires_in, refresh_token, scope }`.

**`refresh_token`**: находим по хэшу. Ротация: старый refresh помечается `rotatedAt` и заменяется новым; прежний access-`ApiToken` ревокается, минтится новый. **Reuse detection**: приход уже ротированного refresh = компрометация → ревокация всей цепочки гранта. Невалидный/истёкший/ревокнутый refresh → `400 {"error": "invalid_grant"}` — именно этот код, Claude по нему понимает, что надо переподключаться.

Ошибки — строго словарь RFC 6749: `invalid_request`, `invalid_grant`, `invalid_client`, `unsupported_grant_type`.

### 3.6 Revoke — `POST /api/oauth/mcp/revoke` (RFC 7009, входит в v1)

Принимает access или refresh token, всегда отвечает 200 (не раскрываем существование токена). Зачем: когда юзер удаляет коннектор в UI Claude, Claude дёргает этот endpoint — токен и грант ревокаются у нас немедленно, а не висят до истечения срока. Реализация — тонкая обёртка над существующей ревокацией `ApiToken` + каскад на грант.

## 4. Модели БД

```
McpOAuthClient
  clientId (unique), clientName, redirectUris: string[],
  logoUri?, clientUri?, lastUsedAt, createdAt
  // TTL-чистка: без активных грантов и lastUsedAt старше N дней

McpOAuthAuthorizationCode
  codeHash (unique), clientId, userId, redirectUri,
  codeChallenge, scopes: string[], expiresDays (для гранта),
  resource?, usedAt?, expiresAt  // TTL-индекс 60 сек

McpOAuthGrant                    // «подключение» юзер×клиент
  userId, clientId, scopes, apiTokenId (текущий access),
  refreshTokenHash, refreshRotatedFromHash?,
  expiresAt, revokedAt?, createdAt, lastRefreshedAt
```

`ApiToken` расширяем полем `kind: 'pat' | 'oauth'` (дефолт `'pat'`, миграция не нужна) и опциональным `grantId`. Листинг в `/profile/api-tokens` показывает `kind` бейджем («API-токен» / «OAuth-подключение»); ревокация токена с `grantId` ревокает и грант (иначе Claude тихо обновится по refresh).

## 5. Флоу целиком

```
Claude ── POST /api/mcp ──────────────► 401 + WWW-Authenticate: resource_metadata
Claude ── GET /.well-known/oauth-protected-resource ─► AS = site.com
Claude ── GET /.well-known/oauth-authorization-server ─► endpoints
Claude ── POST /api/oauth/mcp/register ─► client_id
Браузер ─ GET /oauth/mcp/authorize?…&code_challenge=…
              └─ логин (сессия приложения) → consent (scopes из политики роли)
              └─ 302 https://claude.ai/api/mcp/auth_callback?code=…&state=…
Claude ── POST /api/oauth/mcp/token (code + verifier) ─► access (ApiToken) + refresh
Claude ── POST /api/mcp (Bearer access) ─► работает: scopes/rate-limit/аудит как у PAT
   …access истёк → 401 → POST token (refresh_token) → ротация → снова работает
```

## 6. Безопасность

- PKCE S256 обязателен всем (клиенты публичные, секретов нет).
- Redirect URI: exact match для `https:`; для loopback игнорируем только порт. Open-redirect исключён: при невалидном client_id/redirect_uri не редиректим.
- Authorization code: одноразовый, 60 сек, хэш в БД; повторное использование → ревокация выданного.
- Refresh rotation + reuse detection (п. 3.5).
- Access TTL короткий (1 ч) — окно утечки минимально, refresh-цепочка живёт в пределах срока гранта и политики роли.
- `resource` (RFC 8707) валидируем при наличии — токены не переиспользовать против другого RS.
- Rate-limit: `withGlobalRateLimit` на всех роутах + строгие лимиты на `/register` и `/token` (брутфорс кода/refresh).
- Аудит: `recordSecurityAuditEvent` на register / consent granted / consent denied / token issued / refresh / reuse-detected / revoke.
- Enforcement остаётся в REST-слое: OAuth-слой ничего не решает про права, он только минтит `ApiToken` в рамках `ApiTokenRolePolicy`.

## 7. Конфиг (ENV)

| Переменная | Дефолт | Что делает |
| --- | --- | --- |
| `MCP_OAUTH_ENABLED` | `0` | включает discovery, register, authorize, token, revoke |
| `MCP_OAUTH_ACCESS_TTL_MINUTES` | `60` | TTL access-токена |
| `MCP_OAUTH_CLIENT_RETENTION_DAYS` | `30` | чистка DCR-клиентов без грантов |
| `NEXT_PUBLIC_API_TOKEN_BRAND` | `nsb` | бренд-префикс всех машинных идентификаторов |

Срок refresh-гранта не отдельный ENV — его задаёт юзер на consent в пределах `maxExpiresDays` политики.

### Бренд-префикс

Один env вместо отдельных префиксов на каждый тип токена — типы не разъезжаются и не коллидируют:

- PAT: `<brand>_pat_…` (сейчас захардкожен `nsb_pat_` в `src/api/api-token/model.ts` — `API_TOKEN_PREFIX` становится производным от env)
- OAuth access: `<brand>_oat_…`
- DCR client_id: `<brand>_mcp_client_…`

`NEXT_PUBLIC_`, потому что константа живёт в shared-слое (`src/api`) и префикс показывается в UI-инструкциях на страницах токенов. В `verifyApiToken` тип определяется по суффиксу префикса (`_pat_` / `_oat_`), детекция в middleware — `startsWith(<brand>_)`.

⚠️ Смена бренда после выпуска токенов ломает их детекцию в middleware (хэши в БД валидны, но `startsWith` перестанет узнавать старый префикс). Задавать при бутстрапе downstream-проекта, как `MCP_SERVER_NAME`; смену на живом инстансе не поддерживаем.

## 8. UI

- Consent-страница `/oauth/mcp/authorize`: локализованная, тот же layout, что auth-страницы; блок «<Client name> запрашивает доступ» + чекбоксы scopes + срок.
- `/profile/api-tokens` и `/admin/api-tokens`: бейдж kind, для OAuth — имя клиента и дата последнего refresh; ревокация уже есть.
- Инструкция на странице токенов: добавить вкладку «Claude (казуально)»: Settings → Connectors → вставить `https://site.com/api/mcp` → Add. Раздел про `mcp-remote` в `mcp/README.md` пометить как legacy-фолбэк.

## 9. Не делаем (v1)

- CIMD — Claude поддерживает DCR из коробки; CIMD станет актуален при попадании в Connectors Directory с большим трафиком (DCR плодит клиентов). Заложено расширение: `client_id`-как-URL можно добавить в `McpOAuthClient` позже.
- `oauth_anthropic_creds` — только для directory-партнёрства, требует переписки с Anthropic.
- Confidential-клиенты и client_secret — не нужны ни одному целевому хосту.
- ID-токены / OIDC — MCP этого не требует.

## 10. План внедрения

1. **Модели + сервис** (`lib/services/mcp-oauth.service.ts`): клиенты, коды, гранты, минт/ротация. Юнит-тесты: PKCE, ротация, reuse detection, клампинг scopes политикой.
2. **Роуты**: discovery ×2, register, token, revoke + `WWW-Authenticate` в `/api/mcp/route.ts`. Тесты уровня handler (как `mcp/handler.test.ts`).
3. **Consent-страница** + интеграция с логином (returnUrl) + i18n.
4. **UI токенов**: kind-бейдж, каскадная ревокация гранта.
5. **Docs**: `mcp/README.md`, `docs/ENV_REFERENCE.md`, инструкция на страницах токенов.
6. **Проверка**: MCP Inspector (валидация auth-флоу) → реальный Claude.ai custom connector на стейдже → Claude Code (`claude mcp add --transport http` без header — должен сам пройти OAuth через loopback).

Оценка: пункты 1–2 — ядро (~2/3 объёма), 3–5 — обвязка на существующих компонентах.

## 11. Принятые решения

1. **Префиксы** — брендируются через `NEXT_PUBLIC_API_TOKEN_BRAND` (см. п. 7): `<brand>_pat_`, `<brand>_oat_`, `<brand>_mcp_client_`. Тип токена различается суффиксом, `verifyApiToken` получает +1 ветку.
2. **Consent** — показываем при каждом подключении, auto-approve по живому гранту не делаем. Claude инициирует флоу редко, а явный consent проще и безопаснее.
3. **`revocation_endpoint`** — входит в v1: удаление коннектора в UI Claude сразу гасит токен и грант на нашей стороне (см. п. 3.6).

## Источники

- [Authentication for connectors — Claude docs](https://claude.com/docs/connectors/building/authentication)
- [Building custom connectors — Claude docs](https://claude.com/docs/connectors/building)
- [MCP Authorization spec 2025-06-18](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization)
