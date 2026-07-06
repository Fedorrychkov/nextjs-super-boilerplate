# Перенос MCP OAuth + Machine Access в downstream-проекты

Патч: [`patch/mcp-oauth-and-machine-access.patch`](../patch/mcp-oauth-and-machine-access.patch) — **94 файла, весь machine-auth-модуль целиком**: PAT-контур (токены, политики ролей, remote `/api/mcp`, stdio-сервер, страницы токенов, PAT-обвязка v1-роутов статей/ревизий/медиа/LLM) + OAuth 2.1-слой (Claude.ai/Desktop/Cowork по одному URL, Claude Code без токена) + `/admin/machine-access` (usage-тайм-серия по окнам 1ч/6ч/12ч/24ч/7д, ревокация, per-user блокировка). Дизайн: [`MCP_OAUTH_DESIGN_RU.md`](./MCP_OAUTH_DESIGN_RU.md).

Патч сделан от состояния бойлерплейта **без** этого модуля и проверен: на чистую базу ложится `git apply` без конфликтов, результат проходит `tsc --noEmit` без ошибок.

Предпосылки (есть во всех наших проектах): модуль статей + те же `/api/v1/*`-методы, роли `admin`/`editor`/`user` (кастомные роли — ок, см. ниже), Mongo + mongoose, JWT-auth с cookie `accessToken`.

## Основной сценарий — в проекте модуля нет вообще

```bash
git apply --check patch/mcp-oauth-and-machine-access.patch   # сухой прогон: список конфликтов, ничего не меняет
git apply patch/mcp-oauth-and-machine-access.patch           # чисто → применит целиком
# если проект разошёлся с бойлерплейтом и check ругается:
git apply --reject patch/mcp-oauth-and-machine-access.patch  # применит что может, конфликты сложит в *.rej
pnpm install                                                  # подтянет @modelcontextprotocol/sdk (dep уже в package.json из патча)
pnpm typecheck && pnpm lint && pnpm test
```

`pnpm-lock.yaml` в патч намеренно не входит — его пересоберёт `pnpm install`.

Где вероятны `.rej` при разошедшейся базе: `src/lib/i18n/messages/{en,ru}.ts` (свои переводы), `config/env.ts` и `.env.example` (свои переменные), `PlatformLayout.tsx` (своя навигация), `src/constants/routes.ts`, `package.json` (свои scripts), `tsconfig.json` (свои paths), PAT-обвязка v1-роутов (`article*`, `media`, `llm/seo` — если сами роуты переписаны). Все нужные куски для ручного разруливания — в разделе «точечные правки» ниже.

После применения: выставить env (см. «Пост-шаги»), прогнать чеклист.

## Запасной сценарий — PAT-контур уже есть, нужен только OAuth+machine-access

Если модуль частично переносили раньше, `git apply` упрётся в существующие файлы. Тогда — «замена своих файлов + точечные правки общих»:

### A1. Файлы контура — заменить целиком

Ваши версии идентичны доэйчейнджевым версиям бойлерплейта, поэтому замена на текущие = применение дельты. Копируйте из этого репо (или вырезайте из патча):

```
src/api/api-token/{model,permissions,permissions.test,types}.ts
lib/db/models/ApiToken.ts
lib/db/models/ApiTokenRolePolicy.ts
lib/services/api-token.service.ts
lib/middleware/api-token-middleware.ts
src/app/api/mcp/route.ts
src/app/api/v1/api-token/create/route.ts
src/app/api/v1/api-token/permissions/route.ts
src/app/api/v1/api-token/policy/update/route.ts
src/components/Views/ApiTokens/List/ApiTokensTable.tsx
src/components/Views/ApiTokens/Policy/RolePoliciesCard.tsx
src/components/Views/ApiTokens/Instructions/McpSetupInstructions.tsx
mcp/README.md
```

⚠️ Если вы локально меняли какой-то из этих файлов (например, свои scopes в `API_TOKEN_SCOPES`) — сначала diff со старым бойлерплейтом, потом перенос своих правок поверх.

### A2. Новые файлы — просто скопировать

```
# OAuth-слой
lib/db/models/{McpOAuthClient,McpOAuthAuthorizationCode,McpOAuthGrant}.ts
lib/services/{mcp-oauth.helpers,mcp-oauth.helpers.test,mcp-oauth.service,mcp-oauth.metadata}.ts
src/app/.well-known/oauth-authorization-server/route.ts
src/app/.well-known/oauth-protected-resource/route.ts
src/app/.well-known/oauth-protected-resource/api/mcp/route.ts
src/app/api/oauth/mcp/{register,token,revoke,consent}/route.ts
src/app/oauth/mcp/authorize/page.tsx
src/components/Views/McpOAuth/ConsentScreen.tsx

# Machine access
lib/db/models/ApiTokenUsageEvent.ts
lib/services/machine-access.service.ts
src/api/machine-access/{index,model,client/index}.ts
src/app/api/v1/machine-access/{users,users/[id],block}/route.ts
src/app/admin/machine-access/page.tsx
src/components/Views/MachineAccess/MachineAccessScreen.tsx
src/query/machine-access/index.ts

# Доки (опционально)
docs/{MCP_OAUTH_DESIGN_RU,MCP_OAUTH_PORTING_RU}.md
```

### A3. Общие файлы — точечные правки

Эти файлы в downstream могли разойтись, поэтому не заменять, а вносить куски (точные диффы — в патче, ищите по имени файла):

**`config/env.ts`** — в деструктуризацию:

```ts
/** OAuth layer for the remote MCP endpoint (Claude.ai/Desktop custom connectors). Requires API_TOKENS_ENABLED. */
MCP_OAUTH_ENABLED = process.env.MCP_OAUTH_ENABLED || '0',
MCP_OAUTH_ACCESS_TTL_MINUTES = process.env.MCP_OAUTH_ACCESS_TTL_MINUTES || '60',
MCP_OAUTH_CLIENT_RETENTION_DAYS = process.env.MCP_OAUTH_CLIENT_RETENTION_DAYS || '30',
```

рядом с `API_TOKENS_CONFIG`:

```ts
const MCP_OAUTH_CONFIG = {
  enabled: parseBoolEnv(API_TOKENS_ENABLED, false) && parseBoolEnv(MCP_OAUTH_ENABLED, false),
  accessTtlMinutes: Math.max(5, Number(MCP_OAUTH_ACCESS_TTL_MINUTES) || 60),
  clientRetentionDays: Math.max(1, Number(MCP_OAUTH_CLIENT_RETENTION_DAYS) || 30),
}
```

и `MCP_OAUTH_CONFIG` в export-блок.

**`lib/db/models/User.ts`** — в интерфейс:

```ts
machineAccessBlockedAt?: Date | null
machineAccessBlockedBy?: mongoose.Types.ObjectId | null
```

в схему:

```ts
machineAccessBlockedAt: { type: Date, default: null },
machineAccessBlockedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
```

**`src/api/security-audit/model.ts`** — в union `SecurityAuditAction`:

```ts
| 'mcp_oauth_client_registered' | 'mcp_oauth_consent_granted' | 'mcp_oauth_consent_denied'
| 'mcp_oauth_tokens_issued' | 'mcp_oauth_grant_revoked'
| 'machine_access_blocked' | 'machine_access_unblocked'
```

**`src/constants/routes.ts`** — запись `adminMachineAccess` (путь `/admin/machine-access`, tKey `navigation.adminMachineAccess`).

**`src/components/Layouts/PlatformLayout.tsx`** — пункт навигации рядом с `adminApiTokens` (иконка `ActivityIcon`, guard `role !== ADMIN`, под тем же флагом `NEXT_PUBLIC_API_TOKENS_ENABLED`).

**`src/lib/i18n/messages/en.ts` и `ru.ts`** — перенести секции/ключи (источник — файлы этого репо):

- `navigation.adminMachineAccess`
- `apiTokens.kindOauth`
- `apiTokens.policy.{kinds,kind_pat,kind_oauth}`
- `apiTokens.instructions.*` — секция переписана (OAuth-блок + legacy-мост): проще заменить секцию целиком
- `mcpOauth.*` (consent-экран и ошибки)
- `machineAccess.*` (админ-страница)
- `errors.{notFound,badRequest}`

**`.env.example`** — блок Machine auth:

```bash
NEXT_PUBLIC_API_TOKEN_BRAND=nsb          # бренд префиксов <brand>_pat_/<brand>_oat_ — задать до выпуска токенов!
MCP_OAUTH_ENABLED=0
MCP_OAUTH_ACCESS_TTL_MINUTES=60
MCP_OAUTH_CLIENT_RETENTION_DAYS=30
API_TOKEN_USAGE_RETENTION_DAYS=30
```

### A4. Пост-шаги

1. `pnpm typecheck && pnpm lint && pnpm test` — тесты контура (`permissions.test`, `mcp-oauth.helpers.test`) должны пройти.
2. Выставить `NEXT_PUBLIC_API_TOKEN_BRAND` под проект (например `quickping`). ⚠️ Если PAT уже выпущены с префиксом `nsb_pat_` — оставить `nsb`, смена бренда ломает детекцию старых токенов.
3. `MCP_OAUTH_ENABLED=1` + рестарт.

## Кастомные роли

Ничего адаптировать не нужно: роль в `ApiTokenRolePolicy` — строка, политики (scopes, каналы pat/oauth, срок) включаются админом в `/admin/api-tokens` для любой роли. Захардкожены только веса эскалации в `ROLE_WEIGHT` (`permissions.ts`) — кастомные роли весят 0, то есть никогда не эскалируют; если нужна иерархия для своей роли, добавьте её туда. Свои scopes добавляются в `API_TOKEN_SCOPES` + описания в `apiTokens.scopeDescriptions` (en/ru).

## Миграции БД

Не нужны. Новые коллекции создаются сами; `ApiToken.kind` дефолтится в `pat` на чтении, `ApiTokenRolePolicy.allowedKinds` без поля = оба канала, `User.machineAccessBlockedAt` = null. TTL-индексы (`McpOAuthAuthorizationCode`, `ApiTokenUsageEvent`) mongoose создаст при первом обращении.

## Чеклист проверки после деплоя

1. `curl https://домен/.well-known/oauth-authorization-server` — все URL в ответе должны быть с `https://домен` (проверка `x-forwarded-proto`/`host` за прокси).
2. `curl -X POST https://домен/api/oauth/mcp/register -H 'Content-Type: application/json' -d '{"redirect_uris":["https://claude.ai/api/mcp/auth_callback"]}'` → 201 с `client_id` и `client_secret` (Claude регистрируется как confidential-клиент).
3. Claude.ai/Desktop: Settings → Connectors → Add custom connector → URL `https://домен/api/mcp`, поля Client ID/Secret пустые → логин → consent → тулы доступны.
4. Claude Code: `claude mcp add --transport http <имя> https://домен/api/mcp` без header — OAuth через loopback.
5. `/admin/api-tokens`: в политиках ролей видны чекбоксы каналов (PAT / OAuth-подключения).
6. `/admin/machine-access`: после пары tool-вызовов появляются usage-окна; блокировка юзера мгновенно даёт 401 на его запросы; разблокировка восстанавливает.
7. Ревокация OAuth-токена в `/profile/api-tokens` гасит и грант (Claude при следующем запросе уходит в reconnect, а не тихо обновляется).

## Известные грабли

- **Dev-туннели** (cloudpub и т.п.): hosted-Claude ходит с серверов Anthropic (`160.79.104.0/21`) — туннель не должен резать не-браузерные запросы, иначе DCR упадёт с «Couldn't register with sign-in service».
- Один MCP tool-вызов даёт **два** usage-события: `mcp` (сам вызов) + `rest` (его внутренний запрос к API) — это честные два обработанных запроса, в UI MCP-доля видна отдельно.
- `API_TOKEN_USAGE_RETENTION_DAYS` читается при создании TTL-индекса: смена на живом инстансе требует дропнуть индекс `createdAt` коллекции `apitokenusageevents`.
