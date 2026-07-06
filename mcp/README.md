# MCP-сервер

Машинный доступ к приложению для AI-агентов (Claude Desktop, Cursor, Claude Code и любой MCP-совместимый хост). Сервер — тонкий адаптер: каждый tool транслируется в HTTP-запрос к `/api/v1/*` c Personal Access Token (PAT), поэтому права (scopes), rate-limit и аудит применяются на бэкенде.

Два транспорта с общим реестром тулов (`mcp/tools/*`, диспетчер `mcp/handler.ts`):

- **Remote (основной)** — `POST /api/mcp` на деплое приложения (Streamable HTTP, stateless). Юзеру нужен только URL и токен, репозиторий не нужен. Именно этот вариант показывается в инструкции на страницах токенов.
- **stdio (dev/self-hosted)** — `mcp/server.ts`, хост запускает процесс локально из чекаута репы.

Имя, под которым сервер представляется хосту (`serverInfo.name`), задаётся env `MCP_SERVER_NAME` (дефолт `nsb-mcp`) — в downstream-проекте поставь своё, например `quickping-mcp`. Ключ в `mcpServers`-конфиге хоста — просто локальный алиас, юзер называет его как хочет.

## Remote: подключение по URL

```json
{
  "mcpServers": {
    "nsb-mcp": {
      "url": "https://your-site.com/api/mcp",
      "headers": {
        "Authorization": "Bearer nsb_pat_…"
      }
    }
  }
}
```

Такой `url`-конфиг понимают Cursor (`.cursor/mcp.json`) и Claude Code (`.mcp.json`; или одной командой: `claude mcp add --transport http nsb-mcp https://your-site.com/api/mcp --header "Authorization: Bearer nsb_pat_…"`).

## OAuth: Claude.ai / Claude Desktop / Cowork одним URL

С `MCP_OAUTH_ENABLED=1` кастомный коннектор в Claude подключается **без токена и без Node.js**: Settings → Connectors → Add custom connector → вставить `https://your-site.com/api/mcp` → Add. Поля OAuth Client ID/Secret оставить пустыми — Claude сам зарегистрируется через DCR. Дальше браузер: логин в приложение → consent-экран (scopes в пределах политики роли + срок доступа) → готово.

Как это устроено: приложение само является Authorization Server (discovery на `/.well-known/oauth-protected-resource` и `/.well-known/oauth-authorization-server`; DCR, PKCE S256, refresh-ротация с reuse-detection, RFC 7009 revoke). Access token внутри — обычный `ApiToken` (`kind: 'oauth'`, префикс `<brand>_oat_`, TTL `MCP_OAUTH_ACCESS_TTL_MINUTES`), поэтому scopes, политики ролей, rate-limit, аудит и мгновенная ревокация работают ровно как для PAT. OAuth-подключения видны и отзываются на `/profile/api-tokens` (бейдж «OAuth-подключение»); удаление коннектора на стороне Claude тоже сразу гасит грант (revocation endpoint). Работает и для Claude Code без токена: `claude mcp add --transport http nsb-mcp https://your-site.com/api/mcp` — OAuth пройдёт через loopback-редирект. Дизайн: [`docs/MCP_OAUTH_DESIGN_RU.md`](../docs/MCP_OAUTH_DESIGN_RU.md).

## Legacy-мост для stdio-only хостов

Если OAuth-слой выключен, Claude Desktop `url`-записи в `claude_desktop_config.json` не принимает (только stdio) — подключай через мост `mcp-remote` (нужен Node.js):

```json
{
  "mcpServers": {
    "nsb-mcp": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://your-site.com/api/mcp", "--header", "Authorization:${AUTH_HEADER}"],
      "env": {
        "AUTH_HEADER": "Bearer nsb_pat_…"
      }
    }
  }
}
```

Заголовок через `${AUTH_HEADER}` из `env` — обход бага Claude Desktop, который разбивает аргументы с пробелами. Этот же мост подходит для любого другого stdio-only хоста.

Частая ловушка с nvm: GUI-приложения не читают shell rc и берут `npx` дефолтной версии Node из PATH — если дефолт старый (`mcp-remote` требует Node ≥ 18, а npx из npm 6 вообще трактует URL как пакет для установки), укажи в `command` абсолютный путь к npx современной версии (`/Users/<you>/.nvm/versions/node/v22.x.x/bin/npx`) или смени дефолт: `nvm alias default 22`. Для локальной проверки `http://localhost:3000/api/mcp` подходит как есть — http без TLS mcp-remote разрешает только для localhost.

Как это работает: endpoint stateless (каждый POST независим, без сессий и SSE), рано отдаёт 401 по невалидному/отозванному токену или выключенной политике роли, а тулы ходят в собственный REST через `APP_INTERNAL_ORIGIN` с PAT вызвавшего — весь enforcement (scopes, политики, per-token rate-limit, аудит) остаётся в REST-слое.

### MCP connector (Claude Messages API)

Endpoint совместим с [MCP connector](https://platform.claude.com/docs/en/agents-and-tools/mcp-connector): коннектор шлёт `authorization_token` как `Authorization: Bearer …` и не требует OAuth-флоу — PAT подходит напрямую. Т.е. любой бэкенд (включая само приложение) может дать Claude доступ к этим тулам одним параметром запроса:

```json
"mcp_servers": [{
  "type": "url",
  "url": "https://your-site.com/api/mcp",
  "name": "nsb-mcp",
  "authorization_token": "nsb_pat_…"
}]
```

Кастомные коннекторы в claude.ai/desktop UI статический Bearer-токен не принимают — для них включи OAuth-слой (`MCP_OAUTH_ENABLED=1`, раздел выше) или используй legacy-мост `npx mcp-remote …`.

## Быстрый старт

1. Включи контур на сервере: `API_TOKENS_ENABLED=1` (и `NEXT_PUBLIC_API_TOKENS_ENABLED=1` для пунктов в меню).
2. Создай токен в `/admin/api-tokens` (ADMIN) или в `/profile/api-tokens` (любая роль, которой админ разрешил это политиками, см. ниже). Дефолтные scopes — `articles:read`, `articles:write` (draft-only). Для автопубликации явно добавь `articles:publish`.
3. Подключи хост по remote-конфигу выше — этого достаточно. Шаги 4+ нужны только для локального stdio-варианта.
4. (stdio) Установи зависимости: `pnpm install` — и подключи сервер к хосту (примеры ниже), хост сам запускает процесс.

## Политики ролей (кто может выпускать токены)

По умолчанию токены выпускает только ADMIN. В `/admin/api-tokens` (блок «Политики ролей») админ может разрешить выпуск другим ролям: для каждой роли — вкл/выкл, разрешённые scopes и максимальный срок жизни. Правила:

- Роль хранится строкой (`ApiTokenRolePolicy`), поэтому в downstream-проектах политики работают и для ролей, которых нет в `UserRole` бойлерплейта — код менять не нужно.
- Пользователь разрешённой роли видит пункт «Мои API-токены» в меню и `/profile/api-tokens`: свои токены, создание в пределах разрешённых scopes/срока, отзыв, инструкция по подключению хоста.
- Политика применяется **на каждом запросе**: отключение роли или сужение scopes мгновенно блокирует/ограничивает уже выпущенные токены этой роли (`verifyApiToken`). Понижение роли владельца тоже применяется сразу.
- Не-админ видит и отзывает только свои токены; scopes при создании всегда пересекаются с политикой на сервере.

Проверка руками: `NSB_API_BASE_URL=http://localhost:3000 NSB_API_TOKEN=nsb_pat_… pnpm mcp` (сервер молчит на stdout — это нормально, канал JSON-RPC; диагностика идёт в stderr).

## Конфиг хостов (stdio, dev/self-hosted)

### Claude Desktop (`claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "nsb-mcp": {
      "command": "npx",
      "args": ["tsx", "/абсолютный/путь/к/репо/mcp/server.ts"],
      "env": {
        "NSB_API_BASE_URL": "https://your-site.com",
        "NSB_API_TOKEN": "nsb_pat_…"
      }
    }
  }
}
```

### Cursor (`.cursor/mcp.json`) / Claude Code (`.mcp.json`)

```json
{
  "mcpServers": {
    "nsb-mcp": {
      "command": "npx",
      "args": ["tsx", "mcp/server.ts"],
      "env": {
        "NSB_API_BASE_URL": "http://localhost:3000",
        "NSB_API_TOKEN": "nsb_pat_…"
      }
    }
  }
}
```

## Tools

| Tool | Scope | Что делает |
|------|-------|------------|
| `list_articles` | `articles:read` | Список статей: staff-токен — полный (черновики, фильтры); юзерский — reader-view (published+public с title/description, для дайджестов) |
| `get_article` | `articles:read` | Статья по id или slug (юзерский токен — только published по slug) |
| `get_article_revision` | `articles:read` | Ревизия (контент, SEO-метаданные); юзерский токен — только актуальная ревизия published-статьи |
| `create_article_draft` | `articles:write` | Статья + черновая ревизия из Markdown, возвращает preview URL |
| `update_article_content` | `articles:write` | Обновление контента/заголовка/SEO ревизии (без смены статуса) |
| `suggest_seo` | `articles:seo` | LLM-подсказки по SEO (нужен `NEXT_PUBLIC_LLM_ENABLED` на сервере) |
| `publish_article` | `articles:publish` | Публикация ревизии (кэш + IndexNow — существующий флоу) |
| `unpublish_article` | `articles:publish` | Снятие с публикации |
| `get_article_views` | `articles:read` | Статистика просмотров |
| `list_media` | `media:read` | Список медиа-ассетов |
| `upload_media_from_url` | `media:write` | Загрузка файла по URL в медиатеку (нужен Uploadcare) |

## Настраиваемый цикл публикации

Управляется scopes токена, а не кодом:

- **Draft-only (дефолт):** токен без `articles:publish` — агент создаёт/правит черновики, публикует человек из админки после превью/SEO-аудита. Попытка публикации вернёт 403 с понятной подсказкой.
- **Полный цикл:** добавь scope `articles:publish` — агент публикует сам (`publish_article`), срабатывают ревалидация кэша и IndexNow.

## Медиа

- Есть Uploadcare (`UPLOADCARE_*` в env) → `upload_media_from_url` кладёт файл в медиатеку и возвращает CDN-URL для `![alt](url)`.
- Нет CDN → тул вернёт ошибку с инструкцией: админ загружает файл вручную (в редакторе есть режим «вставить по ссылке») и отдаёт агенту готовый URL.

## Как расширять (новые домены)

1. Добавь scopes домена в `src/api/api-token/model.ts` (`API_TOKEN_SCOPES`) + описания в i18n (`apiTokens.scopeDescriptions`).
2. Оберни REST-роуты домена: `withApiTokenOrAuth('<scope>')(handler)`; точечные проверки — `hasApiTokenScope(auth, '<scope>')`.
3. Создай `mcp/tools/<domain>.mcp.ts` — тулы как тонкие обёртки над REST (без бизнес-логики).
4. Подключи в `mcp/tools/index.ts` (одна строка).

Безопасность: сырой токен хранится только как sha256-хэш; роль токена не выше **текущей** роли владельца; отзыв, отключение политики роли и понижение роли владельца действуют мгновенно; действия (включая изменение политик) пишутся в `SecurityAuditLog` (см. `/admin/security-audit`); per-token rate-limit строже пользовательского.
