# Частые проблемы и решения (FAQ)

Ответы на типичные вопросы при деплое и настройке бойлерплейта.

---

## Certbot / Let's Encrypt

### Ошибка: «example@example.com is an invalid email address»

**Причина:** Let's Encrypt не принимает плейсхолдер `example@example.com`. Нужен реальный email для уведомлений об истечении сертификата и восстановления аккаунта.

**Решение:**

1. В GitHub: **Settings → Secrets and variables → Actions** создайте секрет `CERTBOT_EMAIL` со значением вашей почты (например `you@yourdomain.com`).
2. Либо в workflow (например `prod-deploy.yml`) укажите явно: `certbot_email: 'your-real-email@domain.com'`.
3. Перезапустите деплой или заново запустите job, который поднимает certbot-init.

---

## Сборка на сервере: «no space left on device»

### Service 'core-api' failed to build, write … next-swc.linux-x64-gnu.node: no space left on device

**Причина:** На сервере закончилось место на диске. Сборка (npm install, Next.js build, копирование в образ) пишет во временные каталоги и в образ; при нехватке места запись падает с этой ошибкой.

**Решение:**

1. По SSH на сервер: `df -h` — посмотреть занятость разделов.
2. Очистить Docker: неиспользуемые образы, контейнеры, кэш сборки:
   ```bash
   cd ~/app
   ./scripts/local-containers-run.sh prune-images
   docker system prune -a -f --volumes
   ```
   `prune-images` удалит старые образы приложения (оставит текущий у api-service). `docker system prune -a` удалит все неиспользуемые образы/контейнеры/сети и неиспользуемые тома (осторожно: не трогайте тома с нужными данными, например mongo_data, если они не помечены как used).
3. Более мягкий вариант без удаления неиспользуемых томов: `docker system prune -a -f` (без `--volumes`).
4. При постоянной нехватке места: перейти на `deploy_mode: registry` в workflow — сборка будет в CI, на сервер приедет только готовый образ (pull), места нужно меньше.

**Почему пришло уведомление об успехе:** Раньше при падении сборки внутри SSH-скрипта деплоя шаг мог не завершаться с ошибкой (скрипт продолжал работу). В workflow добавлен `set -e` в скрипт деплоя: при первой же неудачной команде (в т.ч. failed build) шаг падает, job помечается как failed, success-notify не отправляется.

---

## Nginx: сломанные контейнеры по неймингу

### Контейнер nginx создался с неправильным именем и не удаляется при деплое

**Причина:** Иногда при blue/green или перезапусках остаются «битые» контейнеры (другое имя, старый SUFFIX), и обычный `docker-compose down` их не трогает.

**Решение:**

1. Зайдите на сервер по SSH.
2. Перейдите в каталог приложения: `cd ~/app` (или куда склонирован проект).
3. Запустите полную очистку скриптом:
   ```bash
   ./scripts/local-containers-run.sh clean
   ```
4. Затем заново поднимите стек (через повторный деплой в GitHub Actions или вручную с нужными переменными):
   ```bash
   API_ENV=prod ENV_FILE=.env.prod DOMAINS=your-domain.com FIRST_DOMAIN=your-domain.com \
     ./scripts/local-containers-run.sh https prod -d your-domain.com
   ```

Команда `clean` останавливает и удаляет все учтённые в скрипте контейнеры (nginx, api-service, mongo, redis, certbot и т.д.), в том числе с суффиксами `-green`.

---

## MongoDB: ошибки аутентификации и пересоздание

### В логах Mongo: «UserNotFound», «Authentication failed», «Could not find user "admin" for db "admin"»

**В чём проблема:** MongoDB создаёт пользователя root (`MONGO_INITDB_ROOT_USERNAME` / `MONGO_INITDB_ROOT_PASSWORD`) **только при первом запуске**, когда каталог данных **пустой**. Если контейнер уже когда-то поднимался без этих переменных (или с другими значениями), в volume остались старые данные — пользователь `admin` там не создан, но авторизация уже включена. Повторный запуск с правильными переменными окружения не переинициализирует БД: init-скрипт больше не выполняется.

**Типичные причины:**

- Volume был создан до того, как в compose добавили `MONGO_INITDB_*` или до появления подгрузки `.env` в shell перед `docker-compose up`.
- В секрете (например `WEB_ENV_PROD`) не было или были неверные `MONGO_USER` / `MONGO_PASSWORD`, и контейнер первый раз поднялся с дефолтами/пустыми значениями.
- Удаляли не тот volume: Docker Compose даёт volume имя с префиксом проекта (например `app_mongo_data`, а не только `mongo_data`), и старый volume с данными без пользователя продолжал использоваться.

---

### Алгоритм ручного пересоздания MongoDB

Выполняйте на сервере в каталоге приложения (например `cd ~/app`). **Все данные в этой инстанции MongoDB будут удалены.**

1. **Остановить и удалить контейнер mongo**
   ```bash
   docker-compose -f docker-compose.local.yml stop mongo
   docker-compose -f docker-compose.local.yml rm -f mongo
   ```

2. **Найти volume, в котором лежат данные MongoDB**
   ```bash
   docker volume ls | grep mongo
   ```
   Часто будут видны оба: `app_mongo_data` (префикс от имени каталога проекта) и, возможно, `mongo_data`. Используется тот, который примонтирован к контейнеру mongo из вашего compose — обычно это volume с именем из секции `volumes:` (например `mongo_data`), а в списке он может отображаться как `app_mongo_data` или `<project_dir>_mongo_data`. Удалить нужно **тот volume, который реально использовался** (иначе при следующем `up` старые данные снова подмонтируются).

3. **Удалить найденный volume (или оба, если не уверены)**
   ```bash
   docker volume rm app_mongo_data
   docker volume rm mongo_data
   ```
   Если какой-то volume не существует, команда вернёт ошибку — это нормально. Важно удалить тот, где лежали данные mongo (чаще всего `app_mongo_data`, если проект в каталоге `app`).

4. **Подгрузить в shell переменные из .env (чтобы docker-compose подставил MONGO_USER / MONGO_PASSWORD в контейнер mongo)**
   ```bash
   set -a
   [ -f .env.prod ] && . ./.env.prod
   set +a
   export ENV_FILE=.env.prod API_ENV=prod
   ```

5. **Запустить mongo заново**
   ```bash
   docker-compose -f docker-compose.local.yml up -d mongo
   ```
   При первом запуске с пустым volume MongoDB выполнит инициализацию и создаст пользователя с учётными данными из окружения.

6. **При необходимости перезапустить приложение (core-api)**
   ```bash
   docker-compose -f docker-compose.local.yml up -d core-api
   ```

**Проверка:** вход в mongo с теми же учётными данными, что в `.env.prod`:
   ```bash
   docker exec -it mongo mongosh -u admin -p 'YOUR_PASSWORD' --authenticationDatabase admin --eval "db.adminCommand({ ping: 1 })"
   ```
   Должен вернуться `ok: 1`.

---

**Секрет в GitHub:** в **Settings → Secrets** переменная с контентом .env (например `WEB_ENV_PROD`) должна содержать строки:
   ```env
   MONGO_HOST=mongo
   MONGO_PORT=27017
   MONGO_USER=admin
   MONGO_PASSWORD=ваш_надёжный_пароль
   MONGO_DB=app
   ```
Спецсимволы в пароле в URI кодируются в коде приложения автоматически.

**Вариант через деплой:** после удаления контейнера и правильного volume можно не поднимать mongo вручную, а заново задеплоить через GitHub Actions (push в нужную ветку). Workflow создаст `.env.prod` из секрета и при `docker-compose up` mongo поднимется с пустым volume и создаст пользователя.

---

## Env-переменные не попадают в контейнер приложения

### В `docker inspect api-service` видны только API_ENV, PATH и т.д., нет MONGO_*, JWT_*

**Причина:** Переменные из `.env.prod` подставляются в контейнер через монтирование файла и (при корректной настройке) через `env_file:` в docker-compose. В `Config.Env` могут быть не все переменные, если они только в файле и читаются приложением через `env-cmd`.

**Что проверить:**

1. На сервере: `docker exec api-service cat /usr/src/api/.env.prod` — в файле должны быть нужные ключи (MONGO_*, JWT_*, etc.).
2. Убедиться, что секрет `env` (WEB_ENV_PROD для prod) в GitHub содержит полный контент .env построчно.
3. После правки секрета — новый деплой, чтобы на сервере заново создался `.env.prod`.

---

## Стили не подгружаются на проде

### Страница без стилей после деплоя

**Возможные причины:**

- В `.dockerignore` не должны быть исключены каталоги `.next`, `out`, `build`, `dist` — они создаются при `npm run build` **внутри** образа; исключать нужно только чтобы не копировать их с хоста.
- Если использовался `output: 'standalone'` в next.config — проверить, что в образе копируются нужные артефакты и приложение запускается из правильной рабочей директории.

Проверка: пересобрать образ локально (`docker build -f .docker/Dockerfile ...`) и убедиться, что после `RUN npm run build` в образе есть `.next` и стили отдаются.

---

## Очистка старых Docker-образов

### На сервере копятся образы ghcr.io/… по ~2 GB каждый

**Причина:** При `deploy_mode: registry` каждый деплой пушит новый образ с тегом `sha` (коммит). Сервер при каждом деплое делает `docker pull` нового образа; старые образы остаются и занимают место.

**Что сделано в шаблоне:**

- После каждого деплоя в шаге **Cleanup** workflow удаляет на сервере все образы репозитория приложения (например `ghcr.io/owner/nextjs-super-boilerplate`), **кроме** того, что используется контейнером `api-service`. То есть остаётся только один актуальный образ.
- В скрипте `local-containers-run.sh` добавлена команда **prune-images**: удаляет старые образы того же репозитория, оставляя образ, с которым запущен `api-service`.

**Ручная очистка на сервере:**

```bash
cd ~/app
./scripts/local-containers-run.sh prune-images
```

Если `api-service` не запущен, команда только выведет список образов `ghcr.io` — можно удалить лишние вручную: `docker rmi ghcr.io/owner/name:sha`.

**Очистка в GitHub Container Registry (ghcr.io):**

Образы в GHCR тоже накапливаются. Варианты:

1. **Вручную:** GitHub → репозиторий → **Packages** (справа) → нужный package → **Package settings** → **Delete this package** или удаление отдельных версий (если интерфейс даёт такую возможность). Либо: профиль → **Packages** → выбрать пакет → **Manage versions** и удалить старые теги.
2. **Политика хранения:** В настройках пакета (Package settings) проверьте, есть ли опция автоматического удаления старых версий.
3. **Через API:** [GitHub API для пакетов](https://docs.github.com/en/rest/packages) позволяет удалять версии пакета. Можно раз в месяц запускать workflow, который получает список версий и удаляет все, кроме последних N (например, через `gh api` или curl).

Рекомендация: после включения автоматической очистки на сервере (уже в шаблоне) основное место освобождается там; GHCR при желании чистить вручную или скриптом по API.

---

## Дополнительно

- **Логи контейнеров:** `docker logs <имя_контейнера>` (например `docker logs api-service`, `docker logs mongo`).
- **Проверка env в контейнере:** `docker exec api-service env` или `docker exec api-service printenv MONGO_URI`.
- **Документация по workflow:** параметры и секреты описаны в таблицах в [README](../README.md).
