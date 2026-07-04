# Унификация Field-компонентов + enforcement (RU) — дизайн-док

Статус: **частично реализовано**. Область: `src/components/ui/fields/*`, `src/components/ui/{select-1,multiselect}.tsx`, `src/components/Fields/**`, `eslint.config.mjs`, `AGENTS.md`/`AGENTS_RU.md`, страница `/ui-kit`.

> **Сделано:** ESLint `no-restricted-syntax` (`warn`) на сырые `input/textarea/select` (override для `ui/`); все сырые контролы в `src/**` мигрированы — `<select>` → `MultiselectField` (single через `updateBySelected`), `<textarea>` → `Textarea`/`TextAreaField`, OTP `<input>` → `Input`. Остались только 2 скрытых программных file-input с `eslint-disable` (легитимное исключение). `typecheck`/`eslint` — 0 ошибок.
> **Осталось:** поднять правило до `error`; single-select пример на `/ui-kit`; раздел «Формы и поля» в `AGENTS.md`; опц. `no-restricted-imports`.

## Цель

Полностью уйти от «сырых» HTML `<input>` / `<textarea>` / `<select>` в прикладном коде к единой системе реюзабельных полей и **заложить принуждение** (ESLint + документация), чтобы разработчик и ИИ по умолчанию использовали компоненты-обёртки, а не голый HTML.

> **Решения по итогам ревью:** отдельный single-select **не нужен** — `MultiselectField` / `DefaultMultiselectField` уже покрывают одиночный выбор через проп режима/`maxSelected`. `CheckboxField` (Слой 2) **уже добавлен**. Поэтому фокус этого дока смещается с «достроить компоненты» на **enforcement + миграцию сырого HTML + документацию**.

## Что уже есть (архитектура — 3 слоя)

Система обёрток уже выстроена, но неполна и не защищена от обхода.

**Слой 1 — примитивы** (`src/components/ui/`): стилизованные тонкие обёртки над HTML.

- `ui/fields/input.tsx` → `Input` (`React.ComponentProps<'input'>`, `type` пробрасывается — универсальный).
- `ui/fields/textarea.tsx` → `Textarea`.
- `ui/fields/checkbox.tsx` → `Checkbox`.
- `ui/fields/label.tsx` → `Label`.
- `ui/select-1.tsx` → `Select` — **нативный** `<select>` (single, без поиска), свой `Option`/`error`/`size`.
- `ui/multiselect.tsx` → `MultipleSelector` — на `cmdk`, с поиском и группировкой (multi).

**Слой 2 — Field-обёртки** (`src/components/Fields/Input/*`, `Fields/Password/*`): + `Label`, `error`, `hintText`, layout, `additional*Component`.

- `InputField` (`Fields/Input/InputField.tsx`) — базовая обёртка над `Input`, `classNames.{root,input,label}`, error/hint, слоты.
- `TextAreaField` — обёртка над `Textarea` (+ бейдж лимита).
- `MultiselectField` — обёртка над `MultipleSelector`.
- `MediaUrlUploadField` — специализированное поле.
- `Fields/Password/*` — `PasswordField`, `InputWithPassword`, `PasswordStrengthPanel`.

**Слой 3 — RHF-контейнеры** (`src/components/Fields/HookContainers/*`): подключение к `react-hook-form` через `useFormContext` + `Controller`.

- `DefaultFieldContainer` — RHF-обёртка над `InputField` (это и есть «DefaultInputField» из ТЗ — см. «Именование»).
- `DefaultTextAreaContainer`, `DefaultCheckbox`, `DefaultMultiselectField`.

Экспорт барреллами: `~/components/Fields` (`HookContainers` + `Input` + `Password`) и `~/components/ui`.

## Пробелы

1. **Single select — решено пропом.** Отдельный `SelectField` не нужен: `MultiselectField` / `DefaultMultiselectField` работают в одиночном режиме через проп (`maxSelected` / режим). Достаточно **задокументировать** этот способ. Нативный `ui/select-1` остаётся примитивом для редких простых кейсов.
2. **`CheckboxField` — уже есть** (`src/components/Fields/Input/CheckboxField.tsx`). Проверить только, что `DefaultCheckbox` и прикладной код используют его, а не примитив напрямую.
3. **Сырой HTML в 12 местах** (не в `ui/`): `Blocks/Editor/MarkdownEditor.tsx` (`<textarea>`), `Editor/image/ImageEditorDialog.tsx`, `Editor/media/VideoEditorDialog.tsx`, `Article/.../ArticleAiChatModal.tsx` (`<select>`), `Views/Profile/ProfileMfaBlock.tsx` (`<input>` — OTP), `Fields/Input/media/MediaUrlUploadField.tsx` (`<input>`/`<select>`). Их нужно мигрировать на обёртки или явно занести в allowlist примитивного слоя.
4. **Нет принуждения.** Ничто не мешает разработчику/ИИ поставить голый `<input>`. `eslint.config.mjs` (flat config) уже есть, но правила на это нет.
5. **Именование не консистентно.** ТЗ оперирует «DefaultInputField», код — «DefaultFieldContainer». Нужен единый словарь и, возможно, алиасы-реэкспорты.

## План

### 1. Select: single-режим документацией (без новых компонентов)

Отдельный `SelectField`/`DefaultSelectField` не создаём. Одиночный выбор покрывается существующими `MultiselectField` / `DefaultMultiselectField` через проп одиночного режима (`maxSelected` / режим). Что делаем:

- **Задокументировать** в `AGENTS.md` и на `/ui-kit` пример single-режима: как получить `Option | null` наружу и как подключить в RHF через `DefaultMultiselectField`.
- Убедиться, что наружу single возвращает одиночное значение (а не массив из одного) — если нет, добавить тонкую нормализацию в существующий `MultiselectField`, не плодя новый компонент.
- Нативный `ui/select-1` (`Select`) оставить примитивом Слоя 1 для редких простых кейсов без поиска.

Итоговая матрица компонентов (все уже существуют):

| Тип | Слой 1 (примитив) | Слой 2 (Field) | Слой 3 (RHF) |
|-----|-------------------|----------------|--------------|
| text/email/number/… | `Input` | `InputField` | `DefaultFieldContainer` |
| password | `Input` | `PasswordField`/`InputWithPassword` | (обёртка над DefaultFieldContainer) |
| textarea | `Textarea` | `TextAreaField` | `DefaultTextAreaContainer` |
| checkbox | `Checkbox` | `CheckboxField` | `DefaultCheckbox` |
| select single/multi + поиск | `MultipleSelector` (`Select` — простые) | `MultiselectField` (single через проп) | `DefaultMultiselectField` |

### 2. Именование и словарь

- Зафиксировать канонические имена в `AGENTS.md`/`AGENTS_RU.md`: `Input` (примитив) → `*Field` (Слой 2) → `Default*` (Слой 3, для RHF).
- Для устранения расхождения ТЗ↔код добавить **реэкспорт-алиас** `DefaultInputField = DefaultFieldContainer` (не ломая существующие импорты), либо переименовать с сохранением алиаса.

### 3. Enforcement (ESLint)

Основной механизм принуждения — правило `no-restricted-syntax` в `eslint.config.mjs`, запрещающее JSX-элементы `input`/`textarea`/`select` **везде, кроме примитивного слоя** `src/components/ui/**`.

Набросок (добавляется в основной блок `rules`):

```js
'no-restricted-syntax': [
  'error',
  {
    selector: "JSXOpeningElement[name.name='input']",
    message: 'Не используй сырой <input>. Возьми InputField / DefaultFieldContainer из ~/components/Fields (примитив Input — только внутри src/components/ui).',
  },
  {
    selector: "JSXOpeningElement[name.name='textarea']",
    message: 'Не используй сырой <textarea>. Возьми TextAreaField / DefaultTextAreaContainer.',
  },
  {
    selector: "JSXOpeningElement[name.name='select']",
    message: 'Не используй сырой <select>. Возьми SelectField / DefaultSelectField.',
  },
],
```

Плюс отдельный override-блок, снимающий правило для примитивного слоя (там сырой HTML легитимен):

```js
{
  files: ['src/components/ui/**/*.{ts,tsx}'],
  rules: { 'no-restricted-syntax': 'off' },
},
```

Дополнительно (по желанию) — запретить прямой импорт примитивов `~/components/ui/fields/input` в прикладном коде через `no-restricted-imports`, чтобы направлять на Слой 2/3. Осторожно: не сломать легитимные кейсы (например, кастомные поля, которые сами строятся на примитиве) — для них локальный `// eslint-disable-next-line` с обоснованием.

Правило подключается к уже существующему `pnpm run lint` и, если внедрён CI-гейт (см. `CI_QUALITY_GATE_E2E_RU.md`), блокирует мерж.

### 4. Документация для ИИ и разработчиков

- В `AGENTS.md`/`AGENTS_RU.md` — раздел «Формы и поля»: матрица компонентов, правило «никогда не сырой HTML-input», примеры (в форме → `Default*`, вне формы → `*Field`, single-select через проп `MultiselectField`, кастом → примитив из `ui/`).
- На странице `/ui-kit` — витрина всех полей во всех состояниях (default/error/disabled/loading, single/multi/search) как живой референс и визуальный regression-ориентир.
- В `README.md` — короткое упоминание системы полей как фичи «из коробки».

### 5. Миграция существующего сырого HTML (12 мест)

Порядок — от простого к сложному:

1. `MediaUrlUploadField.tsx`, `ImageEditorDialog.tsx`, `VideoEditorDialog.tsx`, `ArticleAiChatModal.tsx` — `<select>` → `MultiselectField` в single-режиме (или примитив `Select` из `ui/` для простых кейсов).
2. `MarkdownEditor.tsx` — `<textarea>` → `TextAreaField` (или явный allowlist, если нужен голый контрол редактора).
3. `ProfileMfaBlock.tsx` — OTP `<input>`: либо новый узкий компонент `OtpField` на базе `Input`, либо точечный `eslint-disable` с обоснованием (спец-поведение сегментированного ввода).

Каждую миграцию проверять `pnpm typecheck` + `pnpm lint` + визуально на `/ui-kit`.

## Файлы под создание/изменение

- `eslint.config.mjs` — `no-restricted-syntax` + override для `src/components/ui/**` (+ опц. `no-restricted-imports`).
- `src/components/Fields/**/index.ts` — алиас `DefaultInputField = DefaultFieldContainer`; при необходимости нормализация single-значения в `MultiselectField`.
- 12 файлов из раздела «Миграция» — замена сырого HTML.
- `src/app/ui-kit/**` — витрина полей.
- `AGENTS.md`/`AGENTS_RU.md`, `README.md` — документация конвенции.

## Этапы

1. **Enforcement + документация** сначала (правило как `warn`), чтобы новый код уже шёл правильно, а старый не блокировал.
2. **Мигрировать 12 мест**, затем поднять правило до `error`.
3. **Витрина `/ui-kit`** + финальная синхронизация `AGENTS.md`.

## Критерии готовности

- `pnpm run lint` падает на любом новом сыром `<input>/<textarea>/<select>` вне `src/components/ui/**`.
- Single-выбор работает через `MultiselectField` (single-режим) — задокументировано и показано на `/ui-kit`.
- В прикладном коде (`src/**` вне `ui/`) не осталось сырого HTML-инпута (кроме явно задокументированных исключений).
- `/ui-kit` показывает все поля во всех состояниях.
- `AGENTS.md` содержит конвенцию, на которую можно ссылать ИИ.

## Открытые вопросы

- OTP-инпут в `ProfileMfaBlock` — выделять в `OtpField` или оставить исключением? (Рекомендация: `OtpField`, чтобы не плодить исключения.)
- `no-restricted-imports` на примитивы — включать сразу или после миграции? (Рекомендация: после.)
- Уровень правила на старте — `warn` или сразу `error` с массовым `eslint-disable`? (Рекомендация: `warn` → миграция → `error`.)
