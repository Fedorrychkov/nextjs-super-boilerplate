#!/bin/bash

# Определяем корень проекта и пути к файлам
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CERTBOT_DIR="${PROJECT_ROOT}/certbot"
CERTS_DIR="${PROJECT_ROOT}/certs"
COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.local.yml"

DEPLOY_STATE_DIR="${PROJECT_ROOT}/.deploy"
mkdir -p "$DEPLOY_STATE_DIR"
MIGRATIONS_RUN=${MIGRATIONS_RUN:-false}
REDIS_ENABLED=${REDIS_ENABLED:-false}
METRICS_ENABLED=${METRICS_ENABLED:-false}

CORE_SERVICES="core-api"
[ "$REDIS_ENABLED" = "true" ] && CORE_SERVICES="core-api redis"
METRICS_SERVICES="prometheus nginx-prometheus-exporter prometheus-node-exporter cadvisor promtail loki telegraf grafana"

# Общие функции
if [ -f "${PROJECT_ROOT}/scripts/lib/deploy-utils.sh" ]; then
    # shellcheck source=/dev/null
    . "${PROJECT_ROOT}/scripts/lib/deploy-utils.sh"
else
    echo "Missing ${PROJECT_ROOT}/scripts/lib/deploy-utils.sh"
    exit 1
fi

function rollback_mode() {
    local env=${1:-stage}
    local env_file=$(get_env_file $env)

    echo "Starting rollback mode..."
    API_ENV=${env} \
    ENV_FILE=${env_file} \
    docker-compose -f ${COMPOSE_FILE} up -d $CORE_SERVICES

    echo "Waiting for core-api to be ready for rollback..."
    attempts=0; max_attempts=20
    while true; do
        status=$(docker ps --filter name=api-service --format "{{.Status}}")
        if [[ "$status" == *"(healthy)"* || -n "$status" ]]; then
            break
        fi
        ((attempts++)); [ $attempts -ge $max_attempts ] && break
        sleep 2
    done

    local delta_file="${DEPLOY_STATE_DIR}/last_new_migrations_${env}.count"
    local count_to_rollback=0
    if [ -f "$delta_file" ]; then
        count_to_rollback=$(cat "$delta_file" 2>/dev/null | tr -d ' ')
        count_to_rollback=${count_to_rollback:-0}
    fi

    if [[ "$count_to_rollback" =~ ^[0-9]+$ && "$count_to_rollback" -gt 0 ]]; then
        echo "Rolling back $count_to_rollback migration(s) per state file..."
        rollback_new_migrations "$env" "$count_to_rollback" || true
    else
        echo "No migrations to rollback."
    fi

    echo "Stopping core services after rollback..."
    docker-compose -f ${COMPOSE_FILE} stop $CORE_SERVICES
    docker-compose -f ${COMPOSE_FILE} rm -f $CORE_SERVICES

    echo "Clearing migrations state files..."
    clear_migrations_state "$env"
}

# Blue/Green: validate green stack (api+redis) in app_new without nginx
function bg_validate_green() {
    local env=${1:-stage}
    local env_file=$(get_env_file $env)
    echo "Starting blue/green validation for GREEN stack..."

    # Clean up any existing green containers to avoid ContainerConfig errors
    echo "Cleaning up any existing green containers..."
    docker stop api-service-green redis-green 2>/dev/null || true
    docker rm -f api-service-green redis-green 2>/dev/null || true

    if [ "${DEPLOY_MODE:-default}" = "registry" ] && [ -n "${CORE_API_IMAGE:-}" ]; then
        echo "DEPLOY_MODE=registry: pulling core-api image $CORE_API_IMAGE"
        docker pull "$CORE_API_IMAGE"
        export CORE_API_IMAGE
    fi

    export SUFFIX=-green
    API_ENV=${env} \
    ENV_FILE=${env_file} \
    docker-compose -f ${COMPOSE_FILE} up -d $CORE_SERVICES

    echo "Waiting for GREEN core-api to become healthy..."
    attempts=0; max_attempts=30
    while true; do
        status=$(docker ps --filter name=api-service-green --format "{{.Status}}")
        if [[ "$status" == *"(healthy)"* ]]; then
            echo "GREEN core-api is healthy"
            break
        fi
        ((attempts++))
        if [ $attempts -ge $max_attempts ]; then
            echo "Error: GREEN core-api failed to become healthy"
            return 1
        fi
        sleep 2
    done

    echo "Running DB migrations for GREEN (MIGRATIONS_RUN=$MIGRATIONS_RUN)..."
    newly_applied_migs=$(run_migrations_flow "$env") || migs_rc=$?
    migs_rc=${migs_rc:-0}
    if [[ $migs_rc -ne 0 ]]; then
        echo "Error: migrations failed on GREEN"
        return 1
    fi
    echo "GREEN validation complete."
    return 0
}

# Blue/Green: stop green stack
function bg_down_green() {
    echo "Stopping GREEN stack..."
    # Принудительно останавливаем зеленые контейнеры (docker-compose может не найти их из-за SUFFIX)
    docker stop api-service-green redis-green 2>/dev/null || true
    docker rm -f api-service-green redis-green 2>/dev/null || true
}

# Manual certificate renewal
function renew_certificates() {
    local env=${1:-stage}
    local env_file=$(get_env_file $env)
    
    echo "🔄 Manual certificate renewal for environment: $env"
    
    # Проверяем, что certbot контейнер запущен
    if ! docker ps --format '{{.Names}}' | grep -q "service-api-certbot"; then
        echo "❌ Certbot container is not running. Starting it first..."
        API_ENV=${env} \
        ENV_FILE=${env_file} \
        NGINX_MODE=https \
        DOMAINS=${DOMAINS:-app.example.local} \
        FIRST_DOMAIN=${FIRST_DOMAIN:-app.example.local} \
        CERTBOT_TEST_MODE=${CERTBOT_TEST_MODE:-false} \
        docker-compose -f ${COMPOSE_FILE} up -d certbot
        
        echo "⏳ Waiting for certbot to start..."
        sleep 10
    fi
    
    echo "🔍 Checking certificate types and renewing if needed..."
    docker exec service-api-certbot /scripts/renew-certificates.sh --force
    
    echo "🔄 Reloading nginx to use new certificates..."
    docker kill -s HUP core-nginx-service 2>/dev/null || echo "⚠️ Could not reload nginx (container might not be running)"
    
    echo "✅ Certificate renewal process completed!"
}


# Get additional docker-compose parameters
DOCKER_OPTS="${@:3}"

# Check if docker-compose.local.yml exists
if [ ! -f "$COMPOSE_FILE" ]; then
    echo "Error: docker-compose.local.yml not found at $COMPOSE_FILE"
    exit 1
fi

# Start in HTTP mode
function start_http() {
    check_resources

    local env=${1:-stage}
    local raw_domains="$*"  # Берем все оставшиеся аргументы
    
    # Получаем домены через функцию parse_domains
    local domains=$(parse_domains "$raw_domains")
    

    local FIRST_DOMAIN=$(echo "$domains" | cut -d',' -f1)
    
    cd ${PROJECT_ROOT}
    prepare_dirs

    local env_file=$(get_env_file $env)

    DEPLOY_MODE=${DEPLOY_MODE:-default}
    if [ "$DEPLOY_MODE" = "registry" ] && [ -n "${CORE_API_IMAGE:-}" ]; then
        echo "DEPLOY_MODE=registry: pulling core-api image $CORE_API_IMAGE"
        docker pull "$CORE_API_IMAGE"
        export CORE_API_IMAGE
        API_ENV=$env ENV_FILE=$env_file NGINX_MODE=http DOMAINS="$domains" FIRST_DOMAIN="$FIRST_DOMAIN" \
            docker-compose -f ${COMPOSE_FILE} up ${DOCKER_OPTS} $CORE_SERVICES nginx
    else
        API_ENV=$env \
        ENV_FILE=$env_file \
        NGINX_MODE=http \
        DOMAINS="$domains" \
        FIRST_DOMAIN="$FIRST_DOMAIN" \
        docker-compose -f ${COMPOSE_FILE} up ${DOCKER_OPTS} --build $CORE_SERVICES nginx
    fi
}

function start_https() {
    check_resources

    local env=${1:-stage}
    local raw_domains="$*"
    # Parse optional --migrationsRun=true|false flag (deprecated, use MIGRATIONS_RUN env var)
    if [[ "$raw_domains" =~ --migrationsRun=([^[:space:]]+) ]]; then
        MIGRATIONS_RUN="${BASH_REMATCH[1]}"
        # Remove flag from domains
        raw_domains=$(echo "$raw_domains" | sed 's/--migrationsRun=[^ ]*//')
    fi
    local domains=$(parse_domains "$raw_domains")
    local FIRST_DOMAIN=$(echo "$domains" | cut -d',' -f1)
    local env_file=$(get_env_file $env)
    
    export API_ENV=$env
    export ENV_FILE=$env_file
    export DOMAINS="$domains"
    export FIRST_DOMAIN="$FIRST_DOMAIN"
    export NGINX_MODE=http
    export CERTBOT_TEST_MODE=${CERTBOT_TEST_MODE:-false}

    echo "Starting HTTPS mode with:"
    echo "Environment: $env"
    echo "Domains: $domains"
    echo "Env file: $env_file"
    echo "API_ENV: $API_ENV"
    echo "Primary domain: $FIRST_DOMAIN"
    echo "Certbot test mode: $CERTBOT_TEST_MODE"

    DEPLOY_MODE=${DEPLOY_MODE:-default}
    if [ "$DEPLOY_MODE" = "registry" ]; then
        if [ -z "${CORE_API_IMAGE:-}" ]; then
            echo "Error: CORE_API_IMAGE is required when DEPLOY_MODE=registry"
            exit 1
        fi
        echo "DEPLOY_MODE=registry: pulling core-api image $CORE_API_IMAGE"
        docker pull "$CORE_API_IMAGE"
        export CORE_API_IMAGE
    else
        echo "DEPLOY_MODE=default: core-api will be built if needed"
    fi

    echo "Stage 1: Starting API service..."
    docker-compose -f ${COMPOSE_FILE} up -d $CORE_SERVICES

    # Wait for API health before migrations
    echo "Waiting for core-api to become healthy..."
    attempts=0; max_attempts=30
    while true; do
        status=$(docker ps --filter name=api-service --format "{{.Status}}")
        if [[ "$status" == *"(healthy)"* ]]; then
            echo "core-api is healthy"
            break
        fi
        ((attempts++))
        if [ $attempts -ge $max_attempts ]; then
            echo "Error: core-api failed to become healthy"
            exit 1
        fi
        sleep 2
    done

    # Migrations before enabling HTTPS
    echo "Stage 1.1: Running DB migrations (MIGRATIONS_RUN=$MIGRATIONS_RUN)..."
    newly_applied_migs=$(run_migrations_flow "$env") || migs_rc=$?
    migs_rc=${migs_rc:-0}
    if [[ $migs_rc -ne 0 ]]; then
        echo "Error: migrations failed. Stopping deploy."
        exit 1
    fi

    echo "Stage 2: Starting nginx in HTTP mode..."
    # Avoid docker-compose recreate path that can trigger ContainerConfig bug on old compose
    docker-compose -f ${COMPOSE_FILE} stop nginx || true
    docker-compose -f ${COMPOSE_FILE} rm -f nginx || true
    docker-compose -f ${COMPOSE_FILE} up -d nginx

    echo "Waiting for nginx to be healthy..."
    local attempts=0
    local max_attempts=30
    while true; do
        if curl -sf http://localhost:80/.well-known/acme-challenge/health > /dev/null; then
            echo "Nginx is healthy!"
            break
        fi
        
        ((attempts++))
        if [ $attempts -ge $max_attempts ]; then
            echo "Error: Nginx failed to become healthy"
            docker-compose -f ${COMPOSE_FILE} logs nginx
            exit 1
        fi
        echo "Waiting for nginx... (attempt $attempts/$max_attempts)"
        sleep 2
    done

    echo "Stage 3: Running certbot initialization..."
    docker-compose -f ${COMPOSE_FILE} stop certbot-init
    docker-compose -f ${COMPOSE_FILE} rm -f certbot-init
    docker-compose -f ${COMPOSE_FILE} build --no-cache certbot-init
    # Ensure persistent volumes exist for certificates and logs
    docker volume create letsencrypt_certs >/dev/null 2>&1 || true
    docker volume create certbot_logs >/dev/null 2>&1 || true
    
    if ! docker-compose -f ${COMPOSE_FILE} up -d certbot-init; then
        echo "Failed to start certbot-init container"
        docker-compose -f ${COMPOSE_FILE} logs certbot-init
        docker-compose -f ${COMPOSE_FILE} logs nginx
        exit 1
    fi

    # Wait for certificates (through Docker volume, not local folder)
    echo "Waiting for certificates..."
    attempts=0
    max_attempts=30

    # Fixed volume name (can be overridden by LE_VOLUME_NAME variable)
    le_volume="${LE_VOLUME_NAME:-letsencrypt_certs}"
    echo "Debug: Using letsencrypt volume: ${le_volume}"

    while true; do
        if docker run --rm -v "$le_volume:/etc/letsencrypt" alpine sh -c \
            "test -f /etc/letsencrypt/live/${FIRST_DOMAIN}/fullchain.pem && test -f /etc/letsencrypt/live/${FIRST_DOMAIN}/privkey.pem"; then
            echo "✅ Certificates found in volume $le_volume"
            break
        fi

        ((attempts++))
        if [ $attempts -ge $max_attempts ]; then
            echo "Error: Timeout waiting for certificates in volume $le_volume"
            echo "Debug: Listing /etc/letsencrypt/live in volume:"
            docker run --rm -v "$le_volume:/etc/letsencrypt" alpine sh -c "ls -la /etc/letsencrypt/live || true; ls -la /etc/letsencrypt/live/${FIRST_DOMAIN} || true"
            exit 1
        fi
        echo "Waiting for certificates... (attempt $attempts/$max_attempts)"
        sleep 2
    done

    echo "Stage 4: Switching nginx to HTTPS mode..."
    export NGINX_MODE=https

    # Stop containers in the correct order
    echo "Debug: Stopping containers in order..."
    docker-compose -f ${COMPOSE_FILE} stop $CORE_SERVICES
    docker-compose -f ${COMPOSE_FILE} rm -f $CORE_SERVICES
    
    docker-compose -f ${COMPOSE_FILE} stop nginx
    docker-compose -f ${COMPOSE_FILE} rm -f nginx

    # Add pause
    sleep 5

    # Start containers in the correct order
    echo "Debug: Starting containers in order..."
    API_ENV=${env} \
    ENV_FILE=${env_file} \
    NGINX_MODE=https \
    DOMAINS="$domains" \
    FIRST_DOMAIN="$FIRST_DOMAIN" \
    docker-compose -f ${COMPOSE_FILE} up -d $CORE_SERVICES

    sleep 5

    API_ENV=${env} \
    ENV_FILE=${env_file} \
    NGINX_MODE=https \
    DOMAINS="$domains" \
    FIRST_DOMAIN="$FIRST_DOMAIN" \
    docker-compose -f ${COMPOSE_FILE} up -d nginx

    # Check if containers have the correct names
    if ! docker ps --format '{{.Names}}' | grep -q "api-service"; then
        echo "Error: core-api container not found with correct name"
        container_id=$(docker ps -q --filter "name=_core-api")
        if [ ! -z "$container_id" ]; then
            docker rename $container_id api-service
        fi
    fi

    if ! docker ps --format '{{.Names}}' | grep -q "core-nginx-service"; then
        echo "Error: nginx container not found with correct name"
        container_id=$(docker ps -q --filter "name=_nginx")
        if [ ! -z "$container_id" ]; then
            docker rename $container_id core-nginx-service
        fi
    fi

    # Add debug information
    echo "Debug: Current environment variables:"
    echo "DOMAINS=$DOMAINS"
    echo "FIRST_DOMAIN=$FIRST_DOMAIN"
    echo "NGINX_MODE=$NGINX_MODE"

    # Check container status before stopping
    echo "Debug: Container status before stop:"
    docker-compose -f ${COMPOSE_FILE} ps nginx

    # Recreate health check file before restarting nginx
    echo "Debug: Creating health check file..."
    docker-compose -f ${COMPOSE_FILE} exec nginx sh -c "
        echo 'Debug: Current directory structure:' &&
        ls -la /var/www/certbot/.well-known/acme-challenge/ &&
        echo 'Debug: Creating health file...' &&
        mkdir -p /var/www/certbot/.well-known/acme-challenge &&
        echo 'OK' > /var/www/certbot/.well-known/acme-challenge/health &&
        echo 'Debug: Health file created:' &&
        cat /var/www/certbot/.well-known/acme-challenge/health"

    echo "Debug: Checking nginx configuration..."
    docker-compose -f ${COMPOSE_FILE} exec nginx nginx -T

    # Check container status after restart
    echo "Debug: Container status after restart:"
    docker-compose -f ${COMPOSE_FILE} ps nginx
    docker-compose -f ${COMPOSE_FILE} logs nginx

    # Add pause after creating containers
    echo "Waiting for containers to initialize..."
    sleep 10

    echo "Waiting for nginx to be healthy in HTTPS mode..."
    attempts=0
    max_attempts=30
    while true; do
        ((attempts++))
        
        container_status=$(docker ps --filter name=core-nginx-service --format "{{.Status}}")
        echo "Debug: Container status: $container_status"
        
        if [[ "$container_status" == *"(healthy)"* ]]; then
            echo "✅ Nginx is healthy!"
            break
        fi
        
        if [ $attempts -ge $max_attempts ]; then
            echo "Error: Nginx failed to become healthy after $max_attempts attempts"
            # Откатим новые миграции, если были применены
            if [[ -n "$newly_applied_migs" && "$newly_applied_migs" -gt 0 ]]; then
                echo "Attempting to rollback $newly_applied_migs migrations due to failure..."
                rollback_new_migrations "$env" "$newly_applied_migs" || true
            fi
            echo "Debug: Full nginx logs:"
            docker-compose -f ${COMPOSE_FILE} logs nginx
            exit 1
        fi
        
        echo "Waiting for nginx... (attempt $attempts/$max_attempts)"
        sleep 2
    done

    echo "Stage 5: Starting certbot renewal service..."

    API_ENV=${env} \
    ENV_FILE=${env_file} \
    NGINX_MODE=https \
    DOMAINS="$domains" \
    FIRST_DOMAIN="$FIRST_DOMAIN" \
    CERTBOT_TEST_MODE=${CERTBOT_TEST_MODE:-false} \
    docker-compose -f ${COMPOSE_FILE} up -d certbot
    
    echo "HTTPS setup completed successfully!"

    # After successful service startup, clean up the migration count records
    if [ -f "${DEPLOY_STATE_DIR}/last_new_migrations_${env}.count" ]; then
        echo "Cleaning migrations delta state file..."
        : > "${DEPLOY_STATE_DIR}/last_new_migrations_${env}.count"
    fi
    if [ -f "${DEPLOY_STATE_DIR}/migrations_${env}.count" ]; then
        echo "Cleaning migrations applied state file..."
        : > "${DEPLOY_STATE_DIR}/migrations_${env}.count"
    fi

    if [ "$METRICS_ENABLED" = "true" ] || [ "$REDIS_ENABLED" = "true" ]; then
        echo "Starting optional services (metrics and/or redis)..."
        EXTRA_SERVICES=""
        [ "$METRICS_ENABLED" = "true" ] && EXTRA_SERVICES="$METRICS_SERVICES"
        [ "$REDIS_ENABLED" = "true" ] && EXTRA_SERVICES="$EXTRA_SERVICES redis"
        EXTRA_SERVICES=$(echo "$EXTRA_SERVICES")
        docker-compose -f ${COMPOSE_FILE} up -d $EXTRA_SERVICES
        echo "Optional services started."
    fi
}

# Full rebuild
function rebuild() {
    cd ${PROJECT_ROOT}
    prepare_dirs
    local env_file=$(get_env_file $env)
    docker-compose -f ${COMPOSE_FILE} down
    docker system prune -f
    API_ENV=${1:-stage} \
    ENV_FILE=$env_file \
    NGINX_MODE=http \
    docker-compose -f ${COMPOSE_FILE} build --no-cache && \
    docker-compose -f ${COMPOSE_FILE} up ${DOCKER_OPTS}
}

# Cleanup
function clean() {
    cd ${PROJECT_ROOT}
    
    echo "🛑 Stopping containers..."
    # Try to stop containers through docker-compose
    docker-compose -f ${COMPOSE_FILE} down --remove-orphans

    # Force stop all containers in the project (including green)
    docker stop service-api-certbot-init service-api-certbot core-nginx-service api-service api-service-green prometheus nginx-prometheus-exporter prometheus-node-exporter cadvisor promtail loki telegraf grafana redis redis-green 2>/dev/null || true
    docker rm -f service-api-certbot-init service-api-certbot core-nginx-service api-service api-service-green prometheus nginx-prometheus-exporter prometheus-node-exporter cadvisor promtail loki telegraf grafana redis redis-green 2>/dev/null || true

    # Clean up old app_new images
    echo "Cleaning up old app_new images..."
    docker images --filter "reference=app_new_*" --format "table {{.Repository}}:{{.Tag}}\t{{.ID}}\t{{.Size}}" || true
    docker rmi $(docker images --filter "reference=app_new_*" --format "{{.ID}}") 2>/dev/null || true
    
    echo "✅ Cleanup completed"
}

case "$1" in
    "http") 
        shift
        start_http "$@" ;;
    "https") 
        shift
        start_https "$@" ;;
    "rebuild") 
        shift
        rebuild "$@" ;;
    "rollback")
        shift
        rollback_mode "$@" ;;
    "bg-validate")
        shift
        bg_validate_green "$@" ;;
    "bg-down")
        shift
        bg_down_green "$@" ;;
    "renew-certs")
        shift
        renew_certificates "$@" ;;
    "clean") 
        clean ;;
    *) 
        echo "Usage: ./scripts/local-containers-run.sh [http|https|rebuild|clean|renew-certs] [stage|prod] [-d domain1.com,domain2.com]"
        echo "Environment variables:"
        echo "  MIGRATIONS_RUN=true|false   - Enable/disable database migrations (default: false)"
        echo "  REDIS_ENABLED=true|false   - Start Redis container (default: false)"
        echo "  METRICS_ENABLED=true|false  - Start metrics stack (prometheus, grafana, loki, etc.) (default: false)"
        echo "  DEPLOY_MODE=default|registry - default: build on server; registry: use CORE_API_IMAGE (pull only)"
        echo "  CORE_API_IMAGE=<image>     - When DEPLOY_MODE=registry, image to pull (e.g. ghcr.io/owner/sapian-web-core-api:sha)"
        echo "Commands:"
        echo "  renew-certs [stage|prod]    - Manually renew certificates (force reissue non-Let's Encrypt certs)"
        echo "Examples:"
        echo "  ./scripts/local-containers-run.sh https prod -d example.com"
        echo "  MIGRATIONS_RUN=true ./scripts/local-containers-run.sh https prod -d example.com"
        echo "  ./scripts/local-containers-run.sh https prod -d example.com,www.example.com"
        echo "  ./scripts/local-containers-run.sh renew-certs stage  # Renew certificates for stage environment"
        ;;
esac
