#!/bin/bash
#
# Настроить ЛОКАЛЬНОЕ окружение. Безопасно запускать сколько угодно раз.
#
# Не путать с `init-project.sh`: тот делает ОДНОРАЗОВУЮ работу форка (переименовывает плейсхолдеры
# бойлерплейта под новый продукт) и защищён guard-файлом, потому что повтор разрушителен. Этот
# скрипт — про ПОВТОРНУЮ работу: новый человек в команде, переустановленная машина, добавленная в
# шаблон переменная. Ему guard не нужен и вреден.
#
# Три правила, на которых всё держится:
#
#   1. ЗАПОЛНЯЕТСЯ ТОЛЬКО ПУСТОЕ. Непустое значение не трогается никогда. Перегенерация
#      MFA_ENCRYPTION_KEY необратима: старые шифротексты не расшифруются — TOTP пересоздавать всем
#      (docs/ENV_REFERENCE.md).
#   2. НОВЫЕ КЛЮЧИ ДОЛИВАЮТСЯ из .env.example. Иначе у настроившегося месяц назад молча нет
#      переменных, появившихся с тех пор, и он ловит «тихую деградацию» вместо ошибки.
#   3. ЗАКАНЧИВАЕТСЯ `pnpm doctor`. Он и решает, годен ли результат.
#
# Usage: ./scripts/setup-local.sh   (или `make setup`)

set -euo pipefail

cd "$(dirname "$0")/.."

[ -f .env.example ] || { echo "Не вижу .env.example — запускать из корня репозитория."; exit 1; }

ENV=.env.local

# --- 1. файл ----------------------------------------------------------------
if [ ! -f "$ENV" ]; then
    cp .env.example "$ENV"
    echo "Создан $ENV из шаблона."
else
    echo "$ENV уже есть — не перезаписываю, только дополню."
fi

# --- 2. долив новых ключей --------------------------------------------------
# Сравниваются ИМЕНА, не строки: значение в шаблоне это пример, а в локальном файле — настройка.
NEW=0
while IFS= read -r key; do
    grep -qE "^${key}=" "$ENV" && continue
    if [ "$NEW" = "0" ]; then
        printf '\n# --- Добавлено setup-local.sh %s: новые ключи из .env.example ---\n' "$(date '+%Y-%m-%d')" >> "$ENV"
        NEW=1
    fi
    grep -m1 -E "^${key}=" .env.example >> "$ENV"
    echo "  + $key"
done < <(grep -oE '^[A-Z][A-Z0-9_]*=' .env.example | tr -d '=' | sort -u)

[ "$NEW" = "0" ] && echo "Новых ключей в шаблоне нет."

# --- 3. заполнение пустых ---------------------------------------------------
# Пусто = ключ есть, а значения нет. Отсутствующий ключ сюда не попадёт: его добавил шаг 2.
is_empty() { grep -qE "^$1=[[:space:]]*$" "$ENV"; }

setenv() {
    local k="$1" v="$2" sv
    sv="$(printf '%s' "$v" | perl -pe 's/([\/@\$\\])/\\$1/g')"
    perl -i -pe "s/^$k=.*/$k=$sv/ if /^$k=/" "$ENV"
    echo "  = $k"
}

fill_if_empty() { is_empty "$1" && setenv "$1" "$2" || true; }

echo "Заполняю пустые значения:"

# Сгенерированные секреты. Способ генерации ОДИН на проект: второй однажды разойдётся с первым
# по длине или алфавиту, и различие всплывёт там, где его никто не ищет.
fill_if_empty JWT_SECRET "$(openssl rand -hex 32)"
fill_if_empty MFA_ENCRYPTION_KEY "$(openssl rand -hex 32)"
fill_if_empty SEO_NOTIFY_SECRET "$(openssl rand -hex 24)"

# Локальные адреса из docs/ENV_REFERENCE.md. Порты и root-пользователь — из docker-compose.dev.yml
# (`make up-local`), не выдуманные. Если монга у тебя своя — значение уже непустое, и оно останется.
fill_if_empty NEXT_PUBLIC_SITE_URL "http://localhost:3000"
fill_if_empty MONGO_URI "mongodb://admin:123123@localhost:27017/app?authSource=admin"
fill_if_empty REDIS_URL "redis://localhost:6380"

# VAPID — парой или никак: половина ключа хуже отсутствия обоих.
if is_empty VAPID_PRIVATE_KEY; then
    if VAPID_OUT="$(npx --yes web-push generate-vapid-keys --json 2>/dev/null)"; then
        VP="$(printf '%s' "$VAPID_OUT" | perl -ne 'print $1 if /"publicKey"\s*:\s*"([^"]+)"/')"
        VS="$(printf '%s' "$VAPID_OUT" | perl -ne 'print $1 if /"privateKey"\s*:\s*"([^"]+)"/')"
        if [ -n "$VP" ] && [ -n "$VS" ]; then
            setenv NEXT_PUBLIC_VAPID_PUBLIC_KEY "$VP"
            setenv VAPID_PRIVATE_KEY "$VS"
        fi
    else
        echo "  ! web-push недоступен — VAPID оставлен пустым (https://vapidkeys.com/)"
    fi
fi

# --- 4. вердикт -------------------------------------------------------------
echo
echo "== pnpm doctor =="
pnpm run doctor
