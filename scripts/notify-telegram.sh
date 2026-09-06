#!/usr/bin/env bash

set -euo pipefail

# ${var:0:N} counts characters only under a UTF-8 locale; without one bash counts bytes and the
# cut lands inside a Cyrillic letter. Runners do not always export LANG.
export LC_ALL="${LC_ALL:-C.UTF-8}"

# Required variables:
# TG_TOKEN, TG_CHAT_ID
# TG_THREAD_ID — optional; if not set, reply_to_message_id is not sent (normal group or personal chat)
# TG_STATUS: start|success|error|cancelled
# TG_TAG, TG_API_ENV, TG_NGINX_MODE, TG_DOMAIN, TG_METRICS_ENABLED (or TG_GRAFANA_ENABLED)
# GITHUB_RUN_URL, GITHUB_BRANCH_URL, GITHUB_COMMIT_URL, GITHUB_AUTHOR_URL, GITHUB_MESSAGE
# TG_DRY_RUN=1 — print the message instead of sending it (local check of the template)
#
# PR / review / CI-failure / Lighthouse notifications live in scripts/telegram/ (node, tested);
# this script is only the three deploy messages.

STATUS="${TG_STATUS:-start}"

case "$STATUS" in
  start)
    PREFIX="🚀 #start"
    TITLE="deploy started"
    ;;
  success)
    PREFIX="✅ #success"
    TITLE="deploy finished successfully"
    ;;
  error)
    PREFIX="❌ #error"
    TITLE="deploy finished with error"
    ;;
  cancelled|cancel)
    PREFIX="⏹️ #cancelled"
    TITLE="deploy cancelled"
    ;;
  *)
    PREFIX="💬 #info"
    TITLE="notification"
    ;;
esac

TAG_PART=""
if [ -n "${TG_TAG:-}" ]; then
  TAG_PART=" #${TG_TAG}"
fi

NGINX_MODE="${TG_NGINX_MODE:-https}"
# TG_DOMAIN may be a comma-separated list (e.g. "root,www.root") — links use only the first entry
DOMAIN="${TG_DOMAIN:-}"
DOMAIN="${DOMAIN%%,*}"
GRAFANA_ENABLED="${TG_METRICS_ENABLED:-${TG_GRAFANA_ENABLED:-true}}"

msg_text="${PREFIX} #${TG_API_ENV:-unknown}${TAG_PART} ${TITLE}:
<a href=\"${GITHUB_RUN_URL:-}\"> 🔗 Github Action</a>

"

if [ "${GRAFANA_ENABLED}" != "false" ] && [ -n "${DOMAIN}" ]; then
  msg_text="${msg_text}- <a href=\"${NGINX_MODE}://${DOMAIN}/grafana\"> 🔄 Grafana</a>
"
fi

if [ -n "${DOMAIN}" ]; then
  msg_text="${msg_text}- <a href=\"${NGINX_MODE}://${DOMAIN}\"> 👀 ${DOMAIN}</a>

"
fi

# The commit message is the only free text here, and Telegram parses the text as HTML: a trailer
# like `Co-Authored-By: Name <mail>` reads as a tag and the API answers 400 "can't parse entities".
# Cut to a readable length by characters, not bytes: `head -c` splits a Cyrillic letter in half and
# Telegram rejects the broken UTF-8.
html_escape() {
  sed -e 's/&/\&amp;/g' -e 's/</\&lt;/g' -e 's/>/\&gt;/g'
}
MESSAGE="${GITHUB_MESSAGE:-}"
if [ "${#MESSAGE}" -gt 1500 ]; then
  MESSAGE="${MESSAGE:0:1500}…"
fi
MESSAGE=$(printf '%s' "$MESSAGE" | html_escape)

msg_text="${msg_text}<blockquote>
🔄 Branch: ${GITHUB_BRANCH_URL:-}
📝 Commit: ${GITHUB_COMMIT_URL:-}
👤 Author: ${GITHUB_AUTHOR_URL:-}
📝 Message: ${MESSAGE}
</blockquote>
"

if [ -n "${TG_DRY_RUN:-}" ]; then
  printf '%s' "$msg_text"
  exit 0
fi

# Through --data-urlencode: an `&` in a commit message used to split the form into extra fields.
curl_args=(
  --data-urlencode "chat_id=${TG_CHAT_ID}"
  --data-urlencode "text=${msg_text}"
  --data-urlencode "parse_mode=HTML"
)
if [ -n "${TG_THREAD_ID:-}" ]; then
  curl_args+=(--data-urlencode "reply_to_message_id=${TG_THREAD_ID}")
fi

# A notification must never take a deploy down with it, but it must not fail silently either:
# `curl -s` without `-f` exits zero on a 400, and nobody read the answer — which is how a refused
# notification looked exactly like a delivered one.
response=$(curl -sS -X POST "https://api.telegram.org/bot${TG_TOKEN}/sendMessage" "${curl_args[@]}" 2>&1) || true
case "$response" in
  *'"ok":true'*) echo "Telegram: notification sent" ;;
  *) echo "::warning::Telegram refused the ${STATUS} notification: ${response}" ;;
esac
