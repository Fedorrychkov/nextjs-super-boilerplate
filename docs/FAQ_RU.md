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

## MongoDB: неверные данные инициализации

### Регистрация не работает, в логах Mongo «Access control is not enabled» или ошибки аутентификации

**Причина:** Контейнер MongoDB уже был создан с пустым volume раньше (без `MONGO_INITDB_ROOT_*`), либо в секрете `env` (WEB_ENV_PROD) не было/неправильные `MONGO_USER` / `MONGO_PASSWORD`. Инициализация пользователя выполняется только при **первом** запуске с пустым каталогом данных.

**Решение (очистка и повторное создание Mongo):**

1. **Зайти на сервер по SSH**, перейти в каталог приложения: `cd ~/app`.

2. **Остановить и удалить контейнер и volume MongoDB** (данные в Mongo будут удалены):
   ```bash
   API_ENV=prod ENV_FILE=.env.prod docker-compose -f docker-compose.local.yml stop mongo
   API_ENV=prod ENV_FILE=.env.prod docker-compose -f docker-compose.local.yml rm -f mongo
   docker volume ls | grep mongo
   docker volume rm <имя_volume_mongo>   # например service-api-network_mongo_data или mongo_data
   ```

3. **Проверить секрет в GitHub:** в **Settings → Secrets** переменная для контента .env (например `WEB_ENV_PROD`) должна содержать строки:
   ```env
   MONGO_HOST=mongo
   MONGO_PORT=27017
   MONGO_USER=admin
   MONGO_PASSWORD=ваш_надёжный_пароль
   MONGO_DB=app
   ```
   Спецсимволы в пароле в URI кодируются автоматически в коде приложения.

4. **Заново задеплоить** через GitHub Actions (push в нужную ветку) — workflow создаст новый `.env.prod` из секрета и при следующем `docker-compose up` Mongo поднимется с пустым volume и создаст пользователя `admin` с указанным паролем.

**Либо** поднять только mongo вручную после очистки volume (с предварительной подгрузкой env):
   ```bash
   set -a; [ -f .env.prod ] && . ./.env.prod; set +a
   export ENV_FILE=.env.prod API_ENV=prod
   docker-compose -f docker-compose.local.yml up -d mongo
   ```
   Затем при необходимости перезапустить core-api.

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

## Дополнительно

- **Логи контейнеров:** `docker logs <имя_контейнера>` (например `docker logs api-service`, `docker logs mongo`).
- **Проверка env в контейнере:** `docker exec api-service env` или `docker exec api-service printenv MONGO_URI`.
- **Документация по workflow:** параметры и секреты описаны в таблицах в [README](../README.md).
