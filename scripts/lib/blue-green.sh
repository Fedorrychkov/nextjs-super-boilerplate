#!/bin/bash
# Blue/green swap without a window where nobody serves (sourced by the deploy workflow).
#
# nginx proxies to `http://api-service:3000` through Docker's DNS (`resolver 127.0.0.11`,
# variable `proxy_pass`), and a name that resolves to several addresses is balanced across all
# of them, with `proxy_next_upstream error timeout` (nginx default) moving a refused request to
# the next one. The swap uses that:
#
#   1. bg_join_green    — the validated green container gets the network alias `api-service`:
#                         nginx now sends traffic to blue AND green;
#   2. bg_retire_blue   — blue is stopped and removed: everything goes to green;
#   3. (compose up -d)  — the new blue starts under its own name `api-service`, waits healthy;
#   4. bg_retire_green  — green is removed: everything goes to the new blue.
#
# After each change nginx is reloaded (`nginx -s reload`, not a restart): new workers resolve the
# name again at once, old ones finish the requests they hold. The previous swap stopped blue
# first and restarted nginx, so from `stop` until the new container passed its healthcheck
# (up to a few minutes) every request got a 502.
#
# Names are overridable for the local stand; the defaults are the production ones.

BG_API="${BG_API:-api-service}"
BG_GREEN="${BG_GREEN:-api-service-green}"
BG_NGINX="${BG_NGINX:-core-nginx-service}"
BG_NETWORK="${BG_NETWORK:-service-api-network}"
# Grace for requests in flight on blue before it is killed.
BG_STOP_TIMEOUT="${BG_STOP_TIMEOUT:-20}"

bg_log() { echo "[blue-green] $*"; }

# Graceful: workers that hold connections finish them; new workers re-resolve the upstream.
bg_nginx_reload() {
    if docker exec "$BG_NGINX" nginx -s reload >/dev/null 2>&1; then
        bg_log "nginx reloaded"
    else
        bg_log "warning: nginx reload failed (is $BG_NGINX running?)"
    fi
    # Let the new workers come up before the next topology change.
    sleep "${BG_SETTLE_SECONDS:-2}"
}

bg_join_green() {
    if [ "$(docker inspect -f '{{.State.Health.Status}}' "$BG_GREEN" 2>/dev/null)" != "healthy" ]; then
        bg_log "error: $BG_GREEN is not healthy — refusing to send traffic to it"
        return 1
    fi
    # An existing attachment cannot gain an alias: reconnect. Green is not serving yet, so the
    # second it spends off the network costs nothing.
    docker network disconnect "$BG_NETWORK" "$BG_GREEN" >/dev/null 2>&1 || true
    docker network connect --alias "$BG_API" "$BG_NETWORK" "$BG_GREEN" || return 1
    bg_log "$BG_GREEN answers as $BG_API"
    bg_nginx_reload
}

bg_retire_blue() {
    if docker inspect "$BG_API" >/dev/null 2>&1; then
        docker stop -t "$BG_STOP_TIMEOUT" "$BG_API" >/dev/null 2>&1 || true
        docker rm -f "$BG_API" >/dev/null 2>&1 || true
        bg_log "old $BG_API removed"
    fi
    bg_nginx_reload
}

bg_retire_green() {
    docker stop -t "$BG_STOP_TIMEOUT" "$BG_GREEN" >/dev/null 2>&1 || true
    docker rm -f "$BG_GREEN" >/dev/null 2>&1 || true
    bg_log "$BG_GREEN removed"
    bg_nginx_reload
}

bg_wait_healthy() {
    local name=$1 attempts=0 max=${2:-150} health
    while true; do
        health=$(docker inspect "$name" --format '{{.State.Health.Status}}' 2>/dev/null || true)
        [ "$health" = "healthy" ] && { bg_log "$name is healthy"; return 0; }
        attempts=$((attempts + 1))
        if [ "$attempts" -ge "$max" ]; then
            bg_log "error: $name did not become healthy"
            docker logs --tail=200 "$name" 2>&1 || true
            return 1
        fi
        sleep 2
    done
}
