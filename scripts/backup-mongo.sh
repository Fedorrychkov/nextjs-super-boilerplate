#!/bin/bash

# Mongo backup for the LOCAL mongo container (MONGO_ENABLED=true deployments only;
# a remote cluster should use the provider's backups). See docs/MONGO_BACKUPS_RU.md.
#
# Design notes:
#  - mongodump runs in a THROWAWAY container sharing the mongo container's network
#    namespace (`--network container:mongo`) with its own hard --memory/--cpus caps.
#    Never `docker exec` into the mongo container: the dump would eat the DB's own
#    cgroup budget (memory-limits.sh) and could OOM-kill mongod under load.
#  - The dump container is transient (minutes, off-peak cron) — intentionally NOT part
#    of the memory-limits.sh budget; the caps below keep it polite instead.
#  - Streams `mongodump --archive --gzip` to a file in BACKUP_DIR (outside $HOME/app,
#    so blue/green swaps of the app dir never touch the dumps).
#
# Usage (cron installs this via the deploy workflow):
#   ENV_FILE=.env.prod API_ENV=prod ./scripts/backup-mongo.sh
#
# Tunables (env):
#   BACKUP_DIR                  default $HOME/db-backups
#   MONGO_CONTAINER             default mongo
#   MONGO_BACKUP_RETENTION      dumps to keep, default 14
#   MONGO_BACKUP_MIN_FREE_MB    skip if less free disk, default 500
#   MONGO_BACKUP_MEM_LIMIT      dump container RAM cap, default 256m
#   MONGO_BACKUP_CPUS           dump container CPU cap, default 0.5
#   MONGO_BACKUP_DB             db to dump, default $MONGO_DB; "all" = full instance

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

BACKUP_DIR="${BACKUP_DIR:-$HOME/db-backups}"
MONGO_CONTAINER="${MONGO_CONTAINER:-mongo}"
RETENTION="${MONGO_BACKUP_RETENTION:-14}"
MIN_FREE_MB="${MONGO_BACKUP_MIN_FREE_MB:-500}"
MEM_LIMIT="${MONGO_BACKUP_MEM_LIMIT:-256m}"
CPUS="${MONGO_BACKUP_CPUS:-0.5}"
ENV_FILE="${ENV_FILE:-.env}"

log() { echo "[backup-mongo] $(date '+%Y-%m-%d %H:%M:%S') $*"; }

# Load MONGO_USER / MONGO_PASSWORD / MONGO_DB from the app env file (values already
# in the environment win — same convention as the deploy scripts).
if [ -f "${PROJECT_ROOT}/${ENV_FILE}" ]; then
    set -a
    # shellcheck source=/dev/null
    . "${PROJECT_ROOT}/${ENV_FILE}"
    set +a
fi

MONGO_USER="${MONGO_USER:-admin}"
MONGO_DB="${MONGO_DB:-app}"
DUMP_DB="${MONGO_BACKUP_DB:-$MONGO_DB}"

if [ -z "${MONGO_PASSWORD:-}" ]; then
    log "ERROR: MONGO_PASSWORD is empty (env file: ${PROJECT_ROOT}/${ENV_FILE})"
    exit 1
fi

mkdir -p "$BACKUP_DIR"

# Trim our own log so cron output never grows unbounded (~10MB cap).
LOG_FILE="$BACKUP_DIR/backup.log"
if [ -f "$LOG_FILE" ] && [ "$(stat -c%s "$LOG_FILE" 2>/dev/null || stat -f%z "$LOG_FILE")" -gt 10485760 ]; then
    tail -c 1048576 "$LOG_FILE" > "$LOG_FILE.tmp" && mv "$LOG_FILE.tmp" "$LOG_FILE"
fi

# Overlap guard: a slow dump must not stack with the next cron tick.
LOCK_DIR="$BACKUP_DIR/.backup.lock"
if ! mkdir "$LOCK_DIR" 2>/dev/null; then
    log "another backup is already running (lock: $LOCK_DIR) — skipping"
    exit 0
fi
trap 'rmdir "$LOCK_DIR" 2>/dev/null || true' EXIT

# Local mongo must be up; when MONGO_ENABLED=false there is no container — that's fine,
# the deploy removes this cron entry, but guard anyway (manual runs, race with deploy).
if [ "$(docker inspect -f '{{.State.Running}}' "$MONGO_CONTAINER" 2>/dev/null)" != "true" ]; then
    log "container '$MONGO_CONTAINER' is not running — nothing to back up (remote mongo?)"
    exit 0
fi

# Reuse the exact image of the running mongo — tool versions always match the server.
MONGO_IMAGE="$(docker inspect -f '{{.Config.Image}}' "$MONGO_CONTAINER")"

FREE_MB="$(df -Pm "$BACKUP_DIR" | awk 'NR==2 {print $4}')"
if [ "$FREE_MB" -lt "$MIN_FREE_MB" ]; then
    log "ERROR: only ${FREE_MB}MB free at $BACKUP_DIR (< ${MIN_FREE_MB}MB) — skipping backup"
    exit 1
fi

STAMP="$(date +%Y%m%d_%H%M%S)"
FILE="$BACKUP_DIR/mongo_${API_ENV:-prod}_${STAMP}.archive.gz"

DB_ARGS=(--db "$DUMP_DB")
[ "$DUMP_DB" = "all" ] && DB_ARGS=()

log "dumping db='$DUMP_DB' from container '$MONGO_CONTAINER' (image $MONGO_IMAGE, mem $MEM_LIMIT, cpus $CPUS) -> $FILE"

# Password goes in via env (not argv) so it never shows in host `ps`.
if ! docker run --rm \
    --network "container:${MONGO_CONTAINER}" \
    --memory "$MEM_LIMIT" --cpus "$CPUS" \
    -e MONGO_BACKUP_PWD="$MONGO_PASSWORD" \
    "$MONGO_IMAGE" \
    sh -c "mongodump --host 127.0.0.1 --port 27017 --username '$MONGO_USER' --password \"\$MONGO_BACKUP_PWD\" --authenticationDatabase admin --quiet --archive --gzip $(printf '%s ' ${DB_ARGS[@]+"${DB_ARGS[@]}"})" \
    > "$FILE"; then
    log "ERROR: mongodump failed"
    rm -f "$FILE"
    exit 1
fi

if [ ! -s "$FILE" ] || ! gzip -t "$FILE" 2>/dev/null; then
    log "ERROR: dump is empty or corrupt — removing $FILE"
    rm -f "$FILE"
    exit 1
fi

log "done: $FILE ($(du -h "$FILE" | cut -f1))"

# Retention: keep the newest N dumps for this env.
ls -1t "$BACKUP_DIR"/mongo_"${API_ENV:-prod}"_*.archive.gz 2>/dev/null | tail -n +"$((RETENTION + 1))" | while read -r old; do
    log "retention: removing $old"
    rm -f "$old"
done

log "backups on disk: $(ls -1 "$BACKUP_DIR"/mongo_*.archive.gz 2>/dev/null | wc -l | tr -d ' '), free: $(df -Pm "$BACKUP_DIR" | awk 'NR==2 {print $4}')MB"
