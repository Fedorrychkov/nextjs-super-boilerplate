#!/bin/bash
# Memory budgeting for docker-compose.local.yml.
#
# Two ways to configure (both optional):
#   1. SERVER_MEMORY_MB=<total RAM in MB> — derives every limit below from a single number.
#   2. Explicit per-service overrides — always win over derived values:
#        API_MEM_LIMIT API_MEM_RESERVATION API_NODE_OPTIONS
#        REDIS_MEM_LIMIT REDIS_MAXMEMORY
#        MONGO_MEM_LIMIT MONGO_CACHE_GB
#
# When nothing is set, docker-compose.local.yml falls back to its own inline
# defaults (api 2g, redis/mongo unlimited) — the historical behavior.
#
# NOTE: this boilerplate has no background worker. If you add one, give it its own
# WORKER_* budget and reduce the api/mongo shares below accordingly.
#
# Budget split (rest is headroom for nginx/certbot/OS):
#   METRICS_ENABLED != true:  api 48% | mongo 32% | redis 10%            (~10% headroom)
#   METRICS_ENABLED == true:  api 34% | mongo 22% | redis 8% | metrics 29% (~7% headroom)
# Node heap (--max-old-space-size) is set to ~2/3 of the container limit so V8
# garbage-collects instead of getting OOM-killed by the cgroup.
#
# Metrics overrides (each also settable explicitly): PROMETHEUS_MEM_LIMIT LOKI_MEM_LIMIT
# GRAFANA_MEM_LIMIT TELEGRAF_MEM_LIMIT PROMTAIL_MEM_LIMIT CADVISOR_MEM_LIMIT EXPORTER_MEM_LIMIT

compute_memory_limits() {
    local total="${SERVER_MEMORY_MB:-0}"
    # non-numeric / empty -> 0 (no derivation)
    case "$total" in (''|*[!0-9]*) total=0 ;; esac

    if [ "$total" -gt 0 ]; then
        local api_pct=48 mongo_pct=32 redis_pct=10

        if [ "${METRICS_ENABLED:-false}" = "true" ]; then
            api_pct=34; mongo_pct=22; redis_pct=8

            # Metrics stack gets ~29% of the host, split across its services.
            # Grafana is the heaviest by far (unified storage + apiserver: ~150M+ at
            # start; at 15%/88M on a 2GB host it thrashed at 97% and got OOM-killed),
            # so it is the biggest recipient here.
            local metrics_mb=$(( total * 29 / 100 ))
            export GRAFANA_MEM_LIMIT="${GRAFANA_MEM_LIMIT:-$(( metrics_mb * 29 / 100 ))M}"
            export PROMETHEUS_MEM_LIMIT="${PROMETHEUS_MEM_LIMIT:-$(( metrics_mb * 21 / 100 ))M}"
            export LOKI_MEM_LIMIT="${LOKI_MEM_LIMIT:-$(( metrics_mb * 16 / 100 ))M}"
            export CADVISOR_MEM_LIMIT="${CADVISOR_MEM_LIMIT:-$(( metrics_mb * 10 / 100 ))M}"
            export TELEGRAF_MEM_LIMIT="${TELEGRAF_MEM_LIMIT:-$(( metrics_mb * 9 / 100 ))M}"
            export PROMTAIL_MEM_LIMIT="${PROMTAIL_MEM_LIMIT:-$(( metrics_mb * 9 / 100 ))M}"
            # nginx-exporter + node-exporter, each
            export EXPORTER_MEM_LIMIT="${EXPORTER_MEM_LIMIT:-$(( metrics_mb * 3 / 100 ))M}"
            echo "Metrics budget: total=${metrics_mb}M prometheus=${PROMETHEUS_MEM_LIMIT} loki=${LOKI_MEM_LIMIT} grafana=${GRAFANA_MEM_LIMIT} telegraf=${TELEGRAF_MEM_LIMIT} promtail=${PROMTAIL_MEM_LIMIT} cadvisor=${CADVISOR_MEM_LIMIT} exporters=2x${EXPORTER_MEM_LIMIT}"
        fi

        local api_mb=$(( total * api_pct / 100 ))
        local mongo_mb=$(( total * mongo_pct / 100 ))
        local redis_mb=$(( total * redis_pct / 100 ))

        export API_MEM_LIMIT="${API_MEM_LIMIT:-${api_mb}M}"
        export API_MEM_RESERVATION="${API_MEM_RESERVATION:-$(( api_mb / 2 ))M}"
        export API_NODE_OPTIONS="${API_NODE_OPTIONS:---max-old-space-size=$(( api_mb * 2 / 3 ))}"

        export REDIS_MEM_LIMIT="${REDIS_MEM_LIMIT:-${redis_mb}M}"
        export REDIS_MAXMEMORY="${REDIS_MAXMEMORY:-$(( redis_mb * 2 / 3 ))mb}"

        export MONGO_MEM_LIMIT="${MONGO_MEM_LIMIT:-${mongo_mb}M}"
        # WiredTiger cache ~40% of the mongo budget; mongod requires >= 0.25GB
        # LC_ALL=C: keep the decimal point locale-independent (mongod can't parse "0,25")
        export MONGO_CACHE_GB="${MONGO_CACHE_GB:-$(LC_ALL=C awk -v mb="$mongo_mb" 'BEGIN { c = mb * 0.4 / 1024; if (c < 0.25) c = 0.25; printf "%.2f", c }')}"

        echo "Memory budget (SERVER_MEMORY_MB=${total}): api=${API_MEM_LIMIT} (heap ${API_NODE_OPTIONS#*=}M) mongo=${MONGO_MEM_LIMIT} (cache ${MONGO_CACHE_GB}GB) redis=${REDIS_MEM_LIMIT} (maxmemory ${REDIS_MAXMEMORY})"
    fi
    # total=0: nothing derived; explicit overrides (if any) are already in the
    # environment and compose inline defaults cover the rest.
}
