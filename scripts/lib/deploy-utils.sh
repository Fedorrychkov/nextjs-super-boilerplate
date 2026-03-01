#!/bin/bash

# Shared deploy utilities for local-containers-run.sh and future blue/green flows
# Expects environment variables from caller:
# - PROJECT_ROOT, COMPOSE_FILE, DEPLOY_STATE_DIR, MIGRATIONS_RUN

function parse_bool() {
    local val=$(echo "$1" | tr '[:upper:]' '[:lower:]')
    if [[ "$val" == "1" || "$val" == "true" || "$val" == "yes" ]]; then
        echo true
    else
        echo false
    fi
}

function get_env_file() {
    local env=${1:-stage}
    if [ "$env" = "prod" ]; then
        echo ".env.prod"
    elif [ "$env" = "stage" ]; then
        echo ".env.stage"
    else
        echo ".env.$env"
    fi
}

# Load env file into current shell so docker-compose can substitute ${MONGO_USER} etc.
# Call this before running docker-compose when compose file uses vars from the env file.
function load_env_into_shell() {
    local env_file="${1:-.env}"
    local project_root="${PROJECT_ROOT:-.}"
    if [ -f "${project_root}/${env_file}" ]; then
        set -a
        # shellcheck source=/dev/null
        . "${project_root}/${env_file}"
        set +a
    fi
}

function prepare_dirs() {
    local project_root=${PROJECT_ROOT:-$(pwd)}
    local certbot_dir="${project_root}/certbot"
    local certs_dir="${project_root}/certs"
    mkdir -p ${certbot_dir}/www ${certs_dir}
    chmod -R 755 ${certbot_dir} ${certs_dir}
}

function check_resources() {
    echo "Debug: Checking system resources..."
    echo "Memory usage:"
    free -h
    echo "Disk usage:"
    df -h
    return 0
}

# Compose helpers
function compose_up() {
    # usage: compose_up services...
    docker-compose -f ${COMPOSE_FILE} up -d "$@"
}

function compose_stop_rm() {
    # usage: compose_stop_rm services...
    docker-compose -f ${COMPOSE_FILE} stop "$@"
    docker-compose -f ${COMPOSE_FILE} rm -f "$@"
}

function parse_domains() {
    local raw_domains="$1"
    local domains
    
    # Debug output to stderr
    echo "Debug: Raw domains input: '$raw_domains'" >&2
    
    # Parse and get domains
    if [[ "$raw_domains" =~ "-d "* ]]; then
        domains=$(echo "$raw_domains" | sed 's/^.*-d //')  # Everything after -d
        # If empty after -d, use default
        if [[ -z "$domains" ]]; then
            domains="app.example.local,www.app.example.local"
            echo "No domain specified, using default: $domains" >&2
        fi
    else
        # No -d flag, use default
        domains="app.example.local,www.app.example.local"
        echo "No -d flag found, using default: $domains" >&2
    fi
    
    # Trim whitespace
    domains=$(echo "$domains" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
    echo "$domains"
}

# TypeORM helpers (run inside core-api container)
function migrations_show() {
    local env=$1
    docker-compose -f ${COMPOSE_FILE} exec -T core-api sh -lc "npm run migration:show:${env} 2>/dev/null | cat"
}

function migrations_run() {
    local env=$1
    docker-compose -f ${COMPOSE_FILE} exec -T core-api sh -lc "npm run migration:run:${env} | cat"
}

function migrations_revert() {
    local env=$1
    docker-compose -f ${COMPOSE_FILE} exec -T core-api sh -lc "npm run migration:revert:${env} | cat"
}

function get_applied_count() {
    local show_out="$1"
    echo "$show_out" | LC_ALL=C grep -E '^[[:space:]]*\[X\]' | wc -l | tr -d ' '
}

function get_pending_count() {
    local show_out="$1"
    echo "$show_out" | LC_ALL=C grep -E '^[[:space:]]*\[ \]' | wc -l | tr -d ' '
}

function run_migrations_flow() {
    local env=$1
    local state_file="${DEPLOY_STATE_DIR}/migrations_${env}.count"
    local delta_file="${DEPLOY_STATE_DIR}/last_new_migrations_${env}.count"

    # Migrations disabled by default; enable with MIGRATIONS_RUN=true
    if [[ "$(parse_bool "$MIGRATIONS_RUN")" != "true" ]]; then
        echo "Migrations are disabled by default (MIGRATIONS_RUN=$MIGRATIONS_RUN). Skipping."
        echo 0
        return 0
    fi

    echo "Checking migrations status before run..."
    local before_show
    if ! before_show=$(migrations_show "$env"); then
        echo "Failed to show migrations"
        echo 0
        return 1
    fi
    local applied_before=$(get_applied_count "$before_show")
    local pending_before=$(get_pending_count "$before_show")
    echo "Applied before: $applied_before, Pending: $pending_before"

    if [[ "$pending_before" -eq 0 ]]; then
        echo "No pending migrations."
        echo 0
        return 0
    fi

    echo "Running migrations..."
    if ! migrations_run "$env"; then
        echo "Migrations run failed"
        echo 0
        return 1
    fi

    local after_show
    if ! after_show=$(migrations_show "$env"); then
        echo "Failed to show migrations after run"
        echo 0
        return 1
    fi
    local applied_after=$(get_applied_count "$after_show")
    local newly_applied=$((applied_after - applied_before))
    if [[ $newly_applied -lt 0 ]]; then newly_applied=0; fi
    echo "Newly applied migrations in this deploy: $newly_applied"

    echo "$applied_after" > "$state_file"
    echo "$newly_applied" > "$delta_file"
    echo "$newly_applied"
}

function rollback_new_migrations() {
    local env=$1
    local count_to_rollback=$2
    
    # Check if migrations are enabled
    if [[ "$(parse_bool "$MIGRATIONS_RUN")" != "true" ]]; then
        echo "Migrations are disabled by default (MIGRATIONS_RUN=$MIGRATIONS_RUN). Skipping rollback."
        return 0
    fi
    
    if [[ "$count_to_rollback" -le 0 ]]; then
        echo "Nothing to rollback."
        return 0
    fi
    echo "Rolling back $count_to_rollback migration(s)..."
    local i=0
    while [[ $i -lt $count_to_rollback ]]; do
        if ! migrations_revert "$env"; then
            echo "Rollback failed on step $((i+1))/$count_to_rollback"
            return 1
        fi
        i=$((i+1))
    done
    echo "Rollback completed."
    return 0
}

function clear_migrations_state() {
    local env=$1
    if [ -f "${DEPLOY_STATE_DIR}/last_new_migrations_${env}.count" ]; then
        : > "${DEPLOY_STATE_DIR}/last_new_migrations_${env}.count"
    fi
    if [ -f "${DEPLOY_STATE_DIR}/migrations_${env}.count" ]; then
        : > "${DEPLOY_STATE_DIR}/migrations_${env}.count"
    fi
}


