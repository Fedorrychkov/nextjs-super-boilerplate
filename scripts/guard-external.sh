#!/usr/bin/env bash
#
# Гейт необратимых и внешне видимых операций для агентских рантаймов.
#
# Вешается на PreToolUse для Bash (см. .claude/settings.json). Читает JSON события со
# stdin, достаёт команду и решает, можно ли её выполнять без слова владельца.
#
# Fail closed ВНУТРИ СЕБЯ: сломанный ввод, отсутствующий парсер, непонятная структура события —
# запрет. Но отсутствующий или неисполняемый скрипт Claude Code НЕ блокирует: код 126/127 для
# PreToolUse значит «не мешать», и команда выполнится. Поэтому хук в settings.json — обёртка с
# проверкой `[ -x ]`, а `scripts/check-agent-gate.mjs` следит за битом x и за самой обёрткой.
#
# Коды выхода (контракт Claude Code PreToolUse):
#   0 — разрешено
#   2 — запрещено, stderr уходит агенту как причина
#
# Гейт ловит только то, что распознаётся по строке команды. Ручной деплой, рассылки и
# ротацию секретов он не увидит — они держатся на правиле «сначала спроси» из AGENTS.md.
#
# Правила — регулярные выражения по СЛОВАМ с якорем на начало команды, а не голая подстрока:
# голое `*"git push"*` запрещало `git commit -m "add push subscription"`, `git stash push`,
# `cat .env.production` и `grep build:prod package.json`. Цена ложного срабатывания — агент
# обходит гейт переписыванием команды, и тогда он не ловит уже ничего.
#
# Таблица вердиктов и документация гейта — scripts/guard-external.test.mjs (в `pnpm test`).

set -uo pipefail

deny() {
  echo "ЗАПРЕЩЕНО ГЕЙТОМ: $1" >&2
  echo "Это операция первого приоритета из AGENTS.md — нужно явное слово владельца именно на неё." >&2
  echo "Не обходи гейт переписыванием команды: скажи, что уперся, и получи решение." >&2
  exit 2
}

event="$(cat 2>/dev/null || true)"
[ -n "$event" ] || deny "пустое событие на входе (fail closed)"

command -v python3 >/dev/null 2>&1 || deny "нет python3 для разбора события (fail closed)"

cmd="$(
  printf '%s' "$event" | python3 -c '
import json, sys
try:
    event = json.load(sys.stdin)
except Exception:
    sys.exit(3)
tool = event.get("tool_name") or event.get("toolName") or ""
if tool and tool != "Bash":
    print("")
    sys.exit(0)
payload = event.get("tool_input") or event.get("toolInput") or {}
value = payload.get("command")
print(value if isinstance(value, str) else "")
' 2>/dev/null
)" || deny "не удалось разобрать событие (fail closed)"

# Пустая строка — не Bash или нет команды. Разбирать нечего.
[ -n "$cmd" ] || exit 0

# Схлопываем перенос строки и множественные пробелы: `git \<newline> push` должен
# читаться так же, как `git push`.
flat="$(printf '%s' "$cmd" | tr '\n\t' '  ' | sed 's/\\ / /g; s/  */ /g')"
# Обёртки: `ssh host 'git push origin main'`, `bash -c "…"`, `eval "…"` прячут команду в кавычках,
# где «начала команды» нет. Кавычки превращаются в разделитель, и вложенная команда становится
# видна тем же словарным правилам. Правила гоняются по обеим строкам.
deep="$(printf '%s' "$flat" | sed "s/[\"']/ ; /g; s/  */ /g")"

# Регэкспы лежат в переменных: внутри `[[ =~ ]]` пробелы и скобки без кавычек — синтаксическая
# ошибка, а `printf | grep` под pipefail на длинной команде даёт SIGPIPE и «разрешено».
# «Начало команды» — старт строки или разделитель (; & | ( `), затем необязательные
# sudo/env/присваивания переменных, затем сам бинарник.
start='(^|[;&|(`] *)(sudo +|env +|[A-Z_]+=[^ ]* +)*'
# Опции между git и push: флаги без значения (--no-pager) и две с значением (-C <dir>, -c <cfg>).
# Произвольное слово здесь допускать нельзя: `git log --grep push` стало бы «git push».
opt='( +(-C +[^ ]+|-c +[^ ]+|-[-A-Za-z0-9=./]+))*'

# --- git push: разрешён только с явным пунктом назначения `<remote> <ветка>`, не main, не force ---
# prod-deploy.yml триггерится на push в main — это выкатка в прод. Голый `git push` и
# `push origin HEAD` берут ветку из текущего состояния, которого в команде не видно.
re_git_push=${start}'git'${opt}' +push([ ;&|)]|$)'
re_push_force='( --force| -f| --force-with-lease| --force-if-includes| \+[A-Za-z])'
re_push_wide='( --all| --mirror| --tags| --delete| -d)([ ;&|)]|$)'
re_push_main='( |:)(refs/heads/)?main([ ;&|)]|$)'
re_push_blind='( |:)(HEAD|@)([ ;&|)]|$)'
re_push_dest='^( +(-u|--set-upstream|--no-verify|--quiet|-[-A-Za-z0-9=./]+))* +[A-Za-z0-9._-]+ +[A-Za-z0-9._/:+-]+'

# --- gh: merge в main, запись через API, административные команды ---
re_gh_merge=${start}'gh +pr +merge([ ;&|)]|$)'
re_gh_api_write=${start}'gh +api[^;&|]*( (-X|--method) +(POST|PUT|PATCH|DELETE)| (-f|-F|--field|--raw-field|--input)([ =]|$))'
re_gh_admin=${start}'gh +(workflow +run|release|repo +(delete|archive|edit)|secret +(set|delete)|variable +(set|delete)|ruleset)'

# --- тома, cron, бэкапы: так теряли данные прода ---
re_volume=${start}'docker( +[^ ;&|]+)* +volume +(rm|prune)([ ;&|)]|$)'
re_compose_down_v='(docker +compose|docker-compose)[^;&|]* down[^;&|]*( -v| --volumes)([ ;&|)]|$)'
re_system_prune=${start}'docker( +[^ ;&|]+)* +system +prune'
re_cron_wipe=${start}'crontab +-r([ ;&|)]|$)'
# rclone sync/move — односторонняя синхронизация в сторону off-site копии стирает там всё, чего нет локально.
re_backup_wipe='(rclone +(purge|delete|deletefile|sync|move)|aws +s3 +(rm|rb)|s3cmd +(del|rb)|rm +[^;&|]*(backups?([/ ]|$)|\.archive\.gz))'

# --- боевое и стейджевое окружение, восстановление базы ---
re_env_file='\.env\.(prod|stage)([^A-Za-z0-9_-]|$)'
re_env_script=${start}'(pnpm|npm|yarn)( +run)? +[A-Za-z0-9_.-]+:(prod|stage)([ ;&|)]|$)'
re_restore_script=${start}'(bash +|sh +|\./|[^ ]*/)?scripts/restore-mongo\.sh'
re_db_drop='(mongorestore|dropDatabase\(|--drop([ ;&|)]|$))'

for probe in "$flat" "$deep"; do
  if [[ $probe =~ $re_git_push ]]; then
    push_part=${probe#*push}
    [[ $push_part =~ $re_push_force ]] && deny "force-push: перезапись удалённой истории необратима — только руками владельца."
    [[ $push_part =~ $re_push_wide ]] && deny "push --all/--mirror/--tags/--delete задевает main и удалённые ветки целиком."
    [[ $push_part =~ $re_push_main ]] && deny "push в main = выкатка в прод (prod-deploy.yml на push в main). В main только через PR из develop, мержит владелец."
    [[ $push_part =~ $re_push_blind ]] && deny "push без имени ветки (HEAD/@): на main это выкатка в прод. Пиши: git push origin <ветка>"
    [[ $push_part =~ $re_push_dest ]] || deny "голый git push: ветка назначения из команды не видна, на main это выкатка в прод. Пиши: git push origin <ветка>"
  fi

  [[ $probe =~ $re_gh_merge ]] && deny "gh pr merge: мерж develop → main = выкатка в прод, мержит владелец."
  [[ $probe =~ $re_gh_api_write ]] && deny "gh api с записью (-X POST/PUT/PATCH/DELETE или -f/-F/--field/--input) — внешне видимое действие."
  [[ $probe =~ $re_gh_admin ]] && deny "gh workflow run / release / secret / variable / repo / ruleset — внешне видимое действие."

  [[ $probe =~ $re_volume ]] && deny "docker volume rm/prune: том с базой и сертификатами. Так уже теряли данные прода."
  [[ $probe =~ $re_compose_down_v ]] && deny "compose down -v удаляет тома вместе с базой."
  [[ $probe =~ $re_system_prune ]] && deny "docker system prune задевает тома и образы."
  [[ $probe =~ $re_cron_wipe ]] && deny "crontab -r стирает расписание бэкапов."
  [[ $probe =~ $re_backup_wipe ]] && deny "удаление или односторонняя синхронизация бэкапов."

  [[ $probe =~ $re_env_file ]] && deny "команда затрагивает файл окружения prod/stage. Боевые креды — только руками владельца."
  [[ $probe =~ $re_env_script ]] && deny "pnpm-скрипт с суффиксом :prod / :stage (build, start, worker, doctor) ходит в боевое окружение. Только руками владельца."
  [[ $probe =~ $re_restore_script ]] && deny "восстановление базы. Необратимо."
  [[ $probe =~ $re_db_drop ]] && deny "перезапись или удаление базы. Необратимо."
done

exit 0
