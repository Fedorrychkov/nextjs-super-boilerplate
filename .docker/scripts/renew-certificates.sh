#!/bin/bash

echo "Starting certificate renewal check at $(date)"

# Check docker.sock availability for deploy-hook
if [ ! -S "/var/run/docker.sock" ]; then
    echo "❌ Warning: Docker socket not available, deploy-hook may not work"
fi

# Ensure webroot and health file for ACME
mkdir -p /var/www/certbot/.well-known/acme-challenge
echo OK > /var/www/certbot/.well-known/acme-challenge/health

# Safe nginx container restart and wait for ready
restart_nginx_container() {
    echo "🔄 Restarting nginx container before certificate operations..."
    docker restart core-nginx-service 2>/dev/null || \
    docker kill -s HUP core-nginx-service 2>/dev/null || \
    docker exec core-nginx-service nginx -s reload 2>/dev/null || \
    echo "⚠️ Failed to restart nginx (container may be down)"
}

wait_for_nginx_ready() {
    echo "⏳ Waiting for nginx to become ready on port 80..."
    local hosts=("nginx" "core-nginx-service")
    for i in {1..30}; do
        for host in "${hosts[@]}"; do
            if curl -s -f "http://$host:80/.well-known/acme-challenge/health" > /dev/null; then
                echo "✅ Nginx is ready ($host)"
                return 0
            fi
        done
        sleep 5
    done
    echo "❌ Nginx did not become ready in time"
    return 1
}

restart_nginx_container
if ! wait_for_nginx_ready; then
    echo "❌ Warning: Nginx is not available on port 80 after restart, skipping renewal for now"
    exit 0
fi

# Detect certificate type
is_letsencrypt_cert() {
    local domain=$1
    local cert_path="/etc/letsencrypt/live/${domain}/cert.pem"
    
    if [ ! -f "$cert_path" ]; then
        return 1
    fi
    
    # Check cert issuer
    local issuer=$(openssl x509 -in "$cert_path" -noout -issuer 2>/dev/null | sed 's/issuer=//')
    
    # Let's Encrypt certs have issuer containing "Let's Encrypt" or "R3"
    if [[ "$issuer" == *"Let's Encrypt"* ]] || [[ "$issuer" == *"R3"* ]] || [[ "$issuer" == *"E1"* ]]; then
        return 0  # Let's Encrypt cert
    else
        return 1  # Self-signed or other
    fi
}

# Fix certificate symlinks
fix_certificate_symlinks() {
    local domain=$1
    echo "🔧 Checking and fixing certificate symlinks for $domain"
    
    # Find dir with numeric suffix
    new_cert_dir=$(find /etc/letsencrypt/archive -maxdepth 1 -name "${domain}-*" -type d | grep -E "${domain}-[0-9]+$" | head -1)
    if [ -n "$new_cert_dir" ]; then
        new_cert_name=$(basename "$new_cert_dir")
        echo "📁 Found certificate with suffix ${new_cert_name#${domain}-}, reorganizing to main name..."
        
        # Rename old dir to -old if present
        if [ -d "/etc/letsencrypt/archive/${domain}" ]; then
            echo "📁 Moving old certificate to -old suffix..."
            mv "/etc/letsencrypt/archive/${domain}" "/etc/letsencrypt/archive/${domain}-old"
            mv "/etc/letsencrypt/live/${domain}" "/etc/letsencrypt/live/${domain}-old" 2>/dev/null || true
            mv "/etc/letsencrypt/renewal/${domain}.conf" "/etc/letsencrypt/renewal/${domain}-old.conf" 2>/dev/null || true
        fi
        
        # Rename new dir to main name
        echo "📁 Moving new certificate to main name..."
        mv "/etc/letsencrypt/archive/${new_cert_name}" "/etc/letsencrypt/archive/${domain}"
        mv "/etc/letsencrypt/live/${new_cert_name}" "/etc/letsencrypt/live/${domain}" 2>/dev/null || true
        mv "/etc/letsencrypt/renewal/${new_cert_name}.conf" "/etc/letsencrypt/renewal/${domain}.conf" 2>/dev/null || true
        
        # Create correct symlinks
        echo "🔗 Creating correct symlinks..."
        rm -f "/etc/letsencrypt/live/${domain}"/*.pem
        ln -s "../../archive/${domain}/cert1.pem" "/etc/letsencrypt/live/${domain}/cert.pem"
        ln -s "../../archive/${domain}/chain1.pem" "/etc/letsencrypt/live/${domain}/chain.pem"
        ln -s "../../archive/${domain}/fullchain1.pem" "/etc/letsencrypt/live/${domain}/fullchain.pem"
        ln -s "../../archive/${domain}/privkey1.pem" "/etc/letsencrypt/live/${domain}/privkey.pem"
        
        echo "✅ Certificate reorganized and symlinks fixed for $domain"
        return 0
    fi
    return 1
}

# Force reissue certificate
force_reissue_cert() {
    local domain=$1
    echo "🔄 Force reissuing certificate for $domain (current cert is not Let's Encrypt)"
    
    # Safe nginx reload helper
    reload_nginx() {
        echo "🔁 Reloading nginx to apply new certificates..."
        docker kill -s HUP core-nginx-service 2>/dev/null || \
        docker exec core-nginx-service nginx -s reload 2>/dev/null || \
        docker restart core-nginx-service 2>/dev/null || \
        echo "⚠️ Failed to reload nginx (container may be down)"
    }

    # Do not remove current cert first; get new one then switch
    
    # Call get-certificates.sh to create new cert
    echo "🆕 Creating new certificate..."
    /scripts/get-certificates.sh --force-renewal
    
    # Fix symlinks after new cert is created (atomic switch)
    fix_certificate_symlinks "$domain"
    
    reload_nginx
}

# Re-check nginx availability (in case of race)
NGINX_OK=false
for host in nginx core-nginx-service; do
    if curl -s -f http://$host:80/.well-known/acme-challenge/health > /dev/null; then
        NGINX_OK=true
        break
    fi
done
if [ "$NGINX_OK" != true ]; then
    echo "❌ Warning: Nginx is not available on port 80, skipping renewal for now"
    # Return 0 so supervisor does not restart on error; cron will run later
    exit 0
fi

# Force renewal: --force arg or env FORCE_RENEWAL=true
FORCE_RENEWAL_MODE=false
if [ "${1:-}" = "--force" ] || [ "${FORCE_RENEWAL:-false}" = "true" ]; then
    FORCE_RENEWAL_MODE=true
    echo "⚙️  Force renewal mode enabled"
fi

# Parse domains string into array
IFS=',' read -ra DOMAIN_ARRAY <<< "$DOMAINS"

# Track overall result
renewal_failed=false

# Process each domain
for domain in "${DOMAIN_ARRAY[@]}"; do
    echo "📝 Processing domain: $domain"
    
    # Skip renewal for local domains and test mode
    if [[ "$domain" == *".127.0.0.1."* ]] || [[ "$domain" == *".localhost"* ]] || [[ "${CERTBOT_TEST_MODE:-false}" = "true" ]]; then
        echo "🔧 Local/Test domain detected, skipping renewal for $domain"
        continue
    fi
    
    echo "🔄 Checking renewal for $domain"

    # In force renewal mode, check cert type first
    if [ "$FORCE_RENEWAL_MODE" = true ]; then
        if ! is_letsencrypt_cert "$domain"; then
            echo "⚠️ Current certificate is not Let's Encrypt. Reissuing by removing existing lineage..."
            force_reissue_cert "$domain"
            continue
        fi

        FORCE_ARGS=(
            certonly
            --domains "$domain"
            --webroot -w /var/www/certbot
            --cert-name "$domain"
            --deploy-hook "docker kill -s HUP core-nginx-service"
            --non-interactive
            --force-renewal
            --disable-hook-validation
        )
        if [[ "${CERTBOT_USE_STAGING:-false}" = "true" ]]; then
            FORCE_ARGS+=(--server "https://acme-staging-v02.api.letsencrypt.org/directory")
        fi
        if certbot "${FORCE_ARGS[@]}"; then
            echo "✅ Force renewal completed successfully for $domain"
            # Reload nginx after successful renewal
            docker kill -s HUP core-nginx-service 2>/dev/null || \
            docker exec core-nginx-service nginx -s reload 2>/dev/null || \
            docker restart core-nginx-service 2>/dev/null || \
            echo "⚠️ Failed to reload nginx (container may be down)"
        else
            echo "❌ Force renewal failed for $domain"
            renewal_failed=true
        fi
        continue
    fi
    
    # Check if certificate exists
    cert_path="/etc/letsencrypt/live/${domain}/fullchain.pem"
    if [ ! -f "$cert_path" ]; then
        echo "ℹ️ Certificate not found for $domain, will be created by certbot-init"
        continue
    fi
    
    # Check cert type
    if ! is_letsencrypt_cert "$domain"; then
        echo "⚠️ Current certificate for $domain is not from Let's Encrypt"
        
        # Try fixing symlinks first (maybe new cert with -0001 exists)
        if fix_certificate_symlinks "$domain"; then
            echo "✅ Fixed symlinks, certificate should now be Let's Encrypt"
            continue
        fi
        
        if [ "$FORCE_RENEWAL_MODE" = true ]; then
            echo "🔄 Force mode enabled, reissuing certificate..."
            force_reissue_cert "$domain"
            continue
        else
            echo "🔄 Attempting to get Let's Encrypt certificate (current is self-signed)"
            # Try to get Let's Encrypt cert without removing existing
            # If that fails, keep self-signed
            /scripts/get-certificates.sh --force-renewal
            # Fix symlinks after obtaining new cert
            fix_certificate_symlinks "$domain"
            continue
        fi
    fi
    
    # Check if cert expires within 30 days (2592000 sec)
    if openssl x509 -checkend 2592000 -noout -in "$cert_path" > /dev/null 2>&1; then
        echo "✅ Certificate for $domain is valid for more than 30 days"
    else
        echo "🔄 Certificate for $domain will expire within 30 days, attempting renewal"
            
            # Try to renew certificate
            RENEW_ARGS=(
                renew
                --webroot -w /var/www/certbot
                --cert-name "$domain"
                --deploy-hook "docker kill -s HUP core-nginx-service"
                --non-interactive
                --quiet
                --disable-hook-validation
            )
            if [[ "${CERTBOT_USE_STAGING:-false}" = "true" ]]; then
                RENEW_ARGS+=(--server "https://acme-staging-v02.api.letsencrypt.org/directory")
            fi
            if certbot "${RENEW_ARGS[@]}"; then
                echo "✅ Certificate renewal completed successfully for $domain"
            else
                echo "❌ Certificate renewal failed for $domain, trying force renewal"
                
                # Force renewal
                FORCE_ARGS=(
                    certonly
                    --domains "$domain"
                    --webroot -w /var/www/certbot
                    --cert-name "$domain"
                    --deploy-hook "docker kill -s HUP core-nginx-service"
                    --non-interactive
                    --force-renewal
                    --disable-hook-validation
                )
                if [[ "${CERTBOT_USE_STAGING:-false}" = "true" ]]; then
                    FORCE_ARGS+=(--server "https://acme-staging-v02.api.letsencrypt.org/directory")
                fi
                if certbot "${FORCE_ARGS[@]}"; then
                    echo "✅ Force renewal completed successfully for $domain"
                else
                    echo "❌ Force renewal also failed for $domain"
                    renewal_failed=true
                fi
            fi
    fi
done

# If renewal failed, try to obtain new certificates
if [ "$renewal_failed" = true ]; then
    echo "🔄 Some renewals failed, attempting to get new certificates"
    /scripts/get-certificates.sh --force-renewal
fi

echo "🎉 Certificate renewal process completed at $(date)"
exit 0
