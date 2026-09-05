#!/usr/bin/env bash
#
# Гейт необратимых и внешне видимых операций для агентских рантаймов.
#
# Вешается на PreToolUse для Bash (см. .claude/settings.json). Читает JSON события со
# stdin, достаёт команду и решает, можно ли её выполнять без слова владельца.
#
# Fail closed: всё, что мешает принять решение — сломанный ввод, отсутствующий парсер,
# непонятная структура события — трактуется как запрет. Сломанный гейт не вправе
# разрешить необратимое действие.
#
# Коды выхода (контракт Claude Code PreToolUse):
#   0 — разрешено
#   2 — запрещено, stderr уходит агенту как причина
#
# Гейт ловит только то, что распознаётся по строке команды. Ручной деплой, рассылки и
# ротацию секретов он не увидит — они держатся на правиле «сначала спроси» из AGENTS.md.
#
# Правила — регулярные выражения по СЛОВАМ, а не голая подстрока: голое `*"git push"*`
# запрещало `git commit -m "add push subscription"`, `git stash push`, `cat .env.production`
# и `grep build:prod package.json`. Цена ложного срабатывания — агент обходит гейт
# переписыванием команды, и тогда он не ловит уже ничего.

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

# Регэкспы лежат в переменных: внутри `[[ =~ ]]` пробелы и скобки без кавычек — синтаксическая
# ошибка, а `printf | grep` под pipefail на длинной команде даёт SIGPIPE и «разрешено».
# «Начало команды» — старт строки или разделитель (; & | ( `), затем необязательные
# sudo/env/присваивания переменных, затем сам бинарник.
start='(^|[;&|(`] *)(sudo +|env +|[A-Z_]+=[^ ]* +)*'
# Опции между git и push: флаги без значения (--no-pager) и две с значением (-C <dir>, -c <cfg>).
# Произвольное слово здесь допускать нельзя: `git log --grep push` стало бы «git push».
re_git_push=${start}'git( +(-C +[^ ]+|-c +[^ ]+|-[-A-Za-z0-9=./]+))* +push([ ;&|)]|$)'
re_env_file='\.env\.(prod|stage)([^A-Za-z0-9_-]|$)'
re_env_script=${start}'(pnpm|npm|yarn)( +run)? +[A-Za-z0-9_.-]+:(prod|stage)([ ;&|)]|$)'
re_restore_script=${start}'(bash +|sh +|\./|[^ ]*/)?scripts/restore-mongo\.sh'
re_mongorestore=${start}'(docker +(exec|run) +[^;&|]*)?mongorestore'

# --- git push в любой форме: `cd x && git push`, `git -C . push`, `git --no-pager push` ---
if [[ $flat =~ $re_git_push ]]; then
  deny "git push. prod-deploy.yml триггерится на push в main — push здесь может означать выкатку в прод. Пушит владелец сам."
fi

# --- боевое и стейджевое окружение: файлы и pnpm-цели ---
if [[ $flat =~ $re_env_file ]]; then
  deny "команда затрагивает файл окружения prod/stage. Боевые креды — только руками владельца."
fi
if [[ $flat =~ $re_env_script ]]; then
  deny "pnpm-скрипт с суффиксом :prod / :stage (build, start, worker, doctor) ходит в боевое окружение. Только руками владельца."
fi

# --- восстановление и перезапись боевой базы: ЗАПУСК скрипта, не чтение ---
if [[ $flat =~ $re_restore_script ]] || [[ $flat =~ $re_mongorestore ]]; then
  deny "восстановление или перезапись базы. Необратимо."
fi

exit 0
