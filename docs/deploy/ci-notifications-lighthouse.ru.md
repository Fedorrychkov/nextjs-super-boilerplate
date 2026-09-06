# CI: уведомления в Telegram, Lighthouse, скан секретов, гейты

Что происходит на каждый PR и push в `develop` / `main` помимо деплоя. Деплойные сообщения
(старт / успех / ошибка) — по-прежнему в `reusable-deploy-config.yml` и `scripts/notify-telegram.sh`.

## Карта workflow

| Workflow | Файл | Когда | Что делает |
|---|---|---|---|
| CI | `ci.yml` → `quality.yml` | PR, push | Матрица `gates` / `lint` / `typecheck` / `test`, `fail-fast: false` |
| Secret scan | `ci-secret-scan.yml` | PR, push, без paths-фильтра | gitleaks по отслеживаемому дереву (`git archive`) |
| Lighthouse | `lighthouse.yml` | PR и push, только при изменениях `src/**`, `public/**`, `next.config.ts`, `package.json`, lockfile | Живой `next start` с пустой Mongo, бюджеты из `lighthouserc.json`, сводка в step summary и в Telegram |
| Notify Telegram | `notify-telegram.yml` | PR-события, ревью, `workflow_run` по CI и Secret scan | Сообщения в чат |

## Уведомления: что приходит и что нет

Секреты репозитория те же, что у деплоя: `TG_TOKEN`, `TG_CHAT_ID`, `TG_THREAD_ID` (тема
супергруппы, необязательно). Без них скрипт печатает текст и выходит нулём — PR из форка не
ломает CI.

Приходит:

- 🟢 открыт PR / готов к ревью / переоткрыт — автор, метки, `закрывает #N · связано #M` из тела PR, цитата ветки;
- 👀 запрошено ревью у кого-то;
- ✅ / ❌ / 💬 оставлено ревью (approve / changes requested / комментарий), с текстом;
- 🔴 упал или вышел по таймауту `CI` / `Secret scan` — имена упавших джоб (через API), ссылка на прогон;
- 🟣 PR влит — кем, куда, коммит;
- 🟢 / 🔴 Lighthouse — perf, LCP, вес по каждому URL (шлёт сам `lighthouse.yml`, потому что другой workflow до отчётов не дотянется).

Не приходит намеренно: draft-PR, обычный push в открытый PR (`synchronize`), зелёные прогоны,
отмены по concurrency, PR закрыт без merge.

Хэштеги для поиска в чате: `#pr #develop`, `#merged #main`, `#ci`, `#review`, `#lighthouse` — те же,
что у деплойных `#stage` / `#prod` / `#error`.

## Где тексты и как их менять

`scripts/telegram/format.mjs` — чистые функции без сети, тесты в `format.test.mjs` (входят в
`pnpm test`). `scripts/telegram/notify.mjs` — CLI: читает `$GITHUB_EVENT_PATH`, шлёт через Bot API.
Зависимостей нет намеренно: джоба бежит на sparse-checkout без `pnpm install`, за секунды.

Всё динамическое проходит через `esc()`: формат HTML, и трейлер `Co-Authored-By: Имя <почта>`
иначе читается Telegram как тег (Bot API отвечает 400 «can't parse entities»). Добавляя новое
поле в сообщение — экранируй.

Локальная проверка деплойного шаблона:

```bash
TG_DRY_RUN=1 TG_STATUS=success TG_API_ENV=prod TG_DOMAIN=example.com GITHUB_MESSAGE='fix: <x> & y' bash scripts/notify-telegram.sh
```

Незаданные `GITHUB_*_URL` в сухом прогоне остаются пустыми, скрипт из-за них не падает.

## Lighthouse: бюджеты

`lighthouserc.json`, mobile, медиана из трёх прогонов. Ломают сборку (детерминированы): вес
страницы, JS, картинки, шрифты, CLS, `font-display`. Предупреждают (плавают на раннере):
performance, accessibility, LCP, render-blocking. Сторонние запросы — `warn`, потому что
бойлерплейт не знает, подключит ли продукт аналитику; в продукте без сторонних скриптов переведи
в `error`.

Числа — храповик против регресса, не цель. После первого прогона в своём проекте посмотри
сводку в step summary и выставь пороги с запасом ~25 % от факта. Список URL — публичные страницы,
которые видит новый посетитель; добавляй свои.

Прогон требует, чтобы приложение поднялось на минимальном env (см. шаг «.env.local для
прогона»). Добавил обязательную переменную в `config/env.ts` — добавь её и туда.

## Гейты (`pnpm gates`)

`scripts/gates.mjs` запускает каждый `scripts/check-*.mjs` и печатает одну таблицу — все, всегда:
`&&` спрятал бы второй красный за первым, и починка трёх гейтов заняла бы три раунда CI. Гейт —
обычный node-скрипт: выход 0 — прошёл, иначе — нет, что напечатал — объяснение. Добавить гейт =
добавить файл, регистрировать нечего.

| Гейт | Что ловит |
|---|---|
| `check-agent-contract` | `AGENTS.md` больше 28 КБ или с `@file`-импортом; `CLAUDE.md` без `@AGENTS.md` или больше 4 КБ |
| `check-eslint-disable-ratchet` | Число `eslint-disable` выросло. Baseline `scripts/eslint-disable-ratchet-baseline.txt`; стало меньше — `node scripts/check-eslint-disable-ratchet.mjs --update` тем же PR |
| `check-docs-structure` | Документ вне схемы `docs/<тема>/<kebab>.<ru\|en>.md`, документ без строки в `docs/README.md`, битая относительная ссылка в любом `.md` репозитория (код-спаны и блоки кода не считаются) |
| `check-env-reference` | Имена в `.env.example` и в `docs/configure/env-reference.{ru,en}.md` разошлись в любую сторону; блок `<!-- env-gate: ignore -->` (входы деплоя) не учитывается |

Механика храповика — `scripts/lib/ratchet.mjs`: годится для любого «числа, которое может только
уменьшаться» (JS-файлы при миграции на TS, `any`, `alert()`, TODO).

## Секреты

`ci-secret-scan.yml` гоняет gitleaks по отслеживаемому дереву на каждый PR и push. Историю не
сканирует: если секрет уже в истории, это ротация и purge руками владельца, а не задача гейта.
Ложное срабатывание на примерных значениях — добавь `.gitleaks.toml` с allowlist и объясни в PR.
