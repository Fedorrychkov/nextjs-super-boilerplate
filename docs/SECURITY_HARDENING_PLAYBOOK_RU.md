# Security Hardening Playbook

Контекст-документ к патчу `patch/security-hardening.patch`. Патч собирает переиспользуемые правки безопасности/SEO, применимые к проектам, порождённым из этого бойлерплейта (одинаковая структура `lib/`, `config/`, `src/app/api`, `.docker/nginx`).

Патч НЕ содержит: `pnpm-lock.yaml` (регенерируется), отчёт аудита, инфраструктурные патчи и файлы вне этого набора.

---

## Что внутри патча (15 файлов)

| Область | Файлы | Что делает |
|---|---|---|
| JWT | `lib/jwt/utils.ts` | Пиннинг алгоритма: `algorithm: 'HS256'` при подписи, `algorithms: ['HS256']` при верификации. Защита от algorithm-confusion (`alg:none`, HS/RS confusion). |
| SEO-эндпоинты | `lib/security/seo-notify-guard.ts` (new), `src/app/api/v1/seo/{notify,indexnow,google-indexing}/route.ts`, `config/env.ts`, `.env.example` | Guard с флагом раската `SEO_NOTIFY_AUTH_ENABLED` + секрет `SEO_NOTIFY_SECRET`, обёртка `withGlobalRateLimit`, фильтр URL по хосту сайта. |
| nginx | `.docker/nginx/nginx.conf.template.https`, `.template.http`, `.local.template.https` | `/nginx_status` закрыт (localhost + приватные подсети вместо `allow 0.0.0.0/0`); убран подделываемый источник client IP из левого `X-Forwarded-For` → только `$realip_remote_addr`. |
| Гигиена | `src/proxy.ts`, `lib/middleware/rate-limit-middleware.ts`, `lib/cookies.ts` | Per-request логи с IP понижены `warn`→`debug`; `sameSite` в `clearAuthCookies` унифицирован на `lax`. |
| Зависимости | `package.json`, `pnpm-workspace.yaml` (new) | Прямые: `undici`≥7.28, `uuid`≥13.0.1, `happy-dom`≥20.10.6; блок `overrides` для уязвимых транзитивных (dompurify, markdown-it, linkify-it, postcss, @babel/core, picomatch, ws, brace-expansion). |

---

## Применение в новом проекте

```bash
# из корня целевого проекта
git apply --check patch/security-hardening.patch      # проверка без изменений
git apply patch/security-hardening.patch              # применить
# если package.json разошёлся — применить с 3-way или отбросить конфликтные хунки:
git apply --3way patch/security-hardening.patch
#   либо: git apply --reject ... и доработать *.rej вручную

# зависимости (lockfile в патч не входит намеренно):
rm -f pnpm-lock.yaml && pnpm install
pnpm audit --prod        # цель: 0 уязвимостей; если вылезли новые транзитивы — допишите overrides

# проверка компиляции:
pnpm typecheck
```

Если проект НЕ на pnpm или дерево зависимостей сильно отличается — примените блок `overrides` вручную под свой `pnpm audit` (см. ниже), остальные хунки от менеджера пакетов не зависят.

---

## Обязательные env после применения

```env
# SEO indexing endpoints — постепенный раскат:
#   false (дефолт) → ручки открыты как раньше, ничего не ломается
#   true            → требуется заголовок x-seo-notify-secret = SEO_NOTIFY_SECRET
SEO_NOTIFY_AUTH_ENABLED=false
SEO_NOTIFY_SECRET=
```

Порядок безопасного включения: выкатить код с флагом `false` → проставить `SEO_NOTIFY_SECRET` и научить вызовы слать заголовок → переключить флаг в `true`. При `true` + пустом секрете эндпоинты возвращают 503 (fail-closed, чтобы не осталось молча открытой ручки).

---

## Разбор правок (что / зачем / как проверить)

### 1. JWT — пиннинг HS256
`jwt.verify(token, secret)` без `algorithms` допускает algorithm-confusion. Пиннинг фиксирует единственный ожидаемый алгоритм.
Проверка: валидный токен проходит; токен с `alg: none` или другим алгоритмом отклоняется.

### 2. SEO-эндпоинты — auth + rate-limit + фильтр домена
`/api/v1/seo/{notify,indexnow,google-indexing}` дёргают IndexNow / Google Indexing API и жгут вашу квоту. Раньше — аноним, без лимита, любой URL. Стало: секрет-заголовок под флагом, глобальный rate-limit, фильтр URL по хосту `NEXT_PUBLIC_SITE_URL`.
Внутренний автопостинг при публикации не затронут — он вызывает `lib/seo/indexing` напрямую, не через HTTP-роут.
Проверка: при `SEO_NOTIFY_AUTH_ENABLED=true` запрос без заголовка → 401; с верным заголовком и своим доменом → 200; чужой домен в `urls` → отфильтровывается.

### 3. nginx — /nginx_status и client IP
`allow 0.0.0.0/0` матчился раньше `deny all`, т.е. метрики были публичны. Заменено на localhost + приватные подсети.
Client IP раньше собирался из левого элемента `X-Forwarded-For` (задаётся клиентом → подмена ключа rate-limit). Оставлен только `$realip_remote_addr` (прямой TCP-peer, неподделываем, т.к. nginx — edge).
За CDN/LB (Cloudflare и т.п.) включите realip-модуль:
```nginx
set_real_ip_from <trusted-proxy-cidr>;
real_ip_header X-Forwarded-For;
real_ip_recursive on;
```
Проверка: `curl -H 'X-Forwarded-For: 1.2.3.4' https://site/...` — в апстрим уходит реальный IP, а не 1.2.3.4; `/nginx_status` снаружи → 403.

### 4. Гигиена
Per-request логи с IP на уровне `warn` попадали в прод (consola показывает warn). Понижены до `debug` (в проде скрыты). `clearAuthCookies` ставил `SameSite=None` — унифицирован с `setAuthCookies` на `lax`.

### 5. Зависимости
`overrides` форсят безопасные версии транзитивных; версионно-скоуплены (picomatch/ws/brace-expansion), чтобы не задеть другие мажорки. `happy-dom` закреплён прямой зависимостью — иначе авто-peer от `@tiptap/html` не переразрешается при инкрементальном install.

Референс блока (адаптируйте под свой `pnpm audit`):
```yaml
# pnpm-workspace.yaml (pnpm 10.16+/11); для pnpm 9 — тот же блок в package.json → "pnpm": { "overrides": {...} }
overrides:
  dompurify: '>=3.4.11'
  happy-dom: '>=20.8.9'
  markdown-it: '>=14.2.0'
  linkify-it: '>=5.0.1'
  postcss: '>=8.5.10'
  '@babel/core': '>=7.29.6'
  'picomatch@>=4.0.0 <4.0.4': '>=4.0.4'
  'ws@>=7.0.0 <7.5.11': '>=7.5.11'
  'brace-expansion@>=1.0.0 <1.1.13': '>=1.1.13'
  'brace-expansion@>=4.0.0 <5.0.6': '>=5.0.6'
```

---

## Не входит в патч (сделайте отдельно, требует теста)

- **CSP `unsafe-inline`/`unsafe-eval`** в `next.config.ts` — переход на nonce задевает inline-скрипты аналитики (Метрика/GTM), нужен тест на проде.
- **App-layer доверие к `x-*-ip`** — nginx-фикс закрывает основной вектор; дополнительно не публикуйте порт Next-приложения наружу (за nginx во внутренней docker-сети).
- **CI-gate** `pnpm audit` и scaffold-скрипт инициализации продукта.

---

## Чеклист применения

- [ ] `git apply --check` прошёл
- [ ] `git apply` применён (при конфликте package.json — `--3way`)
- [ ] `pnpm install` + `pnpm audit --prod` = 0
- [ ] `pnpm typecheck` = 0
- [ ] заданы `SEO_NOTIFY_AUTH_ENABLED` / `SEO_NOTIFY_SECRET`
- [ ] за CDN — настроен realip в nginx
- [ ] прод-проверка заголовков на securityheaders.com
