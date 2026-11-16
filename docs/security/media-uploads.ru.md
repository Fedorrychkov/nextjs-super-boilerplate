# Медиа: загрузка, отдача через `/cdn`, приватные файлы

Как устроен путь файла от формы до CDN и что на нём проверяется. Почему именно так — журнал
решений, §15 ([`../decisions/journal.ru.md`](../decisions/journal.ru.md)).

## Путь файла

1. `POST /api/v1/media/upload` (роль ADMIN/EDITOR или PAT со scope `media:write`).
2. До чтения тела — `Content-Length`: больше `MEDIA_UPLOAD_MAX_BYTES` (200 МБ,
   `src/constants/media-upload.ts`) → 413. Нет заголовка — тело читается как раньше.
3. `formData()`, проверка размера файла, затем **тип по байтам**
   (`src/lib/security/fileSignature.ts`): первые 512 байт → JPEG / PNG / GIF / WebP / HEIC / AVIF /
   PDF / SVG / HTML или «неизвестно».
   - слот картинки (`resourceType=image` или заявленный `image/*`) принимает только байты картинки;
   - ни один слот не принимает HTML; SVG в слоте видео/аудио/документа — отказ;
   - видео, аудио, документы сохраняют заявленный тип: сигнатур для них нет намеренно.
   Отказ — 415 `media.errors.unsupportedFileType` с `reason: image_bytes_unknown | active_content`.
4. Загрузка в Uploadcare, затем `getUploadcareFileInfo`: если тип, который увидело хранилище,
   расходится с нашим по семейству (`image/` vs `text/`) — файл удаляется из хранилища, ответ 400
   `MEDIA_MIME_MISMATCH`, документа в базе нет.
5. `MediaAsset` создаётся с `purpose: cms`, `visibility: public`; ответ — DTO без `createdBy`,
   `originalUrl` и `providerFileId`.

## Отдача

| Роут | Кто | Что |
|---|---|---|
| `GET /cdn/<id>[/<variant>]` | все, без входа | 302 на `ucarecdn.com` с операциями варианта. Только `visibility: public`. Приватный ассет и кривой id — 404/400, без 500 |
| `GET /api/v1/media/<id>/file` | владелец или ADMIN (cookie-сессия) | байты потоком через наш origin: `Cache-Control: private, no-store`, `X-Content-Type-Options: nosniff`, `Content-Security-Policy: default-src 'none'; sandbox`, `Content-Disposition: inline` для растра и `attachment` для всего остального |

SVG в загрузке разрешён: он отдаётся с чужого origin (`ucarecdn.com`) и не исполняется в контексте
нашего домена. Через `/api/v1/media/<id>/file` SVG уходит вложением и в песочнице.

## Поля модели

- `purpose` — `cms` (медиатека редакторов, по умолчанию) или `user` (файл человека: аватар,
  вложение). Список `/api/v1/media/list` и удаление `/api/v1/media/delete/<id>` работают только с
  `purpose != user`; документы без поля считаются `cms`.
- `visibility` — `public` (по умолчанию) или `private`. Приватный никогда не отдаётся через `/cdn`.
- Миграции нет: дефолты совпадают с тем, что было у всех существующих документов.

Для файлов людей вызывайте `createMediaAsset({ …, purpose: MediaPurpose.USER, visibility:
MediaVisibility.PRIVATE })` и отдавайте ссылку на `/api/v1/media/<id>/file`, а не на `proxyPath`.
Правило доступа — `canReadMediaAsset` в `lib/services/media-access.ts` (с тестами).

## nginx

`client_max_body_size 10m` на уровне `http` — для всех запросов; вложенный
`location = /api/v1/media/upload` внутри `location /` поднимает его до 200m только для загрузки.
Вложенный блок наследует `proxy_set_header`, буферы и таймауты, но **не** `set` (rewrite-модуль
исполняет только внутренний блок), поэтому `set`-переменные повторены в нём дословно. Добавляя новую
переменную в `location /`, добавьте её и во вложенный блок — иначе заголовок с ней уедет пустым, а
`X-Client-IP` — это ключ рейт-лимита.

Проверка: `curl -X POST --data-binary @20mb.bin https://<домен>/api/v1/llm/chat` → 413 от nginx,
в логах приложения запроса нет; загрузка PNG из редактора работает.

## Что проверить руками после выкатки

- `curl -i https://<домен>/cdn/not-an-id` → 400, в логах нет CastError.
- Загрузка PNG/JPEG из редактора и из MCP (`upload_media_from_url`) — как раньше.
- `curl -F 'file=@page.html;type=image/png' -F resourceType=image …/api/v1/media/upload` под
  сессией редактора → 415.
