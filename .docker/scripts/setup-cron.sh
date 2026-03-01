#!/bin/bash

# Cron job for certificate renewal
# Run daily at 2:00 AM
echo "0 2 * * * /scripts/renew-certificates.sh >> /var/log/certbot/cron-renewal.log 2>&1" > /etc/crontabs/root

# Set crontab file permissions
chmod 0644 /etc/crontabs/root

echo "✅ Cron job for certificate renewal has been set up"
echo "📅 Renewal will run daily at 2:00 AM"
