# I18N Admin Translations Roadmap

План внедрения админского управления переводами поверх текущей файловой i18n-модели.

## Цели

- Оставить `en`/`ru` в коде как baseline (`src/lib/i18n/messages/en.ts`, `src/lib/i18n/messages/ru.ts`).
- Добавить возможность редактировать переводы из админки без изменения исходников.
- Ввести приоритет резолва: **DB override -> file locale -> file `en` -> key**.
- Не позволять добавлять новые ключи через UI/API (ключи только из `en` файла).
- Разрешить создание новых языков (например `pl`, `de`, `pt-BR`) через админку.

## Принятые технические решения (фиксируем)

- `AppLocale` расширяем через `AnyString` из `src/types/shared.types.ts`:
  - целевой тип: `'ru' | 'en' | AnyString`.
- Это изменение распространяем на i18n-хелперы и их вызовы (server/client), где раньше локаль была только union из двух значений.
- API-модели делаем в стиле `src/api/user/model.ts` (контракты и enum/type рядом с API).
- DB-модели делаем в стиле `lib/db/models/User.ts` (Mongoose model реализует контракт API слоя).
- Роуты размещаем рядом с существующими API-роутами в `src/app/api/v1/...`.
- Client query/mutation слой оформляем по паттерну `src/query/user/query/*` и `src/query/user/mutation/*`.
- Для вкладки переводов в админке **пагинацию не делаем**: в выбранном языке показываем все ключи из файлового словаря.
- На клиенте добавляем локальный поиск по ключам/значениям (простая фильтрация `indexOf`/`includes`, без серверного поиска).
- Для форм редактирования переводов используем `react-hook-form` (паттерн проекта), включая existing input components и интеграцию с query/mutation слоем.

## Non-goals (на первый этап)

- Не переводим роутинг/URL-локали и не меняем текущий `SUPPORTED_LOCALES` для public routing.
- Не добавляем генерацию ключей из UI.
- Не делаем авто-перевод через LLM в первом релизе.

---

## Статус реализации (сверка с кодовой базой)

**Сделано по сути v1**

- `AppLocale` = `SystemLocale | AnyString` (`src/lib/i18n/config.ts`); детект локали для SSR: cookie → `Accept-Language` по **файловым `SUPPORTED_LOCALES` ∪ активным кодам из `I18nLocale`** (`detectLocale.ts` + `I18nService.getResolvableLocaleCodesForDetection()`). Публичный barrel `~/lib/i18n` **не** реэкспортирует `detectLocale` (только серверные импорты), чтобы клиент не тянул Mongoose.
- Модели Mongo: `lib/db/models/I18nLocale.ts`, `I18nTranslationOverride.ts`; API-контракты `src/api/i18n/*`; сервис `lib/services/i18n.service.ts`.
- Роуты: `GET/POST /api/v1/i18n/locales`, `POST .../locales/sync-from-files`, `GET/PUT /api/v1/i18n/translations`, `POST .../translations/batch`; права ADMIN/EDITOR.
- Резолв в рантайме: `getT(locale, overrides?)` — **override map → файловая локаль (`en`/`ru` в `getMessages`) → `en` → ключ** (`src/lib/i18n/getT.ts`). Оверрайды на SSR: `getLocaleOverrides` + передача в `I18nProvider` из `src/app/layout.tsx`. Ключи только из flatten `en` (`src/lib/i18n/messageKeys.ts` + проверки в сервисе).
- Админ UI: `src/app/admin/i18n/page.tsx`, `I18nTranslationsScreen` — табы по локалям, карточки, single/batch save, сброс override, поиск, `react-hook-form`; алерт «синхронизировать локали из файлов в БД» при расхождении с `SUPPORTED_LOCALES`.

**Частично / отличия от текста плана**

- Отдельного класса `TranslationResolver` и **кеша с TTL + invalidation** нет — логика в сервисе + `getT`/загрузка overrides на запрос.
- API upsert: `PUT /api/v1/i18n/translations` с телом `{ localeCode, key, value }`, а не `PUT .../:locale/:key` — функционально то же.
- `updated_by_user_id` заполняется при наличии контекста пользователя в роуте; **жёсткий лимит длины value** в сервисе не зафиксирован отдельно.
- Phase 5 (feature flag, метрики, audit log таблицей, backup) — **не делалось**.

**Тесты из плана**

- Юнит-тесты на flatten/resolver/нормализацию и E2E сценарии из документа — **проверить отдельно** (`pnpm test` / e2e), в репозитории могут быть не все перечисленные кейсы.

---

## Текущее состояние (baseline) — устарело

_Ниже сохранён исходный baseline-описание; фактическое «до» см. git-историю. Сейчас поверх файловой i18n работают DB overrides и админка._

- Локали и резолв берутся из кода (`getT`, `getServerT`, `messages/*`).
- Типы ключей определяются от `en` сообщений (source of truth).
- ~~`AppLocale` сейчас ограничен `en | ru` в `src/lib/i18n/config.ts`.~~ → расширен `AnyString`; файловые бандлы по-прежнему `SUPPORTED_LOCALES`.

---

## Архитектура данных (предложение)

### 1) Таблицы

- `i18n_locale`
  - `code` (PK, string, BCP-47-like, lower/normalized storage policy)
  - `label` (nullable, отображаемое имя)
  - `is_system` (bool; `en`, `ru` = true)
  - `is_active` (bool)
  - timestamps

- `i18n_translation_override`
  - `id` (PK)
  - `locale_code` (FK -> `i18n_locale.code`)
  - `key` (string, путь вида `article.ui.content`)
  - `value` (text)
  - `updated_by_user_id`
  - timestamps
  - unique index: (`locale_code`, `key`)

Примечание: список ключей в БД не храним отдельной таблицей, ключи всегда вычисляются из `en` файла.

### 2) Нормализация locale code

- Храним нормализованный формат (например: язык lower-case, регион upper-case: `pt-BR`).
- Валидация через существующий подход BCP-47-like (как в SEO language field).

### 3) Источник ключей

- Ключи API/UI берутся из runtime-словаря `en` (flatten path list), не из БД.
- В БД допускается запись только по ключам из этого списка.

---

## Резолвер переводов (core logic)

Целевой контракт:

1. Пытаемся взять override из БД для `locale + key`.
2. Если нет — берем из файлового `messages[locale]` (если такой файл есть).
3. Если нет — fallback на файловый `en`.
4. Если и там нет — возвращаем `key` (как сейчас).

Реализация:

- Вынести отдельный слой `TranslationResolver`:
  - `resolve(locale, key, vars?)`
  - `resolveBulk(locale, keys[])`
- Для SSR и API добавить кеш:
  - in-memory/Next cache с TTL + tag invalidation при save.
- После сохранения override делать invalidate кеша по locale.

---

## API план

### 1) Locale management

- `GET /api/v1/i18n/locales`
  - список локалей: system + admin-created
- `POST /api/v1/i18n/locales`
  - создать новую локаль
  - payload: `{ code, label? }`
  - reject, если code уже существует
- `POST /api/v1/i18n/locales/sync-from-files` (фактически в репо) — upsert строк `I18nLocale` по `SUPPORTED_LOCALES`.

### 2) Translation grid

- `GET /api/v1/i18n/translations?locale=...`
  - возвращает список ключей из `en` + значения:
    - `baseEnValue`
    - `fileLocaleValue` (если есть)
    - `dbOverrideValue` (если есть)
    - `effectiveValue`
  - без пагинации (полный список ключей для выбранного locale)

- `PUT /api/v1/i18n/translations` (фактически в репо) — тело `{ localeCode, key, value }`; пустое значение удаляет override.

- `POST /api/v1/i18n/translations/batch` (фактически в репо) — `{ items: [{ localeCode, key, value }] }`

### 3) Validation rules

- ключ должен существовать в списке ключей `en`.
- locale должен существовать в `i18n_locale`.
- ограничение длины значения (защитный лимит).
- audit fields (`updated_by_user_id`) обязательны.

---

## Админка: UX план

### 1) Новый раздел

- `Admin -> I18n / Translations` (новый пункт меню).
- Верхний уровень: tabs по локалям (`en`, `ru`, добавленные админом).

### 2) Добавление новой локали

- Кнопка “Добавить язык”.
- В диалоге:
  - select популярных кодов (тот же набор, что в SEO helper)
  - manual input для кастомного BCP-47 кода.
- Ссылка-подсказка на стандарт BCP-47 (wiki/RFC reference).

### 3) Контент таба локали

- Grid карточек:
  - title: ключ (`article.ui...`)
  - поле ввода/textarea текущего значения override
  - индикатор diff/dirty
  - кнопка “Сохранить” (per-card)
  - кнопка “Сбросить override” (вернуться к fallback)
- Общая кнопка “Сохранить все”.
- Локальный фильтр/поиск по ключу и текущему значению (`indexOf`/`includes`, client-side).
- Технически форма строится на `react-hook-form`:
  - единый form state на таб локали;
  - `dirtyFields` для per-card save и batch save;
  - reset конкретной карточки и reset всех после успешного сохранения.

### 4) “Сводные значения других языков”

- В карточке компактный блок:
  - `en` (base)
  - текущий file locale value (если есть)
  - 1-2 соседних часто используемых локали (например `ru`, `en`)
- Это read-only preview, чтобы редактор видел контекст.

---

## Интеграция с текущим i18n (SSR + Client)

### Phase A (safe)

- Сохранить текущий контракт `getT/getServerT`.
- Внутри `getT` добавить async-capable backend source через preload на SSR:
  - server получает map overrides для locale.
  - передает в клиент через контекст/provider.

### Phase B (unification)

- Ввести `I18nProvider` c `messagesEffective` (file + db merged).
- Client hooks читают уже merged-сообщения без повторного запроса.
- Для динамической смены locale — опционально lazy fetch overrides.

### Важный момент про новые локали

- Сейчас `AppLocale` ограничен `en | ru`, но в рамках этой инициативы расширяем до `'ru' | 'en' | AnyString`.
- Для роутинга/детекта можно сохранить текущий baseline (`en`/`ru`), а runtime-резолвер переводов обязан уметь любые коды локалей из БД.

---

## Поэтапный план внедрения

## Phase 1 — Foundation

- [x] Обновить `AppLocale` на `'ru' | 'en' | AnyString` и пройтись по i18n-хелперам/типам использования.
- [x] Финализировать контракт fallback и нормализацию locale code (детект + cookie; нормализация при создании локали в сервисе).
- [x] Добавить таблицы и миграции (`i18n_locale`, `i18n_translation_override`) — Mongoose-модели в репозитории.
- [ ] Seed `en`, `ru` в `i18n_locale` — явный seed в репо не зафиксирован; есть `POST .../locales/sync-from-files` и ручное создание в админке.
- [x] Реализовать flatten keys из `en` (`messageKeys.ts`); unit tests — см. покрытие `pnpm test`.

## Phase 2 — Backend API

- [x] API-модели в `src/api/i18n/*` по паттерну `src/api/user/model.ts`.
- [x] CRUD API для локалей (+ sync из файлов).
- [x] GET grid API для ключей+effective values.
- [x] Single save + batch save API.
- [x] Валидации (key allowlist, locale exists, auth ADMIN/EDITOR).

## Phase 3 — Runtime resolver

- [ ] Отдельный `TranslationResolver` (сейчас: `getT` + overrides + сервис для админ-грида).
- [x] Интеграция в `getT` / `getServerT` (+ `I18nProvider` с overrides из layout).
- [ ] Cache + invalidation после сохранений.
- [ ] Нагрузочные тесты на массовые ключи.

## Phase 4 — Admin UI

- [x] Новый раздел переводов.
- [x] Tabs по локалям.
- [x] Grid карточек key/value + per-card save.
- [x] Batch save + отслеживание изменений (в т.ч. сравнение с `effectiveValue` при batch).
- [x] Create locale dialog (datalist популярных тегов + ручной код + BCP-47 ссылка).
- [x] Read-only “сводка других языков” в карточке (base `en`, file locale, effective).
- [x] Локальный поиск по ключам/значениям в пределах выбранного таба (без пагинации).
- [x] Форма таба на `react-hook-form`; производительность — вынесенный редактор без глобального `watch` по всем ключам.

## Phase 5 — Rollout & hardening

- [ ] Feature flag (`NEXT_PUBLIC_I18N_DB_OVERRIDES_ENABLED` + server flag).
- [ ] Метрики: read hit rate DB override, save errors, latency.
- [ ] Расширенный audit log (поле `updatedByUserId` на override есть; отдельная таблица логов — нет).
- [ ] Backup/restore strategy для override-таблицы.

---

## Тест-план

- Unit:
  - flatten keys
  - resolver fallback matrix
  - locale normalization
- Integration:
  - API validation/reject unknown key
  - save single/batch and fetch effective value
- E2E:
  - админ создает locale, редактирует ключ, сохраняет, видит значение в UI
  - reset override -> возвращается file/en fallback
- Regression:
  - поведение `en`/`ru` без override не меняется.

---

## Риски и решения

- **Риск:** деградация SSR из-за чтения многих override.
  - **Митигировать:** preload по locale одним запросом + cache.
- **Риск:** рассинхрон ключей при рефакторе `en.ts`.
  - **Митигировать:** runtime allowlist из текущего `en`; невалидные DB-ключи не используются.
- **Риск:** тип `AppLocale` узкий (`en|ru`). — **снят:** `AppLocale` расширен `AnyString`; детект учитывает БД + файлы.

---

## Definition of Done (v1)

По функциональным пунктам ниже цель **достигнута**; Phase 5 (флаги, метрики, отдельный audit trail, backup) остаётся вне v1.

- Админ может:
  - создать новую локаль,
  - изменить перевод существующего ключа,
  - сохранить single и batch.
- Runtime использует DB override с корректными fallback.
- Ключи из UI/API строго ограничены `en`-словарем.
- Существующий сценарий `en/ru` работает без изменений при пустой БД overrides.
