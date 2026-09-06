# Аудит бойлерплейта против дочерних проектов — сентябрь 2026

Дата: 05.09.2026. Сравнивались четыре живых проекта: **mcrypto-superweb** и **vpn-saas-super**
(на этом бойлерплейте), **vrs** (React + Spring) и **banking-future-mvp** (NestJS + Next, монорепо).
Цель — вернуть в бойлерплейт то, что в проектах выросло из реальных инцидентов, и записать, что
осознанно не переносится.

**Запись не равна состоянию.** Раздел «Что осталось» — снимок на дату; перед тем как брать пункт,
сверься с кодом.

## Матрица: что где было

| Возможность | BP до аудита | mcrypto | vpn-saas | vrs | banking | Итог |
|---|---|---|---|---|---|---|
| Уведомления в TG о PR / ревью / падении CI / merge | — | ✅ `scripts/telegram` | — | ✅ (тот же код) | — | **перенесено** |
| Lighthouse-бюджеты публичных страниц | — | ✅ живой `next start` | — | ✅ статика | — | **перенесено** (вариант mcrypto) |
| Скан секретов (gitleaks) | — | — | — | ✅ с baseline | ✅ по `git archive` | **перенесено** (вариант banking) |
| `gates.mjs` + `check-*.mjs` | — | ✅ | — | ✅ | ✅ (20 гейтов) | **перенесено** + `eslint-disable`-храповик |
| Контракт агента: `AGENTS.md` + тонкий `CLAUDE.md` + проверка размера | AGENTS как справочник | ✅ | ✅ | ✅ | ✅ | **перенесено** |
| Гейт `PreToolUse` (git push, `.env.prod`, restore) | — | — | ✅ `guard-external.sh` | — | ✅ (личные хуки + Cursor-адаптеры) | **перенесено** (вариант vpn) |
| `docs/agents/review.md`, `triage.md` | — | — | — | ✅ | ✅ | **перенесено**, адаптировано под CI BP |
| Журнал решений (`DECISIONS`) | — | ✅ дизайн-док §N | ✅ | ✅ `decisions/NNNN` | ✅ | **перенесено** (форма vpn, §N) |
| `docs/plans/` с README | — | — | ✅ | — | ✅ | **перенесено** |
| PR-шаблон | — | — | — | ✅ | — | **перенесено** |
| Деплойное уведомление: экранирование, urlencode, проверка ответа | ломалось на трейлере | ✅ | ✅ | — | — | **перенесено** |
| `env_public` из Variables + CRLF + ловля секретов в Variables | — | ✅ | — | — | — | **перенесено** |
| Doctor гейтом перед деплоем | — | ✅ | — | — | — | **перенесено** (флаг `doctor_check_enabled`) |
| Doctor: loopback-хост при sibling-контейнерах | — | ✅ `container-topology.ts` | — | — | — | **перенесено** |
| Хранилища первыми, бюджет ожидания 300 с, логи при падении, отказ pull | 60 с и молча | ✅ | — | — | — | **перенесено** |
| CRLF-толерантный `load_env_into_shell` | — | ✅ | — | — | — | **перенесено** |
| Grafana: пин 13.2.1, 43 % бюджета, аналитика off | `latest`, 29 % | ✅ | — | — | — | **перенесено** |
| `setup-local.sh` (повторяемый онбординг) | только `init-project.sh` | ✅ | — | — | — | **перенесено**, оба скрипта |
| Воркер blue/green + multi-domain wildcard (Cloudflare DNS-01) | — | — | ✅ | — | — | не перенесено, см. ниже |
| Ярус интеграционных тестов `test:db` на реплика-сете, `withDb` в quality | — | ✅ | — | — | ✅ | не перенесено, см. ниже |
| Heartbeat воркера в БД + индикатор в админке | флаг `WORKER_HEARTBEAT` | ✅ модель `WorkerHeartbeat` | — | — | — | бэклог |
| `SEO_INDEXING_ENABLED` (стейдж закрыт от индексации флагом) | — | ✅ | — | — | — | бэклог |
| Skills в `.agents/skills` + symlink-адаптеры для Claude/Codex/Cursor, `sync:mcp` | `skills/NSB_SETUP_SKILL.md` | — | — | — | ✅ | бэклог |
| Обновлённые security overrides (`pnpm-workspace.yaml`) | старее | ✅ | — | — | — | бэклог (нужен `pnpm install` и проверка `next/image`) |
| Docs: `STACK_RU.md` отдельно от контракта, `SESSION_HANDOFF` | — | ✅ | — | — | — | пока не нужно: контракт 15/21 КБ из 28 |

## Что перенесено — и откуда

Каждый пункт ниже — с источником, чтобы при расхождении смотреть оригинал.

### CI и уведомления

- `scripts/telegram/{format,notify}.mjs` + тесты — mcrypto `cccd4e1` (#25). Тексты те же; имя
  репо в тестах заменено на `owner/repo`.
- `.github/workflows/notify-telegram.yml` — mcrypto, `workflow_run` расширен на `Secret scan`.
- `.github/workflows/lighthouse.yml`, `lighthouserc.json` — mcrypto; монга поднята `services:`
  (реплика-сет не нужен), URL — `/`, `/articles`, `/login`; сторонние запросы `warn`, не `error`.
- `.github/workflows/ci-secret-scan.yml` — banking `ci-secret-scan.yml` (дерево через
  `git archive`, без baseline).
- `scripts/gates.mjs`, `scripts/check-agent-contract.mjs` — mcrypto; `scripts/lib/ratchet.mjs` —
  vrs; `check-eslint-disable-ratchet.mjs` — новый, baseline 21.
- `quality.yml` — матрица `[gates, lint, typecheck, test]`; `package.json` — `gates`,
  `doctor:stage`, `test` с кавычками в глобах (иначе `sh` в CI разворачивает `**` как `*`).
- `scripts/notify-telegram.sh` — vpn `9fa0e83` (перенос mcrypto `8d2adc8`).
- `.github/PULL_REQUEST_TEMPLATE.md` — vrs, чеклист под BP.

### Деплой

- `reusable-deploy-config.yml` — mcrypto `75ec456`, `2bf8279`, `a2db7f3`: `env_public`,
  `doctor_check_enabled`, CRLF, ловля секретов в Variables, шаг doctor. Отличие от mcrypto: шаг
  doctor условен на `doctor_check_enabled` (в mcrypto он шёл всегда для stage/prod, а install в
  registry-режиме — только при флаге; при `false` шаг упал бы на «tsx not found»).
- `prod-deploy.yml` — `env_public: ${{ vars.WEB_ENV_PUBLIC_PROD }}`, `doctor_check_enabled: true`.
- `scripts/local-containers-run.sh` — mcrypto `d4a8ffb`, `2bf8279`: `wait_for_container_healthy`,
  `pull_core_api_image`, Stage 0 для хранилищ.
- `scripts/lib/deploy-utils.sh`, `scripts/lib/memory-limits.sh` — mcrypto `2bf8279`, `447ae24`.
- `docker-compose.local.yml` — Grafana `13.2.1` + `GF_ANALYTICS_*`.
- `scripts/doctor.ts` + `config/container-topology.ts` — mcrypto `a2db7f3`.

### Агентский слой

- `CLAUDE.md` — по образцу mcrypto/vpn; добавлено правило про Write для файлов со словами,
  которые ловит гейт.
- `.claude/settings.json`, `scripts/guard-external.sh` — vpn.
- `AGENTS.md` / `AGENTS_RU.md` — новый раздел «Rules for agents»: лестница приоритетов, размер
  работы, «сделано и достаточно», тесты, что ловится машинно, дисциплина документации —
  синтез mcrypto / vpn / banking; справочная часть (стек, структура) оставлена.
- `docs/agents/review.md`, `triage.md` — vrs/banking, адаптировано; `docs/DECISIONS_RU.md` —
  форма vpn, записи §1–§7 объясняют решения этого аудита; `docs/plans/README.md` — vpn.
- `scripts/setup-local.sh`, `make setup` — mcrypto `d276a8a`; в отличие от mcrypto
  `init-project.sh` оставлен: у бойлерплейта форки будут.
- `.gitignore` — рантайм агентов (vpn + banking).

## Что осталось (бэклог, по убыванию ценности)

1. **Heartbeat воркера в БД** (mcrypto `7e63597`): модель `WorkerHeartbeat`, запись раз в
   интервал из `worker-scheduler.ts`, индикатор «воркер жив / молчит N минут» в админском
   overview. Сейчас смерть воркера выглядит как здоровье. Средняя работа.
2. **`SEO_INDEXING_ENABLED`** (mcrypto `07160c6`): стейдж по умолчанию `noindex` + `robots`
   Disallow, открывается флагом. Мелкая работа, есть смысл сделать до появления стейджа.
3. **Skills-слой для трёх агентов** (banking): `.agents/skills/` как источник, symlink-адаптеры
   `.claude/skills`, `.codex/skills`, `.cursor/skills`, `.mcp.json.example` + `.codex/config.toml.example`
   + `sync-mcp-configs`, проверка паритета в `agent-check`. Имеющийся `skills/NSB_SETUP_SKILL.md`
   переезжает туда. Средняя работа; ценно, когда команда реально на трёх инструментах.
4. **Security overrides** из mcrypto `pnpm-workspace.yaml` (`sharp >=0.35`, `postcss >=8.5.18`,
   `fast-uri`, `immutable`, `brace-expansion 1.1.16/5.0.8`, `dompurify >=3.4.12`). Требует
   `pnpm install` без `--frozen-lockfile` и проверки `next/image` после `sharp`.
5. **Ярус `test:db`** (mcrypto `quality.yml` с `withDb`, `Makefile test-db`): нужен, когда в
   проекте появятся гарантии уровня БД (уникальные индексы, транзакции). В бойлерплейте таких
   тестов нет — заводить пустой ярус вредно (см. правило про сюиты с инфраструктурой).
6. **Воркер blue/green и multi-domain** (vpn): стоп обоих цветов воркера, `DOMAINS_LIST` /
   `FIRST_DOMAIN_VALUE`, wildcard-сертификаты через Cloudflare DNS-01. Продуктово-специфично;
   переносить, когда появится второй проект с поддоменами тенантов.
7. **Stage-деплой** (mcrypto `stage-deploy.yml`): в BP `stage-deploy.yml` удалён патчем CI как
   пустой. Вернуть как шаблон с `develop` → stage, когда у демо появится стейдж-сервер.
8. **`check-gate-list`** (banking): сверка таблицы «что ловит CI» в `review.md` со списком
   джобов в обе стороны. Полезно, когда гейтов станет больше пяти.

## Что осознанно не переносится

- **Денежные правила, `check-one-writer-ledger`, `check-provider-literal`, `check-merchant-dto`**
  (mcrypto) — специфика платёжного шлюза. Общая идея «инвариант — это гейт, а не абзац в
  контракте» перенесена как механика (`gates.mjs`).
- **`.cursor/hooks` с адаптерами на личные `~/.claude/hooks`** (banking) — завязано на локальную
  машину владельца; у BP гейт лежит в репозитории и работает у любого.
- **Grafana на поддомене** (vpn) — требует wildcard-сертификата; в BP остаётся `/grafana`.
- **Реплика-сет Mongo в compose** (mcrypto) — нужен только транзакциям; бойлерплейту достаточно
  standalone.

## Как проверялось

`pnpm gates` (2/2), `pnpm test` (113/113, включая новые `scripts/telegram/format.test.mjs` и
`config/container-topology.test.ts`), `pnpm typecheck` (чисто), `pnpm lint` (одно старое
предупреждение react-compiler, не связано), `bash -n` по всем правленым скриптам, `SERVER_MEMORY_MB=4096
METRICS_ENABLED=true` → Grafana 510M, `TG_DRY_RUN=1` с трейлером `<mail>` и кириллицей, гейт на
девяти командах (allow / deny как ожидалось), YAML всех workflow и compose разобран парсером.

Перед коммитом дифф прошёл адверсарное ревью (5 ревьюеров по направлениям — Actions, shell,
node-скрипты, доки, верность переноса — и по три опровергателя на каждую находку): 22
подтверждённых, 1 отклонена. Две P0 — Mongo без healthcheck при Stage 0 (каждый холодный деплой
падал бы через 300 с) — и остальное починены в том же диффе, разбор в `docs/DECISIONS_RU.md` §8.
Доктор на шаблоне `.env.example` с выключенным LLM — 0 ошибок; с включённым без ключа — 1.

**Не проверялось:** сами workflow на GitHub (нужен push), Lighthouse-пороги на реальном демо
(первый прогон покажет, подгонять по факту), `doctor:prod` на боевом env демо — если он красный,
это находка, флаг выключать осознанно. Демо идёт с `metrics_enabled: false` (см. §7): если у VPS
≥ 4 ГБ, поставь реальный `server_memory_mb` и включи обратно.

## Что сделать при выкатке

- Секреты репозитория `TG_TOKEN`, `TG_CHAT_ID`, `TG_THREAD_ID` уже есть (те же, что у деплоя).
- Variable `WEB_ENV_PUBLIC_PROD` — необязательна; пока пусто, всё едет из секрета `WEB_ENV_PROD`.
- Первый прогон `Lighthouse` — посмотреть сводку и, если бюджеты не сходятся с реальностью
  демо, поправить `lighthouserc.json` тем же днём.
- Следующий деплой пересоздаст Grafana (`latest` → `13.2.1`) — дашборды провижнятся из репо,
  данных не теряется.
