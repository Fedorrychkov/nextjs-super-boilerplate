# mongo-local-observability-and-backups.patch — что это и как внедрять

Патч для переноса в проекты, отпочковавшиеся от БП. Собран из двух коммитов БП:

- `0576fce` — ci(*): add mongo local mode — grafana dashboard and add container names
- `b91c27b` — ci(*): add mongo local backup supports

Итог: наблюдаемость локальной Mongo в Grafana + автоматические бэкапы с управлением через деплой. Всё касается **только** деплоев с локальной монгой (`mongo_enabled: true`); при ремоут-кластере патч безвреден и просто ничего не делает.

## Что внутри и зачем

| Файл | Что | Зачем |
| --- | --- | --- |
| `grafana/dashboard/logs_grafana_dashboard.json` | Панели `mongo service` и `mongo slow queries` | Логи mongod уже льются в Loki (promtail скрейпит все контейнеры) — не хватало только панелей. Slow queries (>100ms) — главный профит: медленные запросы видны без ssh |
| `grafana/loki-config.yml` | `retention_period: 168h` + секция `compactor` | Раньше чанки Loki копились бесконечно, пока жив контейнер. Теперь логи старше 7 дней удаляются |
| `docker-compose.local.yml` | `container_name` для promtail/loki/grafana | Имена перестают зависеть от версии compose (v1 `app_grafana_1` vs v2 `app-grafana-1`); чинит латентный баг — `clean` в `local-containers-run.sh` стопал их по голым именам и никогда не находил |
| `scripts/local-containers-run.sh` | `worker-service` в полный clean-список | Полная зачистка теперь включает воркер |
| `.github/workflows/reusable-deploy-config.yml` | 1) cleanup «залипших» контейнеров при выключении флагов; 2) инпуты `mongo_backup_*`; 3) установка/снятие cron | 1) при переключении `metrics_enabled`/`worker_enabled` true→false контейнеры с `restart: always` раньше жили вечно на старом образе; 2–3) см. бэкапы ниже |
| `scripts/backup-mongo.sh` | Ежесуточный mongodump | Дамп в `~/db-backups` (вне `~/app` — переживает blue/green-свопы). Запуск в одноразовом контейнере с капами `--memory 256m --cpus 0.5`, а НЕ `docker exec` в mongo — иначе дамп ел бы cgroup-бюджет базы и мог спровоцировать OOM-kill mongod. Лок, гард по диску, проверка целостности, ротация |
| `scripts/restore-mongo.sh` | Восстановление | `mongorestore --drop` с подтверждением; тот же изолированный контейнер |
| `docs/deploy/mongo-backups.ru.md` | Дока | Настройка, примеры cron, restore-алгоритм, выгрузка дампов на локальную машину |
| `.github/workflows/prod-deploy.yml` | Пример включения `mongo_backup_*` | Проектная строка — при конфликте просто добавь руками в свой prod-deploy |

Логика включения бэкапов: `mongo_enabled: true` → cron ставится автоматически (`mongo_backup_enabled` дефолт `true`). Выключил монгу или флаг → следующий деплой снимает cron, дампы остаются. Частота — `mongo_backup_cron`, глубина — `mongo_backup_retention` (в дампах, не в днях!).

## Как внедрять

```sh
cd <проект>
git apply --check patch/mongo-local-observability-and-backups.patch   # сухая проверка
git apply --3way  patch/mongo-local-observability-and-backups.patch   # применение
```

Ожидаемые конфликты по проектам:

- **`logs_grafana_dashboard.json`** — конфликтует почти наверняка: в vpn/ticker/quickping дашборды уже разошлись (свои worker-панели). Не мучай merge — выкини хунк (`git checkout -- grafana/dashboard/...`) и добавь две mongo-панели руками: скопируй объекты с `"id": 102` и `"id": 103` из дашборда БП в свой, поправь `gridPos.y` под свою сетку.
- **`reusable-deploy-config.yml`** — в тикере есть опечатка `notigy_enabled`, в quickping свои имена воркера — возможен fuzz. При конфликте переноси три блока руками: инпуты `mongo_backup_*`, их проброс в `env:`/`envs:`, и блок `BACKUP_MARKER` в конце deploy-скрипта.
- **quickping**: контейнер воркера называется `uptime-worker`, а не `worker-service` — поправь имя в cleanup-блоке и в clean-списке `local-containers-run.sh`. В vpn/ticker имена совпадают с БП.
- **`prod-deploy.yml`** — хунк проектный, при конфликте пропусти и добавь `mongo_backup_*` в свой вызов workflow руками.

Патч самодостаточен: **не требует** воркера из БП (бэкапы идут через системный cron сознательно — страховка не должна зависеть от Redis/BullMQ). Упоминания `worker-service` в cleanup безвредны, если воркера в проекте нет (no-op).

## После применения

1. Деплой с `mongo_enabled: true` — в логе деплоя должно появиться `Mongo backup cron installed: ...`.
2. На сервере: `crontab -l | grep bp-mongo-backup` — строка стоит.
3. Разовый ручной прогон, не дожидаясь ночи: `ENV_FILE=.env.prod API_ENV=prod ~/app/scripts/backup-mongo.sh && ls -lh ~/db-backups/` — дамп лёг, размер разумный.
4. Grafana → logs-дашборд: панели `mongo service` / `mongo slow queries` показывают данные (при `metrics_enabled: true`).
5. Прочитай `docs/deploy/mongo-backups.ru.md` до момента, когда restore понадобится по-настоящему.
