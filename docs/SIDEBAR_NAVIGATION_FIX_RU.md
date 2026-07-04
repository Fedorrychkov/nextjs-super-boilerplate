# Sidebar Navigation Fix (RU) — дизайн-док

Статус: **реализовано**. Область: `src/components/ui/sidebar.tsx`, `src/components/Layouts/PlatformLayout.tsx`, `src/utils/sidebarSectionState.ts`.

> **Сделано (Вариант A — модульный стор + `sessionStorage`):** новый `src/utils/sidebarSectionState.ts` — module-level стор `userOverride` по `id` секции + зеркало в `sessionStorage` (переживает ремаунт при смене лейаута и полный reload, сбрасывается с новой вкладкой/сессией), хук `useSidebarSectionOverride` на `useSyncExternalStore` (SSR-safe, `getServerSnapshot` → `undefined`). В `sidebar.tsx`: у `NavigationSection` добавлен стабильный `id`, хелпер `sectionContainsActivePath` (рекурсивный `matchesPathname`), `CollapsibleSection` резолвит `open = override ?? (isActiveByUrl || defaultOpen)` и по клику пишет override. В `PlatformLayout.tsx` секциям проставлены `id: 'welcome'` / `id: 'admin'`. `typecheck`/`eslint` — 0 ошибок.

## Проблема

В текущем сайдбаре раскрытие секций (`CollapsibleSection`) работает неверно в двух сценариях:

1. **Активная ветка не раскрывается по URL.** Секция открыта или закрыта только по статическому `defaultOpen`, заданному в конфиге навигации. Если текущий URL входит в одну из вложенных ссылок секции, секция всё равно может быть закрыта — пользователю приходится раскрывать её вручную.
2. **Состояние теряется при смене лейаута.** Открытые/закрытые секции сбрасываются при переходе между страницами с разными `layout.tsx` (например, из `/admin/*` в статью и обратно), потому что состояние живёт в локальном `useState` внутри `CollapsibleSection` и обнуляется при ремаунте дерева сайдбара.

## Причина (по коду)

В `src/components/ui/sidebar.tsx`:

```tsx
const CollapsibleSection = ({ title, children, defaultOpen }) => {
  const [open, setOpen] = useState(defaultOpen || false) // ← инициализируется один раз
  ...
}
```

- `open` инициализируется **однократно** из `defaultOpen` и никак не связан с `usePathname()`.
- `defaultOpen` задаётся статически в `PlatformLayout.tsx` (обе секции — `defaultOpen: true`), то есть не зависит от текущего маршрута.
- Подсветка **отдельных ссылок** уже вычисляется через `matchesPathname(item.href, pathname)` (`src/utils/matchPath.ts`), но на **уровне секции** этот сигнал не используется.
- Каждая группа маршрутов (`src/app/admin/layout.tsx`, `src/app/profile/layout.tsx`, `.../articles/layout.tsx`, …) оборачивает свой собственный экземпляр `PlatformLayout` → `Sidebar`. При переходе между группами React размонтирует и монтирует поддерево сайдбара заново, и локальный `useState` теряется. Провайдер, переживающий эти переходы, должен находиться выше — в `src/app/layout.tsx`.

Дополнительный риск: ключ секции сейчас — локализованный `title`. При смене языка строка меняется, и любое сохранённое по ней состояние «отвяжется». Нужен стабильный `id`.

## Целевое поведение

- Секция **раскрыта**, если выполняется любое из: (а) её содержимое соответствует текущему URL, (б) `defaultOpen: true`, (в) пользователь раскрыл её вручную.
- Секция **закрыта**, если пользователь свернул её вручную — даже если внутри активный URL (явное действие пользователя приоритетно). *(Опциональный режим — см. «Открытые вопросы».)*
- Состояние **переживает** навигацию между лейаутами и ремаунты.
- При первом заходе на страницу активная секция уже раскрыта (без «моргания»).

## Формула резолва состояния

Для каждой секции:

```
resolvedOpen = userOverride ?? (isActiveByUrl || defaultOpen)
```

- `isActiveByUrl` — `true`, если **любая** ссылка секции (рекурсивно, включая `items` вложенных `NavigationItem`) удовлетворяет `matchesPathname(href, pathname)`.
- `userOverride` — `true | false | undefined`; ставится только по явному клику пользователя. `undefined` = «пользователь не трогал», работает автоматика.

## План реализации

### 1. Стабильные идентификаторы секций

В типах `NavigationSection` / `NavigationItem` (`src/components/ui/sidebar.tsx`) добавить обязательный (или выводимый) `id: string`, независимый от локали. В `PlatformLayout.tsx` проставить `id: 'welcome'`, `id: 'admin'` и т.п. Ключ для хранения состояния — `id`, не `title`.

### 2. Внешнее хранилище состояния секций

Состояние вынести из `CollapsibleSection` в стор, который переживает ремаунты:

- **Вариант A (рекомендуется): модульный стор + `useSyncExternalStore`.** Простой синглтон `Map<sectionId, boolean>` для `userOverride`, подписка через `useSyncExternalStore`. Опционально зеркалировать в `sessionStorage` (ключ `nsb.sidebar.sections`), чтобы состояние жило и между полными перезагрузками страницы. Не требует нового провайдера в дереве и не зависит от того, где монтируется сайдбар.
- **Вариант B: `SidebarStateProvider` в `src/app/layout.tsx`.** React-контекст выше всех групповых лейаутов. Надёжно переживает смену лейаутов, но требует, чтобы провайдер стоял именно в корневом layout (не в `PlatformLayout`, который сам ремаунтится).

Рекомендация — **Вариант A**: меньше связности, работает даже если сайдбар используется вне `PlatformLayout`, легко покрыть юнит-тестом (стор — чистая функция).

### 3. Автораскрытие по URL

- В `CollapsibleSection` (или в новом хуке `useSectionOpenState(sectionId, isActiveByUrl, defaultOpen)`) вычислять `resolvedOpen` по формуле выше.
- `isActiveByUrl` считать в `NavigationSection` через `usePathname()` + рекурсивный обход `items` с `matchesPathname`. Вынести обход в утилиту `sectionContainsActivePath(section, pathname)` рядом с `matchPath.ts` — тестируемо отдельно.
- Клик по заголовку выставляет `userOverride = !resolvedOpen` в сторе.

### 4. Аккуратность анимации и SSR

- Начальное значение `resolvedOpen` должно совпадать на сервере и клиенте, чтобы не было гидрационного мисматча. `pathname` доступен на клиенте; для секции с активным URL стартовать сразу раскрытой (без exit-анимации на первом кадре — например, `initial={false}` для активной секции в `AnimatePresence`).
- `sessionStorage` читать только на клиенте (в `useSyncExternalStore` через `getServerSnapshot`, возвращающий дефолт).

### 5. Совместимость

- Публичный API `Sidebar` / `NavigationSection` расширяется добавлением `id` — обновить единственного потребителя `PlatformLayout.tsx`. Обратная совместимость: если `id` не задан, фолбэк на `title` (с предупреждением в dev).

## Файлы под изменение

- `src/components/ui/sidebar.tsx` — типы `NavigationSection`/`NavigationItem` (+`id`), `CollapsibleSection`, `NavigationSection`.
- `src/utils/matchPath.ts` (или новый `src/utils/sidebarSectionState.ts`) — `sectionContainsActivePath`, модульный стор.
- `src/components/Layouts/PlatformLayout.tsx` — проставить `id` секциям.
- `src/app/layout.tsx` — только если выбран Вариант B (провайдер).

## Тестирование

- **Юнит:** `sectionContainsActivePath` — плоские и вложенные `items`, динамические сегменты (`[...slug]`), trailing slash (переиспользовать кейсы `matchesPathname`).
- **Юнит:** стор — `userOverride` перекрывает автоматику; `undefined` возвращает автоматику; сериализация в/из `sessionStorage`.
- **E2E (если внедряется Playwright, см. `CI_QUALITY_GATE_E2E_RU.md`):** зайти на `/admin/rum` → секция `admin` раскрыта; свернуть → перейти на `/profile` → вернуться на `/admin/rum` → секция осталась свёрнутой (override пережил смену лейаута).

## Критерии готовности

- Секция с активным URL раскрыта при первом рендере страницы, без ручного клика.
- Ручное сворачивание/раскрытие переживает переход между разными лейаутами.
- Нет гидрационных предупреждений в консоли.
- Смена языка не сбрасывает и не «отвязывает» состояние секций.

## Открытые вопросы

- Должно ли ручное сворачивание секции сохраняться, если пользователь ушёл на страницу **внутри** этой секции? (Текущее предложение: да, override приоритетен. Альтернатива: сбрасывать override при заходе на активный URL — более «умное», но менее предсказуемое поведение.)
- Хранить состояние в `sessionStorage` (сбрасывается с вкладкой) или `localStorage` (переживает перезапуск браузера)? Рекомендация — `sessionStorage`.
