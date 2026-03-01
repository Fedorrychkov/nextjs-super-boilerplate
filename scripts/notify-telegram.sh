#!/usr/bin/env bash

set -euo pipefail

# Required variables:
# TG_TOKEN, TG_CHAT_ID
# TG_THREAD_ID — optional; if not set, reply_to_message_id is not sent (normal group or personal chat)
# TG_STATUS: start|success|error
# TG_TAG, TG_API_ENV, TG_NGINX_MODE, TG_DOMAIN, TG_METRICS_ENABLED (or TG_GRAFANA_ENABLED)
# GITHUB_RUN_URL, GITHUB_BRANCH_URL, GITHUB_COMMIT_URL, GITHUB_AUTHOR_URL, GITHUB_MESSAGE

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
DOMAIN="${TG_DOMAIN:-}"
GRAFANA_ENABLED="${TG_METRICS_ENABLED:-${TG_GRAFANA_ENABLED:-true}}"

msg_text="${PREFIX} #${TG_API_ENV:-unknown}${TAG_PART} ${TITLE}:
<a href=\"${GITHUB_RUN_URL}\"> 🔗 Github Action</a>

"

if [ "${GRAFANA_ENABLED}" != "false" ] && [ -n "${DOMAIN}" ]; then
  msg_text="${msg_text}- <a href=\"${NGINX_MODE}://${DOMAIN}/grafana\"> 🔄 Grafana</a>
"
fi

if [ -n "${DOMAIN}" ]; then
  msg_text="${msg_text}- <a href=\"${NGINX_MODE}://${DOMAIN}\"> 👀 ${DOMAIN}</a>

"
fi

msg_text="${msg_text}<blockquote>
🔄 Branch: ${GITHUB_BRANCH_URL}
📝 Commit: ${GITHUB_COMMIT_URL}
👤 Author: ${GITHUB_AUTHOR_URL}
📝 Message: ${GITHUB_MESSAGE}
</blockquote>
"

POST_DATA="chat_id=${TG_CHAT_ID}&text=${msg_text}&parse_mode=HTML"
if [ -n "${TG_THREAD_ID:-}" ]; then
  POST_DATA="${POST_DATA}&reply_to_message_id=${TG_THREAD_ID}"
fi
curl -s -X POST "https://api.telegram.org/bot${TG_TOKEN}/sendMessage" -d "$POST_DATA"

