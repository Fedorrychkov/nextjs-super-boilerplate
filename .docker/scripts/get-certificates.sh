#!/bin/bash

# At script start
mkdir -p /var/log/certbot
chmod 755 /var/log/certbot
echo "running" > /var/log/certbot/error_status
chmod 644 /var/log/certbot/error_status

# Safe nginx container restart and wait for ready
restart_nginx_container() {
    echo "🔄 Restarting nginx container before certificate issuance..."
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
wait_for_nginx_ready || true

# Clean up old certificates with numeric suffixes
cleanup_old_certificates() {
    local domain=$1
    echo "🧹 Cleaning up old certificates with suffixes for $domain"
    
    # Find dirs with numeric suffixes (except -old which we keep as backup)
    old_cert_dirs=$(find /etc/letsencrypt/archive -maxdepth 1 -name "${domain}-*" -type d | grep -E "${domain}-[0-9]+$")
    
    if [ -n "$old_cert_dirs" ]; then
        echo "$old_cert_dirs" | while read -r cert_dir; do
            cert_name=$(basename "$cert_dir")
            suffix="${cert_name#${domain}-}"
            echo "🗑️ Removing old certificate with suffix ${suffix}"
            rm -rf "/etc/letsencrypt/archive/${cert_name}"
            rm -rf "/etc/letsencrypt/live/${cert_name}" 2>/dev/null || true
            rm -f "/etc/letsencrypt/renewal/${cert_name}.conf" 2>/dev/null || true
        done
    else
        echo "ℹ️ No old certificates with numeric suffixes found"
    fi
}

# Check if certificate exists for domain
has_existing_cert() {
    local domain=$1
    [ -f "/etc/letsencrypt/live/${domain}/fullchain.pem" ] && \
    [ -f "/etc/letsencrypt/live/${domain}/privkey.pem" ]
}

# Create self-signed certificate
create_self_signed_cert() {
    local domain=$1
    echo "Creating self-signed certificate for $domain"
    
    # Create required directories
    mkdir -p "/etc/letsencrypt/live/${domain}"
    mkdir -p "/var/www/certbot/.well-known/acme-challenge"
    
    # Verify directories exist
    echo "Debug: Checking directories..."
    ls -la "/etc/letsencrypt/live/"
    ls -la "/var/www/certbot/.well-known/acme-challenge/"
    
    # Generate certificates with verbose output
    echo "Debug: Generating private key..."
    openssl genrsa -out "/etc/letsencrypt/live/${domain}/privkey.pem" 2048 || {
        echo "Failed to generate private key"
        return 1
    }
    
    echo "Debug: Generating self-signed certificate..."
    openssl req -x509 -new -nodes \
        -key "/etc/letsencrypt/live/${domain}/privkey.pem" \
        -subj "/CN=${domain}" \
        -days 365 \
        -out "/etc/letsencrypt/live/${domain}/fullchain.pem" || {
        echo "Failed to generate certificate"
        return 1
    }
    
    # Verify generated files
    echo "Debug: Verifying generated files..."
    openssl x509 -in "/etc/letsencrypt/live/${domain}/fullchain.pem" -text -noout || {
        echo "Invalid certificate generated"
        return 1
    }
    
    # Copy cert files
    cp "/etc/letsencrypt/live/${domain}/fullchain.pem" "/etc/letsencrypt/live/${domain}/cert.pem"
    cp "/etc/letsencrypt/live/${domain}/fullchain.pem" "/etc/letsencrypt/live/${domain}/chain.pem"
    
    # Set permissions
    chmod 644 "/etc/letsencrypt/live/${domain}"/*.pem
    chmod 755 "/etc/letsencrypt/live/${domain}"
    
    # Create ACME challenge
    echo "LOCAL_DOMAIN_VERIFICATION_${domain}" > "/var/www/certbot/.well-known/acme-challenge/health"
    chmod -R 755 /var/www/certbot
    
    echo "✅ Self-signed certificate created for ${domain}"
    ls -la "/etc/letsencrypt/live/${domain}"
    return 0
}

# Obtain Let's Encrypt certificate
get_letsencrypt_cert() {
    local domain=$1
    local force_renewal=${2:-false}
    
    # Safe nginx reload helper
    reload_nginx() {
        echo "🔁 Reloading nginx to apply new certificates..."
        docker kill -s HUP core-nginx-service 2>/dev/null || \
        docker exec core-nginx-service nginx -s reload 2>/dev/null || \
        docker restart core-nginx-service 2>/dev/null || \
        echo "⚠️ Failed to reload nginx (container may be down)"
    }
    
    # Early exit if cert files already exist in persistent storage
    # Only when not force-renewal and cert is valid
    if has_existing_cert "$domain" && [ "$force_renewal" != "true" ]; then
        echo "Existing cert files found for $domain, skipping issuance"
        ls -la "/etc/letsencrypt/live/${domain}/"
        return 0
    fi

    echo "Requesting Let's Encrypt certificate for $domain (force: $force_renewal)"
    
    # Check existing cert
    # Detect certificate type (Let's Encrypt vs self-signed)
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

    if certbot certificates --cert-name "$domain" &>/dev/null; then
        echo "Certificate already exists for $domain"
        
        # Check cert files exist
        if [ ! -f "/etc/letsencrypt/live/${domain}/fullchain.pem" ] || \
           [ ! -f "/etc/letsencrypt/live/${domain}/privkey.pem" ]; then
            echo "Certificate files not found, requesting new certificate"
        elif [ "$force_renewal" = "true" ]; then
            echo "Force renewal requested, requesting new certificate"
        elif ! is_letsencrypt_cert "$domain"; then
            echo "Existing certificate is not from Let's Encrypt, will request new LE cert without removing current"
        else
            echo "Let's Encrypt certificate exists and is valid, skipping"
            ls -la "/etc/letsencrypt/live/${domain}/"
            return 0
        fi
    elif [ "$force_renewal" = "true" ] && ! is_letsencrypt_cert "$domain"; then
        echo "Force renewal requested and existing certificate is not from Let's Encrypt, will obtain new LE cert without removing current"
    fi
    
    # Ensure webroot dir exists
    if [ ! -d "/var/www/certbot" ]; then
        mkdir -p /var/www/certbot
    fi
    
    # Build certbot params
    local certbot_params=(
        "--webroot"
        "-w=/var/www/certbot"
        "-d=${domain}"
        "--expand"
        "--keep-until-expiring"
        "--cert-name=${domain}"
        "--verbose"
        "--non-interactive"
        "--email=${CERTBOT_EMAIL:-example@example.com}"
        "--agree-tos"
    )
    # Optional: use staging CA for testing
    if [[ "${CERTBOT_USE_STAGING:-false}" = "true" ]]; then
        certbot_params+=("--server" "https://acme-staging-v02.api.letsencrypt.org/directory")
    fi
    
    # Add force renewal if requested
    if [ "$force_renewal" = "true" ]; then
        certbot_params+=("--force-renewal")
        # Do not touch current lineage until new cert is issued
    fi
    
    # Request certificate
    certbot certonly "${certbot_params[@]}"
    rc=$?
    if [ $rc -eq 0 ]; then
        echo "✅ Certificate obtained successfully for $domain"
        
        # Check if cert was created with numeric suffix
        new_cert_dir=$(find /etc/letsencrypt/archive -maxdepth 1 -name "${domain}-*" -type d | grep -E "${domain}-[0-9]+$" | head -1)
        if [ -n "$new_cert_dir" ]; then
            new_cert_name=$(basename "$new_cert_dir")
            echo "🔄 New certificate created with suffix ${new_cert_name#${domain}-}, reorganizing..."
            
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
            
            echo "✅ Certificate reorganized successfully"
        fi
        
        ls -la "/etc/letsencrypt/live/${domain}"
        reload_nginx
        return 0
    fi
    echo "❌ Failed to obtain certificate for $domain (rc=$rc)"
    # If rate limit hit, try existing files or fallback
    if grep -qi "too many certificates" /var/log/letsencrypt/letsencrypt.log 2>/dev/null; then
        if has_existing_cert "$domain"; then
            echo "Rate limit hit, but existing cert files found — reusing"
            return 0
        else
            echo "Rate limit hit and no existing files — generating self-signed for continuity"
            create_self_signed_cert "$domain"
            return $?
        fi
    fi
    return 1
}

# Check nginx availability
echo "Checking nginx configuration and availability..."
for i in {1..3}; do
    echo "Attempt $i: Checking nginx status..."
    if curl --connect-timeout 5 -I http://nginx:80 > /dev/null 2>&1; then
        echo "✅ Successfully connected to nginx"
        break
    fi
    echo "❌ Cannot connect to nginx"
    if [ $i -eq 3 ]; then
        echo "❌ Failed to connect to nginx after 3 attempts"
        echo "nginx_connection_failed" > /var/log/certbot/error_status
        exit 1
    fi
    sleep 5
done

# Check if script was called with force-renewal flag
FORCE_RENEWAL=false
if [ "$1" = "--force-renewal" ]; then
    FORCE_RENEWAL=true
    echo " Force renewal mode enabled"
fi

# Parse domains string into array
IFS=',' read -ra DOMAIN_ARRAY <<< "$DOMAINS"
for domain in "${DOMAIN_ARRAY[@]}"; do
    echo " Processing domain: $domain"
    
    # Clean old certs with suffixes
    cleanup_old_certificates "$domain"
    
    # Check local domains BEFORE test mode
    if [[ "$domain" =~ [.]127[.]0[.]0[.]1[.] ]] || \
       [[ "$domain" =~ [.]localhost ]] || \
       [[ "$domain" =~ [.]local$ ]] || \
       [[ "$domain" =~ [.]local[,]? ]]; then
        echo "🔧 Local domain detected, using self-signed certificate"
        create_self_signed_cert "$domain"
    # Then check test mode
    elif [[ "${CERTBOT_TEST_MODE:-false}" = "true" ]]; then
        echo " Test mode enabled, using self-signed certificate"
        create_self_signed_cert "$domain"
    else
        echo "🌐 Production domain detected, using Let's Encrypt"
        get_letsencrypt_cert "$domain" "$FORCE_RENEWAL"
    fi
done

echo "🎉 All certificates have been processed"

# At script end
if [ $? -eq 0 ]; then
    echo "success" > /var/log/certbot/error_status
else
    echo "certificate_generation_failed" > /var/log/certbot/error_status
fi
