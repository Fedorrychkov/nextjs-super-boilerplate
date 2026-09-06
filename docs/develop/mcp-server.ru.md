# MCP-сервер для статей (RU) — дизайн-док

Статус: **реализовано (этапы 1–3: PAT-слой, админ-UI `/admin/api-tokens`, MCP stdio-сервер `mcp/`; плюс ролевые политики `ApiTokenRolePolicy` и self-service `/profile/api-tokens` — кто может выпускать токены, с какими scopes и сроком, решает админ; роли хранятся строками и расширяемы в downstream-проектах)**. Практическое руководство — [`../mcp/README.md`](../../mcp/README.md). HTTP-транспорт `/api/mcp` и дашборд использования — не реализованы (этапы 4–5 ниже остаются планом). Источник: TODO «Сделать MCP для статей, с доступом по API, для ИИ чтобы он сам писал статьи; в админке нужна настройка для такой работы».

Область: новый слой машинной авторизации (`ApiToken`), MCP-сервер (`mcp/`), точки в `lib/middleware`, `lib/db/models`, `src/app/api/v1/*`, админ-страница `/admin/api-tokens`.

## Цель

Дать AI-агенту (Claude Desktop, Cursor, собственный агент) возможность **программно** создавать, редактировать, оценивать и публиковать статьи через стандартный протокол MCP — с безопасным доступом по токену и управлением из админки. Это AI-native дифференциатор бойлерплейта: у него уже есть LLM-авторинг в UI и Markdown-негоциация для агентов (`src/proxy.ts`), но нет машинного write-доступа.

## Текущее состояние (по коду)

- **Авторизация — только JWT.** `authMiddleware` (`lib/security/auth.ts`) читает `accessToken` из cookie **или** `Authorization: Bearer`. Отдельного понятия API-ключа / personal access token нет.
- **Доменные роуты статей** (`src/app/api/v1/article/*`, `article-revision/*`): `create`, `update`, `get/[id]`, `get-by-slug/[slug]`, `list`, ревизии `create`/`update`/`list`/`get`/`delete`, переводы `translation-*`. Все под `withAuthMiddleware` + `withGlobalRateLimit`, роль `ADMIN|EDITOR`.
- **Публикация** — не отдельный эндпоинт, а `article-revision/update` со `status = CONFIRMED`: выставляет `publishedAt`, обновляет `Article.status`, делает `revalidateTag`/`revalidatePath`, шлёт `notifySearchEngines` (IndexNow). Логика в `src/app/api/v1/article-revision/update/route.ts`.
- **Модель `Article`**: `slug`, `status` (`ArticleStatus`), `visibility`/roles, `revisionId`, `publishedAt`, `language`, `translationGroupId`. Ревизия хранит `metadata.seo` (canonical, language, keywords).
- **Конвертация контента**: редактор — TipTap JSON; есть `@tiptap/markdown` и `src/components/Blocks/Editor/markdownNormalize.ts`; на рендере — санитайз (`src/lib/sanitize/articleHtml.ts`).
- **Аудит/usage** уже есть паттернами: `LlmUsageEvent`, `SecurityAuditLog`.

Вывод: REST-контур для статей уже полный — MCP не дублирует бизнес-логику, а **оборачивает существующие эндпоинты** и добавляет два недостающих слоя: (1) машинную авторизацию по токену, (2) сам MCP-сервер.

## Архитектура

Три компонента:

```
AI-агент ──MCP──▶ MCP-сервер (mcp/) ──HTTP + Bearer PAT──▶ REST /api/v1/* ──▶ lib/services + Mongo
                                          ▲
                            ApiToken (hashed) + scopes + audit
```

### 1. Машинная авторизация — Personal Access Tokens (PAT)

**Модель `ApiToken`** (`lib/db/models/ApiToken.ts`) по образцу существующих моделей:

- `tokenHash` (хэш — bcrypt/sha256; сырой токен показывается **один раз**), `prefix` (для отображения `nsb_pat_ab12…`), `name`, `ownerUserId`, `role` (наследуется от владельца, не выше), `scopes: string[]`, `lastUsedAt`, `expiresAt`, `revokedAt`, `createdBy`.
- Формат токена: `nsb_pat_<random>` (узнаваемый префикс — удобно для secret-scanning).

**Скоупы** (минимально необходимые):

- `articles:read` — list/get.
- `articles:write` — create/update draft, ревизии.
- `articles:publish` — перевод ревизии в CONFIRMED (публикация/снятие).
- `articles:seo` — вызов LLM-подсказок SEO (если `NEXT_PUBLIC_LLM_ENABLED`).

**Интеграция в middleware.** Расширить проверку так, чтобы `Authorization: Bearer nsb_pat_…` резолвился как PAT (по префиксу), а обычный JWT — как раньше. Варианты:

- **Вариант A (рекомендуется):** новый `withApiTokenOrAuth` поверх существующего — сначала пробует PAT (если префикс `nsb_pat_`), иначе делегирует в `authMiddleware`. Возвращает тот же `AuthSuccessResult` (синтезируя `payload` из владельца токена + помечая `scopes`). Роуты статей оборачиваются в него вместо/в дополнение к `withAuthMiddleware`. Обычный UI не затрагивается.
- **Вариант B:** встроить распознавание PAT прямо в `authMiddleware`. Меньше обёрток, но смешивает пользовательскую и машинную авторизацию в одном месте — хуже для аудита и rate-limit.

Плюс проверка скоупа на роуте: `requireScope('articles:publish')`. Rate-limit — отдельный лимитер per-token (переиспользовать `lib/security/rate-limit` / `rate-limiter-flexible`), строже пользовательского.

**Аудит.** Каждое действие по PAT логировать в `SecurityAuditLog` (кто/токен/действие/articleId) и, где уместно, в usage-счётчик. `lastUsedAt` обновлять асинхронно.

### 2. MCP-сервер

Пакет `mcp/` в репозитории на `@modelcontextprotocol/sdk`. Два транспорта:

- **Транспорт stdio (рекомендуется как основной out-of-the-box артефакт).** Отдельный Node-процесс `mcp/server.ts`, который агент (Claude Desktop/Cursor) запускает локально; конфигурируется через env `NSB_API_BASE_URL` + `NSB_API_TOKEN`. Внутри — тонкий HTTP-клиент к REST `/api/v1/*`. Не требует изменения рантайма Next.js, работает сразу.
- **Транспорт Streamable HTTP (опционально, позже).** Эндпоинт `src/app/api/mcp/route.ts` с MCP-over-HTTP, авторизация тем же PAT. Удобно для облачных агентов без локального процесса. Добавить вторым этапом.

**MCP-инструменты** (маппинг на существующие REST-эндпоинты):

| Tool | REST | Scope |
|------|------|-------|
| `list_articles` | `GET /api/v1/article/list` | `articles:read` |
| `get_article` | `GET /api/v1/article/get/[id]` / `get-by-slug/[slug]` | `articles:read` |
| `create_article_draft` | `POST /api/v1/article/create` (+ `article-revision/create`) | `articles:write` |
| `update_article_content` | `POST /api/v1/article-revision/update` | `articles:write` |
| `suggest_seo` | `POST /api/v1/llm/seo/suggest` | `articles:seo` |
| `publish_article` | `POST /api/v1/article-revision/update` (`status=CONFIRMED`) | `articles:publish` |
| `unpublish_article` | `POST /api/v1/article-revision/update` / `article/update` | `articles:publish` |
| `get_article_views` | `GET /api/v1/article/views/by-article/[articleId]` | `articles:read` |

**Конвертация контента.** Агент присылает **Markdown** — сервер конвертирует в TipTap JSON, которого ждут ревизии, переиспользуя `@tiptap/markdown` + `markdownNormalize.ts`. Санитайз при рендере уже гарантирован (`articleHtml.ts`), поэтому UGC от агента не опаснее, чем от человека. Логику конвертации вынести в общую утилиту, чтобы UI и MCP шли одним путём.

**Ресурсы/подсказки MCP (опционально):** ресурс `article://{slug}` (чтение через Markdown-негоциацию `src/proxy.ts`), prompt-шаблон «напиши статью по брифу с SEO».

### 3. Настройка в админке

- **Страница `/admin/api-tokens`** (роут в `src/constants/routes.ts` + пункт в `PlatformLayout.tsx`, роль ADMIN): список токенов (name, prefix, scopes, lastUsedAt, expiresAt, статус), создание (сырой токен показывается один раз с кнопкой копирования), отзыв, задание scopes/срока. UI по паттерну проекта: `src/api/api-token` → `src/query/api-token` → компоненты, `react-hook-form`.
- **Feature-флаг** `MCP_ENABLED` / `API_TOKENS_ENABLED` в `config/env.ts` + `.env.example` (по умолчанию выкл). При выкл — роуты токенов и MCP-контур недоступны.
- **Дашборд использования** (можно позже): агрег4ция по `SecurityAuditLog`/usage — какие токены что публиковали, объём.

## Безопасность

- Токен хранится только в виде хэша; сырой — один раз.
- Скоуп `articles:publish` выдаётся явно; по умолчанию новый токен — только `articles:read`/`articles:write`.
- Роль токена не выше роли владельца (EDITOR не может выдать ADMIN-скоуп).
- Отдельный, более строгий rate-limit per-token.
- Полный аудит действий в `SecurityAuditLog`; `expiresAt` обязателен (например, дефолт 90 дней).
- Санитайз входящего контента на общем рендер-пути (уже есть).
- Секреты MCP-клиента (`NSB_API_TOKEN`) — только в конфиге агента, не в репозитории.

## Файлы под создание/изменение

- `lib/db/models/ApiToken.ts` — **новый**.
- `lib/services/api-token.service.ts` — **новый** (issue/verify/revoke/lastUsed).
- `lib/security/api-token.ts` + `lib/middleware/*` — **новый** `withApiTokenOrAuth`, `requireScope`.
- `src/app/api/v1/api-token/*` — **новый** (CRUD токенов, ADMIN).
- Роуты статей — обернуть в `withApiTokenOrAuth` + `requireScope` (минимальная правка).
- `mcp/` — **новый** пакет: `server.ts` (stdio), клиент REST, конвертер Markdown→TipTap, `README`.
- `src/app/api/mcp/route.ts` — **новый** (опциональный HTTP-транспорт, этап 2).
- `src/app/admin/api-tokens/*`, `src/api/api-token/*`, `src/query/api-token/*` — **новый** (админ-UI).
- `src/constants/routes.ts`, `src/components/Layouts/PlatformLayout.tsx` — пункт навигации.
- `config/env.ts`, `.env.example`, `docs/ENV_REFERENCE.md` — флаг + переменные.
- `docs/AGENTS_RU.md`/`AGENTS.md`, `README.md`, `public/llms.txt` — документация и discovery.

## Этапы

1. **PAT-слой:** модель `ApiToken`, сервис, `withApiTokenOrAuth` + scopes, аудит, rate-limit. (Самостоятельно ценно — API-доступ для любых интеграций, не только MCP.)
2. **Админ-UI** `/admin/api-tokens` + feature-флаг.
3. **MCP stdio-сервер** `mcp/` с базовым набором tools + конвертер Markdown.
4. **HTTP-транспорт** `/api/mcp` (опционально).
5. **Дашборд использования** + расширенные tools (переводы, media-upload).

## Критерии готовности

- Админ создаёт токен со scope `articles:write` → агент по MCP создаёт draft из Markdown → статья видна в `/admin/articles`.
- Токен без `articles:publish` не может опубликовать (403), с ним — статья уходит в публикацию и в IndexNow (существующий флоу).
- Отзыв токена немедленно блокирует доступ.
- Все действия по токену видны в `SecurityAuditLog`.
- При `MCP_ENABLED=false` контур полностью отключён.

## Открытые вопросы

- MCP как **отдельный пакет в репо** (stdio) или сразу **встроенный HTTP-эндпоинт**? (Рекомендация: сначала stdio — быстрее, совместимо с Claude Desktop/Cursor; HTTP — этап 2.)
- Публикация агентом сразу или через **очередь ревью** (агент создаёт только draft, публикацию подтверждает человек)? Для контентной безопасности рекомендуется дефолт «агент → draft, человек → publish», а автопубликацию включать явным scope.
- Мультивендорность LLM для `suggest_seo` (в роадмапе `LLMService` пока single-OpenAI) — вне области этого дока, но связано.
