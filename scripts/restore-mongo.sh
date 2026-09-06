#!/bin/bash

# Restore a dump produced by scripts/backup-mongo.sh into the LOCAL mongo container.
# DESTRUCTIVE: --drop replaces existing collections. See docs/deploy/mongo-backups.ru.md.
#
# Usage:
#   ENV_FILE=.env.prod ./scripts/restore-mongo.sh /root/db-backups/mongo_prod_20260717_033001.archive.gz
#   FORCE=1 ... — skip the interactive confirmation (for scripted recovery).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

ARCHIVE="${1:-}"
MONGO_CONTAINER="${MONGO_CONTAINER:-mongo}"
MEM_LIMIT="${MONGO_BACKUP_MEM_LIMIT:-256m}"
CPUS="${MONGO_BACKUP_CPUS:-0.5}"
ENV_FILE="${ENV_FILE:-.env}"

log() { echo "[restore-mongo] $(date '+%Y-%m-%d %H:%M:%S') $*"; }

if [ -z "$ARCHIVE" ] || [ ! -f "$ARCHIVE" ]; then
    echo "Usage: ENV_FILE=.env.prod $0 /path/to/mongo_<env>_<stamp>.archive.gz"
    exit 1
fi

if ! gzip -t "$ARCHIVE" 2>/dev/null; then
    log "ERROR: $ARCHIVE is not a valid gzip archive"
    exit 1
fi

if [ -f "${PROJECT_ROOT}/${ENV_FILE}" ]; then
    set -a
    # shellcheck source=/dev/null
    . "${PROJECT_ROOT}/${ENV_FILE}"
    set +a
fi

MONGO_USER="${MONGO_USER:-admin}"

if [ -z "${MONGO_PASSWORD:-}" ]; then
    log "ERROR: MONGO_PASSWORD is empty (env file: ${PROJECT_ROOT}/${ENV_FILE})"
    exit 1
fi

if [ "$(docker inspect -f '{{.State.Running}}' "$MONGO_CONTAINER" 2>/dev/null)" != "true" ]; then
    log "ERROR: container '$MONGO_CONTAINER' is not running"
    exit 1
fi

MONGO_IMAGE="$(docker inspect -f '{{.Config.Image}}' "$MONGO_CONTAINER")"

if [ "${FORCE:-0}" != "1" ]; then
    echo "About to RESTORE (with --drop!) from: $ARCHIVE"
    echo "Target: container '$MONGO_CONTAINER' ($MONGO_IMAGE)"
    read -r -p "Type 'restore' to continue: " answer
    [ "$answer" = "restore" ] || { echo "Aborted."; exit 1; }
fi

log "restoring from $ARCHIVE ..."

if ! docker run --rm -i \
    --network "container:${MONGO_CONTAINER}" \
    --memory "$MEM_LIMIT" --cpus "$CPUS" \
    -e MONGO_BACKUP_PWD="$MONGO_PASSWORD" \
    "$MONGO_IMAGE" \
    sh -c "mongorestore --host 127.0.0.1 --port 27017 --username '$MONGO_USER' --password \"\$MONGO_BACKUP_PWD\" --authenticationDatabase admin --archive --gzip --drop" \
    < "$ARCHIVE"; then
    log "ERROR: mongorestore failed"
    exit 1
fi

log "restore complete. Verify the app (healthcheck, key screens) before declaring victory."
