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
            # Grafana is the heaviest by far and its appetite is a property of the VERSION, not
            # of the host: Grafana 13 runs the Loki datasource as a separate process and peaks
            # at ~450M RSS on a log query. With 29% of the pool it got 344M on a 4GB host and
            # was OOM-killed twice a minute (memcg kill of the grafana process, so the container
            # even reported OOMKilled=false); 6GB hosts survived only because 29% happened to
            # land above the peak. Grafana therefore takes the largest share by a wide margin;
            # Prometheus, which idled at 30M of 249M, gives most of it up. Below ~3GB the
            # metrics stack does not fit at all — disable it rather than shrink these further.
            local metrics_mb=$(( total * 29 / 100 ))
            export GRAFANA_MEM_LIMIT="${GRAFANA_MEM_LIMIT:-$(( metrics_mb * 43 / 100 ))M}"
            export PROMETHEUS_MEM_LIMIT="${PROMETHEUS_MEM_LIMIT:-$(( metrics_mb * 14 / 100 ))M}"
            export LOKI_MEM_LIMIT="${LOKI_MEM_LIMIT:-$(( metrics_mb * 16 / 100 ))M}"
            export CADVISOR_MEM_LIMIT="${CADVISOR_MEM_LIMIT:-$(( metrics_mb * 8 / 100 ))M}"
            export TELEGRAF_MEM_LIMIT="${TELEGRAF_MEM_LIMIT:-$(( metrics_mb * 7 / 100 ))M}"
            export PROMTAIL_MEM_LIMIT="${PROMTAIL_MEM_LIMIT:-$(( metrics_mb * 7 / 100 ))M}"
            # nginx-exporter + node-exporter, each (2.5% each; the integer math rounds down)
            export EXPORTER_MEM_LIMIT="${EXPORTER_MEM_LIMIT:-$(( metrics_mb * 25 / 1000 ))M}"
            # Not clamped: the budget has ~7% headroom and a silent bump would over-commit it.
            # Loud instead — below this line Grafana 13 gets memcg-killed on the first Loki query.
            if [ "${GRAFANA_MEM_LIMIT%M}" -lt 450 ] 2>/dev/null; then
                echo "WARN: GRAFANA_MEM_LIMIT=${GRAFANA_MEM_LIMIT} is below the ~450M peak of Grafana 13: the metrics stack will be OOM-killed on the first log query. Set metrics_enabled: false or raise server_memory_mb (>= 4096), see docs/DECISIONS_RU.md §7." >&2
            fi
            echo "Metrics budget: total=${metrics_mb}M prometheus=${PROMETHEUS_MEM_LIMIT} loki=${LOKI_MEM_LIMIT} grafana=${GRAFANA_MEM_LIMIT} telegraf=${TELEGRAF_MEM_LIMIT} promtail=${PROMTAIL_MEM_LIMIT} cadvisor=${CADVISOR_MEM_LIMIT} exporters=2x${EXPORTER_MEM_LIMIT}"
        fi

        # Background worker (scripts/worker.ts). Enabled with WORKER_ENABLED=true.
        # Its slice is carved out of the api share so the total budget stays the same.
        local worker_pct=0

        if [ "${WORKER_ENABLED:-false}" = "true" ]; then
            worker_pct=10
            api_pct=$(( api_pct - worker_pct ))
        fi

        local api_mb=$(( total * api_pct / 100 ))
        local mongo_mb=$(( total * mongo_pct / 100 ))
        local redis_mb=$(( total * redis_pct / 100 ))

        export API_MEM_LIMIT="${API_MEM_LIMIT:-${api_mb}M}"
        export API_MEM_RESERVATION="${API_MEM_RESERVATION:-$(( api_mb / 2 ))M}"
        export API_NODE_OPTIONS="${API_NODE_OPTIONS:---max-old-space-size=$(( api_mb * 2 / 3 ))}"

        if [ "$worker_pct" -gt 0 ]; then
            local worker_mb=$(( total * worker_pct / 100 ))
            export WORKER_MEM_LIMIT="${WORKER_MEM_LIMIT:-${worker_mb}M}"
            export WORKER_MEM_RESERVATION="${WORKER_MEM_RESERVATION:-$(( worker_mb / 2 ))M}"
            export WORKER_NODE_OPTIONS="${WORKER_NODE_OPTIONS:---max-old-space-size=$(( worker_mb * 2 / 3 ))}"
            echo "Worker budget: worker=${WORKER_MEM_LIMIT} (heap ${WORKER_NODE_OPTIONS#*=}M)"
        fi

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
