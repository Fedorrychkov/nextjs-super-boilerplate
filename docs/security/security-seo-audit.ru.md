# Аудит безопасности и SEO — nextjs-super-boilerplate

**Дата:** 2026-07-02
**Объект:** репозиторий `Fedorrychkov/nextjs-super-boilerplate` + прод `https://nextjs-super-boilerplate.visn-ai.io`
**Версия:** 0.2.3 · Next.js 16.1.6

---

## Резюме

Бойлерплейт сделан крепко: продуманная auth-модель (JWT + httpOnly cookies + серверные ревокабельные сессии, MFA/TOTP на AES-256-GCM, bcrypt, брутфорс-защита), полный набор security-заголовков, отличный SEO-слой и по-настоящему удобная конфигурируемость через `config/product.ts` и env-профили. Секретов в git нет, `.env*` корректно игнорируется.

Основные риски не в самописной логике, а в **устаревших зависимостях** (Next.js и axios с десятками известных CVE) и в **нескольких открытых наружу эндпоинтах/настройках** (SEO-indexing без авторизации, `/nginx_status`, доверие к клиентским IP-заголовкам).

Приоритеты: сначала обновить зависимости (1) и закрыть SEO-эндпоинты (2) — это быстрые и высокоэффективные правки.

---

## Находки по безопасности

### 🔴 Высокий приоритет

**1. Устаревшие зависимости с известными CVE.**
`pnpm audit` выдаёт большой список; самое важное:

| Пакет | Текущая | Нужно | Суть |
|---|---|---|---|
| `next` | 16.1.6 | **≥16.2.6** | Middleware/Proxy bypass (несколько), SSRF через WebSocket upgrade, request smuggling в rewrites, DoS в Server Components, XSS в CSP-nonce/beforeInteractive, обход CSRF в Server Actions |
| `axios` | 1.10.0 | **≥1.16.0** | Прототайп-поллюшн (кража кредов, MITM через `config.proxy`), SSRF/NO_PROXY bypass, утечка `Proxy-Authorization` при редиректах, ReDoS |
| `lodash` | (прямая зависимость) | **≥4.18.0** | Code injection через `_.template`, prototype pollution в `_.unset`/`_.omit` |

Транзитивно также: `undici`, `ws`, `form-data`, `dompurify`, `happy-dom`, `picomatch`, `flatted`, `postcss`, `js-yaml` — часть тянется только dev/eslint-цепочкой (ниже риск), но `next`/`axios`/`lodash` — рантайм.

Next.js — критичнее всего: несколько CVE напрямую про обход middleware, а вся ваша авторизация построена на middleware (`withAuthMiddleware`). Обновление до 16.2.6+ обязательно.

> Действие: `pnpm up next@latest axios@latest lodash@latest`, затем `pnpm audit --prod` до нуля high в рантайм-зависимостях. Добавьте `pnpm audit` в CI (GitHub Actions) как gate.

**2. SEO-indexing эндпоинты открыты без авторизации и без rate-limit.**
`src/app/api/v1/seo/notify`, `seo/indexnow`, `seo/google-indexing` — публичные `POST`, принимают произвольный массив URL и валидируют только синтаксис URL (`new URL(u)`), не проверяя принадлежность вашему домену.

Последствия: любой может жечь вашу квоту Google Indexing API (через ваш service account) и IndexNow, а также инициировать индексацию произвольных путей. В отличие от остальных API-роутов, тут нет ни `withAuthMiddleware`, ни `withGlobalRateLimit`. Плюс глобальный rate-limit в `proxy.ts` намеренно пропускает всё под `/api/`.

> Действие: обернуть эти роуты в `withAuthMiddleware` + роль admin (их должен дёргать только бэкенд при публикации), либо защитить внутренним секретом-заголовком; добавить `withGlobalRateLimit`; фильтровать URL по `NEXT_PUBLIC_SITE_URL` host.

### 🟠 Средний приоритет

**3. CSP допускает `unsafe-inline` и `unsafe-eval` в `script-src`.**
В `next.config.ts` политика хорошая по структуре (object-src none, base-uri self, frame-ancestors, form-action self), но `script-src` с `'unsafe-inline' 'unsafe-eval'` сильно ослабляет защиту от XSS — по сути главный барьер CSP против инъекции скриптов снят. Next 16 умеет nonce-based CSP.

> Действие: перейти на nonce/hashes для inline-скриптов, убрать `unsafe-eval` (нужен обычно только аналитике/легаси). Это заметно поднимет реальную стойкость.

**4. Rate-limit и «client IP» доверяют клиентским заголовкам.**
`getClientKey()` берёт `x-client-ip`/`x-real-ip` из запроса как есть, а nginx выставляет `X-Client-IP` из **левого** значения `X-Forwarded-For` (`$original_client_ip = первый элемент XFF`) — а левый элемент XFF задаётся клиентом. То есть атакующий может слать `X-Forwarded-For: <рандом>` и на каждый запрос получать новый ключ rate-limit, обходя лимиты; те же значения уходят в логи как «настоящий IP».

> Действие: на edge (nginx) использовать `$remote_addr` от доверенного прокси как источник IP (или realip module с `set_real_ip_from` для конкретных доверенных прокси), а не первый элемент клиентского XFF. В приложении не доверять `x-*-ip`, если запрос не пришёл от известного прокси.

**5. `/nginx_status` фактически открыт наружу.**
```
location /nginx_status {
    stub_status on;
    allow 0.0.0.0/0;   # ← матчится первым → разрешает всех
    deny all;
}
```
В nginx `allow`/`deny` проверяются по порядку: `allow 0.0.0.0/0` разрешает всех до того, как сработает `deny all`. Метрики nginx доступны публично (в комментарии даже стоит «check security»).

> Действие: заменить на `allow 127.0.0.1; allow <ваша_подсеть_мониторинга>; deny all;`. Аналогично проверьте публичный доступ к `/grafana/`.

**6. `jwt.verify` без пиннинга алгоритма.**
`verifyAccessToken`/`verifyRefreshToken` вызывают `jwt.verify(token, secret)` без `{ algorithms: ['HS256'] }`. Риск невысок (используется только HS256), но пиннинг — стандартная защита от algorithm-confusion.

> Действие: добавить `{ algorithms: ['HS256'] }` в оба verify.

### 🟢 Низкий / гигиена

- `clearAuthCookies` ставит `sameSite: 'none'`, тогда как `setAuthCookies` — `'lax'`. Косметическая нестыковка; для очистки безопаснее тоже `lax`.
- `proxy.ts` логирует `logger.warn('[proxy] consumed key', key)` на каждый запрос, а `removeConsole` в проде оставляет `warn`/`error` → IP клиентов текут в прод-логи и создают шум. Понизить до debug или убрать.
- `article/view` (POST, аноним) — накрутка просмотров возможна, но rate-limit стоит. Приемлемо.

### ✅ Что сделано хорошо

Секреты не в git, `.env*` в `.gitignore`, хардкод-ключей нет. Cookies httpOnly+secure(prod)+sameSite. Пароли на bcrypt. TOTP-секреты шифруются AES-256-GCM. Refresh-токены ротируются и хранятся серверно с возможностью ревока (`sid` привязка). Брутфорс-защита логина (`assertLoginNotBlocked`). Rate-limit глобальный + отдельный для LLM. Заголовки: HSTS(prod), X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, COOP. Auth-middleware серверно проверяет активность сессии.

---

## SEO — оценка

Слой SEO — сильная сторона бойлерплейта, почти без замечаний.

- **robots.txt** (`src/app/robots.ts`) — правила для `*` с закрытием приватных путей + явные allow для Yandex/GPTBot/PerplexityBot/Bingbot/Google-Extended/ClaudeBot, `host`, `sitemap`.
- **sitemap.xml** — динамический (`force-dynamic`), статические + опубликованные статьи, с graceful-фолбэком и кэшем `s-maxage=600, stale-while-revalidate`.
- **Метаданные** — canonical, OpenGraph, Twitter cards, `og:locale` + alternate, JSON-LD (Person, SoftwareApplication). Проверено на живой главной — всё присутствует.
- **AI-discovery** — `llms.txt`, markdown-вариант статей через `Accept`-заголовок (rewrite в `proxy.ts`), Content-Signal header. Хорошо для LLM-агентов.
- **Индексация** — интеграция IndexNow + Google Indexing (но см. находку #2 про их защиту).

Замечаний по самому SEO нет. Единственное пересечение с безопасностью — открытые indexing-эндпоинты.

---

## Конфигурируемость / скорость старта

Тоже сделано на хорошем уровне — это главная цель бойлерплейта, и она достигнута.

- `config/product.ts` — единый source of truth (имя, автор, ссылки, PWA, какие JSON-LD блоки эмитить, sitemap-extra). Понятная модель с `null`-опциями для «продукта без публичного автора» и «не open-source».
- Env-профили `local/stage/prod`, подробнейший `.env.example` с комментариями, скрипт `doctor` для валидации env.
- Docker Compose (dev/local), GitHub Actions CI/CD, feature-флаги.

Рекомендации для ещё более простого «форкнул → переписал → запустил»:

1. **Scaffold-скрипт** (`scripts/init-product.ts`): интерактивно спросить name/domain/author и переписать `config/product.ts` + `NEXT_PUBLIC_SITE_URL` + заменить упоминания старого домена — чтобы после форка не искать хвосты `visn-ai.io` вручную.
2. **`pnpm audit` и `typecheck` как обязательный CI-gate** — чтобы форки не стартовали на уязвимых зависимостях.
3. Вынести в `config/product.ts` (или env) захардкоженные в CSP домены аналитики (`mc.yandex.ru`, GTM, `yclients.com`) — сейчас они зашиты в `next.config.ts` и при старте нового проекта их надо чистить руками.

---

## План действий (по приоритету)

1. Обновить `next` ≥16.2.6, `axios` ≥1.16.0, `lodash` ≥4.18.0; прогнать `pnpm audit --prod`.
2. Закрыть `seo/notify` / `seo/indexnow` / `seo/google-indexing` авторизацией + rate-limit + фильтром по своему домену.
3. Убрать `unsafe-inline`/`unsafe-eval` из `script-src` (nonce-based CSP).
4. Починить источник client IP на edge (realip от доверенного прокси), не доверять `x-*-ip` в приложении.
5. Ограничить `/nginx_status` (и проверить `/grafana/`).
6. Пиннинг `algorithms: ['HS256']` в `jwt.verify`; понизить уровень логов в `proxy.ts`.
7. Добавить `pnpm audit` в CI и scaffold-скрипт инициализации продукта.

---

## Статус исправлений (сессия 2026-07-02)

Выполнено:

- **Зависимости** — `next`/`axios`/`lodash` обновлены; добавлены `pnpm.overrides` (package.json + `pnpm-workspace.yaml`), `undici`→^7.28.0, `uuid`→^13.0.1, `happy-dom` закреплён ^20.10.6 прямой зависимостью. На чистом резолве `pnpm audit` = 0 уязвимостей. Требуется локально: `rm -f pnpm-lock.yaml && pnpm install`.
- **SEO-эндпоинты** — `/api/v1/seo/{notify,indexnow,google-indexing}` обёрнуты в `withGlobalRateLimit`, URL фильтруются по хосту сайта. Auth — с флагом постепенного раската `SEO_NOTIFY_AUTH_ENABLED`: `false` (по умолчанию) → ручки открыты как раньше; `true` → требуется секрет-заголовок `x-seo-notify-secret` = `SEO_NOTIFY_SECRET` (enabled + пустой секрет → 503). Guard: `lib/security/seo-notify-guard.ts`.
- **JWT** — `algorithm: 'HS256'` при подписи и `algorithms: ['HS256']` при верификации (`lib/jwt/utils.ts`).
- **`/nginx_status`** — `allow 0.0.0.0/0` заменён на localhost + приватные подсети (все 3 шаблона).
- **Client IP** — удалён подделываемый источник из левого `X-Forwarded-For`; эффективный источник — `$realip_remote_addr` (прямой peer). Добавлен комментарий про `realip` для CDN.
- **Гигиена** — per-request логи с IP понижены `warn`→`debug` (`proxy.ts`, `rate-limit-middleware.ts`); `sameSite` в `clearAuthCookies` унифицирован на `lax`.

Проверено: `tsc --noEmit` = 0 ошибок; nginx-шаблоны структурно валидны.

Осталось (требует твоего решения/тестирования):

- **CSP `unsafe-inline`/`unsafe-eval`** — не трогал: переход на nonce затрагивает inline-скрипты Яндекс.Метрики/GTM и требует проверки на проде, чтобы не сломать аналитику.
- **App-layer доверие к `x-*-ip`** — nginx-фикс закрывает основной вектор; дополнительно не публикуй порт Next-приложения наружу (в Docker backend доступен только через nginx).
- **CI-gate `pnpm audit` + scaffold-скрипт** инициализации продукта.

---

*Примечание: живые security-заголовки на проде не удалось подтвердить через браузер (расширение Chrome было не подключено). Заголовки определены в `next.config.ts` для всех маршрутов; рекомендую перепроверить на securityheaders.com после деплоя.*
